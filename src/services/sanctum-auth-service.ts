/**
 * Service de gestion d'authentification et de clés pour le coffre-fort Sanctuaire.
 *
 * Spécification (DEF-01 / I-02, P1) :
 * - Stockage des secrets (sel scrypt, vérificateur de PIN, clé biométrique)
 *   dans le trousseau sécurisé matériel (Keychain iOS / Android Keystore) via `expo-secure-store`.
 * - Élimination définitive du faux enregistrement '__pin_hash__' dans la table SQLite `sanctum_notes`.
 * - Migration transparente des anciens PIN configurés sous l'ancien schéma SHA-256 à sel fixe.
 * - Déverrouillage biométrique au choix de l'utilisateur : la clé n'est lisible qu'après une authentification
 *   exigée par le système (requireAuthentication), et devient invalide si les empreintes changent.
 */

import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha2.js';
import { getDatabase } from '../database/sqlite';
import { SanctumRepository } from '../repositories/sanctum-repository';
import {
  deriveSanctumKey,
  encryptSanctumNote,
  decryptSanctumNote,
  generateRandomBytes,
  bytesToHex,
  hexToBytes,
  SANCTUM_CRYPTO_CONSTANTS,
} from './sanctum-crypto';
import {
  SanctumLockoutState,
  INITIAL_SANCTUM_LOCKOUT,
  registerSanctumFailedAttempt,
  getSanctumLockoutStatus,
} from '../domain/rules/sanctum-rules';

const SECURE_STORE_KEYS = {
  SALT: 'jp_sanctum_salt_v1',
  VERIFIER: 'jp_sanctum_verifier_v1',
  BIOMETRIC_KEY: 'jp_sanctum_biometric_key_v2',
  BIOMETRIC_ENABLED: 'jp_sanctum_biometric_enabled_v2',
  BIOMETRIC_DECLINED: 'jp_sanctum_biometric_declined_v2',
  LEGACY_BIOMETRIC_KEY: 'jp_sanctum_biometric_key_v1',
  KDF_N: 'jp_sanctum_kdf_n_v1',
  LOCKOUT: 'jp_sanctum_lockout_v1',
} as const;

const VERIFIER_SENTINEL = '__SANCTUM_PIN_VERIFIER_TOKEN__';
const BIOMETRIC_KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Accéder au Sanctuaire privé',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

/** What a backup needs for its notes to open with the same PIN on another phone. Never the key itself. */
export interface SanctumBackupKeys {
  salt: string;
  verifier: string;
  kdfN: number;
}

export type SanctumKeysRestore = 'restored' | 'same' | 'conflict';

export type SanctumBiometricUnlock =
  | { status: 'unlocked'; key: Uint8Array }
  /** Authentication canceled or refused: the user can retry or use the PIN. */
  | { status: 'cancelled' }
  /** The key is gone, for instance because the enrolled fingerprints changed: the PIN is needed. */
  | { status: 'unavailable' };

/** The legacy biometric key was readable without authentication: it must not stay on the device. */
async function purgeLegacyBiometricKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.LEGACY_BIOMETRIC_KEY).catch(() => {});
}

/**
 * Calcule l'empreinte de l'ancien système (SHA-256 avec sel fixe) pour la migration.
 */
export function hashLegacyPin(pin: string): string {
  const salted = `sanctum_salt_jp_${pin.trim()}`;
  return bytesToHex(sha256(new TextEncoder().encode(salted)));
}

/**
 * Récupère le hash d'un ancien PIN stocké en clair dans la table SQLite (schéma legacy).
 */
async function getLegacyPinHash(): Promise<string | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ content: string }>(
      `SELECT content FROM sanctum_notes WHERE id = '__pin_hash__'`
    );
    return row?.content && row.content.trim() ? row.content.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Supprime la fausse note '__pin_hash__' de la base SQLite après migration.
 */
async function purgeLegacyPinHash(): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sanctum_notes WHERE id = '__pin_hash__'`);
  } catch {
    // silencieux si la base n'est pas encore prête
  }
}

export const SanctumAuthService = {
  /**
   * Vérifie si le Sanctuaire a un code PIN configuré (soit dans SecureStore, soit legacy).
   */
  async isPinConfigured(): Promise<boolean> {
    const verifier = await SecureStore.getItemAsync(SECURE_STORE_KEYS.VERIFIER);
    if (verifier) {
      return true;
    }
    // Contrôle migration legacy
    const legacy = await getLegacyPinHash();
    return !!legacy;
  },

  /**
   * Configure un nouveau code PIN pour le Sanctuaire.
   *
   * 1. Génère un sel aléatoire matériellement isolé de 16 octets.
   * 2. Dérive la clé symétrique maître de 32 octets via scrypt.
   * 3. Chiffre une chaîne sentinelle de vérification avec cette clé.
   * 4. Stocke le sel et le vérificateur dans SecureStore.
   * 5. Purge l'ancien '__pin_hash__' SQLite s'il existait.
   *
   * @returns La clé symétrique de 32 octets pour la session active.
   */
  async setupPin(pin: string): Promise<Uint8Array> {
    const salt = await generateRandomBytes(SANCTUM_CRYPTO_CONSTANTS.SALT_LENGTH);
    const masterKey = await deriveSanctumKey(pin, salt);

    // Création du vérificateur (token chiffré par la clé maître)
    const verifierPayload = await encryptSanctumNote(VERIFIER_SENTINEL, masterKey);

    await SecureStore.setItemAsync(SECURE_STORE_KEYS.SALT, bytesToHex(salt));
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.VERIFIER, verifierPayload);
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.KDF_N,
      String(SANCTUM_CRYPTO_CONSTANTS.SCRYPT_PARAMS.N)
    );
    await this.disableBiometricUnlock();
    await purgeLegacyBiometricKey();

    // Réinitialiser tout lockout éventuel
    await this.resetLockout();

    // Supprimer l'ancienne trace SQLite s'il y en avait une
    await purgeLegacyPinHash();

    return masterKey;
  },

  /**
   * Récupère l'état de verrouillage persistant (nombre d'échecs, timestamp de lockout).
   */
  async getLockoutState(): Promise<SanctumLockoutState> {
    try {
      const raw = await SecureStore.getItemAsync(SECURE_STORE_KEYS.LOCKOUT);
      if (!raw) return INITIAL_SANCTUM_LOCKOUT;
      const parsed = JSON.parse(raw);
      return {
        failedAttempts: typeof parsed.failedAttempts === 'number' ? parsed.failedAttempts : 0,
        lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : null,
      };
    } catch {
      return INITIAL_SANCTUM_LOCKOUT;
    }
  },

  /**
   * Indique si le coffre est actuellement verrouillé et renvoie le décompte en secondes.
   */
  async getLockoutStatus(
    nowMs: number = Date.now()
  ): Promise<{ isLocked: boolean; remainingSeconds: number }> {
    const state = await this.getLockoutState();
    return getSanctumLockoutStatus(state, nowMs);
  },

  /**
   * Enregistre un échec de saisie du PIN et applique la temporisation exponentielle.
   */
  async recordFailedAttempt(
    nowMs: number = Date.now()
  ): Promise<{ isLocked: boolean; remainingSeconds: number }> {
    const state = await this.getLockoutState();
    const nextState = registerSanctumFailedAttempt(state, nowMs);
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.LOCKOUT, JSON.stringify(nextState));
    return getSanctumLockoutStatus(nextState, nowMs);
  },

  /**
   * Réinitialise le compteur d'échecs à zéro.
   */
  async resetLockout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.LOCKOUT);
    } catch {
      // silencieux
    }
  },

  /**
   * Vérifie le code PIN saisi et déverrouille la clé de chiffrement du Sanctuaire.
   * Empêche l'attaque brute-force par verrouillage exponentiel persisté.
   * Gère automatiquement la migration transparente si l'utilisateur utilisait l'ancien système.
   */
  async verifyAndUnlockWithPin(
    pin: string,
    nowMs: number = Date.now()
  ): Promise<{
    success: boolean;
    key?: Uint8Array;
    error?: string;
    isLocked?: boolean;
    remainingSeconds?: number;
  }> {
    // 1. Contrôle strict de lockout (évite le coût CPU de scrypt si verrouillé)
    const currentLockout = await this.getLockoutStatus(nowMs);
    if (currentLockout.isLocked) {
      return {
        success: false,
        isLocked: true,
        remainingSeconds: currentLockout.remainingSeconds,
        error: `Coffre-fort verrouillé. Réessayez dans ${currentLockout.remainingSeconds}s.`,
      };
    }

    const storedSaltHex = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SALT);
    const storedVerifier = await SecureStore.getItemAsync(SECURE_STORE_KEYS.VERIFIER);

    // Cas standard : système sécurisé moderne (SecureStore)
    if (storedSaltHex && storedVerifier) {
      try {
        const salt = hexToBytes(storedSaltHex);
        const storedN = await SecureStore.getItemAsync(SECURE_STORE_KEYS.KDF_N);
        const n = storedN ? Number(storedN) : SANCTUM_CRYPTO_CONSTANTS.LEGACY_SCRYPT_N;
        const derivedKey = await deriveSanctumKey(pin, salt, n);

        // Validation en déchiffrant la sentinelle
        const decryptedSentinel = await decryptSanctumNote(storedVerifier, derivedKey);
        if (decryptedSentinel === VERIFIER_SENTINEL) {
          // Succès : réinitialiser le compteur d'échecs
          await this.resetLockout();
          await purgeLegacyBiometricKey();
          return { success: true, key: derivedKey };
        }
      } catch {
        // Mauvais PIN
      }

      // Échec : incrémenter le compteur et calculer la pénalité
      const failureStatus = await this.recordFailedAttempt(nowMs);
      if (failureStatus.isLocked) {
        return {
          success: false,
          isLocked: true,
          remainingSeconds: failureStatus.remainingSeconds,
          error: `Code PIN incorrect. Verrouillé pendant ${failureStatus.remainingSeconds}s.`,
        };
      }
      return { success: false, error: 'Code PIN incorrect' };
    }

    // Cas de migration : vérifier si un ancien PIN SHA-256 existait dans SQLite
    const legacyHash = await getLegacyPinHash();
    if (legacyHash) {
      const candidateHash = hashLegacyPin(pin);

      if (candidateHash === legacyHash) {
        // Le PIN est valide ! Migration transparente immédiate vers scrypt + SecureStore
        await this.resetLockout();
        const newKey = await this.setupPin(pin.trim());
        return { success: true, key: newKey };
      }

      const failureStatus = await this.recordFailedAttempt(nowMs);
      if (failureStatus.isLocked) {
        return {
          success: false,
          isLocked: true,
          remainingSeconds: failureStatus.remainingSeconds,
          error: `Code PIN incorrect. Verrouillé pendant ${failureStatus.remainingSeconds}s.`,
        };
      }
      return { success: false, error: 'Code PIN incorrect' };
    }

    return { success: false, error: 'Aucun code PIN configuré pour le Sanctuaire' };
  },

  /**
   * Indique si le déverrouillage biométrique a été activé. Ne demande aucune authentification.
   */
  async isBiometricUnlockEnabled(): Promise<boolean> {
    return (await SecureStore.getItemAsync(SECURE_STORE_KEYS.BIOMETRIC_ENABLED)) === '1';
  },

  /**
   * Indique s'il faut proposer le déverrouillage biométrique : appareil compatible,
   * pas encore activé, et pas déjà refusé par l'utilisateur.
   */
  async shouldOfferBiometricUnlock(): Promise<boolean> {
    try {
      if (!SecureStore.canUseBiometricAuthentication()) return false;
      if (await this.isBiometricUnlockEnabled()) return false;
      return (await SecureStore.getItemAsync(SECURE_STORE_KEYS.BIOMETRIC_DECLINED)) !== '1';
    } catch {
      return false;
    }
  },

  /**
   * Mémorise le refus du déverrouillage biométrique, jusqu'au prochain changement de PIN.
   */
  async declineBiometricUnlock(): Promise<void> {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.BIOMETRIC_DECLINED, '1');
  },

  /**
   * Active le déverrouillage biométrique avec la clé de la session.
   * Retourne false si l'utilisateur annule ou si l'appareil refuse.
   */
  async enableBiometricUnlock(key: Uint8Array): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.BIOMETRIC_KEY,
        bytesToHex(key),
        BIOMETRIC_KEY_OPTIONS
      );
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.BIOMETRIC_ENABLED, '1');
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Désactive le déverrouillage biométrique et efface sa clé.
   */
  async disableBiometricUnlock(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_ENABLED).catch(() => {});
  },

  /**
   * Lit la clé protégée : c'est le système qui exige l'authentification biométrique pour la rendre.
   */
  async unlockWithBiometrics(): Promise<SanctumBiometricUnlock> {
    let keyHex: string | null;
    try {
      keyHex = await SecureStore.getItemAsync(SECURE_STORE_KEYS.BIOMETRIC_KEY, BIOMETRIC_KEY_OPTIONS);
    } catch {
      return { status: 'cancelled' };
    }

    if (keyHex) {
      try {
        const key = hexToBytes(keyHex);
        if (key.length === SANCTUM_CRYPTO_CONSTANTS.KEY_LENGTH) return { status: 'unlocked', key };
      } catch {
        // Clé illisible : même traitement qu'une clé absente
      }
    }

    // Clé invalidée (empreintes modifiées) : le PIN reste la seule voie, on pourra la reproposer
    await this.disableBiometricUnlock();
    return { status: 'unavailable' };
  },

  /**
   * Modifie le code PIN en vérifiant au préalable l'ancien code PIN.
   * Re-chiffre toutes les notes existantes avec la nouvelle clé maîtresse.
   */
  async changePin(
    oldPin: string,
    newPin: string
  ): Promise<{ success: boolean; newKey?: Uint8Array; error?: string }> {
    const unlockResult = await this.verifyAndUnlockWithPin(oldPin);
    if (!unlockResult.success || !unlockResult.key) {
      return { success: false, error: unlockResult.error ?? 'Ancien code PIN incorrect' };
    }
    return this.changePinWithActiveKey(unlockResult.key, newPin);
  },

  /**
   * Modifie le code PIN lorsque la session est déjà active et déverrouillée (clé active en mémoire).
   * Re-chiffre toutes les notes existantes avec la nouvelle clé maîtresse et met à jour SecureStore.
   */
  async changePinWithActiveKey(
    activeKey: Uint8Array,
    newPin: string
  ): Promise<{ success: boolean; newKey?: Uint8Array; error?: string }> {
    try {
      // 1. Génération du nouveau sel et dérivation de la nouvelle clé
      const newSalt = await generateRandomBytes(SANCTUM_CRYPTO_CONSTANTS.SALT_LENGTH);
      const newMasterKey = await deriveSanctumKey(newPin, newSalt);

      const newVerifierPayload = await encryptSanctumNote(VERIFIER_SENTINEL, newMasterKey);

      // 2. Re-chiffrement dans une transaction. Les secrets sont écrits juste avant sa validation :
      //    si l'une des deux étapes échoue, les notes restent lisibles avec l'ancien PIN.
      await SanctumRepository.reencryptAllNotes(activeKey, newMasterKey, async () => {
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.SALT, bytesToHex(newSalt));
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.VERIFIER, newVerifierPayload);
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.KDF_N,
          String(SANCTUM_CRYPTO_CONSTANTS.SCRYPT_PARAMS.N)
        );
      });

      // 3. La clé biométrique correspond à l'ancienne clé : le choix sera reproposé
      await this.disableBiometricUnlock();
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_DECLINED).catch(() => {});
      await this.resetLockout();

      return { success: true, newKey: newMasterKey };
    } catch {
      return { success: false, error: 'Échec lors du changement de code PIN' };
    }
  },

  /**
   * Éléments à placer dans une sauvegarde, null si aucun PIN moderne n'est configuré.
   */
  async exportBackupKeys(): Promise<SanctumBackupKeys | null> {
    const salt = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SALT);
    const verifier = await SecureStore.getItemAsync(SECURE_STORE_KEYS.VERIFIER);
    if (!salt || !verifier) return null;
    const storedN = await SecureStore.getItemAsync(SECURE_STORE_KEYS.KDF_N);
    return {
      salt,
      verifier,
      kdfN: storedN ? Number(storedN) : SANCTUM_CRYPTO_CONSTANTS.LEGACY_SCRYPT_N,
    };
  },

  /**
   * Restaure les éléments d'une sauvegarde, pour que son code PIN ouvre ses notes.
   * Un PIN déjà configuré ici n'est jamais remplacé : cela rendrait illisibles les notes actuelles.
   */
  async restoreBackupKeys(keys: SanctumBackupKeys): Promise<SanctumKeysRestore> {
    if (await this.isPinConfigured()) {
      const currentSalt = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SALT);
      return currentSalt === keys.salt ? 'same' : 'conflict';
    }

    await SecureStore.setItemAsync(SECURE_STORE_KEYS.SALT, keys.salt);
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.VERIFIER, keys.verifier);
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.KDF_N, String(keys.kdfN));
    await this.resetLockout();
    return 'restored';
  },

  /**
   * Efface l'ensemble des clés et secrets du Sanctuaire de SecureStore.
   * Appelable lors d'une réinitialisation complète des données (DEF-02).
   */
  async clearSanctumSecrets(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SALT);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.VERIFIER);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.KDF_N);
    await this.disableBiometricUnlock();
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_DECLINED);
    await purgeLegacyBiometricKey();
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.LOCKOUT);
  },
};


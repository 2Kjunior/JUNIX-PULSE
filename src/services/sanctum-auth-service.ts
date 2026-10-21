/**
 * Service de gestion d'authentification et de clés pour le coffre-fort Sanctuaire.
 *
 * Spécification (DEF-01 / I-02, P1) :
 * - Stockage des secrets (sel scrypt, vérificateur de PIN, clé biométrique)
 *   dans le trousseau sécurisé matériel (Keychain iOS / Android Keystore) via `expo-secure-store`.
 * - Élimination définitive du faux enregistrement '__pin_hash__' dans la table SQLite `sanctum_notes`.
 * - Migration transparente des anciens PIN configurés sous l'ancien schéma SHA-256 à sel fixe.
 * - Support biométrique sécurisé : conservation protégée de la clé dérivée pour éviter de retaper le PIN.
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

const SECURE_STORE_KEYS = {
  SALT: 'jp_sanctum_salt_v1',
  VERIFIER: 'jp_sanctum_verifier_v1',
  BIOMETRIC_KEY: 'jp_sanctum_biometric_key_v1',
} as const;

const VERIFIER_SENTINEL = '__SANCTUM_PIN_VERIFIER_TOKEN__';

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
   * 5. Active l'accès biométrique en conservant la clé dérivée dans SecureStore.
   * 6. Purge l'ancien '__pin_hash__' SQLite s'il existait.
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
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.BIOMETRIC_KEY, bytesToHex(masterKey));

    // Supprimer l'ancienne trace SQLite s'il y en avait une
    await purgeLegacyPinHash();

    return masterKey;
  },

  /**
   * Vérifie le code PIN saisi et déverrouille la clé de chiffrement du Sanctuaire.
   * Gère automatiquement la migration transparente si l'utilisateur utilisait l'ancien système.
   */
  async verifyAndUnlockWithPin(
    pin: string
  ): Promise<{ success: boolean; key?: Uint8Array; error?: string }> {
    const storedSaltHex = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SALT);
    const storedVerifier = await SecureStore.getItemAsync(SECURE_STORE_KEYS.VERIFIER);

    // Cas standard : système sécurisé moderne (SecureStore)
    if (storedSaltHex && storedVerifier) {
      try {
        const salt = hexToBytes(storedSaltHex);
        const derivedKey = await deriveSanctumKey(pin, salt);

        // Validation en déchiffrant la sentinelle
        const decryptedSentinel = await decryptSanctumNote(storedVerifier, derivedKey);
        if (decryptedSentinel === VERIFIER_SENTINEL) {
          // Mettre à jour la clé biométrique pour les accès ultérieurs
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.BIOMETRIC_KEY,
            bytesToHex(derivedKey)
          );
          return { success: true, key: derivedKey };
        }
        return { success: false, error: 'Code PIN incorrect' };
      } catch {
        return { success: false, error: 'Code PIN incorrect' };
      }
    }

    // Cas de migration : vérifier si un ancien PIN SHA-256 existait dans SQLite
    const legacyHash = await getLegacyPinHash();
    if (legacyHash) {
      const candidateHash = hashLegacyPin(pin);

      if (candidateHash === legacyHash) {
        // Le PIN est valide ! Migration transparente immédiate vers scrypt + SecureStore
        const newKey = await this.setupPin(pin.trim());
        return { success: true, key: newKey };
      }
      return { success: false, error: 'Code PIN incorrect' };
    }

    return { success: false, error: 'Aucun code PIN configuré pour le Sanctuaire' };
  },

  /**
   * Tente de récupérer la clé de chiffrement pour un déverrouillage biométrique réussi.
   * Retourne null si aucune clé n'est en mémoire protégée (ex: après réinitialisation).
   */
  async getStoredBiometricKey(): Promise<Uint8Array | null> {
    const keyHex = await SecureStore.getItemAsync(SECURE_STORE_KEYS.BIOMETRIC_KEY);
    if (!keyHex) return null;
    try {
      const key = hexToBytes(keyHex);
      if (key.length === SANCTUM_CRYPTO_CONSTANTS.KEY_LENGTH) {
        return key;
      }
      return null;
    } catch {
      return null;
    }
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

      // 2. Re-chiffrement transparent de toutes les notes avec la nouvelle clé
      await SanctumRepository.reencryptAllNotes(activeKey, newMasterKey);

      // 3. Mise à jour du vérificateur
      const newVerifierPayload = await encryptSanctumNote(VERIFIER_SENTINEL, newMasterKey);

      // 4. Stockage dans SecureStore
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.SALT, bytesToHex(newSalt));
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.VERIFIER, newVerifierPayload);
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.BIOMETRIC_KEY, bytesToHex(newMasterKey));

      return { success: true, newKey: newMasterKey };
    } catch {
      return { success: false, error: 'Échec lors du changement de code PIN' };
    }
  },

  /**
   * Efface l'ensemble des clés et secrets du Sanctuaire de SecureStore.
   * Appelable lors d'une réinitialisation complète des données (DEF-02).
   */
  async clearSanctumSecrets(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SALT);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.VERIFIER);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_KEY);
  },
};


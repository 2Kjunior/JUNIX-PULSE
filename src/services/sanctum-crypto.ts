/**
 * Service cryptographique pour le coffre-fort Sanctuaire (Sanctum).
 *
 * Spécification (DEF-01 / I-02, P1) :
 * - Chiffrement symétrique authentifié XChaCha20-Poly1305 (@noble/ciphers).
 * - Nonce aléatoire de 24 octets (192 bits) par note chiffrée.
 * - Dérivation de clé par scrypt (@noble/hashes) avec N=16384, r=8, p=1 (16 Mo, adapté mobile).
 * - Format de stockage versionné : `xcha:v1:<nonce_hex>:<ciphertext_hex>`.
 * - Tolérance rétrocompatible : détection transparente des notes non chiffrées (legacy).
 *
 * Règle R-12 : pas de cryptographie maison, algorithmes standard audités.
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import * as Crypto from 'expo-crypto';

export const SANCTUM_CRYPTO_CONSTANTS = {
  FORMAT_PREFIX: 'xcha:v1:',
  SCRYPT_PARAMS: { N: 16384, r: 8, p: 1, dkLen: 32 } as const,
  KEY_LENGTH: 32,
  NONCE_LENGTH: 24,
  SALT_LENGTH: 16,
} as const;

/**
 * Convertit un Uint8Array en chaîne hexadécimale en minuscules.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convertit une chaîne hexadécimale en Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Longueur hexadécimale invalide (doit être paire).');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`Caractère hexadécimal invalide à la position ${i * 2}`);
    }
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Génère un tampon d'octets aléatoires cryptographiquement sûrs.
 * Compatible Expo natif (React Native 0.86+ intègre Web Crypto), Node.js et Web.
 */
export async function generateRandomBytes(length: number): Promise<Uint8Array> {
  // 1. Standard Web Crypto API (support natif dans React Native 0.86+, Node.js, et navigateurs)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const array = new Uint8Array(length);
    globalThis.crypto.getRandomValues(array);
    return array;
  }

  // 2. expo-crypto natif si disponible
  if (typeof Crypto.getRandomBytesAsync === 'function') {
    try {
      const bytes = await Crypto.getRandomBytesAsync(length);
      if (bytes && bytes.length === length) {
        return bytes;
      }
    } catch {
      // repli défensif si l'environnement d'exécution n'a pas initialisé le module natif
    }
  }

  // 3. Fallback expo-crypto synchrone (Crypto.getRandomValues)
  if (typeof Crypto.getRandomValues === 'function') {
    const array = new Uint8Array(length);
    Crypto.getRandomValues(array);
    return array;
  }

  throw new Error('Aucun générateur cryptographique aléatoire sécurisé disponible.');
}

/**
 * Dérive une clé cryptographique symétrique de 32 octets (256 bits)
 * à partir du code PIN utilisateur et d'un sel aléatoire de 16 octets.
 */
export async function deriveSanctumKey(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const trimmedPin = pin.trim();
  if (trimmedPin.length < 4 || trimmedPin.length > 8 || !/^\d+$/.test(trimmedPin)) {
    throw new Error('Le code PIN doit comporter entre 4 et 8 chiffres numériques.');
  }

  if (salt.length !== SANCTUM_CRYPTO_CONSTANTS.SALT_LENGTH) {
    throw new Error(
      `Le sel cryptographique doit contenir exactement ${SANCTUM_CRYPTO_CONSTANTS.SALT_LENGTH} octets.`
    );
  }

  const pinBytes = new TextEncoder().encode(trimmedPin);
  return scryptAsync(pinBytes, salt, SANCTUM_CRYPTO_CONSTANTS.SCRYPT_PARAMS);
}

/**
 * Détermine si le contenu d'une note est déjà chiffré selon notre format versionné.
 */
export function isSanctumNoteEncrypted(content: string): boolean {
  return typeof content === 'string' && content.startsWith(SANCTUM_CRYPTO_CONSTANTS.FORMAT_PREFIX);
}

/**
 * Chiffre le contenu d'une note secrète avec XChaCha20-Poly1305.
 *
 * @param content Texte en clair de la note.
 * @param key Clé symétrique de 32 octets issue de `deriveSanctumKey`.
 * @param customNonce Optionnel (pour tests unitaires déterministes).
 * @returns Chaîne formatée `xcha:v1:<nonce_hex>:<ciphertext_hex>`.
 */
export async function encryptSanctumNote(
  content: string,
  key: Uint8Array,
  customNonce?: Uint8Array
): Promise<string> {
  if (key.length !== SANCTUM_CRYPTO_CONSTANTS.KEY_LENGTH) {
    throw new Error(
      `Clé invalide : attendu ${SANCTUM_CRYPTO_CONSTANTS.KEY_LENGTH} octets, reçu ${key.length}.`
    );
  }

  const nonce = customNonce ?? (await generateRandomBytes(SANCTUM_CRYPTO_CONSTANTS.NONCE_LENGTH));
  if (nonce.length !== SANCTUM_CRYPTO_CONSTANTS.NONCE_LENGTH) {
    throw new Error(
      `Nonce invalide : attendu ${SANCTUM_CRYPTO_CONSTANTS.NONCE_LENGTH} octets, reçu ${nonce.length}.`
    );
  }

  const plaintextBytes = new TextEncoder().encode(content);
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertextWithTag = cipher.encrypt(plaintextBytes);

  return `${SANCTUM_CRYPTO_CONSTANTS.FORMAT_PREFIX}${bytesToHex(nonce)}:${bytesToHex(ciphertextWithTag)}`;
}

/**
 * Déchiffre une note secrète protégée par XChaCha20-Poly1305.
 *
 * Si la note n'est pas chiffrée (note legacy existante), renvoie le contenu tel quel.
 *
 * @throws Error si la clé est incorrecte (Poly1305 tag mismatch) ou si la note a été altérée.
 */
export async function decryptSanctumNote(payload: string, key: Uint8Array): Promise<string> {
  // Rétrocompatibilité : si la note n'a pas le préfixe chiffré, c'est du texte en clair
  if (!isSanctumNoteEncrypted(payload)) {
    return payload;
  }

  if (key.length !== SANCTUM_CRYPTO_CONSTANTS.KEY_LENGTH) {
    throw new Error(
      `Clé invalide : attendu ${SANCTUM_CRYPTO_CONSTANTS.KEY_LENGTH} octets, reçu ${key.length}.`
    );
  }

  const withoutPrefix = payload.slice(SANCTUM_CRYPTO_CONSTANTS.FORMAT_PREFIX.length);
  const parts = withoutPrefix.split(':');
  if (parts.length !== 2) {
    throw new Error('Format de note chiffrée corrompu ou incomplet.');
  }

  const [nonceHex, ciphertextHex] = parts;
  const nonce = hexToBytes(nonceHex);
  const ciphertext = hexToBytes(ciphertextHex);

  if (nonce.length !== SANCTUM_CRYPTO_CONSTANTS.NONCE_LENGTH) {
    throw new Error('Nonce invalide dans le payload chiffré.');
  }

  try {
    const cipher = xchacha20poly1305(key, nonce);
    const plaintextBytes = cipher.decrypt(ciphertext);
    return new TextDecoder().decode(plaintextBytes);
  } catch {
    throw new Error('Déchiffrement impossible : clé de déverrouillage invalide ou contenu altéré.');
  }
}

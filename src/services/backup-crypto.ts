import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { deriveScryptKey } from './kdf';
import { z } from 'zod';
import { t } from '../i18n';

const EncryptedBackupSchema = z.object({
  format: z.literal('junix-pulse-encrypted-backup'),
  version: z.literal(1),
  cipher: z.literal('xchacha20-poly1305'),
  kdf: z.literal('scrypt'),
  scrypt: z.object({
    n: z.union([z.literal(32768), z.literal(65536)]),
    r: z.literal(8),
    p: z.literal(1),
  }).strict(),
  salt: z.string().regex(/^[0-9a-f]{32}$/),
  nonce: z.string().regex(/^[0-9a-f]{48}$/),
  ciphertext: z.string().regex(/^(?:[0-9a-f]{2}){16,}$/),
}).strict();

// Paramètres par défaut pour le chiffrement mobile :
// N=32768 (32 Mo de RAM max au lieu de 64 Mo, prévient les OOM sur Android tout en assurant une haute résistance cryptographique).
const DEFAULT_SCRYPT_PARAMETERS = { N: 32768, r: 8, p: 1, dkLen: 32 } as const;

const HEX = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'));

// A table and plain loops: a backup holds megabytes, and per-byte formatting was slow on the phone
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let index = 0; index < bytes.length; index += 1) hex += HEX[bytes[index]];
  return hex;
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = (hexDigit(value.charCodeAt(index * 2)) << 4) | hexDigit(value.charCodeAt(index * 2 + 1));
  }
  return bytes;
}

/** The file is protected by scrypt N=32768: ten characters stay costly to guess. */
export const BACKUP_PASSPHRASE_MIN_LENGTH = 10;
export const BACKUP_PASSPHRASE_MAX_LENGTH = 256;

function hexDigit(code: number): number {
  // 0-9, then a-f: the format only uses lowercase hexadecimal
  return code <= 57 ? code - 48 : code - 87;
}

function validatePassphrase(passphrase: string): void {
  if (passphrase.length < BACKUP_PASSPHRASE_MIN_LENGTH || passphrase.length > BACKUP_PASSPHRASE_MAX_LENGTH) {
    throw new Error(t('backup.passphraseLength'));
  }
}

export async function encryptBackupContents(
  contents: string,
  passphrase: string,
  salt: Uint8Array,
  nonce: Uint8Array
): Promise<string> {
  validatePassphrase(passphrase);
  if (salt.length !== 16 || nonce.length !== 24) {
    throw new Error(t('backup.badCrypto'));
  }

  const key = await deriveScryptKey(new TextEncoder().encode(passphrase), salt, DEFAULT_SCRYPT_PARAMETERS);
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(new TextEncoder().encode(contents));

  return JSON.stringify({
    format: 'junix-pulse-encrypted-backup',
    version: 1,
    cipher: 'xchacha20-poly1305',
    kdf: 'scrypt',
    scrypt: { n: DEFAULT_SCRYPT_PARAMETERS.N, r: 8, p: 1 },
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  });
}

export async function decryptBackupContents(contents: string, passphrase: string): Promise<string> {
  validatePassphrase(passphrase);

  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error(t('backup.notEncrypted'));
  }

  const parsed = EncryptedBackupSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(t('backup.encryptedIncompatible'));
  }

  try {
    const key = await deriveScryptKey(
      new TextEncoder().encode(passphrase),
      hexToBytes(parsed.data.salt),
      { N: parsed.data.scrypt.n, r: parsed.data.scrypt.r, p: parsed.data.scrypt.p, dkLen: 32 }
    );
    const plaintext = xchacha20poly1305(
      key,
      hexToBytes(parsed.data.nonce)
    ).decrypt(hexToBytes(parsed.data.ciphertext));
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error(t('backup.wrongPassword'));
  }
}
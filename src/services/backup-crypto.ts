import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { z } from 'zod';

const EncryptedBackupSchema = z.object({
  format: z.literal('junix-pulse-encrypted-backup'),
  version: z.literal(1),
  cipher: z.literal('xchacha20-poly1305'),
  kdf: z.literal('scrypt'),
  scrypt: z.object({ n: z.literal(65536), r: z.literal(8), p: z.literal(1) }).strict(),
  salt: z.string().regex(/^[0-9a-f]{32}$/),
  nonce: z.string().regex(/^[0-9a-f]{48}$/),
  ciphertext: z.string().regex(/^(?:[0-9a-f]{2}){16,}$/),
}).strict();

const SCRYPT_PARAMETERS = { N: 65536, r: 8, p: 1, dkLen: 32 } as const;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function validatePassphrase(passphrase: string): void {
  if (passphrase.length < 16 || passphrase.length > 256) {
    throw new Error('Le mot de passe doit contenir entre 16 et 256 caractères.');
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
    throw new Error('Paramètres cryptographiques invalides.');
  }

  const key = await scryptAsync(new TextEncoder().encode(passphrase), salt, SCRYPT_PARAMETERS);
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(new TextEncoder().encode(contents));

  return JSON.stringify({
    format: 'junix-pulse-encrypted-backup',
    version: 1,
    cipher: 'xchacha20-poly1305',
    kdf: 'scrypt',
    scrypt: { n: 65536, r: 8, p: 1 },
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  }, null, 2);
}

export async function decryptBackupContents(contents: string, passphrase: string): Promise<string> {
  validatePassphrase(passphrase);

  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error('Le fichier sélectionné n’est pas une sauvegarde chiffrée valide.');
  }

  const parsed = EncryptedBackupSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Le fichier sélectionné n’est pas une sauvegarde Junix Pulse chiffrée compatible.');
  }

  try {
    const key = await scryptAsync(
      new TextEncoder().encode(passphrase),
      hexToBytes(parsed.data.salt),
      SCRYPT_PARAMETERS
    );
    const plaintext = xchacha20poly1305(
      key,
      hexToBytes(parsed.data.nonce)
    ).decrypt(hexToBytes(parsed.data.ciphertext));
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('Mot de passe incorrect ou fichier de sauvegarde altéré.');
  }
}
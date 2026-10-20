/**
 * Tests unitaires pour les fonctions cryptographiques de sauvegarde (Lot 13 — Performance & Sécurité).
 *
 * Couverture :
 * - Chiffrement et déchiffrement bout-en-bout avec N=32768 (coût scrypt allégé mobile)
 * - Compatibilité descendante : déchiffrement d'une sauvegarde existante avec N=65536
 * - Validation de la longueur de la phrase secrète (<16 caractères ou >256 caractères)
 * - Rejet d'un mot de passe incorrect
 * - Rejet d'une sauvegarde au format altéré ou JSON corrompu
 */

import { encryptBackupContents, decryptBackupContents } from '../services/backup-crypto';

describe('Lot 13 — Cryptographie des sauvegardes (backup-crypto)', () => {
  const validPassphrase = 'un-mot-de-passe-tres-securise-de-plus-de-16-caracteres';
  const testPayload = JSON.stringify({
    tasks: [{ id: 'task-1', title: 'Test tâche' }],
    reminders: [{ id: 'rem-1', title: 'Test rappel' }],
    exportedAt: '2026-10-20T00:00:00.000Z',
  });

  const validSalt = new Uint8Array(16).fill(42);
  const validNonce = new Uint8Array(24).fill(7);

  describe('encryptBackupContents & decryptBackupContents (N=32768)', () => {
    it('chiffre les données avec N=32768 et les déchiffre fidèlement', async () => {
      const encryptedJson = await encryptBackupContents(
        testPayload,
        validPassphrase,
        validSalt,
        validNonce
      );

      const parsed = JSON.parse(encryptedJson);
      expect(parsed.format).toBe('junix-pulse-encrypted-backup');
      expect(parsed.version).toBe(1);
      expect(parsed.cipher).toBe('xchacha20-poly1305');
      expect(parsed.kdf).toBe('scrypt');
      expect(parsed.scrypt).toEqual({ n: 32768, r: 8, p: 1 });
      expect(parsed.ciphertext).toBeDefined();

      const decrypted = await decryptBackupContents(encryptedJson, validPassphrase);
      expect(decrypted).toBe(testPayload);
    });

    it('rejette une phrase secrète trop courte (< 16 caractères)', async () => {
      await expect(
        encryptBackupContents(testPayload, 'court', validSalt, validNonce)
      ).rejects.toThrow('Le mot de passe doit contenir entre 16 et 256 caractères.');

      await expect(
        decryptBackupContents('{}', 'court')
      ).rejects.toThrow('Le mot de passe doit contenir entre 16 et 256 caractères.');
    });

    it('rejette un mot de passe erroné lors du déchiffrement', async () => {
      const encryptedJson = await encryptBackupContents(
        testPayload,
        validPassphrase,
        validSalt,
        validNonce
      );

      const wrongPassphrase = 'autre-mot-de-passe-incorrect-mais-assez-long';
      await expect(
        decryptBackupContents(encryptedJson, wrongPassphrase)
      ).rejects.toThrow('Mot de passe incorrect ou fichier de sauvegarde altéré.');
    });

    it('rejette un JSON non chiffré ou corrompu', async () => {
      await expect(
        decryptBackupContents('invalid-json{{{', validPassphrase)
      ).rejects.toThrow('Le fichier sélectionné n’est pas une sauvegarde chiffrée valide.');

      await expect(
        decryptBackupContents(JSON.stringify({ not: 'a valid backup' }), validPassphrase)
      ).rejects.toThrow('Le fichier sélectionné n’est pas une sauvegarde Junix Pulse chiffrée compatible.');
    });
  });

  describe('Compatibilité descendante (N=65536)', () => {
    it('déchiffre avec succès une sauvegarde produite avec les anciens paramètres N=65536', async () => {
      // Simuler une sauvegarde au format N=65536
      const { xchacha20poly1305 } = require('@noble/ciphers/chacha.js');
      const { scryptAsync } = require('@noble/hashes/scrypt.js');

      const oldParams = { N: 65536, r: 8, p: 1, dkLen: 32 };
      const key = await scryptAsync(
        new TextEncoder().encode(validPassphrase),
        validSalt,
        oldParams
      );
      const ciphertext = xchacha20poly1305(key, validNonce).encrypt(
        new TextEncoder().encode(testPayload)
      );

      const bytesToHex = (b: Uint8Array) =>
        Array.from(b, byte => byte.toString(16).padStart(2, '0')).join('');

      const legacyBackupJson = JSON.stringify({
        format: 'junix-pulse-encrypted-backup',
        version: 1,
        cipher: 'xchacha20-poly1305',
        kdf: 'scrypt',
        scrypt: { n: 65536, r: 8, p: 1 },
        salt: bytesToHex(validSalt),
        nonce: bytesToHex(validNonce),
        ciphertext: bytesToHex(ciphertext),
      });

      const decrypted = await decryptBackupContents(legacyBackupJson, validPassphrase);
      expect(decrypted).toBe(testPayload);
    });
  });
});

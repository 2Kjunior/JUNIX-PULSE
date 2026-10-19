/**
 * Tests unitaires pour le service cryptographique du Sanctuaire (sanctum-crypto.ts).
 *
 * Couverture (DEF-01 / I-02, P1) :
 * - Dérivation de clé scrypt (sécurité PIN, validation, déterministe, résistance).
 * - Chiffrement et déchiffrement XChaCha20-Poly1305.
 * - Authentification Poly1305 (échec sur mauvaise clé ou altération du ciphertext).
 * - Rétrocompatibilité : détection et retour intact des notes non chiffrées (legacy).
 * - Unicité des nonces (deux chiffrements du même contenu génèrent des résultats différents).
 */

import {
  deriveSanctumKey,
  encryptSanctumNote,
  decryptSanctumNote,
  isSanctumNoteEncrypted,
  generateRandomBytes,
  bytesToHex,
  hexToBytes,
  SANCTUM_CRYPTO_CONSTANTS,
} from '../services/sanctum-crypto';

describe('SanctumCrypto — Primitives hexadécimales & aléatoires', () => {
  it('convertit fidèlement des octets en hexadécimal et inversement', () => {
    const bytes = new Uint8Array([0x00, 0x0f, 0x10, 0xff, 0x42]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe('000f10ff42');
    expect(hexToBytes(hex)).toEqual(bytes);
  });

  it('rejette une chaîne hexadécimale de longueur impaire', () => {
    expect(() => hexToBytes('123')).toThrow('Longueur hexadécimale invalide');
  });

  it('rejette des caractères non hexadécimaux', () => {
    expect(() => hexToBytes('zz')).toThrow('Caractère hexadécimal invalide');
  });

  it('génère des octets aléatoires de la taille requise', async () => {
    const bytes16 = await generateRandomBytes(16);
    expect(bytes16.length).toBe(16);

    const bytes24 = await generateRandomBytes(24);
    expect(bytes24.length).toBe(24);
    expect(bytes24).toBeInstanceOf(Uint8Array);
  });
});

describe('SanctumCrypto — Dérivation de clé (scrypt)', () => {
  const validSalt = new Uint8Array(16).fill(0xaa);

  it('rejette un PIN de moins de 4 chiffres', async () => {
    await expect(deriveSanctumKey('123', validSalt)).rejects.toThrow(
      'Le code PIN doit comporter entre 4 et 8 chiffres numériques.'
    );
  });

  it('rejette un PIN de plus de 8 chiffres', async () => {
    await expect(deriveSanctumKey('123456789', validSalt)).rejects.toThrow(
      'Le code PIN doit comporter entre 4 et 8 chiffres numériques.'
    );
  });

  it('rejette un PIN contenant des lettres ou caractères spéciaux', async () => {
    await expect(deriveSanctumKey('12ab', validSalt)).rejects.toThrow(
      'Le code PIN doit comporter entre 4 et 8 chiffres numériques.'
    );
  });

  it('rejette un sel de taille invalide', async () => {
    const invalidSalt = new Uint8Array(10);
    await expect(deriveSanctumKey('1234', invalidSalt)).rejects.toThrow(
      `Le sel cryptographique doit contenir exactement ${SANCTUM_CRYPTO_CONSTANTS.SALT_LENGTH} octets.`
    );
  });

  it('dérive une clé de 32 octets de manière déterministe pour un PIN et un sel identiques', async () => {
    const key1 = await deriveSanctumKey('1234', validSalt);
    const key2 = await deriveSanctumKey('1234', validSalt);

    expect(key1.length).toBe(32);
    expect(key2.length).toBe(32);
    expect(bytesToHex(key1)).toBe(bytesToHex(key2));
  });

  it('produit deux clés différentes pour deux PINs différents avec le même sel', async () => {
    const keyA = await deriveSanctumKey('1234', validSalt);
    const keyB = await deriveSanctumKey('1235', validSalt);

    expect(bytesToHex(keyA)).not.toBe(bytesToHex(keyB));
  });

  it('produit deux clés différentes pour le même PIN avec deux sels différents', async () => {
    const otherSalt = new Uint8Array(16).fill(0xbb);
    const keyA = await deriveSanctumKey('1234', validSalt);
    const keyB = await deriveSanctumKey('1234', otherSalt);

    expect(bytesToHex(keyA)).not.toBe(bytesToHex(keyB));
  });
});

describe('SanctumCrypto — Chiffrement et déchiffrement XChaCha20-Poly1305', () => {
  let validKey: Uint8Array;
  const mockSalt = new Uint8Array(16).fill(0x42);

  beforeAll(async () => {
    validKey = await deriveSanctumKey('123456', mockSalt);
  });

  it('chiffre et déchiffre fidèlement du texte simple et Unicode complexe', async () => {
    const plaintext = 'Mon carnet secret : mot de passe = ⚡S3cr3t! & accents : été, cœur, 100€';
    const encrypted = await encryptSanctumNote(plaintext, validKey);

    expect(isSanctumNoteEncrypted(encrypted)).toBe(true);
    expect(encrypted.startsWith('xcha:v1:')).toBe(true);

    const decrypted = await decryptSanctumNote(encrypted, validKey);
    expect(decrypted).toBe(plaintext);
  });

  it('gère correctement une chaîne vide', async () => {
    const encrypted = await encryptSanctumNote('', validKey);
    const decrypted = await decryptSanctumNote(encrypted, validKey);
    expect(decrypted).toBe('');
  });

  it('génère des ciphertexts différents pour le même texte (nonces aléatoires uniques)', async () => {
    const text = 'Donnée confidentielle';
    const enc1 = await encryptSanctumNote(text, validKey);
    const enc2 = await encryptSanctumNote(text, validKey);

    expect(enc1).not.toBe(enc2);
    // Mais les deux se déchiffrent identiquement
    expect(await decryptSanctumNote(enc1, validKey)).toBe(text);
    expect(await decryptSanctumNote(enc2, validKey)).toBe(text);
  });

  it('supporte un nonce personnalisé pour reproductibilité', async () => {
    const customNonce = new Uint8Array(24).fill(0x07);
    const text = 'Contenu fixe';
    const enc1 = await encryptSanctumNote(text, validKey, customNonce);
    const enc2 = await encryptSanctumNote(text, validKey, customNonce);

    expect(enc1).toBe(enc2);
  });

  it('échoue au déchiffrement avec une mauvaise clé (Poly1305 MAC tag failure)', async () => {
    const wrongKey = await deriveSanctumKey('999999', mockSalt);
    const plaintext = 'Ce message ne doit pas être lu avec une mauvaise clé';
    const encrypted = await encryptSanctumNote(plaintext, validKey);

    await expect(decryptSanctumNote(encrypted, wrongKey)).rejects.toThrow(
      'Déchiffrement impossible : clé de déverrouillage invalide ou contenu altéré.'
    );
  });

  it('échoue si le ciphertext a été altéré (intégrité Poly1305)', async () => {
    const plaintext = 'Intégrité garantie par Poly1305';
    const encrypted = await encryptSanctumNote(plaintext, validKey);

    // Altérer le dernier caractère hexadécimal
    const lastChar = encrypted[encrypted.length - 1];
    const tamperedChar = lastChar === 'a' ? 'b' : 'a';
    const tampered = encrypted.slice(0, -1) + tamperedChar;

    await expect(decryptSanctumNote(tampered, validKey)).rejects.toThrow(
      'Déchiffrement impossible : clé de déverrouillage invalide ou contenu altéré.'
    );
  });

  it('rétrocompatibilité : renvoie le texte brut si la note n’est pas chiffrée (legacy)', async () => {
    const legacyPlaintext = 'Note rédigée avant la mise en place du chiffrement XChaCha20.';
    expect(isSanctumNoteEncrypted(legacyPlaintext)).toBe(false);

    // decryptSanctumNote doit retourner directement le texte brut sans lever d’erreur
    const result = await decryptSanctumNote(legacyPlaintext, validKey);
    expect(result).toBe(legacyPlaintext);
  });

  it('rejette une clé de taille incorrecte', async () => {
    const invalidKey = new Uint8Array(16); // 16 octets au lieu de 32
    await expect(encryptSanctumNote('test', invalidKey)).rejects.toThrow(
      'Clé invalide : attendu 32 octets, reçu 16.'
    );
    await expect(decryptSanctumNote('xcha:v1:00:00', invalidKey)).rejects.toThrow(
      'Clé invalide : attendu 32 octets, reçu 16.'
    );
  });
});

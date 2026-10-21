/**
 * Tests unitaires pour le service d'authentification du Sanctuaire (sanctum-auth-service.ts).
 *
 * Couverture (DEF-01 / I-02, P1) :
 * - Configuration du PIN dans SecureStore.
 * - Déverrouillage sécurisé par PIN avec token de vérification sentinelle.
 * - Rejet des mauvais PINs.
 * - Récupération de la clé biométrique stockée.
 * - Nettoyage complet des secrets.
 * - Migration transparente depuis un ancien hash SQLite SHA-256.
 */

import * as SecureStore from 'expo-secure-store';
import { SanctumAuthService, hashLegacyPin } from '../services/sanctum-auth-service';
import { getDatabase } from '../database/sqlite';

// Mock sqlite
jest.mock('../database/sqlite', () => {
  const mockRows = new Map<string, any>();
  return {
    getDatabase: jest.fn(async () => ({
      getFirstAsync: jest.fn(async (query: string) => {
        if (query.includes("id = '__pin_hash__'")) {
          return mockRows.get('__pin_hash__') ?? null;
        }
        return null;
      }),
      getAllAsync: jest.fn(async () => []),
      runAsync: jest.fn(async (query: string, ...params: any[]) => {
        if (query.includes("DELETE FROM sanctum_notes WHERE id = '__pin_hash__'")) {
          mockRows.delete('__pin_hash__');
        } else if (query.includes("INSERT INTO sanctum_notes")) {
          mockRows.set('__pin_hash__', { content: params[0] });
        }
      }),
      __setMockRow: (id: string, row: any) => mockRows.set(id, row),
      __clearMockRows: () => mockRows.clear(),
    })),
  };
});

describe('SanctumAuthService — Gestion moderne via SecureStore', () => {
  beforeEach(async () => {
     
    (SecureStore as any).__resetMockStorage?.();
    const db = await getDatabase();
    (db as any).__clearMockRows?.();
  });

  it('indique que le PIN n’est pas configuré initialement', async () => {
    const configured = await SanctumAuthService.isPinConfigured();
    expect(configured).toBe(false);
  });

  it('configure un nouveau PIN et renvoie la clé de 32 octets', async () => {
    const key = await SanctumAuthService.setupPin('1234');
    expect(key.length).toBe(32);

    const configured = await SanctumAuthService.isPinConfigured();
    expect(configured).toBe(true);

    const bioKey = await SanctumAuthService.getStoredBiometricKey();
    expect(bioKey).toEqual(key);
  });

  it('déverrouille avec le bon PIN et renvoie la même clé', async () => {
    const originalKey = await SanctumAuthService.setupPin('4321');
    const result = await SanctumAuthService.verifyAndUnlockWithPin('4321');

    expect(result.success).toBe(true);
    expect(result.key).toEqual(originalKey);
  });

  it('rejette un mauvais PIN avec un message clair', async () => {
    await SanctumAuthService.setupPin('1234');
    const result = await SanctumAuthService.verifyAndUnlockWithPin('9999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Code PIN incorrect');
    expect(result.key).toBeUndefined();
  });

  it('efface tous les secrets stockés', async () => {
    await SanctumAuthService.setupPin('1234');
    await SanctumAuthService.clearSanctumSecrets();

    const configured = await SanctumAuthService.isPinConfigured();
    expect(configured).toBe(false);

    const bioKey = await SanctumAuthService.getStoredBiometricKey();
    expect(bioKey).toBeNull();
  });

  it('modifie le code PIN avec succès et permet de déverrouiller avec le nouveau PIN', async () => {
    const initialKey = await SanctumAuthService.setupPin('1234');
    expect(initialKey.length).toBe(32);

    const changeResult = await SanctumAuthService.changePin('1234', '5678');
    expect(changeResult.success).toBe(true);
    expect(changeResult.newKey?.length).toBe(32);

    // L'ancien PIN ne doit plus fonctionner
    const oldUnlock = await SanctumAuthService.verifyAndUnlockWithPin('1234');
    expect(oldUnlock.success).toBe(false);

    // Le nouveau PIN doit déverrouiller avec la nouvelle clé
    const newUnlock = await SanctumAuthService.verifyAndUnlockWithPin('5678');
    expect(newUnlock.success).toBe(true);
    expect(newUnlock.key).toEqual(changeResult.newKey);

    // La clé biométrique doit être mise à jour avec la nouvelle clé
    const bioKey = await SanctumAuthService.getStoredBiometricKey();
    expect(bioKey).toEqual(changeResult.newKey);
  });

  it('échoue lors du changement de PIN si l’ancien code est incorrect', async () => {
    await SanctumAuthService.setupPin('1234');
    const changeResult = await SanctumAuthService.changePin('0000', '5678');
    expect(changeResult.success).toBe(false);
    expect(changeResult.error).toBe('Code PIN incorrect');
  });
});

describe('SanctumAuthService — Migration transparente legacy', () => {
  beforeEach(async () => {
     
    (SecureStore as any).__resetMockStorage?.();
    const db = await getDatabase();
    (db as any).__clearMockRows?.();
  });

  it('détecte et migre un ancien PIN SHA-256 stocké dans SQLite', async () => {
    const legacyPin = '5678';
    const legacyHash = hashLegacyPin(legacyPin);

    const db = await getDatabase();
    (db as any).__setMockRow('__pin_hash__', { content: legacyHash });

    // Le PIN est considéré configuré grâce au fallback legacy
    const isConfigured = await SanctumAuthService.isPinConfigured();
    expect(isConfigured).toBe(true);

    // Déverrouillage : doit valider l'ancien hash, migrer vers scrypt + SecureStore, et purger SQLite
    const unlockResult = await SanctumAuthService.verifyAndUnlockWithPin(legacyPin);
    expect(unlockResult.success).toBe(true);
    expect(unlockResult.key?.length).toBe(32);

    // Vérifier que la clé biométrique est maintenant initialisée dans SecureStore
    const bioKey = await SanctumAuthService.getStoredBiometricKey();
    expect(bioKey).toEqual(unlockResult.key);

    // Vérifier qu'un mauvais PIN échoue toujours
    const badUnlock = await SanctumAuthService.verifyAndUnlockWithPin('0000');
    expect(badUnlock.success).toBe(false);
  });
});

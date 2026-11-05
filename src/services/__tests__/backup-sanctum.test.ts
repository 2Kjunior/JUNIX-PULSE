import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createBackup,
  parseBackup,
  parseBackupSanctumKeys,
  restoreBackupSanctum,
} from '../backup-service';
import { SanctumAuthService } from '../sanctum-auth-service';
import { decryptSanctumNote, encryptSanctumNote } from '../sanctum-crypto';

jest.mock('../../database/sqlite', () => ({
  getDatabase: jest.fn(async () => ({
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async () => undefined),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => callback()),
  })),
}));

const PIN = '135790';
const resetPhone = () => (SecureStore as unknown as { __resetMockStorage: () => void }).__resetMockStorage();

function databaseWithNote(content: string): SQLiteDatabase {
  const note = { id: 'n1', title: 'Banque', content, folder: 'Coffre', created_at: 'x', updated_at: 'x' };
  return {
    getAllAsync: async (query: string) => (query.includes('sanctum_notes') ? [note] : []),
  } as unknown as SQLiteDatabase;
}

describe('Sanctuary in a backup', () => {
  beforeEach(resetPhone);

  it('opens the notes on a new phone with the same PIN', async () => {
    const key = await SanctumAuthService.setupPin(PIN);
    const secret = await encryptSanctumNote('Code du coffre', key);
    const backup = await createBackup(databaseWithNote(secret));

    resetPhone();
    const data = parseBackup(backup);
    const outcome = await restoreBackupSanctum(data, parseBackupSanctumKeys(backup));

    expect(outcome).toBe('restored');
    const unlock = await SanctumAuthService.verifyAndUnlockWithPin(PIN);
    expect(unlock.success).toBe(true);
    expect(await decryptSanctumNote(data.sanctum_notes[0].content as string, unlock.key!)).toBe('Code du coffre');
  });

  it('never puts the key or the PIN in the backup', async () => {
    const key = await SanctumAuthService.setupPin(PIN);
    const backup = await createBackup(databaseWithNote(await encryptSanctumNote('x', key)));

    const hexKey = Array.from(key, byte => byte.toString(16).padStart(2, '0')).join('');
    expect(backup).not.toContain(hexKey);
    expect(backup).not.toContain(PIN);
  });

  it('does not replace a PIN already set on this phone', async () => {
    const key = await SanctumAuthService.setupPin(PIN);
    const backup = await createBackup(databaseWithNote(await encryptSanctumNote('x', key)));

    resetPhone();
    await SanctumAuthService.setupPin('246801');
    const outcome = await restoreBackupSanctum(parseBackup(backup), parseBackupSanctumKeys(backup));

    expect(outcome).toBe('conflict');
    expect((await SanctumAuthService.verifyAndUnlockWithPin('246801')).success).toBe(true);
  });

  it('accepts a backup made with an earlier PIN cost', async () => {
    const key = await SanctumAuthService.setupPin(PIN);
    const backup = JSON.parse(await createBackup(databaseWithNote(await encryptSanctumNote('x', key))));
    backup.sanctumKeys.kdfN = 8192;

    expect(() => parseBackup(JSON.stringify(backup))).not.toThrow();
  });

  it('recognizes a backup of this same phone', async () => {
    const key = await SanctumAuthService.setupPin(PIN);
    const backup = await createBackup(databaseWithNote(await encryptSanctumNote('x', key)));

    expect(await restoreBackupSanctum(parseBackup(backup), parseBackupSanctumKeys(backup))).toBe('same');
  });

  it('says so when an older backup has no keys', async () => {
    const key = await SanctumAuthService.setupPin(PIN);
    const backup = await createBackup(databaseWithNote(await encryptSanctumNote('x', key)));
    const older = JSON.parse(backup);
    delete older.sanctumKeys;
    const contents = JSON.stringify(older);

    resetPhone();
    const outcome = await restoreBackupSanctum(parseBackup(contents), parseBackupSanctumKeys(contents));

    expect(outcome).toBe('missing');
    expect(await SanctumAuthService.isPinConfigured()).toBe(false);
  });

  it('sets no PIN when the backup has no encrypted note', async () => {
    await SanctumAuthService.setupPin(PIN);
    const backup = await createBackup(databaseWithNote('Note en clair'));

    resetPhone();
    const outcome = await restoreBackupSanctum(parseBackup(backup), parseBackupSanctumKeys(backup));

    expect(outcome).toBe('none');
    expect(await SanctumAuthService.isPinConfigured()).toBe(false);
  });

  it.each([
    ['an abusive scrypt cost', { kdfN: 1073741824 }],
    ['a malformed salt', { salt: 'zz' }],
    ['a malformed verifier', { verifier: 'plain text' }],
  ])('refuses a backup with %s', async (_label, tampered) => {
    const key = await SanctumAuthService.setupPin(PIN);
    const backup = JSON.parse(await createBackup(databaseWithNote(await encryptSanctumNote('x', key))));
    backup.sanctumKeys = { ...backup.sanctumKeys, ...tampered };

    expect(() => parseBackup(JSON.stringify(backup))).toThrow();
  });
});

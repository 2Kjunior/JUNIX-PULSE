/**
 * Opens the app database encrypted with SQLCipher, and moves an existing clear database into it.
 *
 * - The key is 32 random bytes kept in the secure store, passed as a raw key: no slow derivation
 *   at each opening.
 * - The encrypted database has its own file name. The clear one is only deleted once the encrypted
 *   copy holds the same rows; until then, any failure keeps using the clear one.
 * - Where SQLCipher is absent (web, Expo Go, an app built before this change), the database stays
 *   as it is: PRAGMA key would silently do nothing there.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { logger } from '../utils/logger';

export const CLEAR_DATABASE_NAME = 'junixpulse.db';
export const ENCRYPTED_DATABASE_NAME = 'junixpulse-secure.db';

const KEY_ITEM = 'jp_db_key_v1';
const ENCRYPTED_FLAG_ITEM = 'jp_db_encrypted_v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** The key as an SQL literal for PRAGMA key and ATTACH ... KEY: a raw 256-bit key, hex only. */
export function rawKeyLiteral(hexKey: string): string {
  if (!/^[0-9a-f]{64}$/.test(hexKey)) throw new Error('Invalid database key');
  // Single quotes: the value is x'…', which SQLCipher reads as a raw key
  return `'x''${hexKey}'''`;
}

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_ITEM, STORE_OPTIONS);
  if (existing) return existing;
  const key = Array.from(Crypto.getRandomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_ITEM, key, STORE_OPTIONS);
  return key;
}

async function openEncrypted(hexKey: string): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(ENCRYPTED_DATABASE_NAME);
  await db.execAsync(`PRAGMA key = ${rawKeyLiteral(hexKey)};`);
  // Fails at once with a wrong key, instead of at the first real query
  await db.getFirstAsync('SELECT count(*) AS count FROM sqlite_master');
  return db;
}

async function hasSqlCipher(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    return (await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version')) !== null;
  } catch {
    return false;
  }
}

async function rowCounts(db: SQLite.SQLiteDatabase, prefix = ''): Promise<Record<string, number>> {
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM ${prefix}sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
  );
  const counts: Record<string, number> = {};
  for (const { name } of tables) {
    const row = await db.getFirstAsync<{ count: number }>(`SELECT count(*) AS count FROM ${prefix}"${name}"`);
    counts[name] = row?.count ?? 0;
  }
  return counts;
}

function sameCounts(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
}

function siblingPath(databasePath: string, name: string): string {
  return databasePath.slice(0, databasePath.lastIndexOf('/') + 1) + name;
}

/**
 * Copies the clear database into the encrypted file. Returns the encrypted database, or null when
 * the copy failed or differs: the clear database is then still there and still used.
 */
async function migrate(clear: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase | null> {
  const hexKey = await getOrCreateKey();
  // A copy left by an interrupted attempt would make the export fail
  await SQLite.deleteDatabaseAsync(ENCRYPTED_DATABASE_NAME).catch(() => {});

  try {
    await clear.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
    const expected = await rowCounts(clear);
    const target = siblingPath(clear.databasePath, ENCRYPTED_DATABASE_NAME).replace(/'/g, "''");
    await clear.execAsync(`ATTACH DATABASE '${target}' AS encrypted KEY ${rawKeyLiteral(hexKey)};`);
    await clear.getFirstAsync("SELECT sqlcipher_export('encrypted')");
    const copied = await rowCounts(clear, 'encrypted.');
    await clear.execAsync('DETACH DATABASE encrypted;');

    if (!sameCounts(expected, copied)) {
      logger.error('[DatabaseEncryption] La copie chiffrée diffère, base en clair conservée');
      await SQLite.deleteDatabaseAsync(ENCRYPTED_DATABASE_NAME).catch(() => {});
      return null;
    }

    const encrypted = await openEncrypted(hexKey);
    await SecureStore.setItemAsync(ENCRYPTED_FLAG_ITEM, '1', STORE_OPTIONS);
    return encrypted;
  } catch (error) {
    logger.error('[DatabaseEncryption] Chiffrement impossible, base en clair conservée', error);
    await clear.execAsync('DETACH DATABASE encrypted;').catch(() => {});
    await SQLite.deleteDatabaseAsync(ENCRYPTED_DATABASE_NAME).catch(() => {});
    return null;
  }
}

export async function openAppDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') return SQLite.openDatabaseAsync(CLEAR_DATABASE_NAME);

  if ((await SecureStore.getItemAsync(ENCRYPTED_FLAG_ITEM, STORE_OPTIONS)) === '1') {
    const hexKey = await SecureStore.getItemAsync(KEY_ITEM, STORE_OPTIONS);
    if (!hexKey) throw new Error('Database key not found');
    const db = await openEncrypted(hexKey);
    // A clear copy left by an interruption between the switch and its removal
    await SQLite.deleteDatabaseAsync(CLEAR_DATABASE_NAME).catch(() => {});
    return db;
  }

  const clear = await SQLite.openDatabaseAsync(CLEAR_DATABASE_NAME);
  if (!(await hasSqlCipher(clear))) return clear;

  const encrypted = await migrate(clear);
  if (!encrypted) return clear;

  await clear.closeAsync().catch(() => {});
  await SQLite.deleteDatabaseAsync(CLEAR_DATABASE_NAME).catch(error =>
    logger.warn('[DatabaseEncryption] Ancienne base en clair non supprimée', error)
  );
  return encrypted;
}

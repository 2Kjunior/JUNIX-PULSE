/**
 * Automatic backup: once a week, an encrypted backup goes to a folder the user chose once (on
 * Android, through the system picker, which can be a cloud drive such as Google Drive).
 * The password is kept in the secure store of the phone, so the backup runs without asking.
 * It is a copy outside the app: losing the phone does not lose the data.
 */

import * as SecureStore from 'expo-secure-store';
import { Directory, File } from 'expo-file-system';

import { getDatabase } from '@/database/sqlite';
import { autoBackupFileName, autoBackupFilesToDelete, isAutoBackupDue } from '@/domain/rules/auto-backup-rules';
import { createBackup, encryptBackup } from '@/services/backup-service';
import { logger } from '@/utils/logger';

const CONFIG_KEY = 'jp_auto_backup_v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface AutoBackupConfig {
  directoryUri: string;
  password: string;
  lastSuccessAt: number | null;
  lastFailedAt: number | null;
}

export type AutoBackupResult = 'done' | 'not-due' | 'off' | 'failed';

let running: Promise<AutoBackupResult> | null = null;

function isConfig(value: unknown): value is AutoBackupConfig {
  const config = value as AutoBackupConfig;
  return typeof config?.directoryUri === 'string' && typeof config?.password === 'string';
}

export async function getAutoBackupConfig(): Promise<AutoBackupConfig | null> {
  try {
    const raw = await SecureStore.getItemAsync(CONFIG_KEY, STORE_OPTIONS);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isConfig(value) ? value : null;
  } catch {
    return null;
  }
}

async function saveConfig(config: AutoBackupConfig): Promise<void> {
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(config), STORE_OPTIONS);
}

export async function enableAutoBackup(directoryUri: string, password: string): Promise<void> {
  await saveConfig({ directoryUri, password, lastSuccessAt: null, lastFailedAt: null });
}

export async function disableAutoBackup(): Promise<void> {
  await SecureStore.deleteItemAsync(CONFIG_KEY, STORE_OPTIONS);
}

async function run(force: boolean): Promise<AutoBackupResult> {
  const config = await getAutoBackupConfig();
  if (!config) return 'off';
  const now = Date.now();
  if (!force && !isAutoBackupDue(config.lastSuccessAt, now)) return 'not-due';

  try {
    const encrypted = await encryptBackup(await createBackup(await getDatabase()), config.password);
    const directory = new Directory(config.directoryUri);
    const file = directory.createFile(autoBackupFileName(new Date(now)), 'application/json');
    await file.write(encrypted);

    // Only the most recent files stay: an old one failing to go away must not fail the backup
    try {
      const files = directory.list().filter((entry): entry is File => entry instanceof File);
      const toDelete = new Set(autoBackupFilesToDelete(files.map(entry => entry.name)));
      files.filter(entry => toDelete.has(entry.name)).forEach(entry => entry.delete());
    } catch (error) {
      logger.warn('[AutoBackup] Anciennes sauvegardes non supprimées', error);
    }

    await saveConfig({ ...config, lastSuccessAt: now, lastFailedAt: null });
    return 'done';
  } catch (error) {
    logger.error('[AutoBackup] Sauvegarde automatique impossible', error);
    await saveConfig({ ...config, lastFailedAt: now }).catch(() => {});
    return 'failed';
  }
}

/** Runs the backup when a week has passed, or at once with force. One run at a time. */
export function runAutoBackup({ force = false }: { force?: boolean } = {}): Promise<AutoBackupResult> {
  if (!running) running = run(force).finally(() => (running = null));
  return running;
}

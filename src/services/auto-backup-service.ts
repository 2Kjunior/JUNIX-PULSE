/**
 * Automatic backup: once a week, an encrypted backup goes to a folder the user chose once (on
 * Android, through the system picker, which can be a cloud drive such as Google Drive).
 * The password is kept in the secure store of the phone, so the backup runs without asking.
 * It is a copy outside the app: losing the phone does not lose the data.
 *
 * It runs when the app opens and, on Android, in the background about twice a day while the
 * phone allows it (the system decides; never when the app was force-stopped). With the
 * fingerprint option, it only runs in front of the user, after the fingerprint.
 * A failure sends one notification, then waits for a success before warning again.
 */

import * as BackgroundTask from 'expo-background-task';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

import { getDatabase } from '@/database/sqlite';
import {
  AUTO_BACKUP_FAILED_NOTIFICATION_ID,
  AUTO_BACKUP_TASK,
  AUTO_BACKUP_TASK_INTERVAL_MINUTES,
  autoBackupFileName,
  autoBackupFilesToDelete,
  isAutoBackupDue,
  shouldWarnAutoBackupFailure,
} from '@/domain/rules/auto-backup-rules';
import { t } from '@/i18n';
import { createBackup, encryptBackup } from '@/services/backup-service';
import { NotificationService } from '@/services/notification-service';
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
  /** Ask for the fingerprint before each backup: it then never runs in the background. */
  requireBiometric?: boolean;
}

export type AutoBackupResult = 'done' | 'not-due' | 'off' | 'failed' | 'cancelled';

export interface RunAutoBackupOptions {
  /** Now, even if a week has not passed. */
  force?: boolean;
  /** From the background task: nobody is there to give a fingerprint. */
  background?: boolean;
}

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

/** Registers the background run while it can run unattended, removes it otherwise. */
export async function syncAutoBackupTask(config?: AutoBackupConfig | null): Promise<void> {
  // Android only: elsewhere the backup runs when the app opens
  if (Platform.OS !== 'android') return;
  const current = config === undefined ? await getAutoBackupConfig() : config;
  try {
    if (current && !current.requireBiometric) {
      await BackgroundTask.registerTaskAsync(AUTO_BACKUP_TASK, { minimumInterval: AUTO_BACKUP_TASK_INTERVAL_MINUTES });
    } else {
      await BackgroundTask.unregisterTaskAsync(AUTO_BACKUP_TASK).catch(() => {});
    }
  } catch (error) {
    logger.warn('[AutoBackup] Tâche de fond non mise à jour', error);
  }
}

export async function enableAutoBackup(directoryUri: string, password: string): Promise<void> {
  const config: AutoBackupConfig = { directoryUri, password, lastSuccessAt: null, lastFailedAt: null };
  await saveConfig(config);
  await syncAutoBackupTask(config);
}

export async function disableAutoBackup(): Promise<void> {
  await SecureStore.deleteItemAsync(CONFIG_KEY, STORE_OPTIONS);
  await syncAutoBackupTask(null);
}

export async function setAutoBackupBiometric(requireBiometric: boolean): Promise<void> {
  const config = await getAutoBackupConfig();
  if (!config) return;
  const updated = { ...config, requireBiometric };
  await saveConfig(updated);
  await syncAutoBackupTask(updated);
}

async function confirmWithBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('autoBackup.biometricPrompt'),
      cancelLabel: t('common.cancel'),
    });
    return result.success;
  } catch {
    return false;
  }
}

async function warnFailure(): Promise<void> {
  await NotificationService.notifyNow({
    identifier: AUTO_BACKUP_FAILED_NOTIFICATION_ID,
    title: t('autoBackup.failedNotifTitle'),
    body: t('autoBackup.failedNotifBody'),
    data: { type: 'AUTO_BACKUP_FAILED' },
  });
}

async function run({ force = false, background = false }: RunAutoBackupOptions): Promise<AutoBackupResult> {
  const config = await getAutoBackupConfig();
  if (!config) return 'off';
  const now = Date.now();
  if (!force && !isAutoBackupDue(config.lastSuccessAt, now)) return 'not-due';
  if (config.requireBiometric) {
    // Waits for the user: the next opening of the app asks for the fingerprint
    if (background) return 'not-due';
    if (!(await confirmWithBiometric())) return 'cancelled';
  }

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
    // Folder removed, access withdrawn, drive full...: said once, until a backup works again
    if (shouldWarnAutoBackupFailure(config.lastSuccessAt, config.lastFailedAt)) await warnFailure();
    return 'failed';
  }
}

/** Runs the backup when a week has passed, or at once with force. One run at a time. */
export function runAutoBackup(options: RunAutoBackupOptions = {}): Promise<AutoBackupResult> {
  if (!running) running = run(options).finally(() => (running = null));
  return running;
}

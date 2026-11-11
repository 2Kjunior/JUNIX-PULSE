/**
 * When the automatic backup runs, and which of its files are kept.
 */

export const AUTO_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTO_BACKUP_KEPT_FILES = 4;
export const AUTO_BACKUP_FILE_PREFIX = 'junix-pulse-auto-';

/** Background task of the backup on Android, and how often the system may run it at most. */
export const AUTO_BACKUP_TASK = 'junix-pulse-auto-backup';
export const AUTO_BACKUP_TASK_INTERVAL_MINUTES = 12 * 60;
export const AUTO_BACKUP_FAILED_NOTIFICATION_ID = 'junix-pulse-auto-backup-failed';

/**
 * Whether a failure deserves a notification: the first one after a success (or ever), not the
 * next ones, so a missing folder does not send one twice a day.
 */
export function shouldWarnAutoBackupFailure(lastSuccessAt: number | null, lastFailedAt: number | null): boolean {
  if (lastFailedAt === null) return true;
  return lastSuccessAt !== null && lastSuccessAt > lastFailedAt;
}

/** Due once a week, or right away when it never succeeded. A clock set back counts as due. */
export function isAutoBackupDue(lastSuccessAt: number | null, now: number): boolean {
  if (lastSuccessAt === null) return true;
  const elapsed = now - lastSuccessAt;
  return elapsed < 0 || elapsed >= AUTO_BACKUP_INTERVAL_MS;
}

/** Name of a new file: the date sorts the files from the oldest to the newest. */
export function autoBackupFileName(now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `${AUTO_BACKUP_FILE_PREFIX}${stamp}.json`;
}

/** Files to delete so that only the most recent ones stay. */
export function autoBackupFilesToDelete(names: readonly string[]): string[] {
  return names
    .filter(name => name.startsWith(AUTO_BACKUP_FILE_PREFIX))
    .sort()
    .reverse()
    .slice(AUTO_BACKUP_KEPT_FILES);
}

/** When the next automatic backup is expected: a week after the last one, unknown before the first. */
export function nextAutoBackupAt(lastSuccessAt: number | null): number | null {
  return lastSuccessAt === null ? null : lastSuccessAt + AUTO_BACKUP_INTERVAL_MS;
}

/**
 * A readable name for the folder chosen through the system: "Documents/Junix" for a folder of
 * the phone, "Google Drive" for Drive, whose links hide the folder name; null when unknown.
 */
export function autoBackupFolderLabel(uri: string): string | null {
  let text = uri;
  try {
    text = decodeURIComponent(uri);
  } catch {
    // An odd link stays as it is
  }
  if (text.includes('com.google.android.apps.docs')) return 'Google Drive';
  const tree = text.split('/tree/')[1];
  if (!tree) return null;
  const path = tree.slice(tree.indexOf(':') + 1).split('/document/')[0].replace(/\/+$/, '');
  return path.length > 0 ? path : null;
}

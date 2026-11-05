/**
 * When the automatic backup runs, and which of its files are kept.
 */

export const AUTO_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTO_BACKUP_KEPT_FILES = 4;
export const AUTO_BACKUP_FILE_PREFIX = 'junix-pulse-auto-';

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

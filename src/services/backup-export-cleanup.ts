/**
 * Removes the encrypted backups left in the cache after being shared.
 * Not done right after sharing: the receiving app may still be reading the file at that moment.
 */

import { Directory, File, Paths } from 'expo-file-system';

import { logger } from '@/utils/logger';

export const BACKUP_EXPORT_PREFIX = 'junix-pulse-backup-';

export function purgeBackupExports(): void {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && entry.name.startsWith(BACKUP_EXPORT_PREFIX)) entry.delete();
    }
  } catch {
    logger.warn('[BackupExportCleanup] Nettoyage du cache impossible');
  }
}

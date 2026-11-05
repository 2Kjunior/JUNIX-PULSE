/**
 * Restoring an encrypted backup, from the welcome screen or from the settings.
 * Nothing is written before the file is decrypted, validated and summarized, and the user has
 * confirmed. The import then runs in one transaction: it adds what is missing and never replaces
 * nor deletes what the phone already holds.
 */

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { format } from 'date-fns';
import { useState } from 'react';
import { Platform } from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';

import { BackupPasswordModal } from '@/components/ui/BackupPasswordModal';
import { getDatabase } from '@/database/sqlite';
import { MessageKey, useDateLocale, useT } from '@/i18n';
import {
  BackupImportResult,
  BackupSanctumRestore,
  decryptBackup,
  importBackup,
  parseBackup,
  parseBackupSanctumKeys,
  restoreBackupSanctum,
  summarizeBackup,
} from '@/services/backup-service';
import { reconcileOverdueRecurringReminders } from '@/use-cases/reminder-use-cases';

const SANCTUM_RESTORE_NOTICE: Record<BackupSanctumRestore, MessageKey | null> = {
  none: null,
  restored: 'welcome.restore.sanctumRestored',
  same: null,
  conflict: 'welcome.restore.sanctumConflict',
  missing: 'welcome.restore.sanctumMissing',
};

export interface BackupRestoreOutcome {
  result: BackupImportResult;
  sanctum: BackupSanctumRestore;
}

export function useBackupRestore(onRestored: (outcome: BackupRestoreOutcome) => void | Promise<void>) {
  const t = useT();
  const dateLocale = useDateLocale();
  const [contents, setContents] = useState<string | null>(null);

  const startRestore = async () => {
    try {
      if (Platform.OS === 'web') {
        GlassAlert.alert(t('welcome.restore.unavailableTitle'), t('welcome.restore.unavailableBody'));
        return;
      }
      const selection = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;
      setContents(await new File(selection.assets[0].uri).text());
    } catch (error) {
      GlassAlert.alert(
        t('welcome.restore.invalidTitle'),
        error instanceof Error ? error.message : t('welcome.restore.invalidBody')
      );
    }
  };

  const runImport = async (data: ReturnType<typeof parseBackup>, keys: ReturnType<typeof parseBackupSanctumKeys>) => {
    try {
      const result = await importBackup(await getDatabase(), data);
      const sanctum = await restoreBackupSanctum(data, keys);
      await reconcileOverdueRecurringReminders();
      const notice = SANCTUM_RESTORE_NOTICE[sanctum];
      GlassAlert.alert(
        t('welcome.restore.doneTitle'),
        t('welcome.restore.doneBody', { inserted: result.inserted, skipped: result.skipped }) +
          (notice ? `\n\n${t(notice)}` : ''),
        [{ text: t('common.continue'), onPress: () => void onRestored({ result, sanctum }) }]
      );
    } catch (error) {
      GlassAlert.alert(
        t('welcome.restore.failTitle'),
        error instanceof Error ? error.message : t('welcome.restore.failBody')
      );
    }
  };

  // Throws to the password window, which shows the message: wrong password, damaged file...
  const handleDecrypt = async (password: string) => {
    if (!contents) throw new Error(t('welcome.restore.pickAgain'));

    const plaintext = await decryptBackup(contents, password);
    const data = parseBackup(plaintext);
    const keys = parseBackupSanctumKeys(plaintext);
    const summary = summarizeBackup(plaintext);
    setContents(null);

    GlassAlert.alert(
      t('welcome.restore.mergeTitle'),
      t('backupRestore.summary', {
        date: format(new Date(summary.exportedAt), 'PPPp', { locale: dateLocale }),
        version: summary.version,
        tasks: summary.counts.tasks,
        reminders: summary.counts.reminders,
        people: summary.counts.persons,
        habits: summary.counts.habits,
        notes: summary.counts.sanctumNotes,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('welcome.restore.import'), onPress: () => void runImport(data, keys) },
      ]
    );
  };

  const restoreModal = (
    <BackupPasswordModal
      visible={contents !== null}
      title={t('welcome.restore.unlockTitle')}
      confirmLabel={t('welcome.restore.decrypt')}
      onCancel={() => setContents(null)}
      onSubmit={handleDecrypt}
    />
  );

  return { startRestore, restoreModal };
}

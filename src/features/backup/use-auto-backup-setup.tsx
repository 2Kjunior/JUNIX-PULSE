/**
 * Turning on the automatic backup, from the settings or at the end of the onboarding:
 * a word on what it does, the folder picked through the system, then the password.
 */

import { Directory } from 'expo-file-system';
import { useState } from 'react';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import { BackupPasswordModal } from '@/components/ui/BackupPasswordModal';
import { useT } from '@/i18n';
import { expectAppLockReturn } from '@/services/app-lock-service';
import { enableAutoBackup } from '@/services/auto-backup-service';

export function useAutoBackupSetup(onEnabled: () => void | Promise<void>) {
  const t = useT();
  const [directoryUri, setDirectoryUri] = useState<string | null>(null);

  /** The folder, picked through the system; the password is asked next. */
  const pickFolder = async () => {
    try {
      expectAppLockReturn();
      const directory = await Directory.pickDirectoryAsync();
      if (directory?.uri) setDirectoryUri(directory.uri);
    } catch {
      // Picker closed without a folder
    }
  };

  /** From the onboarding: a word on what it does first, then the folder. */
  const startSetup = () => {
    GlassAlert.alert(t('autoBackup.setupTitle'), t('autoBackup.setupBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('autoBackup.pickFolder'), onPress: pickFolder },
    ]);
  };

  const handleEnable = async (password: string) => {
    if (!directoryUri) return;
    await enableAutoBackup(directoryUri, password);
    setDirectoryUri(null);
    await onEnabled();
  };

  const setupModal = (
    <BackupPasswordModal
      visible={directoryUri !== null}
      title={t('autoBackup.passwordTitle')}
      confirmLabel={t('autoBackup.enable')}
      confirmPassword
      onCancel={() => setDirectoryUri(null)}
      onSubmit={handleEnable}
    />
  );

  return { startSetup, pickFolder, setupModal };
}

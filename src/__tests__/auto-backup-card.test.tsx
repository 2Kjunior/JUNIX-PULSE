/**
 * The automatic backup card: what it says off and on, the warning after a failed try, and the
 * two calculations it shows (next backup, readable folder name).
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AutoBackupCard } from '@/components/settings/AutoBackupCard';
import { AUTO_BACKUP_INTERVAL_MS, autoBackupFolderLabel, nextAutoBackupAt } from '@/domain/rules/auto-backup-rules';
import type { AutoBackupConfig } from '@/services/auto-backup-service';

jest.mock('@/services/auto-backup-service', () => ({}));

const noop = () => {};

function render(config: AutoBackupConfig | null) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <AutoBackupCard config={config} running={false} onEnable={noop} onRunNow={noop} onDisable={noop} onToggleBiometric={noop} />
    );
  });
  return renderer.root
    .findAllByType(Text)
    .map(node => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children)));
}

describe('readable folder and next backup', () => {
  it('names a folder of the phone, Google Drive, or nothing', () => {
    expect(autoBackupFolderLabel('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FJunix')).toBe('Documents/Junix');
    expect(autoBackupFolderLabel('content://com.google.android.apps.docs.storage/tree/acc%3D1%3Bdoc%3Dabc')).toBe('Google Drive');
    expect(autoBackupFolderLabel('content://com.android.externalstorage.documents/tree/primary%3A')).toBeNull();
    expect(autoBackupFolderLabel('file:///nothing')).toBeNull();
  });

  it('comes a week after the last one, unknown before the first', () => {
    expect(nextAutoBackupAt(null)).toBeNull();
    expect(nextAutoBackupAt(1000)).toBe(1000 + AUTO_BACKUP_INTERVAL_MS);
  });
});

describe('automatic backup card', () => {
  const on: AutoBackupConfig = {
    directoryUri: 'content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FJunix',
    password: 'secret',
    lastSuccessAt: Date.now() - 60_000,
    lastFailedAt: null,
  };

  it('off: says what it does and offers to turn it on', () => {
    const texts = render(null);
    expect(texts).toEqual(expect.arrayContaining(['Désactivée', 'Chaque semaine, sans y penser', 'Activer']));
  });

  it('on: shows it is active, the next backup and the folder, without the password', () => {
    const texts = render(on);
    expect(texts).toEqual(expect.arrayContaining(['Active', 'Dernière sauvegarde', 'Documents/Junix', 'Désactiver']));
    expect(texts.some(text => text.startsWith('Vers le '))).toBe(true);
    expect(texts.join(' ')).not.toContain('secret');
  });

  it('warns when the last try failed after the last success', () => {
    const texts = render({ ...on, lastFailedAt: Date.now() });
    expect(texts).toEqual(expect.arrayContaining(['À vérifier']));
    expect(texts.some(text => text.startsWith('Le dernier essai a échoué'))).toBe(true);
  });
});

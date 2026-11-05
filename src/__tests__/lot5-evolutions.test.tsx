/**
 * Lot 5: glass alerts, automatic backup, encrypted database, notification buttons and the
 * vibration switch. What needs a real phone (system folder picker, SQLCipher build, buttons in
 * the notification shade) is checked on the device; the logic around it is checked here.
 */

import React from 'react';
import { Text, Vibration, Platform } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import * as SecureStore from 'expo-secure-store';

import { GlassAlert, GlassAlertHost } from '@/components/feedback/GlassAlert';
import {
  AUTO_BACKUP_INTERVAL_MS,
  AUTO_BACKUP_KEPT_FILES,
  autoBackupFileName,
  autoBackupFilesToDelete,
  isAutoBackupDue,
} from '@/domain/rules/auto-backup-rules';
import {
  notificationActionFor,
  REMINDER_ACTION_COMPLETE,
  REMINDER_ACTION_SNOOZE,
} from '@/domain/rules/reminder-notification-rules';
import * as autoBackupService from '@/services/auto-backup-service';
import * as databaseEncryption from '@/database/database-encryption';
import { emitMascotEvent } from '@/services/mascot/mascot-event-bus';
import { setHapticsEnabled, startActionHaptics } from '@/services/haptic-service';

const resetSecureStore = () => (SecureStore as unknown as { __resetMockStorage: () => void }).__resetMockStorage();

// ─── Glass alert ──────────────────────────────────────────────────────────

describe('GlassAlert', () => {
  const mountHost = () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<GlassAlertHost />);
    });
    return renderer;
  };
  beforeEach(() => act(() => GlassAlert._reset()));

  it('shows one alert at a time, the next one once the first is closed', () => {
    const renderer = mountHost();
    act(() => {
      GlassAlert.alert('Premier', 'Message un');
      GlassAlert.alert('Second');
    });
    const texts = () => renderer.root.findAllByType(Text).map(node => node.props.children);
    expect(texts()).toEqual(expect.arrayContaining(['Premier', 'Message un']));
    expect(texts()).not.toContain('Second');

    // No button given: one close button, as the native alert
    act(() => renderer.root.findByProps({ testID: 'glass-alert-button-0' }).props.onPress());
    expect(texts()).toContain('Second');
    act(() => renderer.root.findByProps({ testID: 'glass-alert-button-0' }).props.onPress());
    expect(GlassAlert._current()).toBeNull();
    act(() => renderer.unmount());
  });

  it('closes before running the button, so the button can open another alert', () => {
    const renderer = mountHost();
    const onDelete = jest.fn(() => GlassAlert.alert('Supprimé'));
    act(() =>
      GlassAlert.alert('Supprimer ?', undefined, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ])
    );
    const buttons = renderer.root.findAll(node => typeof node.props.testID === 'string' && node.props.variant);
    expect(buttons.map(button => button.props.variant)).toEqual(['ghost', 'destructive']);

    act(() => renderer.root.findByProps({ testID: 'glass-alert-button-1' }).props.onPress());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(GlassAlert._current()?.title).toBe('Supprimé');
    act(() => renderer.unmount());
  });

  it('makes the last action the main one, and the back button acts as cancel', () => {
    const renderer = mountHost();
    const onCancel = jest.fn();
    act(() =>
      GlassAlert.alert('Sauvegarde', undefined, [
        { text: 'Annuler', style: 'cancel', onPress: onCancel },
        { text: 'Désactiver', style: 'destructive' },
        { text: 'Maintenant' },
      ])
    );
    const variants = [0, 1, 2].map(
      index => renderer.root.findByProps({ testID: `glass-alert-button-${index}` }).props.variant
    );
    expect(variants).toEqual(['ghost', 'destructive', 'primary']);

    const modal = renderer.root.findByProps({ statusBarTranslucent: true });
    act(() => modal.props.onRequestClose());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(GlassAlert._current()).toBeNull();
    act(() => renderer.unmount());
  });
});

// ─── Automatic backup: rules ──────────────────────────────────────────────

describe('automatic backup rules', () => {
  const now = Date.UTC(2026, 10, 4, 9, 0, 0);

  it('is due at once, then once a week, and when the clock went back', () => {
    expect(isAutoBackupDue(null, now)).toBe(true);
    expect(isAutoBackupDue(now - AUTO_BACKUP_INTERVAL_MS + 1, now)).toBe(false);
    expect(isAutoBackupDue(now - AUTO_BACKUP_INTERVAL_MS, now)).toBe(true);
    expect(isAutoBackupDue(now + 60_000, now)).toBe(true);
  });

  it('names files so that they sort by date, and keeps the most recent ones only', () => {
    const names = [0, 1, 2, 3, 4, 5].map(week => autoBackupFileName(new Date(now + week * AUTO_BACKUP_INTERVAL_MS)));
    expect(names[0]).toMatch(/^junix-pulse-auto-2026-11-04T09-00-00-000Z\.json$/);
    const shuffled = [names[3], 'photo.jpg', names[0], names[5], names[1], names[4], names[2]];
    expect(autoBackupFilesToDelete(shuffled).sort()).toEqual([names[0], names[1]]);
    expect(6 - autoBackupFilesToDelete(shuffled).length).toBe(AUTO_BACKUP_KEPT_FILES);
  });
});

// ─── Automatic backup: service ────────────────────────────────────────────

const mockFolder: { files: Map<string, string>; failWrite: boolean } = { files: new Map(), failWrite: false };

jest.mock('expo-file-system', () => {
  class File {
    name: string;
    constructor(fileName: string) {
      this.name = fileName;
    }
    async write(contents: string) {
      if (mockFolder.failWrite) throw new Error('disk full');
      mockFolder.files.set(this.name, contents);
    }
    delete() {
      mockFolder.files.delete(this.name);
    }
  }
  class Directory {
    uri: string;
    constructor(directoryUri: string) {
      this.uri = directoryUri;
    }
    createFile(name: string) {
      return new File(name);
    }
    list() {
      return [...mockFolder.files.keys()].map(name => new File(name));
    }
  }
  return { File, Directory, Paths: { cache: { uri: 'file:///cache/' } } };
});

jest.mock('@/database/sqlite', () => ({ getDatabase: jest.fn(async () => ({})) }));

jest.mock('@/services/backup-service', () => ({
  createBackup: jest.fn(async () => '{"tables":{}}'),
  encryptBackup: jest.fn(async (plaintext: string, password: string) => `enc(${password}):${plaintext}`),
}));

describe('automatic backup service', () => {
  const service = () => autoBackupService;

  beforeEach(() => {
    resetSecureStore();
    mockFolder.files = new Map();
    mockFolder.failWrite = false;
  });

  it('does nothing until it is turned on', async () => {
    expect(await service().runAutoBackup()).toBe('off');
    expect(mockFolder.files.size).toBe(0);
  });

  it('writes an encrypted file, then waits a week', async () => {
    await service().enableAutoBackup('content://drive/tree/backups', 'mot-de-passe-solide');
    expect(await service().runAutoBackup()).toBe('done');
    const [contents] = [...mockFolder.files.values()];
    expect(contents).toBe('enc(mot-de-passe-solide):{"tables":{}}');
    expect((await service().getAutoBackupConfig())?.lastSuccessAt).toEqual(expect.any(Number));

    expect(await service().runAutoBackup()).toBe('not-due');
    expect(await service().runAutoBackup({ force: true })).toBe('done');
  });

  it('keeps only the most recent files of the folder, and nothing else of it is touched', async () => {
    const old = [0, 1, 2, 3, 4].map(week => autoBackupFileName(new Date(Date.UTC(2025, 0, 1 + week * 7))));
    old.forEach(name => mockFolder.files.set(name, 'old'));
    mockFolder.files.set('notes.txt', 'mine');
    await service().enableAutoBackup('content://drive/tree/backups', 'mot-de-passe-solide');

    expect(await service().runAutoBackup()).toBe('done');
    const kept = [...mockFolder.files.keys()];
    expect(kept).toContain('notes.txt');
    expect(kept.filter(name => name.startsWith('junix-pulse-auto-'))).toHaveLength(AUTO_BACKUP_KEPT_FILES);
    expect(kept).not.toContain(old[0]);
  });

  it('records a failure, and tries again on the next run', async () => {
    await service().enableAutoBackup('content://drive/tree/backups', 'mot-de-passe-solide');
    mockFolder.failWrite = true;
    expect(await service().runAutoBackup()).toBe('failed');
    const config = await service().getAutoBackupConfig();
    expect(config?.lastSuccessAt).toBeNull();
    expect(config?.lastFailedAt).toEqual(expect.any(Number));

    mockFolder.failWrite = false;
    expect(await service().runAutoBackup()).toBe('done');
  });

  it('runs once when asked twice at the same time', async () => {
    await service().enableAutoBackup('content://drive/tree/backups', 'mot-de-passe-solide');
    const [first, second] = await Promise.all([service().runAutoBackup(), service().runAutoBackup()]);
    expect([first, second]).toEqual(['done', 'done']);
    expect(mockFolder.files.size).toBe(1);
  });

  it('forgets the folder and the password once turned off', async () => {
    await service().enableAutoBackup('content://drive/tree/backups', 'mot-de-passe-solide');
    await service().disableAutoBackup();
    expect(await service().getAutoBackupConfig()).toBeNull();
    expect(await service().runAutoBackup({ force: true })).toBe('off');
  });
});

// ─── Notification buttons ─────────────────────────────────────────────────

describe('reminder notification buttons', () => {
  it('maps each button to its action, and a plain tap to opening the app', () => {
    expect(notificationActionFor(REMINDER_ACTION_COMPLETE)).toBe('complete');
    expect(notificationActionFor(REMINDER_ACTION_SNOOZE)).toBe('snooze');
    expect(notificationActionFor('expo.modules.notifications.actions.DEFAULT')).toBe('open');
  });
});

// ─── Vibration switch ─────────────────────────────────────────────────────

describe('vibration switch', () => {
  const os = Platform.OS;
  beforeAll(() => Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true }));
  afterAll(() => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true }));
  afterEach(() => setHapticsEnabled(true));

  it('stays silent on the actions once turned off, and plays again once back on', () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    const stop = startActionHaptics();

    setHapticsEnabled(false);
    emitMascotEvent({ type: 'REMINDER_COMPLETED', priority: 'NORMAL' } as never);
    expect(vibrate).not.toHaveBeenCalled();

    setHapticsEnabled(true);
    emitMascotEvent({ type: 'REMINDER_COMPLETED', priority: 'NORMAL' } as never);
    expect(vibrate).toHaveBeenCalledTimes(1);

    stop();
    vibrate.mockRestore();
  });
});

// ─── Encrypted database ───────────────────────────────────────────────────

interface FakeDb {
  name: string;
  databasePath: string;
  sql: string[];
  execAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  closeAsync: jest.Mock;
}

const mockSqlite: {
  cipher: boolean;
  copyDiffers: boolean;
  opened: FakeDb[];
  deleted: string[];
} = { cipher: true, copyDiffers: false, opened: [], deleted: [] };

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async (name: string) => {
    const db: FakeDb = {
      name,
      databasePath: `/data/user/0/app/files/SQLite/${name}`,
      sql: [],
      execAsync: jest.fn(async (sql: string) => {
        db.sql.push(sql);
      }),
      getFirstAsync: jest.fn(async (sql: string) => {
        db.sql.push(sql);
        if (sql.startsWith('PRAGMA cipher_version')) return mockSqlite.cipher ? { cipher_version: '4.6.1' } : null;
        if (sql.includes('FROM encrypted."tasks"')) return { count: mockSqlite.copyDiffers ? 1 : 2 };
        if (sql.includes('count(*)')) return { count: 2 };
        return null;
      }),
      getAllAsync: jest.fn(async () => [{ name: 'tasks' }]),
      closeAsync: jest.fn(async () => {}),
    };
    mockSqlite.opened.push(db);
    return db;
  }),
  deleteDatabaseAsync: jest.fn(async (name: string) => {
    mockSqlite.deleted.push(name);
  }),
}));

describe('database encryption', () => {
  const encryption = () => databaseEncryption;
  const os = Platform.OS;

  beforeAll(() => Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true }));
  afterAll(() => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true }));
  beforeEach(() => {
    resetSecureStore();
    Object.assign(mockSqlite, { cipher: true, copyDiffers: false, opened: [], deleted: [] });
  });

  it('accepts a 256-bit hex key only, as a single-quoted raw key', () => {
    const key = 'ab'.repeat(32);
    expect(encryption().rawKeyLiteral(key)).toBe(`'x''${key}'''`);
    expect(() => encryption().rawKeyLiteral("ab'; DROP TABLE tasks; --")).toThrow();
  });

  it('keeps the clear database where SQLCipher is not in the app', async () => {
    mockSqlite.cipher = false;
    const db = await encryption().openAppDatabase();
    expect((db as unknown as FakeDb).name).toBe('junixpulse.db');
    expect(mockSqlite.deleted).not.toContain('junixpulse.db');
    expect(await SecureStore.getItemAsync('jp_db_key_v1')).toBeNull();
  });

  it('copies the clear database into the encrypted one, then deletes the clear one', async () => {
    const db = (await encryption().openAppDatabase()) as unknown as FakeDb;
    const [clear] = mockSqlite.opened;

    expect(db.name).toBe('junixpulse-secure.db');
    const key = await SecureStore.getItemAsync('jp_db_key_v1');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(clear.sql).toContain(
      `ATTACH DATABASE '/data/user/0/app/files/SQLite/junixpulse-secure.db' AS encrypted KEY 'x''${key}''';`
    );
    expect(clear.sql).toContain("SELECT sqlcipher_export('encrypted')");
    expect(db.sql[0]).toBe(`PRAGMA key = 'x''${key}''';`);
    expect(clear.closeAsync).toHaveBeenCalled();
    expect(mockSqlite.deleted.at(-1)).toBe('junixpulse.db');
    expect(await SecureStore.getItemAsync('jp_db_encrypted_v1')).toBe('1');
  });

  it('keeps the clear database when the encrypted copy differs', async () => {
    mockSqlite.copyDiffers = true;
    const db = (await encryption().openAppDatabase()) as unknown as FakeDb;

    expect(db.name).toBe('junixpulse.db');
    expect(mockSqlite.deleted).not.toContain('junixpulse.db');
    expect(mockSqlite.deleted.at(-1)).toBe('junixpulse-secure.db');
    expect(await SecureStore.getItemAsync('jp_db_encrypted_v1')).toBeNull();
  });

  it('opens the encrypted database with its key on the next launches', async () => {
    await encryption().openAppDatabase();
    const key = await SecureStore.getItemAsync('jp_db_key_v1');
    mockSqlite.opened = [];

    const db = (await encryption().openAppDatabase()) as unknown as FakeDb;
    expect(mockSqlite.opened).toHaveLength(1);
    expect(db.name).toBe('junixpulse-secure.db');
    expect(db.sql[0]).toBe(`PRAGMA key = 'x''${key}''';`);
  });

  it('refuses to start on an empty database when the key is gone', async () => {
    await SecureStore.setItemAsync('jp_db_encrypted_v1', '1');
    await expect(encryption().openAppDatabase()).rejects.toThrow('Database key not found');
    expect(mockSqlite.opened).toHaveLength(0);
  });
});

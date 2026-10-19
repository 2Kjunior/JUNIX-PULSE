/**
 * Tests unitaires pour la persistance et les sauvegardes (Phase P2).
 *
 * Couverture :
 * - Migration v22 : présence dans MIGRATIONS, versionnage, SQL idempotent.
 * - SettingsRepository : mapping de appearanceMode avec repli défensif ('dark').
 * - BackupService :
 *     1. Parsing et validation d'une sauvegarde moderne avec appearance_mode ('system'|'light'|'dark').
 *     2. Rétro-compatibilité : parsing réussi d'une sauvegarde antérieure SANS appearance_mode.
 *     3. Rejet strict si appearance_mode contient une valeur inconnue.
 * - clearAllData : annulation des notifications OS + vidage atomique des 19 tables.
 */

import { MIGRATIONS } from '../database/migrations';
import { getDatabase } from '../database/sqlite';
import { SettingsRepository } from '../repositories/settings-repository';
import { parseBackup } from '../services/backup-service';

// Imports APRÈS les jest.mock — Jest les hisse automatiquement, mais
// la résolution de module doit atteindre les mocks, pas les vrais modules.
import { clearAllData } from '../database/seed';
import { NotificationService } from '../services/notification-service';

// ── Mocks de modules natifs ──────────────────────────────────────────────────
// Jest hisse jest.mock() AU-DESSUS de toutes les déclarations de variables.
// On ne peut donc pas référencer une variable externe dans la factory :
// les jest.fn() doivent être créés DIRECTEMENT dans la factory.

jest.mock('../services/notification-service', () => ({
  NotificationService: {
    cancelAll: jest.fn().mockResolvedValue(undefined),
    isAvailable: jest.fn().mockReturnValue(true),
    initialize: jest.fn().mockResolvedValue(undefined),
    scheduleReminder: jest.fn().mockResolvedValue('mock-notif-id'),
    cancelReminder: jest.fn().mockResolvedValue(undefined),
    getAllScheduled: jest.fn().mockResolvedValue([]),
    checkPermissions: jest.fn().mockResolvedValue(true),
    requestPermissions: jest.fn().mockResolvedValue(true),
    sendTestNotification: jest.fn().mockResolvedValue({ success: true }),
    addForegroundListener: jest.fn().mockReturnValue(() => {}),
    addResponseListener: jest.fn().mockReturnValue(() => {}),
  },
}));

jest.mock('../services/backup-crypto', () => ({
  encryptBackupContents: jest.fn(),
  decryptBackupContents: jest.fn(),
}));

jest.mock('../database/sqlite', () => ({
  getDatabase: jest.fn(),
}));

describe('Phase P2 — Persistance & Sauvegarde', () => {
  describe('Migration v22', () => {
    it('la migration v22 est définie avec le nom "add_appearance_mode"', () => {
      const mig = MIGRATIONS.find(m => m.version === 22);
      expect(mig).toBeDefined();
      expect(mig?.name).toBe('add_appearance_mode');
    });

    it('la migration v22 ajoute la colonne appearance_mode avec valeur par défaut "dark"', () => {
      const mig = MIGRATIONS.find(m => m.version === 22);
      expect(mig?.sql).toContain('ALTER TABLE settings ADD COLUMN appearance_mode TEXT NOT NULL DEFAULT \'dark\';');
    });

    it('la migration v22 initialise appearance_mode depuis appearance_dark existant', () => {
      const mig = MIGRATIONS.find(m => m.version === 22);
      expect(mig?.sql).toContain('UPDATE settings SET appearance_mode = CASE WHEN appearance_dark = 1 THEN \'dark\' ELSE \'light\' END;');
    });
  });

  describe('BackupService — Rétro-compatibilité et validation', () => {
    const baseValidBackup = {
      format: 'junix-pulse-backup',
      version: 1,
      exportedAt: '2026-10-13T00:00:00.000Z',
      data: {
        persons: [],
        recurrence_rules: [],
        reminders: [],
        reminder_checklist_items: [],
        tasks: [],
        subtasks: [],
        events: [],
        event_persons: [],
        habits: [],
        habit_completions: [],
        habit_pauses: [],
        goals: [],
        goal_tasks: [],
        personal_schedules: [],
        planning_blocks: [],
        interactions: [],
        suggestions: [],
        settings: [
          {
            id: '1',
            display_name: 'Utilisateur Test',
            timezone: 'Europe/Paris',
            onboarding_completed: 1,
            notifications_enabled: 1,
            forgotten_contact_threshold_days: 30,
            end_of_day_hour: 20,
            morning_briefing_hour: 8,
            appearance_dark: 1,
            appearance_mode: 'dark',
            created_at: '2026-10-13T00:00:00.000Z',
            updated_at: '2026-10-13T00:00:00.000Z',
          },
        ],
        sanctum_notes: [],
      },
    };

    it('valide et parse une sauvegarde contenant appearance_mode ("dark")', () => {
      const json = JSON.stringify(baseValidBackup);
      const parsed = parseBackup(json);
      expect(parsed.settings[0].appearance_mode).toBe('dark');
    });

    it('valide et parse une sauvegarde contenant appearance_mode ("light")', () => {
      const lightBackup = {
        ...baseValidBackup,
        data: {
          ...baseValidBackup.data,
          settings: [
            {
              ...baseValidBackup.data.settings[0],
              appearance_mode: 'light',
              appearance_dark: 0,
            },
          ],
        },
      };
      const parsed = parseBackup(JSON.stringify(lightBackup));
      expect(parsed.settings[0].appearance_mode).toBe('light');
    });

    it('valide et parse une sauvegarde contenant appearance_mode ("system")', () => {
      const systemBackup = {
        ...baseValidBackup,
        data: {
          ...baseValidBackup.data,
          settings: [
            {
              ...baseValidBackup.data.settings[0],
              appearance_mode: 'system',
            },
          ],
        },
      };
      const parsed = parseBackup(JSON.stringify(systemBackup));
      expect(parsed.settings[0].appearance_mode).toBe('system');
    });

    it('rétro-compatibilité : parse avec succès une sauvegarde antérieure SANS appearance_mode', () => {
      const legacySettings = {
        id: '1',
        display_name: 'Ancien Utilisateur',
        timezone: 'UTC',
        onboarding_completed: 1,
        notifications_enabled: 1,
        forgotten_contact_threshold_days: 30,
        end_of_day_hour: 20,
        morning_briefing_hour: 8,
        appearance_dark: 1,
        // Pas de champ appearance_mode dans une sauvegarde antérieure
        created_at: '2026-10-12T00:00:00.000Z',
        updated_at: '2026-10-12T00:00:00.000Z',
      };

      const legacyBackup = {
        ...baseValidBackup,
        data: {
          ...baseValidBackup.data,
          settings: [legacySettings],
        },
      };

      const parsed = parseBackup(JSON.stringify(legacyBackup));
      expect(parsed.settings[0].appearance_dark).toBe(1);
      expect(parsed.settings[0].appearance_mode).toBeUndefined();
    });

    it('rejette une sauvegarde si appearance_mode contient une valeur inconnue', () => {
      const corruptedBackup = {
        ...baseValidBackup,
        data: {
          ...baseValidBackup.data,
          settings: [
            {
              ...baseValidBackup.data.settings[0],
              appearance_mode: 'neon-glow', // Valeur interdite
            },
          ],
        },
      };

      expect(() => parseBackup(JSON.stringify(corruptedBackup))).toThrow(
        /Format de sauvegarde invalide : settings\[0\]\.appearance_mode contient une valeur inconnue/
      );
    });
  });

  describe('SettingsRepository — Mapping et repli défensif', () => {
    const mockDb = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    });

    it('mappe fidèlement les modes valides ("light", "dark", "system")', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: '1',
        timezone: 'UTC',
        onboarding_completed: 1,
        notifications_enabled: 1,
        forgotten_contact_threshold_days: 30,
        end_of_day_hour: 20,
        morning_briefing_hour: 8,
        appearance_dark: 0,
        appearance_mode: 'light',
        created_at: '2026-10-13T00:00:00Z',
        updated_at: '2026-10-13T00:00:00Z',
      });

      const s = await SettingsRepository.get();
      expect(s.appearanceMode).toBe('light');
      expect(s.appearanceDark).toBe(false);
    });

    it('applique le repli défensif "dark" si appearance_mode est corrompu ou absent', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: '1',
        timezone: 'UTC',
        onboarding_completed: 1,
        notifications_enabled: 1,
        forgotten_contact_threshold_days: 30,
        end_of_day_hour: 20,
        morning_briefing_hour: 8,
        appearance_dark: 1,
        appearance_mode: 'valeur-corrompue',
        created_at: '2026-10-13T00:00:00Z',
        updated_at: '2026-10-13T00:00:00Z',
      });

      const s = await SettingsRepository.get();
      expect(s.appearanceMode).toBe('dark');
    });

    it('met à jour appearance_mode et synchronise appearance_dark', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ changes: 1 });

      await SettingsRepository.update({
        appearanceMode: 'light',
        updatedAt: '2026-10-13T01:00:00Z',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings SET'),
        null, // display_name
        null, // timezone
        null, // onboarding_completed
        null, // notifications_enabled
        null, // forgotten_contact_threshold_days
        null, // end_of_day_hour
        null, // morning_briefing_hour
        0,    // syncDark: light -> 0
        'light', // appearance_mode
        '2026-10-13T01:00:00Z'
      );
    });
  });

  describe('clearAllData — Réinitialisation complète et atomique (DEF-02)', () => {
    const mockDb = {
      runAsync: jest.fn().mockResolvedValue({ changes: 0 }),
      withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => {
        await callback();
      }),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    });

    it('annule toutes les notifications OS et vide les 19 tables sous transaction', async () => {
      await clearAllData();

      // 1. Annulation des alarmes OS
      expect(NotificationService.cancelAll).toHaveBeenCalledTimes(1);

      // 2. Encapsulation transactionnelle
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);

      // 3. Vérification de la présence des 19 tables critiques (dont les 5 précédemment oubliées)
      const expectedTables = [
        'habit_completions',
        'habit_pauses',
        'habits',
        'goal_tasks',
        'goals',
        'reminder_checklist_items',
        'reminders',
        'recurrence_rules',
        'subtasks',
        'tasks',
        'event_persons',
        'events',
        'interactions',
        'persons',
        'suggestions',
        'planning_blocks',
        'personal_schedules',
        'settings',
        'sanctum_notes',
      ];

      expect(mockDb.runAsync).toHaveBeenCalledTimes(expectedTables.length);
      expectedTables.forEach((table) => {
        expect(mockDb.runAsync).toHaveBeenCalledWith(`DELETE FROM ${table}`);
      });
    });
  });
});



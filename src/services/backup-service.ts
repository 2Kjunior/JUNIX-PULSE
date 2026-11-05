import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { t } from '../i18n';
import { decryptBackupContents, encryptBackupContents } from './backup-crypto';
import { isSanctumNoteEncrypted, SANCTUM_CRYPTO_CONSTANTS } from './sanctum-crypto';
import { SanctumAuthService, type SanctumBackupKeys } from './sanctum-auth-service';

const BACKUP_TABLES = [
  'persons',
  'recurrence_rules',
  'reminders',
  'reminder_checklist_items',
  'tasks',
  'subtasks',
  'events',
  'event_persons',
  'habits',
  'habit_completions',
  'habit_pauses',
  'goals',
  'goal_tasks',
  'personal_schedules',
  'planning_blocks',
  'interactions',
  'suggestions',
  'settings',
  'sanctum_notes',
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];
type SqlValue = string | number | null;
type BackupRow = Record<string, SqlValue>;

const TABLE_COLUMNS: Record<BackupTable, readonly string[]> = {
  persons: ['id', 'display_name', 'relationship', 'phone', 'email', 'birth_date', 'notes', 'last_interaction_at', 'forgotten_threshold_days', 'imported_from_contacts', 'timezone', 'availability', 'created_at', 'updated_at', 'deleted_at'],
  recurrence_rules: ['id', 'type', 'interval_val', 'days_of_week', 'day_of_month', 'week_position', 'end_date'],
  reminders: ['id', 'title', 'notes', 'scheduled_at', 'timezone', 'priority', 'status', 'action_type', 'person_id', 'recurrence_rule_id', 'notification_id', 'snoozed_until', 'created_at', 'updated_at', 'completed_at', 'deleted_at'],
  reminder_checklist_items: ['id', 'reminder_id', 'title', 'is_completed', 'position'],
  tasks: ['id', 'title', 'description', 'status', 'scheduled_date', 'estimated_minutes', 'priority', 'goal_id', 'person_id', 'tags', 'created_at', 'updated_at', 'completed_at', 'deleted_at'],
  subtasks: ['id', 'task_id', 'title', 'is_completed', 'position', 'created_at', 'completed_at'],
  events: ['id', 'title', 'notes', 'start_at', 'end_at', 'timezone', 'location', 'type', 'travel_buffer_minutes', 'created_at', 'updated_at', 'deleted_at'],
  event_persons: ['event_id', 'person_id'],
  habits: ['id', 'title', 'description', 'frequency', 'target_days_per_week', 'status', 'color', 'created_at', 'updated_at', 'deleted_at'],
  habit_completions: ['id', 'habit_id', 'completed_date', 'created_at'],
  habit_pauses: ['id', 'habit_id', 'start_date', 'end_date', 'reason', 'created_at'],
  goals: ['id', 'title', 'description', 'status', 'deadline', 'created_at', 'updated_at', 'deleted_at'],
  goal_tasks: ['goal_id', 'task_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'valid_until', 'status', 'created_at', 'updated_at'],
  planning_blocks: ['id', 'schedule_id', 'label', 'type', 'day_of_week', 'start_time', 'end_time', 'color', 'created_at', 'updated_at'],
  interactions: ['id', 'person_id', 'type', 'occurred_at', 'notes', 'reminder_id', 'created_at'],
  suggestions: ['id', 'type', 'status', 'title', 'explanation', 'target_id', 'target_type', 'proposed_data', 'generated_at', 'expires_at', 'decided_at', 'created_at'],
  settings: ['id', 'display_name', 'timezone', 'onboarding_completed', 'notifications_enabled', 'forgotten_contact_threshold_days', 'end_of_day_hour', 'morning_briefing_hour', 'appearance_dark', 'appearance_mode', 'mascot_presence', 'mascot_address', 'mascot_proposals', 'mascot_briefings', 'language', 'notification_sound_enabled', 'haptics_enabled', 'created_at', 'updated_at'],
  sanctum_notes: ['id', 'title', 'content', 'folder', 'created_at', 'updated_at'],
};

const REQUIRED_COLUMNS: Partial<Record<BackupTable, readonly string[]>> = {
  persons: ['id', 'display_name', 'forgotten_threshold_days', 'imported_from_contacts', 'created_at', 'updated_at'],
  recurrence_rules: ['id', 'type', 'interval_val'],
  reminders: ['id', 'title', 'scheduled_at', 'timezone', 'priority', 'status', 'action_type', 'created_at', 'updated_at'],
  reminder_checklist_items: ['id', 'reminder_id', 'title', 'is_completed', 'position'],
  tasks: ['id', 'title', 'status', 'priority', 'created_at', 'updated_at'],
  subtasks: ['id', 'task_id', 'title', 'is_completed', 'position', 'created_at'],
  events: ['id', 'title', 'start_at', 'end_at', 'timezone', 'type', 'created_at', 'updated_at'],
  event_persons: ['event_id', 'person_id'],
  habits: ['id', 'title', 'frequency', 'status', 'created_at', 'updated_at'],
  habit_completions: ['id', 'habit_id', 'completed_date', 'created_at'],
  habit_pauses: ['id', 'habit_id', 'start_date', 'created_at'],
  goals: ['id', 'title', 'status', 'created_at', 'updated_at'],
  goal_tasks: ['goal_id', 'task_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'status', 'created_at', 'updated_at'],
  planning_blocks: ['id', 'schedule_id', 'label', 'type', 'day_of_week', 'start_time', 'end_time', 'created_at', 'updated_at'],
  interactions: ['id', 'person_id', 'type', 'occurred_at', 'created_at'],
  suggestions: ['id', 'type', 'status', 'title', 'explanation', 'generated_at', 'created_at'],
  settings: ['id', 'timezone', 'onboarding_completed', 'notifications_enabled', 'forgotten_contact_threshold_days', 'end_of_day_hour', 'morning_briefing_hour', 'appearance_dark', 'created_at', 'updated_at'],
  sanctum_notes: ['id', 'content', 'updated_at'],
};

const INTEGER_COLUMNS: Partial<Record<BackupTable, readonly string[]>> = {
  persons: ['forgotten_threshold_days', 'imported_from_contacts'],
  recurrence_rules: ['interval_val', 'day_of_month'],
  reminder_checklist_items: ['is_completed', 'position'],
  tasks: ['estimated_minutes'],
  subtasks: ['is_completed', 'position'],
  events: ['travel_buffer_minutes'],
  habits: ['target_days_per_week'],
  personal_schedules: [],
  planning_blocks: ['day_of_week'],
  settings: ['onboarding_completed', 'notifications_enabled', 'forgotten_contact_threshold_days', 'end_of_day_hour', 'morning_briefing_hour', 'appearance_dark', 'mascot_briefings', 'notification_sound_enabled', 'haptics_enabled'],
};

const ENUM_COLUMNS: Partial<Record<BackupTable, Record<string, readonly string[]>>> = {
  recurrence_rules: {
    type: ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM_INTERVAL'],
    week_position: ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'LAST'],
  },
  reminders: {
    priority: ['URGENT', 'HIGH', 'NORMAL', 'LOW'],
    status: ['UPCOMING', 'TRIGGERED', 'SNOOZED', 'MISSED', 'COMPLETED', 'DELETED'],
    action_type: ['NONE', 'CALL', 'MESSAGE', 'EMAIL', 'MEET', 'TASK'],
  },
  tasks: {
    status: ['INBOX', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED'],
    priority: ['URGENT', 'HIGH', 'NORMAL', 'LOW'],
  },
  events: { type: ['FREE', 'BUSY'] },
  habits: {
    frequency: ['DAILY', 'WEEKLY'],
    status: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
  },
  goals: { status: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] },
  personal_schedules: { status: ['ACTIVE', 'INACTIVE', 'DELETED'] },
  planning_blocks: { type: ['WORK', 'STUDY', 'REST', 'SPORT', 'HOUSE', 'FREE', 'OTHER'] },
  interactions: { type: ['CALL', 'SMS', 'WHATSAPP', 'EMAIL', 'IN_PERSON', 'OTHER'] },
  suggestions: {
    type: ['RESCHEDULE_REMINDER', 'POSTPONE_TASK', 'FORGOTTEN_CONTACT', 'BIRTHDAY_REMINDER', 'OVERLOADED_DAY', 'HABIT_REMINDER', 'PLANNING_CONFLICT', 'GOAL_APPROACHING', 'LINGERING_TASK', 'WELCOME_BACK'],
    status: ['PENDING', 'ACCEPTED', 'MODIFIED', 'REFUSED', 'EXPIRED'],
  },
  settings: {
    appearance_mode: ['system', 'light', 'dark'],
    mascot_presence: ['full', 'discreet', 'off'],
    mascot_address: ['tu', 'vous'],
    mascot_proposals: ['normal', 'rare', 'off'],
    language: ['auto', 'fr', 'en'],
  },
};

/** Values used when an older backup has no mascot column, so the NOT NULL columns still restore. */
const MASCOT_RESTORE_DEFAULTS: Record<string, string | number> = {
  mascot_presence: 'full',
  mascot_address: 'tu',
  mascot_proposals: 'normal',
  mascot_briefings: 1,
};

const SqlValueSchema =z.union([z.string(), z.number().finite(), z.null()]);
const BackupRowSchema = z.record(z.string(), SqlValueSchema);

const BackupDataSchema = z.object({
  persons: z.array(BackupRowSchema),
  recurrence_rules: z.array(BackupRowSchema),
  reminders: z.array(BackupRowSchema),
  reminder_checklist_items: z.array(BackupRowSchema),
  tasks: z.array(BackupRowSchema),
  subtasks: z.array(BackupRowSchema),
  events: z.array(BackupRowSchema),
  event_persons: z.array(BackupRowSchema),
  habits: z.array(BackupRowSchema),
  habit_completions: z.array(BackupRowSchema),
  habit_pauses: z.array(BackupRowSchema),
  goals: z.array(BackupRowSchema),
  goal_tasks: z.array(BackupRowSchema),
  personal_schedules: z.array(BackupRowSchema),
  planning_blocks: z.array(BackupRowSchema),
  interactions: z.array(BackupRowSchema),
  suggestions: z.array(BackupRowSchema),
  settings: z.array(BackupRowSchema),
  sanctum_notes: z.array(BackupRowSchema),
}).strict();

// The file comes from outside: only known parameters, as a huge scrypt cost would freeze the phone
const SanctumKeysSchema = z.object({
  salt: z.string().regex(new RegExp(`^[0-9a-f]{${SANCTUM_CRYPTO_CONSTANTS.SALT_LENGTH * 2}}$`)),
  verifier: z.string().startsWith(SANCTUM_CRYPTO_CONSTANTS.FORMAT_PREFIX),
  kdfN: z.union([
    z.literal(SANCTUM_CRYPTO_CONSTANTS.LEGACY_SCRYPT_N),
    z.literal(SANCTUM_CRYPTO_CONSTANTS.FAST_SCRYPT_N),
    z.literal(SANCTUM_CRYPTO_CONSTANTS.SCRYPT_PARAMS.N),
  ]),
}).strict();

const BackupSchema = z.object({
  format: z.literal('junix-pulse-backup'),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  data: BackupDataSchema,
  sanctumKeys: SanctumKeysSchema.optional(),
}).strict();

export type BackupData = z.infer<typeof BackupDataSchema>;

export interface BackupImportResult {
  inserted: number;
  skipped: number;
}

/**
 * What happened to the Sanctuary of a restored backup.
 * none: no encrypted note. restored or same: its PIN opens them.
 * conflict: another PIN is set on this phone. missing: older backup, without its keys.
 */
export type BackupSanctumRestore = 'none' | 'restored' | 'same' | 'conflict' | 'missing';

function validateRows(data: BackupData): void {
  for (const table of BACKUP_TABLES) {
    const columns = TABLE_COLUMNS[table];
    const expected = new Set(columns);
    const required = REQUIRED_COLUMNS[table] ?? [];
    const integerColumns = new Set(INTEGER_COLUMNS[table] ?? []);

    for (const [rowIndex, row] of data[table].entries()) {
      const rowKeys = Object.keys(row);
      if (rowKeys.some(key => !expected.has(key))) {
        throw new Error(t('backup.badColumns', { table }));
      }

      for (const column of required) {
        if (row[column] === null || row[column] === undefined) {
          throw new Error(t('backup.required', { path: `${table}[${rowIndex}].${column}` }));
        }
      }

      for (const column of integerColumns) {
        const value = row[column];
        if (value !== null && value !== undefined && (typeof value !== 'number' || !Number.isInteger(value))) {
          throw new Error(t('backup.integer', { path: `${table}[${rowIndex}].${column}` }));
        }
      }

      for (const column of columns) {
        const value = row[column];
        if (value !== null && value !== undefined && !integerColumns.has(column) && typeof value !== 'string') {
          throw new Error(t('backup.text', { path: `${table}[${rowIndex}].${column}` }));
        }
      }

      for (const [column, allowedValues] of Object.entries(ENUM_COLUMNS[table] ?? {})) {
        const value = row[column];
        if (value !== null && value !== undefined && (typeof value !== 'string' || !allowedValues.includes(value))) {
          throw new Error(t('backup.unknownValue', { path: `${table}[${rowIndex}].${column}` }));
        }
      }
    }
  }
}

export async function createBackup(db: SQLiteDatabase): Promise<string> {
  const data = {} as BackupData;
  for (const table of BACKUP_TABLES) {
    if (table === 'sanctum_notes') {
      data[table] = await db.getAllAsync<BackupRow>(
        `SELECT * FROM sanctum_notes WHERE id != '__pin_hash__'`
      );
    } else {
      data[table] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table}`);
    }
  }

  const sanctumKeys = await SanctumAuthService.exportBackupKeys();

  return JSON.stringify({
    format: 'junix-pulse-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
    ...(sanctumKeys ? { sanctumKeys } : {}),
  });
}

export function parseBackup(contents: string): BackupData {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error(t('backup.notJson'));
  }

  const parsed = BackupSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(t('backup.incompatible'));
  }

  validateRows(parsed.data.data);
  return parsed.data.data;
}

export interface BackupSummary {
  exportedAt: string;
  version: number;
  counts: { tasks: number; reminders: number; persons: number; habits: number; sanctumNotes: number };
}

/** What a validated backup holds, to show before restoring it. */
export function summarizeBackup(contents: string): BackupSummary {
  const backup = BackupSchema.parse(JSON.parse(contents));
  return {
    exportedAt: backup.exportedAt,
    version: backup.version,
    counts: {
      tasks: backup.data.tasks.length,
      reminders: backup.data.reminders.length,
      persons: backup.data.persons.length,
      habits: backup.data.habits.length,
      sanctumNotes: backup.data.sanctum_notes.length,
    },
  };
}

/** The Sanctuary keys of an already validated backup, if it carries them. */
export function parseBackupSanctumKeys(contents: string): SanctumBackupKeys | null {
  return BackupSchema.safeParse(JSON.parse(contents)).data?.sanctumKeys ?? null;
}

/** To call once the backup is imported, so that a failed import leaves the Sanctuary untouched. */
export async function restoreBackupSanctum(
  data: BackupData,
  keys: SanctumBackupKeys | null
): Promise<BackupSanctumRestore> {
  const hasEncryptedNotes = data.sanctum_notes.some(
    note => typeof note.content === 'string' && isSanctumNoteEncrypted(note.content)
  );
  if (!hasEncryptedNotes) return 'none';
  if (!keys) return 'missing';
  return SanctumAuthService.restoreBackupKeys(keys);
}

export async function importBackup(db: SQLiteDatabase, data: BackupData): Promise<BackupImportResult> {
  let inserted = 0;
  let skipped = 0;

  // Same connection as the key: an exclusive transaction would open one without it
  await db.withTransactionAsync(async () => {
    for (const table of BACKUP_TABLES) {
      for (const row of data[table]) {
        if (table === 'sanctum_notes' && row.id === '__pin_hash__') {
          continue;
        }
        const columns = TABLE_COLUMNS[table];
        const result = await db.runAsync(
          `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map(column => {
            const val = row[column];
            if (val !== undefined) return val;
            if (column === 'appearance_mode') return 'dark';
            // A backup made before the language setting existed follows the phone
            if (column === 'language') return 'auto';
            // Older backups: sound and vibrations on, as on a new install
            if (column === 'notification_sound_enabled' || column === 'haptics_enabled') return 1;
            // A backup made before the mascot existed restores with its default choices
            if (column in MASCOT_RESTORE_DEFAULTS) return MASCOT_RESTORE_DEFAULTS[column];
            return null;
          })
        );
        if (result.changes > 0) inserted += 1;
        else skipped += 1;
      }
    }
  });

  return { inserted, skipped };
}

export async function encryptBackup(contents: string, passphrase: string): Promise<string> {
  const salt = await Crypto.getRandomBytesAsync(16);
  const nonce = await Crypto.getRandomBytesAsync(24);
  return encryptBackupContents(contents, passphrase, salt, nonce);
}

export async function decryptBackup(contents: string, passphrase: string): Promise<string> {
  return decryptBackupContents(contents, passphrase);
}
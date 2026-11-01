/**
 * Backups and the mascot settings: an old backup restores with defaults, a new one keeps its
 * choices, and an invalid choice is refused.
 */

import { parseBackup } from '../backup-service';

const TABLES = [
  'persons', 'recurrence_rules', 'reminders', 'reminder_checklist_items', 'tasks', 'subtasks', 'events',
  'event_persons', 'habits', 'habit_completions', 'habit_pauses', 'goals', 'goal_tasks', 'personal_schedules',
  'planning_blocks', 'interactions', 'suggestions', 'settings', 'sanctum_notes',
] as const;

const baseSettings = {
  id: '1', timezone: 'UTC', onboarding_completed: 1, notifications_enabled: 1,
  forgotten_contact_threshold_days: 30, end_of_day_hour: 20, morning_briefing_hour: 8,
  appearance_dark: 1, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
};

function backupWith(settings: Record<string, string | number | null>[], suggestions: Record<string, string | null>[] = []) {
  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) data[table] = [];
  data.settings = settings;
  data.suggestions = suggestions;
  return JSON.stringify({ format: 'junix-pulse-backup', version: 1, exportedAt: '2026-11-01T06:00:00.000Z', data });
}

describe('backup and the mascot settings', () => {
  it('accepts a backup made before the mascot existed', () => {
    expect(() => parseBackup(backupWith([baseSettings]))).not.toThrow();
  });

  it('keeps the four mascot choices of a new backup', () => {
    const parsed = parseBackup(
      backupWith([{ ...baseSettings, mascot_presence: 'discreet', mascot_address: 'vous', mascot_proposals: 'rare', mascot_briefings: 0 }])
    );
    expect(parsed.settings[0]).toMatchObject({
      mascot_presence: 'discreet', mascot_address: 'vous', mascot_proposals: 'rare', mascot_briefings: 0,
    });
  });

  it.each([
    ['mascot_presence', 'loud'],
    ['mascot_address', 'toi'],
    ['mascot_proposals', 'always'],
  ])('refuses an unknown value for %s', (column, value) => {
    expect(() => parseBackup(backupWith([{ ...baseSettings, [column]: value }]))).toThrow();
  });

  it('refuses a briefing flag that is not a whole number', () => {
    expect(() => parseBackup(backupWith([{ ...baseSettings, mascot_briefings: 0.5 }]))).toThrow();
  });

  it.each(['GOAL_APPROACHING', 'LINGERING_TASK', 'WELCOME_BACK'])('accepts a %s suggestion', type => {
    const suggestion = {
      id: 's1', type, status: 'PENDING', title: 't', explanation: 'e',
      generated_at: '2026-11-01T06:00:00.000Z', created_at: '2026-11-01T06:00:00.000Z',
    };
    expect(() => parseBackup(backupWith([baseSettings], [suggestion]))).not.toThrow();
  });
});

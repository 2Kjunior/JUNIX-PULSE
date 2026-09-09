/**
 * Repository pour les paramètres utilisateur.
 * Ligne unique en base (id = '1').
 */

import { getDatabase } from '../database/sqlite';
import { Settings } from '../domain/entities';

function rowToSettings(row: Record<string, unknown>): Settings {
  return {
    id: row.id as string,
    displayName: (row.display_name as string | null) ?? undefined,
    timezone: (row.timezone as string) || 'UTC',
    onboardingCompleted: (row.onboarding_completed as number) === 1,
    notificationsEnabled: (row.notifications_enabled as number) === 1,
    forgottenContactThresholdDays: row.forgotten_contact_threshold_days as number,
    endOfDayHour: row.end_of_day_hour as number,
    morningBriefingHour: row.morning_briefing_hour as number,
    appearanceDark: (row.appearance_dark as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const SettingsRepository = {
  async get(): Promise<Settings> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM settings WHERE id = ?', '1'
    );
    if (!row) {
      throw new Error('Settings row not found — migration may have failed');
    }
    return rowToSettings(row);
  },

  async update(params: Partial<Omit<Settings, 'id' | 'createdAt'>> & { updatedAt: string }): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE settings SET
        display_name = COALESCE(?, display_name),
        timezone = COALESCE(?, timezone),
        onboarding_completed = COALESCE(?, onboarding_completed),
        notifications_enabled = COALESCE(?, notifications_enabled),
        forgotten_contact_threshold_days = COALESCE(?, forgotten_contact_threshold_days),
        end_of_day_hour = COALESCE(?, end_of_day_hour),
        morning_briefing_hour = COALESCE(?, morning_briefing_hour),
        appearance_dark = COALESCE(?, appearance_dark),
        updated_at = ?
       WHERE id = '1'`,
      params.displayName ?? null,
      params.timezone ?? null,
      params.onboardingCompleted !== undefined ? (params.onboardingCompleted ? 1 : 0) : null,
      params.notificationsEnabled !== undefined ? (params.notificationsEnabled ? 1 : 0) : null,
      params.forgottenContactThresholdDays ?? null,
      params.endOfDayHour ?? null,
      params.morningBriefingHour ?? null,
      params.appearanceDark !== undefined ? (params.appearanceDark ? 1 : 0) : null,
      params.updatedAt
    );
  },

  async markOnboardingComplete(now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE settings SET onboarding_completed = 1, updated_at = ? WHERE id = '1'`,
      now
    );
  },
};

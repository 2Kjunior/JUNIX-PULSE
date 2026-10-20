/**
 * Repository pour les paramètres utilisateur.
 * Ligne unique en base (id = '1').
 */

import { getDatabase } from '../database/sqlite';
import { AppearanceMode, Settings } from '../domain/entities';

const VALID_APPEARANCE_MODES: ReadonlySet<AppearanceMode> = new Set(['system', 'light', 'dark']);

function rowToSettings(row: Record<string, unknown>): Settings {
  const rawMode = row.appearance_mode as string | undefined;
  const appearanceMode: AppearanceMode =
    rawMode && VALID_APPEARANCE_MODES.has(rawMode as AppearanceMode)
      ? (rawMode as AppearanceMode)
      : 'dark';

  return {
    id: row.id as string,
    displayName: (row.display_name as string | null) ?? undefined,
    timezone: (row.timezone as string) || 'UTC',
    onboardingCompleted: (row.onboarding_completed as number) === 1,
    notificationsEnabled: (row.notifications_enabled as number) === 1,
    forgottenContactThresholdDays: row.forgotten_contact_threshold_days as number,
    endOfDayHour: row.end_of_day_hour as number,
    morningBriefingHour: row.morning_briefing_hour as number,
    appearanceMode,
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
    const safeMode =
      params.appearanceMode && VALID_APPEARANCE_MODES.has(params.appearanceMode)
        ? params.appearanceMode
        : null;

    let syncDark: number | null = null;
    if (params.appearanceDark !== undefined) {
      syncDark = params.appearanceDark ? 1 : 0;
    } else if (safeMode !== null) {
      syncDark = safeMode === 'light' ? 0 : 1;
    }

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
        appearance_mode = COALESCE(?, appearance_mode),
        updated_at = ?
       WHERE id = '1'`,
      params.displayName ?? null,
      params.timezone ?? null,
      params.onboardingCompleted !== undefined ? (params.onboardingCompleted ? 1 : 0) : null,
      params.notificationsEnabled !== undefined ? (params.notificationsEnabled ? 1 : 0) : null,
      params.forgottenContactThresholdDays ?? null,
      params.endOfDayHour ?? null,
      params.morningBriefingHour ?? null,
      syncDark,
      safeMode,
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

  /**
   * Remet le flag onboarding_completed à 0 pour rejouer la visite d'accueil.
   * Les données utilisateur sont conservées.
   */
  async resetOnboarding(now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE settings SET onboarding_completed = 0, updated_at = ? WHERE id = '1'`,
      now
    );
  },
};

/**
 * Repository pour les paramètres utilisateur.
 * Ligne unique en base (id = '1').
 */

import type { SQLiteBindValue } from 'expo-sqlite';
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
    id: (row.id as string) || '1',
    displayName: (row.display_name as string | null) ?? undefined,
    timezone: (row.timezone as string) || 'UTC',
    onboardingCompleted: (row.onboarding_completed as number) === 1,
    notificationsEnabled: row.notifications_enabled !== undefined ? (row.notifications_enabled as number) === 1 : true,
    forgottenContactThresholdDays: (row.forgotten_contact_threshold_days as number) ?? 30,
    endOfDayHour: (row.end_of_day_hour as number) ?? 20,
    morningBriefingHour: (row.morning_briefing_hour as number) ?? 8,
    appearanceMode,
    appearanceDark: row.appearance_dark !== undefined ? (row.appearance_dark as number) === 1 : true,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

export const SettingsRepository = {
  async get(): Promise<Settings> {
    const db = await getDatabase();
    let row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM settings WHERE id = ?', '1'
    );
    if (!row) {
      // Auto-réparation immédiate si la table settings est vide (ex: après effacement ou migration partielle)
      await db.runAsync(
        `INSERT OR IGNORE INTO settings (id, timezone, created_at, updated_at)
         VALUES ('1', 'UTC', datetime('now'), datetime('now'))`
      );
      row = await db.getFirstAsync<Record<string, unknown>>(
        'SELECT * FROM settings WHERE id = ?', '1'
      );
    }
    if (!row) {
      throw new Error('Impossible d\'initialiser les paramètres système.');
    }
    return rowToSettings(row);
  },

  async update(params: Partial<Omit<Settings, 'id' | 'createdAt'>> & { updatedAt: string }): Promise<void> {
    const setClauses: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (params.displayName !== undefined) {
      setClauses.push('display_name = ?');
      values.push(params.displayName);
    }
    if (params.timezone !== undefined) {
      setClauses.push('timezone = ?');
      values.push(params.timezone);
    }
    if (params.onboardingCompleted !== undefined) {
      setClauses.push('onboarding_completed = ?');
      values.push(params.onboardingCompleted ? 1 : 0);
    }
    if (params.notificationsEnabled !== undefined) {
      setClauses.push('notifications_enabled = ?');
      values.push(params.notificationsEnabled ? 1 : 0);
    }
    if (params.forgottenContactThresholdDays !== undefined) {
      setClauses.push('forgotten_contact_threshold_days = ?');
      values.push(params.forgottenContactThresholdDays);
    }
    if (params.endOfDayHour !== undefined) {
      setClauses.push('end_of_day_hour = ?');
      values.push(params.endOfDayHour);
    }
    if (params.morningBriefingHour !== undefined) {
      setClauses.push('morning_briefing_hour = ?');
      values.push(params.morningBriefingHour);
    }

    const safeMode =
      params.appearanceMode && VALID_APPEARANCE_MODES.has(params.appearanceMode)
        ? params.appearanceMode
        : null;

    if (params.appearanceMode !== undefined) {
      setClauses.push('appearance_mode = ?');
      values.push(safeMode);
    }

    let syncDark: number | null = null;
    if (params.appearanceDark !== undefined) {
      syncDark = params.appearanceDark ? 1 : 0;
    } else if (safeMode !== null) {
      syncDark = safeMode === 'light' ? 0 : 1;
    }

    if (syncDark !== null) {
      setClauses.push('appearance_dark = ?');
      values.push(syncDark);
    }

    setClauses.push('updated_at = ?');
    values.push(params.updatedAt);

    const db = await getDatabase();
    await db.runAsync(
      `UPDATE settings SET ${setClauses.join(', ')} WHERE id = '1'`,
      ...values
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

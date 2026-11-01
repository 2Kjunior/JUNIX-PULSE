/**
 * Repository pour les paramètres utilisateur.
 * Ligne unique en base (id = '1').
 */

import type { SQLiteBindValue } from 'expo-sqlite';
import { getDatabase } from '../database/sqlite';
import {
  AppearanceMode,
  MascotAddress,
  MascotPresence,
  MascotProposalsLevel,
  Settings,
} from '../domain/entities';
import { DEFAULT_MASCOT_SETTINGS } from '../domain/rules/mascot-preferences';

const VALID_APPEARANCE_MODES: ReadonlySet<AppearanceMode> = new Set(['system', 'light', 'dark']);
const VALID_MASCOT_PRESENCE: ReadonlySet<string> = new Set<MascotPresence>(['full', 'discreet', 'off']);
const VALID_MASCOT_ADDRESS: ReadonlySet<string> = new Set<MascotAddress>(['tu', 'vous']);
const VALID_MASCOT_PROPOSALS: ReadonlySet<string> = new Set<MascotProposalsLevel>(['normal', 'rare', 'off']);

/** Valeur lue si elle est valide, sinon la valeur par défaut : une ligne ancienne ou altérée ne casse rien. */
function validOr<T extends string>(raw: unknown, valid: ReadonlySet<string>, fallback: T): T {
  return typeof raw === 'string' && valid.has(raw) ? (raw as T) : fallback;
}

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
    notificationSoundEnabled: row.notification_sound_enabled !== undefined ? (row.notification_sound_enabled as number) === 1 : true,
    forgottenContactThresholdDays: (row.forgotten_contact_threshold_days as number) ?? 30,
    endOfDayHour: (row.end_of_day_hour as number) ?? 20,
    morningBriefingHour: (row.morning_briefing_hour as number) ?? 8,
    appearanceMode,
    appearanceDark: row.appearance_dark !== undefined ? (row.appearance_dark as number) === 1 : true,
    mascotPresence: validOr(row.mascot_presence, VALID_MASCOT_PRESENCE, DEFAULT_MASCOT_SETTINGS.presence),
    mascotAddress: validOr(row.mascot_address, VALID_MASCOT_ADDRESS, DEFAULT_MASCOT_SETTINGS.address),
    mascotProposals: validOr(row.mascot_proposals, VALID_MASCOT_PROPOSALS, DEFAULT_MASCOT_SETTINGS.proposals),
    mascotBriefings:
      row.mascot_briefings !== undefined ? (row.mascot_briefings as number) === 1 : DEFAULT_MASCOT_SETTINGS.briefings,
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
    if (params.notificationSoundEnabled !== undefined) {
      setClauses.push('notification_sound_enabled = ?');
      values.push(params.notificationSoundEnabled ? 1 : 0);
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

    if (params.mascotPresence !== undefined && VALID_MASCOT_PRESENCE.has(params.mascotPresence)) {
      setClauses.push('mascot_presence = ?');
      values.push(params.mascotPresence);
    }
    if (params.mascotAddress !== undefined && VALID_MASCOT_ADDRESS.has(params.mascotAddress)) {
      setClauses.push('mascot_address = ?');
      values.push(params.mascotAddress);
    }
    if (params.mascotProposals !== undefined && VALID_MASCOT_PROPOSALS.has(params.mascotProposals)) {
      setClauses.push('mascot_proposals = ?');
      values.push(params.mascotProposals);
    }
    if (params.mascotBriefings !== undefined) {
      setClauses.push('mascot_briefings = ?');
      values.push(params.mascotBriefings ? 1 : 0);
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

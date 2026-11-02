/**
 * The language of the app: reading the phone, applying the choice, and keeping it.
 */

import { getLocales } from 'expo-localization';

import type { AppLanguage, LanguageSetting } from '../domain/rules/language-rules';
import { resolveLanguage } from '../domain/rules/language-rules';
import { SettingsRepository } from '../repositories/settings-repository';
import { useAppStore } from '../store/app-store';
import { syncDailyRecapNotifications } from './daily-recap-service';
import { setMascotLanguage } from './mascot/mascot-runtime';
import { NotificationService } from './notification-service';
import { syncReminderNotifications } from './reminder-notification-service';
import { logger } from '../utils/logger';

/** The preferred languages of the phone, most wanted first. */
export function deviceLanguageTags(): string[] {
  try {
    return getLocales().map(locale => locale.languageTag);
  } catch {
    return [];
  }
}

/** Shows the language: the one picked, or the one of the phone on "auto". */
export function applyLanguage(setting: LanguageSetting): AppLanguage {
  const resolved = resolveLanguage(setting, deviceLanguageTags());
  useAppStore.getState().setLanguage(setting, resolved);
  setMascotLanguage(resolved);
  return resolved;
}

/** Applies the choice at once, then keeps it for the next launch. */
export async function changeLanguage(setting: LanguageSetting): Promise<void> {
  applyLanguage(setting);
  await SettingsRepository.update({ language: setting, updatedAt: new Date().toISOString() });
  await refreshNotificationTexts();
}

/** The channel names and the scheduled notifications hold text written in the previous language. */
async function refreshNotificationTexts(): Promise<void> {
  try {
    await NotificationService.initialize();
    await syncDailyRecapNotifications();
    await syncReminderNotifications();
  } catch {
    logger.error('[LanguageService] Erreur lors de la mise à jour des notifications');
  }
}

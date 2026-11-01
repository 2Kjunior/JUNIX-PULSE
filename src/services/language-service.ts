/**
 * The language of the app: reading the phone, applying the choice, and keeping it.
 */

import { getLocales } from 'expo-localization';

import type { AppLanguage, LanguageSetting } from '../domain/rules/language-rules';
import { resolveLanguage } from '../domain/rules/language-rules';
import { SettingsRepository } from '../repositories/settings-repository';
import { useAppStore } from '../store/app-store';

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
  return resolved;
}

/** Applies the choice at once, then keeps it for the next launch. */
export async function changeLanguage(setting: LanguageSetting): Promise<void> {
  applyLanguage(setting);
  await SettingsRepository.update({ language: setting, updatedAt: new Date().toISOString() });
}

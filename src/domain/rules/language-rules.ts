/**
 * Pure rules on the language of the app.
 *
 * The user either lets the app follow the language of the phone ("auto") or picks one. Only
 * French and English exist: a phone in any other language gets English, which is read by the
 * most people.
 */

export type AppLanguage = 'fr' | 'en';
export type LanguageSetting = 'auto' | AppLanguage;

export const LANGUAGE_SETTINGS: readonly LanguageSetting[] = ['auto', 'fr', 'en'];
export const DEFAULT_LANGUAGE_SETTING: LanguageSetting = 'auto';
/** Language used when the phone speaks a language the app does not have. */
export const FALLBACK_LANGUAGE: AppLanguage = 'en';

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return typeof value === 'string' && (LANGUAGE_SETTINGS as readonly string[]).includes(value);
}

/** "fr" for "fr-FR", "fr_CI" or "FR"; null for a tag that is empty or does not start with letters. */
export function primaryLanguageSubtag(tag: string | null | undefined): string | null {
  const match = /^([a-zA-Z]{2,3})(?:[-_]|$)/.exec((tag ?? '').trim());
  return match ? match[1].toLowerCase() : null;
}

/** The language of the phone among those the app has, from the tags of its preferred languages. */
export function languageFromDevice(deviceTags: readonly (string | null | undefined)[]): AppLanguage {
  for (const tag of deviceTags) {
    const subtag = primaryLanguageSubtag(tag);
    if (subtag === 'fr') return 'fr';
    if (subtag === 'en') return 'en';
  }
  return FALLBACK_LANGUAGE;
}

/** The language to show: the one picked, or, on "auto", the one of the phone. */
export function resolveLanguage(
  setting: LanguageSetting,
  deviceTags: readonly (string | null | undefined)[]
): AppLanguage {
  return setting === 'auto' ? languageFromDevice(deviceTags) : setting;
}

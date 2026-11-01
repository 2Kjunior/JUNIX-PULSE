/**
 * Pure translation: a key, a language and optional values give the text.
 *
 * Texts live in `messages.ts`, French first; English must have exactly the same keys, which the
 * compiler checks. A value is written `{name}` in a text and passed in `params`. A text that is
 * missing in the language asked falls back to French, then to the key itself, so a missing
 * translation shows as French text and never as an empty screen.
 */

import type { AppLanguage } from '../domain/rules/language-rules';
import { MESSAGES, MessageKey } from './messages';

export type TranslateParams = Readonly<Record<string, string | number>>;

export function interpolate(text: string, params?: TranslateParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder
  );
}

export function translate(language: AppLanguage, key: MessageKey, params?: TranslateParams): string {
  const text = MESSAGES[language][key] ?? MESSAGES.fr[key] ?? key;
  return interpolate(text, params);
}

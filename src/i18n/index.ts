/**
 * Translation for the screens: `const t = useT()` then `t('key')` or `t('key', { name })`.
 * The screen re-renders when the language changes. Code outside React uses `translate` with the
 * language read from the store.
 */

import { enUS, fr } from 'date-fns/locale';
import type { Locale } from 'date-fns';

import type { AppLanguage } from '../domain/rules/language-rules';
import { useAppStore } from '../store/app-store';
import type { MessageKey } from './messages';
import { translate, TranslateParams } from './translate';

export type { MessageKey } from './messages';
export type TFunction = (key: MessageKey, params?: TranslateParams) => string;

export function useT(): TFunction {
  const language = useAppStore(state => state.language);
  return (key, params) => translate(language, key, params);
}

/** The language being shown, for code that has to choose among its own texts. */
export function useLanguage(): AppLanguage {
  return useAppStore(state => state.language);
}

/** The date-fns locale of the language being shown. */
export function useDateLocale(): Locale {
  return useAppStore(state => state.language) === 'fr' ? fr : enUS;
}

/** The text in the language being shown, read now: for code that is not a component. */
export function t(key: MessageKey, params?: TranslateParams): string {
  return translate(useAppStore.getState().language, key, params);
}

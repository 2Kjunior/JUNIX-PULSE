import {
  DEFAULT_LANGUAGE_SETTING,
  FALLBACK_LANGUAGE,
  isLanguageSetting,
  languageFromDevice,
  primaryLanguageSubtag,
  resolveLanguage,
} from '../language-rules';

describe('primaryLanguageSubtag', () => {
  it('reads the language of a tag, whatever the region or the separator', () => {
    expect(primaryLanguageSubtag('fr')).toBe('fr');
    expect(primaryLanguageSubtag('fr-FR')).toBe('fr');
    expect(primaryLanguageSubtag('fr_CI')).toBe('fr');
    expect(primaryLanguageSubtag('EN-us')).toBe('en');
    expect(primaryLanguageSubtag('  en-GB ')).toBe('en');
    expect(primaryLanguageSubtag('fil-PH')).toBe('fil');
  });

  it('reads nothing from an empty or malformed tag', () => {
    for (const tag of ['', '   ', '-', '12', null, undefined]) expect(primaryLanguageSubtag(tag)).toBeNull();
  });
});

describe('languageFromDevice', () => {
  it('takes the first of the preferred languages that the app has', () => {
    expect(languageFromDevice(['fr-FR', 'en-US'])).toBe('fr');
    expect(languageFromDevice(['en-US', 'fr-FR'])).toBe('en');
    expect(languageFromDevice(['es-ES', 'fr-FR'])).toBe('fr');
    expect(languageFromDevice(['de-DE', 'ar', 'en-GB'])).toBe('en');
  });

  it('falls back to English when the phone speaks none of them', () => {
    expect(languageFromDevice(['es-ES', 'de-DE'])).toBe(FALLBACK_LANGUAGE);
    expect(languageFromDevice([])).toBe('en');
    expect(languageFromDevice([null, undefined, ''])).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('follows the phone on auto', () => {
    expect(resolveLanguage('auto', ['fr-CI'])).toBe('fr');
    expect(resolveLanguage('auto', ['en-US'])).toBe('en');
    expect(resolveLanguage('auto', ['ja-JP'])).toBe('en');
  });

  it('keeps the language that was picked, whatever the phone says', () => {
    expect(resolveLanguage('fr', ['en-US'])).toBe('fr');
    expect(resolveLanguage('en', ['fr-FR'])).toBe('en');
  });
});

describe('isLanguageSetting', () => {
  it('accepts the three choices and nothing else', () => {
    for (const value of ['auto', 'fr', 'en']) expect(isLanguageSetting(value)).toBe(true);
    for (const value of ['es', '', 'FR', null, undefined, 3]) expect(isLanguageSetting(value)).toBe(false);
  });

  it('starts on auto', () => {
    expect(DEFAULT_LANGUAGE_SETTING).toBe('auto');
  });
});

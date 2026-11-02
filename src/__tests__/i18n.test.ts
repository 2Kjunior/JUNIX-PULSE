/**
 * Translation: both languages have every text, with the same values to fill in.
 */

import { MESSAGES, MessageKey } from '../i18n/messages';
import { interpolate, translate } from '../i18n/translate';

const KEYS = Object.keys(MESSAGES.fr) as MessageKey[];

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
}

describe('messages', () => {
  it('has the same keys in French and in English', () => {
    expect(Object.keys(MESSAGES.en).sort()).toEqual([...KEYS].sort());
  });

  it('has no empty text', () => {
    for (const key of KEYS) {
      expect(MESSAGES.fr[key].trim()).not.toBe('');
      expect(MESSAGES.en[key].trim()).not.toBe('');
    }
  });

  it('asks for the same values in both languages', () => {
    for (const key of KEYS) {
      expect({ key, values: placeholders(MESSAGES.en[key]) }).toEqual({ key, values: placeholders(MESSAGES.fr[key]) });
    }
  });

  it('writes no emoji', () => {
    // Typographic marks such as a check or an arrow are fine; only pictures shown as emoji are not
    const emoji = /\p{Emoji_Presentation}/u;
    for (const key of KEYS) {
      expect(emoji.test(MESSAGES.fr[key])).toBe(false);
      expect(emoji.test(MESSAGES.en[key])).toBe(false);
    }
  });
});

describe('interpolate', () => {
  it('fills the values by name', () => {
    expect(interpolate('Chez {name} : {time}', { name: 'Maman', time: '14:30' })).toBe('Chez Maman : 14:30');
  });

  it('writes numbers', () => {
    expect(interpolate('{count} jours', { count: 3 })).toBe('3 jours');
  });

  it('keeps a value that was not given, so a mistake shows instead of hiding', () => {
    expect(interpolate('Bonjour {name}', {})).toBe('Bonjour {name}');
    expect(interpolate('Bonjour {name}')).toBe('Bonjour {name}');
  });
});

describe('translate', () => {
  it('gives the text of the language asked', () => {
    expect(translate('fr', 'tab.tasks')).toBe('Tâches');
    expect(translate('en', 'tab.tasks')).toBe('Tasks');
  });

  it('fills the values', () => {
    expect(translate('en', 'capture.callInfo', { time: '12:00', name: 'Mom' })).toBe(
      'At that time, it will be 12:00 for Mom.'
    );
    expect(translate('fr', 'capture.callInfo', { time: '12:00', name: 'Maman' })).toBe(
      'À ce moment, il sera 12:00 chez Maman.'
    );
  });
});

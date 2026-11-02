import { translate } from '@/i18n/translate';
import { suggestionTexts } from '@/i18n/suggestion-text';
import { formatSpokenTime, localizeSpokenTime } from '@/domain/rules/mascot-suggestion-rules';
import type { SuggestionType } from '@/domain/enums';

const french = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
  translate('fr', key, params);
const english = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
  translate('en', key, params);

const make = (type: SuggestionType, data: object | null) => ({
  type,
  title: 'Titre stocké',
  explanation: 'Explication stockée',
  proposedData: data ? JSON.stringify(data) : null,
});

describe('suggestionTexts', () => {
  it('builds the English texts from the parameters of the suggestion', () => {
    const texts = suggestionTexts(make('FORGOTTEN_CONTACT', { person: 'Maman', days: 31 }), 'en', english);
    expect(texts.title).toBe('Check in on Maman');
    expect(texts.explanation).toBe('You have not interacted with Maman for 31 days.');
  });

  it('builds the French texts the same way', () => {
    const texts = suggestionTexts(make('GOAL_APPROACHING', { goal: 'Permis', days: 5, percent: 40 }), 'fr', french);
    expect(texts.title).toBe('L’objectif « Permis » approche');
    expect(texts.explanation).toBe('Échéance dans 5 jours.');
  });

  it('says a birthday today differently from one to come', () => {
    expect(suggestionTexts(make('BIRTHDAY_REMINDER', { person: 'Awa', days: 0 }), 'en', english).title).toBe(
      'Awa’s birthday today'
    );
    expect(suggestionTexts(make('BIRTHDAY_REMINDER', { person: 'Awa', days: 3 }), 'en', english).title).toBe(
      'Awa’s birthday in 3 days'
    );
  });

  it('picks the singular for one task', () => {
    expect(suggestionTexts(make('POSTPONE_TASK', { count: 1 }), 'en', english).title).toBe('Move 1 task to tomorrow');
    expect(suggestionTexts(make('POSTPONE_TASK', { count: 4 }), 'en', english).title).toBe('Move 4 tasks to tomorrow');
  });

  it('keeps the stored texts when the parameters are missing', () => {
    expect(suggestionTexts(make('OVERLOADED_DAY', null), 'en', english)).toEqual({
      title: 'Titre stocké',
      explanation: 'Explication stockée',
    });
    expect(suggestionTexts(make('OVERLOADED_DAY', { count: 'beaucoup' }), 'en', english).title).toBe('Titre stocké');
  });
});

describe('spoken time', () => {
  it('is said in the form of the language', () => {
    const at = new Date(2026, 10, 2, 9, 30);
    expect(formatSpokenTime(at, 'fr')).toBe('9 h 30');
    expect(formatSpokenTime(at, 'en')).toBe('9:30');
    expect(formatSpokenTime(new Date(2026, 10, 2, 18, 0), 'en')).toBe('18:00');
  });

  it('turns a stored French time into the language shown', () => {
    expect(localizeSpokenTime('9 h', 'en')).toBe('9:00');
    expect(localizeSpokenTime('14 h 05', 'en')).toBe('14:05');
    expect(localizeSpokenTime('14 h 05', 'fr')).toBe('14 h 05');
    expect(localizeSpokenTime('noon', 'en')).toBe('noon');
  });
});

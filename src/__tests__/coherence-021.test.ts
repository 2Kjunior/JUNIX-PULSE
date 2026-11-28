import { PULSE_CONCEPTS, PULSE_CONCEPT_DEFINITIONS } from '../constants/pulse-concepts';
import { DISCOVER_CARD_MESSAGES } from '../domain/rules/mascot-guide-rules';
import { ONBOARDING_FEATURES } from '../constants/onboarding-features';
import { MASCOT_MESSAGES } from '../domain/rules/mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../domain/rules/mascot-message-catalog-en';
import { translate } from '../i18n/translate';

describe('the five things of Junix Pulse (study 001, 15.1; sheet 021)', () => {
  it('lists them in the order the user learns them', () => {
    expect(PULSE_CONCEPTS).toEqual(['task', 'reminder', 'moment', 'habit', 'goal']);
  });

  // The 2nd onboarding screen shows the four flagship features now (sheet 044)
  it('gives the mascot one sentence per card of the 2nd onboarding screen', () => {
    expect(DISCOVER_CARD_MESSAGES).toHaveLength(ONBOARDING_FEATURES.length);
    for (const message of DISCOVER_CARD_MESSAGES) {
      expect(MASCOT_MESSAGES[message.id]).toBeDefined();
      expect(MASCOT_MESSAGES_EN[message.id]).toBeDefined();
    }
  });

  it('names them with the words used everywhere else, in both languages', () => {
    const titles = (lang: 'fr' | 'en') => PULSE_CONCEPTS.map(c => translate(lang, PULSE_CONCEPT_DEFINITIONS[c].titleKey));
    expect(titles('fr')).toEqual(['Tâche', 'Rappel', 'Moment', 'Habitude', 'Objectif']);
    expect(titles('en')).toEqual(['Task', 'Reminder', 'Moment', 'Habit', 'Goal']);
    for (const c of PULSE_CONCEPTS) {
      for (const lang of ['fr', 'en'] as const) {
        expect(translate(lang, PULSE_CONCEPT_DEFINITIONS[c].descKey).length).toBeGreaterThan(0);
        expect(translate(lang, PULSE_CONCEPT_DEFINITIONS[c].exampleKey).length).toBeGreaterThan(0);
      }
    }
  });

  it('no longer speaks of the circle of a task, nor of events, in its bubbles', () => {
    const texts = JSON.stringify([MASCOT_MESSAGES.TIP_TASKS, MASCOT_MESSAGES.TOUR_QUICK_ADD, MASCOT_MESSAGES.TOUR_PILLARS]);
    expect(texts).not.toMatch(/cercle|événement/);
  });
});

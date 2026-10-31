/**
 * Unit tests linking suggestions to the mascot's voice.
 */

import { SuggestionType } from '../../enums';
import { MASCOT_MESSAGES } from '../mascot-message-catalog';
import { resolveMascotMessage, templateParams } from '../mascot-message-rules';
import { DEFAULT_MASCOT_PREFERENCES, PROPOSAL_FAMILIES } from '../mascot-preferences';
import {
  forgottenContactData,
  formatFrenchTime,
  missedReminderData,
  streakAtRiskData,
  suggestionMood,
  suggestionProposalId,
  suggestionToMascotMessage,
} from '../mascot-suggestion-rules';

const TYPES: SuggestionType[] = [
  'FORGOTTEN_CONTACT',
  'RESCHEDULE_REMINDER',
  'HABIT_REMINDER',
  'BIRTHDAY_REMINDER',
  'POSTPONE_TASK',
  'OVERLOADED_DAY',
  'PLANNING_CONFLICT',
];

describe('suggestionProposalId', () => {
  it.each([
    ['FORGOTTEN_CONTACT', 'P1'],
    ['RESCHEDULE_REMINDER', 'P2'],
    ['HABIT_REMINDER', 'P3'],
    ['BIRTHDAY_REMINDER', 'P4'],
    ['POSTPONE_TASK', 'P5'],
    ['OVERLOADED_DAY', 'P6'],
    ['PLANNING_CONFLICT', 'P7'],
  ] as const)('%s is %s', (type, id) => {
    expect(suggestionProposalId(type)).toBe(id);
  });

  it('only maps to proposals that exist', () => {
    for (const type of TYPES) {
      expect(PROPOSAL_FAMILIES).toHaveProperty(suggestionProposalId(type));
    }
  });
});

describe('suggestionMood', () => {
  it('has a mood for every type, never the sleepy or focused ones', () => {
    for (const type of TYPES) {
      expect(['calm', 'happy', 'alert', 'party']).toContain(suggestionMood(type));
    }
  });

  it('celebrates a birthday and keeps a missed reminder on soft alert', () => {
    expect(suggestionMood('BIRTHDAY_REMINDER')).toBe('party');
    expect(suggestionMood('RESCHEDULE_REMINDER')).toBe('alert');
  });
});

describe('formatFrenchTime', () => {
  it.each([
    [new Date(2026, 0, 1, 9, 0), '9 h'],
    [new Date(2026, 0, 1, 9, 30), '9 h 30'],
    [new Date(2026, 0, 1, 19, 5), '19 h 05'],
    [new Date(2026, 0, 1, 0, 0), '0 h'],
  ])('%s is said %s', (date, expected) => {
    expect(formatFrenchTime(date)).toBe(expected);
  });
});

describe('builders and suggestionToMascotMessage', () => {
  it('turns a forgotten contact into its message', () => {
    const suggestion = { type: 'FORGOTTEN_CONTACT' as const, title: 't', proposedData: forgottenContactData('Awa', 31) };
    expect(suggestionToMascotMessage(suggestion)).toEqual({
      id: 'FORGOTTEN_CONTACT',
      params: { days: 31, person: 'Awa' },
    });
  });

  it('turns a missed reminder into its message', () => {
    const data = missedReminderData('Appeler papa', new Date(2026, 0, 1, 9, 0));
    expect(suggestionToMascotMessage({ type: 'RESCHEDULE_REMINDER', title: 't', proposedData: data })).toEqual({
      id: 'MISSED_REMINDER',
      params: { title: 'Appeler papa', time: '9 h' },
    });
  });

  it('turns a streak at risk into its message', () => {
    expect(
      suggestionToMascotMessage({ type: 'HABIT_REMINDER', title: 't', proposedData: streakAtRiskData('Lecture', 6) })
    ).toEqual({ id: 'STREAK_AT_RISK', params: { title: 'Lecture', streak: 6 } });
  });

  it('gives a message every builder output can render in the catalogue', () => {
    const cases = [
      { type: 'FORGOTTEN_CONTACT' as const, proposedData: forgottenContactData('Élodie', 40) },
      { type: 'RESCHEDULE_REMINDER' as const, proposedData: missedReminderData('Rappel', new Date(2026, 0, 1, 7, 45)) },
      { type: 'HABIT_REMINDER' as const, proposedData: streakAtRiskData('Sport', 1) },
    ];
    for (const { type, proposedData } of cases) {
      const message = suggestionToMascotMessage({ type, title: 't', proposedData });
      expect(message).not.toBeNull();
      const text = resolveMascotMessage(message!.id, message!.params, DEFAULT_MASCOT_PREFERENCES, 'Awa');
      expect(text).toEqual(expect.any(String));
      expect(text).not.toMatch(/[{}]/);
    }
  });

  it('keeps a quote or a line break in a title intact', () => {
    const title = 'Dîner « chez Awa »\nà 19 h "ok"';
    const message = suggestionToMascotMessage({
      type: 'HABIT_REMINDER', title: 't', proposedData: streakAtRiskData(title, 2),
    });
    expect(message?.params).toMatchObject({ title });
  });

  it.each([
    ['no data', undefined],
    ['null', null],
    ['empty text', ''],
    ['broken json', '{oops'],
    ['an array', '[1,2]'],
    ['a number', '42'],
    ['a missing field', JSON.stringify({ person: 'Awa' })],
    ['a wrong type', JSON.stringify({ person: 'Awa', days: '31' })],
    ['a non finite number', '{"person":"Awa","days":null}'],
  ])('falls back to the title for %s', (_label, proposedData) => {
    expect(suggestionToMascotMessage({ type: 'FORGOTTEN_CONTACT', title: 't', proposedData })).toBeNull();
  });

  it('ignores extra fields', () => {
    const proposedData = JSON.stringify({ person: 'Awa', days: 3, extra: true });
    expect(suggestionToMascotMessage({ type: 'FORGOTTEN_CONTACT', title: 't', proposedData })?.params).toEqual({
      person: 'Awa',
      days: 3,
    });
  });

  it('asks for exactly the parameters its catalogue message needs', () => {
    const data: Record<string, string> = {
      FORGOTTEN_CONTACT: forgottenContactData('Awa', 1),
      RESCHEDULE_REMINDER: missedReminderData('x', new Date(2026, 0, 1, 9, 0)),
      HABIT_REMINDER: streakAtRiskData('x', 1),
    };
    for (const type of ['FORGOTTEN_CONTACT', 'RESCHEDULE_REMINDER', 'HABIT_REMINDER'] as const) {
      const message = suggestionToMascotMessage({ type, title: 't', proposedData: data[type] })!;
      const needed = templateParams(MASCOT_MESSAGES[message.id].tu.warm.plain);
      expect(Object.keys(message.params).sort()).toEqual(needed);
    }
  });
});

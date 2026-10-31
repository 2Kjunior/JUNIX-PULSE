/**
 * Unit tests for the pure mascot mood rules.
 */

import {
  ALERT_REST_INTENSITY,
  deriveMascotMood,
  isNightHour,
  MascotMoodInput,
} from '../mascot-mood-rules';

const baseInput: MascotMoodInput = {
  hour: 12,
  focusState: 'idle',
  hasUrgentPendingReminder: false,
  todayTaskTotal: 0,
  todayTaskCompleted: 0,
  birthdayToday: false,
  daysSinceLastOpen: 0,
};

const moodOf = (overrides: Partial<MascotMoodInput>) =>
  deriveMascotMood({ ...baseInput, ...overrides }).mood;

describe('isNightHour', () => {
  it.each([
    [22, false],
    [23, true],
    [0, true],
    [4, true],
    [5, false],
  ])('hour %i gives %s', (hour, expected) => {
    expect(isNightHour(hour)).toBe(expected);
  });
});

describe('deriveMascotMood', () => {
  it('is calm when nothing particular happens', () => {
    expect(deriveMascotMood(baseInput)).toEqual({ mood: 'calm', intensity: 1 });
  });

  it.each(['running', 'paused'] as const)('is focused while a session is %s', focusState => {
    expect(moodOf({ focusState })).toBe('focused');
  });

  it.each(['idle', 'completed'] as const)('is not focused when the session is %s', focusState => {
    expect(moodOf({ focusState })).toBe('calm');
  });

  it('rests on a soft alert while an urgent reminder is pending', () => {
    expect(deriveMascotMood({ ...baseInput, hasUrgentPendingReminder: true })).toEqual({
      mood: 'alert',
      intensity: ALERT_REST_INTENSITY,
    });
  });

  it('is happy once every task of the day is done', () => {
    expect(moodOf({ todayTaskTotal: 3, todayTaskCompleted: 3 })).toBe('happy');
  });

  it('is not happy while a task remains', () => {
    expect(moodOf({ todayTaskTotal: 3, todayTaskCompleted: 2 })).toBe('calm');
  });

  it('is not happy on a day without tasks', () => {
    expect(moodOf({ todayTaskTotal: 0, todayTaskCompleted: 0 })).toBe('calm');
  });

  it('celebrates a birthday', () => {
    expect(moodOf({ birthdayToday: true })).toBe('party');
  });

  it.each([
    [22, 'calm'],
    [23, 'sleepy'],
    [4, 'sleepy'],
    [5, 'calm'],
  ])('at %i h the mood is %s', (hour, expected) => {
    expect(moodOf({ hour })).toBe(expected);
  });

  it.each([
    [2, 'calm'],
    [3, 'sleepy'],
    [10, 'sleepy'],
  ])('after %i days away the mood is %s', (daysSinceLastOpen, expected) => {
    expect(moodOf({ daysSinceLastOpen })).toBe(expected);
  });

  it('stays calm on a very first opening', () => {
    expect(moodOf({ daysSinceLastOpen: null })).toBe('calm');
  });

  describe('priority', () => {
    const everything: Partial<MascotMoodInput> = {
      hour: 2,
      focusState: 'running',
      hasUrgentPendingReminder: true,
      todayTaskTotal: 1,
      todayTaskCompleted: 1,
      birthdayToday: true,
      daysSinceLastOpen: 5,
    };

    it('puts focus above everything', () => {
      expect(moodOf(everything)).toBe('focused');
    });

    it('puts alert above the night', () => {
      expect(moodOf({ ...everything, focusState: 'idle' })).toBe('alert');
    });

    it('puts the night above a birthday and finished tasks', () => {
      expect(
        moodOf({ ...everything, focusState: 'idle', hasUrgentPendingReminder: false })
      ).toBe('sleepy');
    });

    const daytime: Partial<MascotMoodInput> = {
      ...everything,
      hour: 12,
      focusState: 'idle',
      hasUrgentPendingReminder: false,
    };

    it('puts a birthday above finished tasks', () => {
      expect(moodOf(daytime)).toBe('party');
    });

    it('puts finished tasks above a long absence', () => {
      expect(moodOf({ ...daytime, birthdayToday: false })).toBe('happy');
    });
  });
});

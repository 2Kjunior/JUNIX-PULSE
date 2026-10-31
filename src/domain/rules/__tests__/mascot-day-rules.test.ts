/**
 * Unit tests for the day data rules feeding the mascot's resting mood.
 */

import {
  buildMascotMoodInput,
  isBirthdayToday,
  MascotDayInput,
  MascotDayReminder,
  pendingUrgentReminders,
} from '../mascot-day-rules';
import { deriveMascotMood } from '../mascot-mood-rules';

const NOW = new Date(2026, 9, 31, 14, 30); // 31 October 2026, 14:30 local

const reminder = (overrides: Partial<MascotDayReminder> = {}): MascotDayReminder => ({
  id: 'r1',
  priority: 'URGENT',
  status: 'TRIGGERED',
  scheduledAt: new Date(2026, 9, 31, 9, 0).toISOString(),
  ...overrides,
});

const day = (overrides: Partial<MascotDayInput> = {}): MascotDayInput => ({
  now: NOW,
  focusState: 'idle',
  reminders: [],
  todayTasks: [],
  persons: [],
  daysSinceLastOpen: null,
  ...overrides,
});

describe('isBirthdayToday', () => {
  it.each([
    ['1990-10-31', true],
    ['2005-10-31', true],
    ['1990-10-30', false],
    ['1990-11-31', false],
    ['1990-09-30', false],
    ['1990-10-31T00:00:00Z', true],
    ['not a date', false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('%j is today: %s', (birthDate, expected) => {
    expect(isBirthdayToday(birthDate, NOW)).toBe(expected);
  });

  it('counts a 29 February birthday only on that day', () => {
    expect(isBirthdayToday('2000-02-29', new Date(2026, 1, 28))).toBe(false);
    expect(isBirthdayToday('2000-02-29', new Date(2028, 1, 29))).toBe(true);
  });
});

describe('pendingUrgentReminders', () => {
  it('keeps an urgent reminder whose time has come', () => {
    expect(pendingUrgentReminders([reminder()], NOW)).toHaveLength(1);
  });

  it.each(['COMPLETED', 'DELETED'] as const)('drops a %s reminder', status => {
    expect(pendingUrgentReminders([reminder({ status })], NOW)).toEqual([]);
  });

  it.each(['UPCOMING', 'TRIGGERED', 'SNOOZED', 'MISSED'] as const)('keeps a %s reminder', status => {
    expect(pendingUrgentReminders([reminder({ status })], NOW)).toHaveLength(1);
  });

  it.each(['HIGH', 'NORMAL', 'LOW'] as const)('ignores a %s priority', priority => {
    expect(pendingUrgentReminders([reminder({ priority })], NOW)).toEqual([]);
  });

  it('ignores a reminder still in the future', () => {
    const later = new Date(2026, 9, 31, 18, 0).toISOString();
    expect(pendingUrgentReminders([reminder({ scheduledAt: later })], NOW)).toEqual([]);
  });

  it('ignores an unreadable date', () => {
    expect(pendingUrgentReminders([reminder({ scheduledAt: 'oops' })], NOW)).toEqual([]);
  });

  it('puts the oldest first', () => {
    const older = reminder({ id: 'old', scheduledAt: new Date(2026, 9, 30, 8, 0).toISOString() });
    const newer = reminder({ id: 'new' });
    expect(pendingUrgentReminders([newer, older], NOW).map(r => r.id)).toEqual(['old', 'new']);
  });
});

describe('buildMascotMoodInput', () => {
  it('reads the hour from the clock it is given', () => {
    expect(buildMascotMoodInput(day()).hour).toBe(14);
  });

  it('counts the tasks of the day and the completed ones', () => {
    const input = buildMascotMoodInput(
      day({ todayTasks: [{ status: 'COMPLETED' }, { status: 'SCHEDULED' }, { status: 'COMPLETED' }] })
    );
    expect(input).toMatchObject({ todayTaskTotal: 3, todayTaskCompleted: 2 });
  });

  it('flags a birthday among the persons', () => {
    expect(buildMascotMoodInput(day({ persons: [{ birthDate: '1990-10-31' }] })).birthdayToday).toBe(true);
    expect(buildMascotMoodInput(day({ persons: [{ birthDate: '1990-10-30' }, {}] })).birthdayToday).toBe(false);
  });

  it('flags a pending urgent reminder', () => {
    expect(buildMascotMoodInput(day({ reminders: [reminder()] })).hasUrgentPendingReminder).toBe(true);
    expect(buildMascotMoodInput(day()).hasUrgentPendingReminder).toBe(false);
  });

  it('passes the focus state and the absence through', () => {
    expect(buildMascotMoodInput(day({ focusState: 'running', daysSinceLastOpen: 4 }))).toMatchObject({
      focusState: 'running',
      daysSinceLastOpen: 4,
    });
  });

  describe('with the mood rules', () => {
    const moodOf = (overrides: Partial<MascotDayInput>) =>
      deriveMascotMood(buildMascotMoodInput(day(overrides))).mood;

    it('is calm on an ordinary day', () => {
      expect(moodOf({ todayTasks: [{ status: 'SCHEDULED' }] })).toBe('calm');
    });

    it('is happy once every task is done', () => {
      expect(moodOf({ todayTasks: [{ status: 'COMPLETED' }] })).toBe('happy');
    });

    it('is on alert for an unsettled urgent reminder', () => {
      expect(moodOf({ reminders: [reminder()], todayTasks: [{ status: 'COMPLETED' }] })).toBe('alert');
    });

    it('celebrates a birthday', () => {
      expect(moodOf({ persons: [{ birthDate: '1990-10-31' }] })).toBe('party');
    });
  });
});

import {
  DURATION_SHORTCUTS,
  MAX_DURATION_MINUTES,
  durationOf,
  durationParts,
  focusPlan,
  isShortcut,
  stepDuration,
} from '../duration-rules';

describe('duration-rules (sheet 033)', () => {
  it('keeps a time between 1 minute and 12 hours', () => {
    expect(durationOf(undefined)).toBeUndefined();
    expect(durationOf(0)).toBeUndefined();
    expect(durationOf(-5)).toBeUndefined();
    expect(durationOf(300)).toBe(300);
    expect(durationOf(10_000)).toBe(MAX_DURATION_MINUTES);
    expect(durationOf(44.6)).toBe(45);
  });

  it('cuts a time into hours and minutes', () => {
    expect(durationParts(300)).toEqual({ hours: 5, minutes: 0 });
    expect(durationParts(95)).toEqual({ hours: 1, minutes: 35 });
  });

  it('steps "Autre" by hours and by quarters, never past 12 h', () => {
    expect(stepDuration(240, 'hours', 1)).toBe(300);
    expect(stepDuration(60, 'hours', -1)).toBe(0);
    expect(stepDuration(0, 'hours', -1)).toBe(0);
    expect(stepDuration(60, 'minutes', 1)).toBe(75);
    expect(stepDuration(105, 'minutes', 1)).toBe(60);
    expect(stepDuration(60, 'minutes', -1)).toBe(105);
    expect(stepDuration(11 * 60 + 45, 'hours', 1)).toBe(MAX_DURATION_MINUTES);
  });

  it('knows the shortcuts', () => {
    expect(DURATION_SHORTCUTS).toEqual([30, 60, 120, 240]);
    expect(isShortcut(undefined)).toBe(true);
    expect(isShortcut(120)).toBe(true);
    expect(isShortcut(300)).toBe(false);
    // An old task of 15 or 45 minutes shows on "Autre"
    expect(isShortcut(45)).toBe(false);
  });

  it('plans Focus in sessions of 50 minutes', () => {
    expect(focusPlan(undefined)).toBeNull();
    expect(focusPlan(300)).toEqual({ sessionMinutes: 50, session: 1, sessions: 6, leftMinutes: 300 });
    expect(focusPlan(300, 100)).toEqual({ sessionMinutes: 50, session: 3, sessions: 6, leftMinutes: 200 });
    // The last session takes what is left
    expect(focusPlan(300, 280)).toEqual({ sessionMinutes: 20, session: 6, sessions: 6, leftMinutes: 20 });
    expect(focusPlan(40)).toEqual({ sessionMinutes: 40, session: 1, sessions: 1, leftMinutes: 40 });
    // All done: one more session of 50, if the person wants it
    expect(focusPlan(60, 90)).toEqual({ sessionMinutes: 50, session: 2, sessions: 2, leftMinutes: 0 });
  });
});

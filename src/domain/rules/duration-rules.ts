/**
 * "Temps pour le faire" (study 001, 16.8 C; sheet 033): four shortcuts and "Autre", any time up to
 * 12 hours (longer: subtasks). Pure: the form, the cards, the Planning and Focus read it.
 */

/** The shortcuts of the form, in minutes. */
export const DURATION_SHORTCUTS: readonly number[] = [30, 60, 120, 240];
/** The longest time to do one thing: beyond it, cut it into subtasks. */
export const MAX_DURATION_MINUTES = 12 * 60;
/** The minutes "Autre" offers, with the hours. */
export const DURATION_MINUTE_STEPS: readonly number[] = [0, 15, 30, 45];

/** A time kept between 1 minute and 12 hours, in whole minutes; anything else is no time. */
export function durationOf(minutes: number | null | undefined): number | undefined {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) return undefined;
  return Math.min(MAX_DURATION_MINUTES, Math.round(minutes));
}

/** Its hours and minutes, for "Autre" and for the labels. */
export function durationParts(minutes: number): { hours: number; minutes: number } {
  const total = durationOf(minutes) ?? 0;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** One more or one less step of "Autre": hours from 0 to 12, minutes by 15, never past 12 h. */
export function stepDuration(current: number, part: 'hours' | 'minutes', by: 1 | -1): number {
  const { hours, minutes } = durationParts(current);
  if (part === 'hours') {
    const next = Math.min(12, Math.max(0, hours + by));
    return Math.min(MAX_DURATION_MINUTES, next * 60 + (next === 12 ? 0 : minutes));
  }
  const index = DURATION_MINUTE_STEPS.indexOf(minutes);
  const nextIndex = (Math.max(index, 0) + by + DURATION_MINUTE_STEPS.length) % DURATION_MINUTE_STEPS.length;
  return Math.min(MAX_DURATION_MINUTES, hours * 60 + DURATION_MINUTE_STEPS[nextIndex]);
}

/** Whether a time is one of the shortcuts: otherwise the form shows it on "Autre". */
export function isShortcut(minutes: number | undefined): boolean {
  return minutes === undefined || DURATION_SHORTCUTS.includes(minutes);
}

/**
 * Focus in sessions (study 16.8 D): a long task is done in sessions of 50 minutes; the last one
 * takes what is left. A task of 5 h is 6 sessions; one of 40 min is one session of 40.
 */
export const FOCUS_SESSION_MINUTES = 50;

export function focusPlan(estimatedMinutes: number | undefined, doneMinutes = 0): {
  /** The length of the next session. */
  sessionMinutes: number;
  /** Its number, from 1. */
  session: number;
  /** How many there are in all. */
  sessions: number;
  /** What is left to do, in minutes. */
  leftMinutes: number;
} | null {
  const total = durationOf(estimatedMinutes);
  if (!total) return null;
  const done = Math.max(0, Math.min(total, Math.round(doneMinutes)));
  const sessions = Math.ceil(total / FOCUS_SESSION_MINUTES);
  const leftMinutes = total - done;
  const session = Math.min(sessions, Math.floor(done / FOCUS_SESSION_MINUTES) + 1);
  const sessionMinutes = Math.max(1, Math.min(FOCUS_SESSION_MINUTES, leftMinutes || FOCUS_SESSION_MINUTES));
  return { sessionMinutes, session, sessions, leftMinutes };
}

/**
 * Pure rules deriving the resting mood of the Pulse mascot.
 * Priority: focused > alert > sleepy (night) > party > happy > sleepy (long absence) > calm.
 * Deterministic and testable without React or SQLite.
 */

import { FocusState } from './focus-rules';

export type MascotMood = 'calm' | 'happy' | 'focused' | 'alert' | 'sleepy' | 'party' | 'worried';

export const NIGHT_START_HOUR = 23;
export const NIGHT_END_HOUR = 5;
export const LONG_ABSENCE_DAYS = 3;
/** After a long absence Pulse wakes up with the user: sleepy for these first minutes only. */
export const ABSENCE_MOOD_MINUTES = 5;
export const ALERT_REST_INTENSITY = 0.45;
/** Open tasks and reminders of today from which the day is overloaded, as for the suggestion. */
export const WORRIED_ITEM_THRESHOLD = 8;

export interface MascotMoodInput {
  hour: number; // Local hour, 0 to 23
  focusState: FocusState;
  hasUrgentPendingReminder: boolean;
  todayTaskTotal: number;
  todayTaskCompleted: number;
  birthdayToday: boolean;
  daysSinceLastOpen: number | null; // null when the app has never been opened before
  /** Open tasks and pending reminders of today. */
  todayOpenItemCount?: number;
}

export interface MascotMoodState {
  mood: MascotMood;
  intensity: number; // 0 to 1, how strongly the mood is expressed
}

/**
 * The days of absence the mood takes into account: those measured at launch, during the first
 * minutes after it only. Without a launch time (never opened, or unknown) there is no absence.
 */
export function absenceDaysForMood(days: number | null, launchedAt: number | null, now: number): number | null {
  if (days === null || launchedAt === null) return null;
  return now - launchedAt < ABSENCE_MOOD_MINUTES * 60_000 ? days : null;
}

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * A paused session is still in progress, so it keeps the focused mood.
 */
function isFocusInProgress(focusState: FocusState): boolean {
  return focusState === 'running' || focusState === 'paused';
}

export function deriveMascotMood(input: MascotMoodInput): MascotMoodState {
  if (isFocusInProgress(input.focusState)) {
    return { mood: 'focused', intensity: 1 };
  }
  if (input.hasUrgentPendingReminder) {
    return { mood: 'alert', intensity: ALERT_REST_INTENSITY };
  }
  if (isNightHour(input.hour)) {
    return { mood: 'sleepy', intensity: 1 };
  }
  if (input.birthdayToday) {
    return { mood: 'party', intensity: 1 };
  }
  if (input.todayTaskTotal > 0 && input.todayTaskCompleted >= input.todayTaskTotal) {
    return { mood: 'happy', intensity: 1 };
  }
  // An overloaded day: Pulse looks worried, a cue to lighten it
  if ((input.todayOpenItemCount ?? 0) >= WORRIED_ITEM_THRESHOLD) {
    return { mood: 'worried', intensity: 1 };
  }
  if (input.daysSinceLastOpen !== null && input.daysSinceLastOpen >= LONG_ABSENCE_DAYS) {
    return { mood: 'sleepy', intensity: 1 };
  }
  return { mood: 'calm', intensity: 1 };
}

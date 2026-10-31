/**
 * Pure rules deriving the resting mood of the Pulse mascot.
 * Priority: focused > alert > sleepy (night) > party > happy > sleepy (long absence) > calm.
 * Deterministic and testable without React or SQLite.
 */

import { FocusState } from './focus-rules';

export type MascotMood = 'calm' | 'happy' | 'focused' | 'alert' | 'sleepy' | 'party';

export const NIGHT_START_HOUR = 23;
export const NIGHT_END_HOUR = 5;
export const LONG_ABSENCE_DAYS = 3;
export const ALERT_REST_INTENSITY = 0.45;

export interface MascotMoodInput {
  hour: number; // Local hour, 0 to 23
  focusState: FocusState;
  hasUrgentPendingReminder: boolean;
  todayTaskTotal: number;
  todayTaskCompleted: number;
  birthdayToday: boolean;
  daysSinceLastOpen: number | null; // null when the app has never been opened before
}

export interface MascotMoodState {
  mood: MascotMood;
  intensity: number; // 0 to 1, how strongly the mood is expressed
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
  if (input.daysSinceLastOpen !== null && input.daysSinceLastOpen >= LONG_ABSENCE_DAYS) {
    return { mood: 'sleepy', intensity: 1 };
  }
  return { mood: 'calm', intensity: 1 };
}

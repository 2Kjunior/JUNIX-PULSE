/**
 * Which vibration answers which action. Success marks what the user finished, a light tap what
 * they only moved or added, a warning what they removed. The rest stays silent, as a vibration
 * that comes without a gesture of the user would only surprise.
 */

import type { MascotEventType } from './mascot-reaction-rules';

export type HapticKind = 'success' | 'light' | 'warning' | 'error';

const EVENT_HAPTICS: Partial<Record<MascotEventType, HapticKind>> = {
  TASK_COMPLETED: 'success',
  REMINDER_COMPLETED: 'success',
  HABIT_COMPLETED: 'success',
  GOAL_COMPLETED: 'success',
  FOCUS_COMPLETED: 'success',
  BACKUP_DONE: 'success',
  SUBTASK_COMPLETED: 'light',
  REMINDER_SNOOZED: 'light',
  ITEM_CREATED: 'light',
  SUGGESTION_ACCEPTED: 'light',
  PERSON_CONTACTED: 'light',
  HABIT_RESUMED: 'light',
  ITEM_DELETED: 'warning',
};

/**
 * Android patterns (wait, vibrate, wait, vibrate... in ms), played at the device's full strength.
 * The defaults of expo-haptics stay at 12 to 27 % of the motor: too faint on many phones.
 * Each kind keeps its own shape, so they can be told apart without looking.
 */
export const ANDROID_HAPTIC_PATTERNS: Readonly<Record<HapticKind, readonly number[]>> = {
  light: [0, 30],
  success: [0, 40, 70, 60],
  warning: [0, 140],
  error: [0, 60, 60, 60, 60, 60],
};

export function hapticForEvent(type: MascotEventType): HapticKind | null {
  return EVENT_HAPTICS[type] ?? null;
}

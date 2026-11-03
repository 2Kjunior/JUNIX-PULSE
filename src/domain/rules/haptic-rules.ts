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

export function hapticForEvent(type: MascotEventType): HapticKind | null {
  return EVENT_HAPTICS[type] ?? null;
}

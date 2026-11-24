/**
 * Pure rules for changing an item with the form that created it (sheet 022): what the form shows
 * of what is saved, and what saving changes. Nothing here reads the database or the screen.
 */

import { format } from 'date-fns';

import type { RecurrenceRule, TaskStatus } from '../entities';

/** The repeats the form offers: every day, every week, every month. */
export type SimpleRecurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * A task given a day leaves the Inbox, a task whose day is taken off goes back to it; any other
 * status (in progress, done, postponed) stays what it was.
 */
export function taskStatusAfterEdit(status: TaskStatus, scheduledDate: string | undefined): TaskStatus {
  if (status === 'INBOX' && scheduledDate) return 'SCHEDULED';
  if (status === 'SCHEDULED' && !scheduledDate) return 'INBOX';
  return status;
}

/**
 * The repeat of a saved rule as the form can show it, or null when the form cannot (every 3 days,
 * several days of the week, "the last Friday"...). Such a rule is kept as it is unless the person
 * changes the repeat.
 */
export function simpleRecurrenceOf(
  rule: Pick<RecurrenceRule, 'type' | 'interval' | 'daysOfWeek' | 'weekPosition'> | null | undefined
): SimpleRecurrence | null {
  if (!rule || rule.interval !== 1 || rule.weekPosition) return null;
  if (rule.type === 'WEEKLY' && (rule.daysOfWeek?.length ?? 0) > 1) return null;
  return rule.type === 'DAILY' || rule.type === 'WEEKLY' || rule.type === 'MONTHLY' ? rule.type : null;
}

/**
 * True when a reminder may not be saved at this time: the time is past and the person moved it
 * there. A reminder already late keeps its time when only its title or its notes change.
 */
export function alertTimeRefused(original: Date | null, next: Date, now: Date): boolean {
  if (next.getTime() > now.getTime()) return false;
  return original === null || original.getTime() !== next.getTime();
}

/** The day (YYYY-MM-DD) and the time of a saved alert, as the form keeps them. */
export function splitAlertMoment(at: Date): { day: string; time: { hour: number; minute: number } } {
  return { day: format(at, 'yyyy-MM-dd'), time: { hour: at.getHours(), minute: at.getMinutes() } };
}

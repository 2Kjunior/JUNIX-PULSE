/**
 * The deadline of a task: the day it must be done by, apart from the day it is planned for
 * ("I do it on Tuesday", "it is due on Friday"). Pure: the screens give the date and the time.
 *
 * The badge never turns aggressive red: orange the day before, on the day and once late, so a
 * slipped deadline reads as "let's catch up", not as a failure.
 */

import { differenceInCalendarDays, startOfDay } from 'date-fns';

/** Pulse speaks about a deadline from this many days before it. */
export const DEADLINE_WARNING_DAYS = 2;

export type DeadlineTone = 'calm' | 'soon' | 'today' | 'late';

export interface DeadlineInfo {
  /** Days until the deadline: 0 today, 1 tomorrow, negative once passed. */
  daysLeft: number;
  tone: DeadlineTone;
}

function dayOf(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function deadlineInfo(dueDate: string | undefined, now: Date): DeadlineInfo | null {
  const due = dueDate ? dayOf(dueDate) : null;
  if (!due) return null;
  const daysLeft = differenceInCalendarDays(due, startOfDay(now));
  const tone: DeadlineTone = daysLeft < 0 ? 'late' : daysLeft === 0 ? 'today' : daysLeft === 1 ? 'soon' : 'calm';
  return { daysLeft, tone };
}

/** Tasks with a deadline first, the nearest first; the others keep their order after them. */
export function sortByDeadline<T extends { dueDate?: string }>(tasks: readonly T[]): T[] {
  const dated = tasks.filter(task => task.dueDate && dayOf(task.dueDate));
  const undated = tasks.filter(task => !task.dueDate || !dayOf(task.dueDate));
  return [...dated.sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string)), ...undated];
}

/** Whether Pulse mentions this deadline today: open, and due within the warning days. */
export function isDeadlineToAnnounce(dueDate: string | undefined, done: boolean, now: Date): boolean {
  if (done) return false;
  const info = deadlineInfo(dueDate, now);
  return !!info && info.daysLeft >= 1 && info.daysLeft <= DEADLINE_WARNING_DAYS;
}

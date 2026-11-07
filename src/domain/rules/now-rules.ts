/**
 * "Maintenant": the next thing to do, then the ones after it, one at a time. For those who find
 * it hard to start, and for a quick look at the home screen. Pure rules: the order of the
 * queue, what "Plus tard" does, and what "Alléger" moves to tomorrow on a heavy day.
 *
 * The order:
 * 1. the reminders already due, or due within half an hour, the oldest first;
 * 2. the open tasks of the day: deadline passed or today first, then by priority, then by
 *    deadline.
 * The reminders later in the day stay in the feed, not here: "Plus tard" pushes a reminder out
 * of this window, so it never comes straight back. Events are not in it either: they happen,
 * they are not "done".
 */

import { deadlineInfo } from './deadline-rules';
import { WORRIED_ITEM_THRESHOLD } from './mascot-mood-rules';

/** A reminder within this many minutes is already "now". */
export const NOW_REMINDER_WINDOW_MINUTES = 30;
/** "Plus tard" on a reminder: it comes back in an hour, past the window. A task moves to tomorrow. */
export const NOW_LATER_MINUTES = 60;

type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface NowReminderInput {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  priority: Priority;
}

export interface NowTaskInput {
  id: string;
  title: string;
  status: string;
  priority: Priority;
  dueDate?: string;
}

export type NowItem =
  | { kind: 'reminder'; id: string; title: string; at: Date; overdue: boolean; priority: Priority }
  | { kind: 'task'; id: string; title: string; priority: Priority; dueDate?: string };

const PRIORITY_RANK: Record<Priority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const SETTLED = ['COMPLETED', 'DELETED'];

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Whether a task must be done today: its deadline is today or already passed. */
function isPressing(task: NowTaskInput, now: Date): boolean {
  const tone = deadlineInfo(task.dueDate, now)?.tone;
  return tone === 'today' || tone === 'late';
}

export function nowQueue(reminders: readonly NowReminderInput[], tasks: readonly NowTaskInput[], now: Date): NowItem[] {
  const windowEnd = now.getTime() + NOW_REMINDER_WINDOW_MINUTES * 60_000;
  const open = reminders
    .filter(reminder => !SETTLED.includes(reminder.status))
    .map(reminder => ({ reminder, at: new Date(reminder.scheduledAt) }))
    .filter(({ at }) => !Number.isNaN(at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const toItem = ({ reminder, at }: { reminder: NowReminderInput; at: Date }): NowItem => ({
    kind: 'reminder',
    id: reminder.id,
    title: reminder.title,
    at,
    overdue: at.getTime() < now.getTime(),
    priority: reminder.priority,
  });

  const dueNow = open.filter(({ at }) => at.getTime() <= windowEnd).map(toItem);

  const openTasks: NowItem[] = tasks
    .filter(task => task.status !== 'COMPLETED')
    .sort((a, b) => {
      const pressing = Number(isPressing(b, now)) - Number(isPressing(a, now));
      if (pressing !== 0) return pressing;
      const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (priority !== 0) return priority;
      if (a.dueDate !== b.dueDate) {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return 0;
    })
    .map(task => ({ kind: 'task', id: task.id, title: task.title, priority: task.priority, dueDate: task.dueDate }));

  return [...dueNow, ...openTasks];
}

/** A heavy day, the same one that worries Pulse: this many open things today or more. */
export function isDayOverloaded(reminders: readonly NowReminderInput[], tasks: readonly NowTaskInput[], now: Date): boolean {
  const openTasks = tasks.filter(task => task.status !== 'COMPLETED').length;
  const openReminders = reminders.filter(
    reminder => !SETTLED.includes(reminder.status) && isSameDay(new Date(reminder.scheduledAt), now)
  ).length;
  return openTasks + openReminders >= WORRIED_ITEM_THRESHOLD;
}

/**
 * What "Alléger" moves to tomorrow: the open tasks that can wait. Never an urgent or important
 * one, never one whose deadline is today or passed; reminders are never moved.
 */
export function tasksToLighten<T extends NowTaskInput>(tasks: readonly T[], now: Date): T[] {
  return tasks.filter(
    task =>
      task.status !== 'COMPLETED' &&
      (task.priority === 'NORMAL' || task.priority === 'LOW') &&
      !isPressing(task, now)
  );
}

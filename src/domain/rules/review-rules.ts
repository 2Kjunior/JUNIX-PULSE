/**
 * The review of a day or a week: what was done, what slipped, and the habits kept.
 * Pure: the screen loads the data and gives the days the period covers.
 *
 * A task counts on the day it was done, whatever day it was planned for (or none, from the
 * Inbox); the total is what was planned in the period plus what was done in it. A reminder
 * slipped when its time passed in the period and it is still not done.
 */

import { addDays, format, startOfDay, startOfWeek } from 'date-fns';

import type { ReminderStatus, TaskStatus } from '../enums';

export type ReviewPeriod = 'day' | 'week';

export interface ReviewTask {
  id: string;
  status: TaskStatus;
  /** Day it was planned for, YYYY-MM-DD; none for a task of the Inbox. */
  scheduledDate?: string;
  completedAt?: string;
}

export interface ReviewReminder {
  status: ReminderStatus;
  scheduledAt: string;
  completedAt?: string;
}

export interface ReviewHabit {
  id: string;
  title: string;
  /** Dates (YYYY-MM-DD) on which the habit was done. */
  completedDates: readonly string[];
}

export interface ReviewInput {
  days: readonly Date[];
  /** Every task, done ones included: the period picks its own. */
  tasks: readonly ReviewTask[];
  reminders: readonly ReviewReminder[];
  habits: readonly ReviewHabit[];
  /** The moment of the review: a reminder still to come has not slipped. */
  now?: Date;
}

export interface ReviewStats {
  tasksDone: number;
  tasksTotal: number;
  /** Share of the tasks done, 0 to 100; null without any task. */
  completionRate: number | null;
  remindersDone: number;
  remindersMissed: number;
  habitChecks: number;
  bestHabit: { title: string; count: number } | null;
  /** The day with the most tasks done, for a week. */
  bestDay: { date: Date; done: number } | null;
}

export type ReviewTone = 'great' | 'good' | 'light' | 'empty';

/** The days of the period that holds this date: the day itself, or Monday to Sunday. */
export function reviewDays(period: ReviewPeriod, date: Date): Date[] {
  if (period === 'day') return [startOfDay(date)];
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function inPeriod(iso: string | undefined, keys: ReadonlySet<string>): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && keys.has(format(date, 'yyyy-MM-dd'));
}

/** The day a task was done; an old task done without a date counts on the day it was planned. */
function doneDay(task: ReviewTask): string | null {
  if (task.status !== 'COMPLETED') return null;
  if (task.completedAt) {
    const at = new Date(task.completedAt);
    if (!Number.isNaN(at.getTime())) return format(at, 'yyyy-MM-dd');
  }
  return task.scheduledDate ?? null;
}

export function buildReviewStats(input: ReviewInput): ReviewStats {
  const keys = new Set(input.days.map(day => format(day, 'yyyy-MM-dd')));
  const now = input.now ?? new Date();

  const done = input.tasks.filter(task => {
    const day = doneDay(task);
    return day !== null && keys.has(day);
  });
  const planned = input.tasks.filter(task => task.scheduledDate !== undefined && keys.has(task.scheduledDate));
  const doneByDay = input.days.map(day => {
    const key = format(day, 'yyyy-MM-dd');
    return done.filter(task => doneDay(task) === key).length;
  });
  const tasksDone = done.length;
  const tasksTotal = new Set([...planned, ...done].map(task => task.id)).size;

  const remindersDone = input.reminders.filter(
    reminder => reminder.status === 'COMPLETED' && inPeriod(reminder.completedAt ?? reminder.scheduledAt, keys)
  ).length;
  // Its time passed in the period and it is still not done: missed, snoozed past or waiting
  const remindersMissed = input.reminders.filter(
    reminder =>
      reminder.status !== 'COMPLETED' &&
      reminder.status !== 'DELETED' &&
      inPeriod(reminder.scheduledAt, keys) &&
      new Date(reminder.scheduledAt).getTime() < now.getTime()
  ).length;

  const habitCounts = input.habits
    .map(habit => ({ title: habit.title, count: habit.completedDates.filter(date => keys.has(date)).length }))
    .filter(habit => habit.count > 0)
    .sort((a, b) => b.count - a.count);

  let bestDay: ReviewStats['bestDay'] = null;
  if (input.days.length > 1) {
    doneByDay.forEach((done, index) => {
      if (done > 0 && (!bestDay || done > bestDay.done)) bestDay = { date: input.days[index], done };
    });
  }

  return {
    tasksDone,
    tasksTotal,
    completionRate: tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : null,
    remindersDone,
    remindersMissed,
    habitChecks: habitCounts.reduce((sum, habit) => sum + habit.count, 0),
    bestHabit: habitCounts[0] ?? null,
    bestDay,
  };
}

/** How the review reads, for the sentence of Pulse and its mood. */
export function reviewTone(stats: ReviewStats): ReviewTone {
  const activity = stats.tasksTotal + stats.remindersDone + stats.habitChecks;
  if (activity === 0) return 'empty';
  if (stats.completionRate === null) return 'good';
  if (stats.completionRate >= 80) return 'great';
  if (stats.completionRate >= 50) return 'good';
  return 'light';
}

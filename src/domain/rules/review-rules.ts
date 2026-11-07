/**
 * The review of a day or a week: what was done, what slipped, and the habits kept.
 * Pure: the screen loads the data of the period and gives the days it covers.
 */

import { addDays, format, startOfDay, startOfWeek } from 'date-fns';

import type { ReminderStatus, TaskStatus } from '../enums';

export type ReviewPeriod = 'day' | 'week';

export interface ReviewTask {
  status: TaskStatus;
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
  /** Tasks of each day, in the order of `days`. */
  tasksByDay: readonly (readonly ReviewTask[])[];
  reminders: readonly ReviewReminder[];
  habits: readonly ReviewHabit[];
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

export function buildReviewStats(input: ReviewInput): ReviewStats {
  const keys = new Set(input.days.map(day => format(day, 'yyyy-MM-dd')));

  const doneByDay = input.tasksByDay.map(tasks => tasks.filter(task => task.status === 'COMPLETED').length);
  const tasksDone = doneByDay.reduce((sum, done) => sum + done, 0);
  const tasksTotal = input.tasksByDay.reduce((sum, tasks) => sum + tasks.length, 0);

  const remindersDone = input.reminders.filter(
    reminder => reminder.status === 'COMPLETED' && inPeriod(reminder.completedAt ?? reminder.scheduledAt, keys)
  ).length;
  const remindersMissed = input.reminders.filter(
    reminder => reminder.status === 'MISSED' && inPeriod(reminder.scheduledAt, keys)
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

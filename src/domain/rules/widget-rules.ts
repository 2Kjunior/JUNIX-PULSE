/**
 * What the home screen widget shows: the next reminder still to come, the progress of today's
 * tasks, and the mood of Pulse. Pure: the widget task and the tests give the data and the time.
 */

import { format } from 'date-fns';

import type { ReminderStatus, TaskStatus } from '../enums';
import { isNightHour, type MascotMood, WORRIED_ITEM_THRESHOLD } from './mascot-mood-rules';

export const TODAY_WIDGET_NAME = 'Today';

export interface WidgetReminder {
  title: string;
  scheduledAt: string;
  status: ReminderStatus;
}

export interface WidgetTask {
  status: TaskStatus;
}

export interface TodayWidgetData {
  nextReminder: { title: string; time: string; today: boolean; at: Date } | null;
  tasksLeft: number;
  tasksDone: number;
  tasksTotal: number;
  /** Reminders of today not done yet, past or to come. */
  remindersLeftToday: number;
}

const DONE_REMINDER: readonly ReminderStatus[] = ['COMPLETED', 'DELETED'];

export function buildTodayWidgetData(
  reminders: readonly WidgetReminder[],
  todayTasks: readonly WidgetTask[],
  now: Date
): TodayWidgetData {
  const open = reminders
    .filter(reminder => !DONE_REMINDER.includes(reminder.status))
    .map(reminder => ({ reminder, at: new Date(reminder.scheduledAt) }))
    .filter(({ at }) => !Number.isNaN(at.getTime()));
  const next = open
    .filter(({ at }) => at.getTime() >= now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  const tasksDone = todayTasks.filter(task => task.status === 'COMPLETED').length;

  return {
    nextReminder: next
      ? {
          title: next.reminder.title,
          time: format(next.at, 'HH:mm'),
          today: next.at.toDateString() === now.toDateString(),
          at: next.at,
        }
      : null,
    tasksLeft: todayTasks.length - tasksDone,
    tasksDone,
    tasksTotal: todayTasks.length,
    remindersLeftToday: open.filter(({ at }) => at.toDateString() === now.toDateString()).length,
  };
}

/** Pulse in the widget: asleep at night, happy once the day is done, worried when overloaded. */
export function todayWidgetMood(data: TodayWidgetData, hour: number): MascotMood {
  if (isNightHour(hour)) return 'sleepy';
  if (data.tasksTotal > 0 && data.tasksLeft === 0) return 'happy';
  if (data.tasksLeft + data.remindersLeftToday >= WORRIED_ITEM_THRESHOLD) return 'worried';
  return 'calm';
}

/** Share of today's tasks done, 0 to 1. */
export function todayWidgetProgress(data: TodayWidgetData): number {
  return data.tasksTotal === 0 ? 0 : data.tasksDone / data.tasksTotal;
}

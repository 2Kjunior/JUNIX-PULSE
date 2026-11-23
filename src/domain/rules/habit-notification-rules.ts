/**
 * Which notifications the phone should hold for the habits that ring (study 001, 15.2; sheet 019):
 * every day at their time, unless already ticked that day; a weekly habit stops for the week once
 * its target is reached. Their notification has one button, "Fait", which ticks the day.
 */

import type { Habit } from '../entities';
import { translate } from '../../i18n/translate';
import { doneThisWeek, weeklyTarget } from './goal-rules';
import type { AppLanguage } from './language-rules';
import { DEFAULT_QUIET_HOURS, NotificationLevel, notificationLevelFor, QuietHours } from './notification-level-rules';

export const HABIT_IDENTIFIER_PREFIX = 'habit-';
/** Category of the habit notifications and its button. Neither ":" nor "-" in them. */
export const HABIT_CATEGORY_ID = 'habit_actions';
export const HABIT_ACTION_DONE = 'habit_done';
export const HABIT_DAYS_AHEAD = 7;
export const MAX_SCHEDULED_HABITS = 20;

export interface HabitToPlan {
  habit: Habit;
  completedDates: readonly string[];
}

export interface PlannedHabitNotification {
  identifier: string;
  habitId: string;
  title: string;
  body: string;
  scheduledAt: Date;
  level: NotificationLevel;
}

const pad = (value: number) => String(value).padStart(2, '0');
const ymd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** "07:30" as hour and minute, or null for a time that does not read. */
export function parseReminderTime(value?: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

export function planHabitNotifications({
  habits,
  now,
  language = 'fr',
  quietHours = DEFAULT_QUIET_HOURS,
}: {
  habits: readonly HabitToPlan[];
  now: Date;
  language?: AppLanguage;
  quietHours?: QuietHours;
}): PlannedHabitNotification[] {
  const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + 7);
  const planned: PlannedHabitNotification[] = [];
  for (const { habit, completedDates } of habits) {
    const time = parseReminderTime(habit.reminderTime);
    if (!time || habit.status !== 'ACTIVE' || habit.deletedAt) continue;
    const done = new Set(completedDates);
    // A weekly habit rings no more this week once its target is reached
    const weekReached =
      habit.frequency !== 'DAILY' &&
      doneThisWeek(completedDates.map(completedDate => ({ completedDate })), now) >= weeklyTarget(habit);
    for (let offset = 0; offset < HABIT_DAYS_AHEAD; offset += 1) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, time.hour, time.minute, 0, 0);
      if (at <= now || done.has(ymd(at)) || (weekReached && at < nextMonday)) continue;
      planned.push({
        identifier: `${HABIT_IDENTIFIER_PREFIX}${habit.id}-${at.getTime()}`,
        habitId: habit.id,
        title: habit.title,
        body: translate(language, 'habitNotif.body'),
        scheduledAt: at,
        level: notificationLevelFor({ moment: 'habit', at, quietHours }),
      });
    }
  }
  return planned.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()).slice(0, MAX_SCHEDULED_HABITS);
}

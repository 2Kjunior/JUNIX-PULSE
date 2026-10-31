/**
 * Pure rules turning the day's local data into the input of the mascot's resting mood.
 * The caller loads the data; nothing here reads the database or the clock.
 */

import { ReminderPriority, ReminderStatus, TaskStatus } from '../enums';
import { FocusState } from './focus-rules';
import { MascotMoodInput } from './mascot-mood-rules';

export interface MascotDayReminder {
  id: string;
  priority: ReminderPriority;
  status: ReminderStatus;
  scheduledAt: string; // ISO 8601
}

export interface MascotDayTask {
  status: TaskStatus;
}

export interface MascotDayPerson {
  birthDate?: string | null; // ISO date, YYYY-MM-DD
}

export interface MascotDayInput {
  now: Date;
  focusState: FocusState;
  reminders: readonly MascotDayReminder[];
  todayTasks: readonly MascotDayTask[];
  persons: readonly MascotDayPerson[];
  daysSinceLastOpen: number | null;
}

/** Statuses of a reminder that no longer needs the user's attention. */
const SETTLED_STATUSES: readonly ReminderStatus[] = ['COMPLETED', 'DELETED'];

/** True when the month and the day of the birth date are today's, whatever the year. */
export function isBirthdayToday(birthDate: string | null | undefined, now: Date): boolean {
  if (!birthDate) return false;
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(birthDate.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  return month === now.getMonth() + 1 && day === now.getDate();
}

/** Urgent reminders whose time has come and that nobody has settled yet, oldest first. */
export function pendingUrgentReminders(
  reminders: readonly MascotDayReminder[],
  now: Date
): MascotDayReminder[] {
  return reminders
    .filter(reminder => {
      if (reminder.priority !== 'URGENT') return false;
      if (SETTLED_STATUSES.includes(reminder.status)) return false;
      const due = new Date(reminder.scheduledAt).getTime();
      return !Number.isNaN(due) && due <= now.getTime();
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export function buildMascotMoodInput(input: MascotDayInput): MascotMoodInput {
  const { now } = input;
  return {
    hour: now.getHours(),
    focusState: input.focusState,
    hasUrgentPendingReminder: pendingUrgentReminders(input.reminders, now).length > 0,
    todayTaskTotal: input.todayTasks.length,
    todayTaskCompleted: input.todayTasks.filter(task => task.status === 'COMPLETED').length,
    birthdayToday: input.persons.some(person => isBirthdayToday(person.birthDate, now)),
    daysSinceLastOpen: input.daysSinceLastOpen,
  };
}

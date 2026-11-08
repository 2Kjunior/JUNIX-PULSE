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
  id?: string;
  displayName?: string;
  birthDate?: string | null; // ISO date, YYYY-MM-DD
  /** The latest exchange with the person, ISO 8601. */
  lastInteractionAt?: string | null;
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

/** Whether there was an exchange with the person today: a call, a message, a meeting... */
export function contactedToday(lastInteractionAt: string | null | undefined, now: Date): boolean {
  if (!lastInteractionAt) return false;
  const at = new Date(lastInteractionAt);
  return !Number.isNaN(at.getTime()) && at.toDateString() === now.toDateString();
}

/**
 * The people whose birthday is today and who have not been wished it yet. Pulse celebrates
 * until the user gets in touch with each of them; an exchange recorded today ends the party.
 */
export function birthdaysToWish<T extends MascotDayPerson>(persons: readonly T[], now: Date): T[] {
  return persons.filter(person => isBirthdayToday(person.birthDate, now) && !contactedToday(person.lastInteractionAt, now));
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
    birthdayToday: birthdaysToWish(input.persons, now).length > 0,
    daysSinceLastOpen: input.daysSinceLastOpen,
    todayOpenItemCount:
      input.todayTasks.filter(task => task.status !== 'COMPLETED').length +
      input.reminders.filter(reminder => {
        if (SETTLED_STATUSES.includes(reminder.status)) return false;
        const due = new Date(reminder.scheduledAt);
        return due.toDateString() === now.toDateString();
      }).length,
  };
}

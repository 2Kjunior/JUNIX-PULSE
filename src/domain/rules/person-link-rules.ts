/**
 * A person at the centre: what is planned with them, and which actions count as an exchange.
 * Pure: the use cases and the screens give the data and the time.
 *
 * What counts as an exchange, so the "forgotten contact" stays right without typing anything:
 * - a reminder done with a person, when its action is to call, write, mail or meet them;
 * - an event with people, once it is over (they met).
 * A task done for someone ("buy Paul's present") is not an exchange, nor a reminder without
 * an action ("Paul's birthday").
 */

import type { ActionType, EventType, InteractionType, ReminderStatus, TaskStatus } from '../enums';

/** How far back an ended event may still count as a meeting, for an app not opened for a while. */
export const MEETING_LOOKBACK_DAYS = 14;
/** How many planned items the page of a person shows before "Tout voir". */
export const PERSON_AGENDA_PREVIEW = 3;
/** Follow-up delays offered on the page of a person, in days. */
export const FOLLOW_UP_DAYS = [1, 3, 7] as const;
export const FOLLOW_UP_HOUR = 10;

export function interactionTypeForAction(action: ActionType | undefined): InteractionType | null {
  switch (action) {
    case 'CALL':
      return 'CALL';
    case 'MESSAGE':
      return 'SMS';
    case 'EMAIL':
      return 'EMAIL';
    case 'MEET':
      return 'IN_PERSON';
    default:
      return null;
  }
}

export interface AgendaReminder {
  id: string;
  title: string;
  scheduledAt: string;
  status: ReminderStatus;
}

export interface AgendaTask {
  id: string;
  title: string;
  status: TaskStatus;
  scheduledDate?: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  type?: EventType;
}

export type PersonAgendaKind = 'reminder' | 'task' | 'event';

export interface PersonAgendaItem {
  kind: PersonAgendaKind;
  id: string;
  title: string;
  /** When it is due; null for a task without a day. */
  at: Date | null;
  /** A reminder whose time has passed without being done. */
  overdue: boolean;
}

function validDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * What is still to do with this person: reminders not done (late ones first), tasks not done,
 * events not over yet. Dated items by date, then the tasks without a day.
 */
export function personAgenda(
  reminders: readonly AgendaReminder[],
  tasks: readonly AgendaTask[],
  events: readonly AgendaEvent[],
  now: Date
): PersonAgendaItem[] {
  const items: PersonAgendaItem[] = [];

  for (const reminder of reminders) {
    if (reminder.status === 'COMPLETED' || reminder.status === 'DELETED') continue;
    const at = validDate(reminder.scheduledAt);
    if (!at) continue;
    items.push({ kind: 'reminder', id: reminder.id, title: reminder.title, at, overdue: at < now });
  }
  for (const task of tasks) {
    if (task.status === 'COMPLETED') continue;
    items.push({ kind: 'task', id: task.id, title: task.title, at: validDate(task.scheduledDate), overdue: false });
  }
  for (const event of events) {
    const end = validDate(event.endAt);
    const start = validDate(event.startAt);
    if (!end || !start || end <= now) continue;
    items.push({ kind: 'event', id: event.id, title: event.title, at: start, overdue: false });
  }

  return items.sort((a, b) => {
    if (a.at && b.at) return a.at.getTime() - b.at.getTime();
    if (a.at) return -1;
    if (b.at) return 1;
    return a.title.localeCompare(b.title);
  });
}

/** When a follow-up planned in `days` days rings: at 10:00 local time. */
export function followUpDate(days: number, now: Date): Date {
  const at = new Date(now);
  at.setDate(at.getDate() + days);
  at.setHours(FOLLOW_UP_HOUR, 0, 0, 0);
  return at;
}

/** The window of ended events to check for meetings, from a while back to now. */
export function meetingWindow(now: Date): { from: Date; to: Date } {
  const from = new Date(now);
  from.setDate(from.getDate() - MEETING_LOOKBACK_DAYS);
  return { from, to: now };
}

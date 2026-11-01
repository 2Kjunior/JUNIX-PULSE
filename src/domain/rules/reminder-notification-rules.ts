/**
 * Which notifications the phone should hold for the reminders, and what a tapped notification opens.
 * A recurring reminder plans several occurrences ahead, so it keeps ringing when the app stays closed.
 * iOS only keeps 64 pending notifications: the nearest ones win, and the next sync plans the rest.
 */

import { RecurrenceRule, Reminder } from '../entities';
import { getNextOccurrence } from './reminder-rules';

export const MAX_RECURRING_OCCURRENCES = 14;
export const MAX_SCHEDULED_REMINDERS = 60;
export const REMINDER_IDENTIFIER_PREFIX = 'reminder-';

const DEFAULT_BODY = 'Rappel Junix Pulse';
const ACTIVE_STATUSES: readonly Reminder['status'][] = ['UPCOMING', 'SNOOZED'];

export interface PlannedReminderNotification {
  identifier: string;
  reminderId: string;
  title: string;
  body: string;
  scheduledAt: Date;
}

export interface ReminderToPlan {
  reminder: Reminder;
  rule: RecurrenceRule | null;
}

function occurrencesOf({ reminder, rule }: ReminderToPlan, now: Date): string[] {
  const isFuture = new Date(reminder.scheduledAt) > now;
  let current = isFuture ? reminder.scheduledAt : rule ? getNextOccurrence(reminder.scheduledAt, rule, now) : null;

  const occurrences: string[] = [];
  // A snoozed occurrence rings once: the series resumes when the app reconciles it
  const limit = rule && reminder.status !== 'SNOOZED' ? MAX_RECURRING_OCCURRENCES : 1;
  while (current && occurrences.length < limit) {
    occurrences.push(current);
    current = rule ? getNextOccurrence(current, rule) : null;
  }
  return occurrences;
}

function bodyOf(reminder: Reminder): string {
  if (reminder.status !== 'SNOOZED') return reminder.notes ?? DEFAULT_BODY;
  return reminder.notes ? `Rappel reporté — ${reminder.notes}` : 'Rappel reporté';
}

export function planReminderNotifications(items: ReminderToPlan[], now: Date): PlannedReminderNotification[] {
  return items
    .filter(({ reminder }) => ACTIVE_STATUSES.includes(reminder.status) && !reminder.deletedAt)
    .flatMap(item =>
      occurrencesOf(item, now).map(occurrence => {
        const scheduledAt = new Date(occurrence);
        return {
          identifier: `${REMINDER_IDENTIFIER_PREFIX}${item.reminder.id}-${scheduledAt.getTime()}`,
          reminderId: item.reminder.id,
          title: item.reminder.title,
          body: bodyOf(item.reminder),
          scheduledAt,
        };
      })
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, MAX_SCHEDULED_REMINDERS);
}

/** Where a tapped notification leads, or null when opening the app is enough. */
export function notificationRoute(data: Record<string, unknown> | null | undefined): string | null {
  if (typeof data?.reminderId === 'string') return `/reminders/${data.reminderId}`;
  if (data?.type === 'DAILY_RECAP') return '/(tabs)';
  return null;
}

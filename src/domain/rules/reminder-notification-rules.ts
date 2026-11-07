/**
 * Which notifications the phone should hold for the reminders, and what a tapped notification opens.
 * A recurring reminder plans several occurrences ahead, so it keeps ringing when the app stays closed.
 * iOS only keeps 64 pending notifications: the nearest ones win, and the next sync plans the rest.
 */

import { RecurrenceRule, Reminder } from '../entities';
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import { getNextOccurrence } from './reminder-rules';

export const MAX_RECURRING_OCCURRENCES = 14;
/** A reminder to confirm rings again this many times, this many minutes apart. */
export const CONFIRMATION_REPEATS = 3;
export const CONFIRMATION_INTERVAL_MINUTES = 5;
export const MAX_SCHEDULED_REMINDERS = 60;
export const REMINDER_IDENTIFIER_PREFIX = 'reminder-';

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

function bodyOf(reminder: Reminder, language: AppLanguage): string {
  if (reminder.status !== 'SNOOZED') return reminder.notes ?? translate(language, 'reminderNotif.default');
  return reminder.notes
    ? translate(language, 'reminderNotif.snoozedNotes', { notes: reminder.notes })
    : translate(language, 'reminderNotif.snoozed');
}

/**
 * The repeats of a reminder to confirm: after its current occurrence (even once passed, so the
 * repeats survive the next sync) and after the next one. They stop when the reminder is done or
 * snoozed, since it then leaves the active ones, or moves to its new time.
 */
function confirmationRepeats(item: ReminderToPlan, now: Date, language: AppLanguage): PlannedReminderNotification[] {
  if (!item.reminder.requiresConfirmation) return [];
  const anchors = new Set([new Date(item.reminder.scheduledAt).getTime()]);
  const next = occurrencesOf(item, now)[0];
  if (next) anchors.add(new Date(next).getTime());

  const repeats: PlannedReminderNotification[] = [];
  for (const anchor of anchors) {
    if (Number.isNaN(anchor)) continue;
    for (let turn = 1; turn <= CONFIRMATION_REPEATS; turn++) {
      const scheduledAt = new Date(anchor + turn * CONFIRMATION_INTERVAL_MINUTES * 60 * 1000);
      if (scheduledAt <= now) continue;
      repeats.push({
        identifier: `${REMINDER_IDENTIFIER_PREFIX}${item.reminder.id}-${anchor}-r${turn}`,
        reminderId: item.reminder.id,
        title: item.reminder.title,
        body: translate(language, 'reminderNotif.confirmAgain'),
        scheduledAt,
      });
    }
  }
  return repeats;
}

export function planReminderNotifications(
  items: ReminderToPlan[],
  now: Date,
  language: AppLanguage = 'fr'
): PlannedReminderNotification[] {
  const active = items.filter(({ reminder }) => ACTIVE_STATUSES.includes(reminder.status) && !reminder.deletedAt);
  const planned = active
    .flatMap(item =>
      occurrencesOf(item, now).map(occurrence => {
        const scheduledAt = new Date(occurrence);
        return {
          identifier: `${REMINDER_IDENTIFIER_PREFIX}${item.reminder.id}-${scheduledAt.getTime()}`,
          reminderId: item.reminder.id,
          title: item.reminder.title,
          body: bodyOf(item.reminder, language),
          scheduledAt,
        };
      })
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, MAX_SCHEDULED_REMINDERS);

  // The repeats take the places left: they never push a reminder of its own out of the phone
  const repeats = active
    .flatMap(item => confirmationRepeats(item, now, language))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, MAX_SCHEDULED_REMINDERS - planned.length);
  return [...planned, ...repeats];
}

/** Category of the reminder notifications and its buttons. Neither ":" nor "-" in the category. */
export const REMINDER_CATEGORY_ID = 'reminder_actions';
export const REMINDER_ACTION_COMPLETE = 'complete';
export const REMINDER_ACTION_SNOOZE = 'snooze_1h';
export const REMINDER_ACTION_SNOOZE_MINUTES = 60;
/** Background task that receives the button taps on Android, even with the app closed. */
export const REMINDER_ACTION_TASK = 'junix-pulse-reminder-action';

export type ReminderNotificationAction = 'complete' | 'snooze' | 'open';

/** What a response asks: a button of the notification, or a plain tap that opens the app. */
export function notificationActionFor(actionIdentifier: string): ReminderNotificationAction {
  if (actionIdentifier === REMINDER_ACTION_COMPLETE) return 'complete';
  if (actionIdentifier === REMINDER_ACTION_SNOOZE) return 'snooze';
  return 'open';
}

/** Where a tapped notification leads, or null when opening the app is enough. */
export function notificationRoute(data: Record<string, unknown> | null | undefined): string | null {
  if (typeof data?.reminderId === 'string') return `/reminders/${data.reminderId}`;
  // The recap of the day opens the review of the day, where it is always there to read
  if (data?.type === 'DAILY_RECAP') return '/review?period=day';
  // A failed automatic backup: its settings, to pick the folder again or try now
  if (data?.type === 'AUTO_BACKUP_FAILED') return '/settings?section=data';
  return null;
}

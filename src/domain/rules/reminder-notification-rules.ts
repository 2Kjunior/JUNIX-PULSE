/**
 * Which notifications the phone should hold for the reminders, and what a tapped notification opens.
 * A recurring reminder plans several occurrences ahead, so it keeps ringing when the app stays closed.
 * iOS only keeps 64 pending notifications: the nearest ones win, and the next sync plans the rest.
 */

import { RecurrenceRule, Reminder } from '../entities';
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import { getNextOccurrence } from './reminder-rules';
import { HABIT_ACTION_DONE } from './habit-notification-rules';
import {
  AlertDefaults,
  insistsFor,
  DEFAULT_ALERT_DEFAULTS,
  DEFAULT_QUIET_HOURS,
  NotificationLevel,
  notificationLevelFor,
  QuietHours,
} from './notification-level-rules';
import type { SwatchId } from '../../constants/color-themes';

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
  /** How loud it rings (sheet 011). */
  level: NotificationLevel;
  /** Haute: it insists, with a longer vibration (sheet 032). */
  insists?: boolean;
  /** The colour chosen for its card (sheet 043): the notification takes it. */
  color?: SwatchId;
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

/** Its level, and whether it insists (Haute, sheet 032). */
function levelAndInsistOf(
  reminder: Reminder,
  at: Date,
  quietHours: QuietHours,
  defaults: AlertDefaults
): { level: NotificationLevel; insists?: boolean } {
  const level = levelOfReminder(reminder, at, quietHours, defaults);
  return insistsFor(reminder.priority, level) ? { level, insists: true } : { level };
}

/** The level of a reminder: the one chosen for it, or its priority and the settings (sheet 023). */
function levelOfReminder(reminder: Reminder, at: Date, quietHours: QuietHours, defaults: AlertDefaults) {
  return notificationLevelFor({ moment: 'reminder', priority: reminder.priority, at, quietHours, chosen: reminder.alertLevel, defaults });
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
function confirmationRepeats(
  item: ReminderToPlan,
  now: Date,
  language: AppLanguage,
  quietHours: QuietHours,
  defaults: AlertDefaults
): PlannedReminderNotification[] {
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
        ...(item.reminder.color ? { color: item.reminder.color } : {}),
        body: translate(language, 'reminderNotif.confirmAgain'),
        scheduledAt,
        ...levelAndInsistOf(item.reminder, scheduledAt, quietHours, defaults),
      });
    }
  }
  return repeats;
}

export function planReminderNotifications(
  items: ReminderToPlan[],
  now: Date,
  language: AppLanguage = 'fr',
  quietHours: QuietHours = DEFAULT_QUIET_HOURS,
  defaults: AlertDefaults = DEFAULT_ALERT_DEFAULTS
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
          ...(item.reminder.color ? { color: item.reminder.color } : {}),
          body: bodyOf(item.reminder, language),
          scheduledAt,
          ...levelAndInsistOf(item.reminder, scheduledAt, quietHours, defaults),
        };
      })
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, MAX_SCHEDULED_REMINDERS);

  // The repeats take the places left: they never push a reminder of its own out of the phone
  const repeats = active
    .flatMap(item => confirmationRepeats(item, now, language, quietHours, defaults))
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

export type ReminderNotificationAction = 'complete' | 'snooze' | 'habitDone' | 'open';

/** What a response asks: a button of the notification, or a plain tap that opens the app. */
export function notificationActionFor(actionIdentifier: string): ReminderNotificationAction {
  if (actionIdentifier === REMINDER_ACTION_COMPLETE) return 'complete';
  if (actionIdentifier === REMINDER_ACTION_SNOOZE) return 'snooze';
  if (actionIdentifier === HABIT_ACTION_DONE) return 'habitDone';
  return 'open';
}

/** Where a tapped notification leads, or null when opening the app is enough. */
export function notificationRoute(data: Record<string, unknown> | null | undefined): string | null {
  if (typeof data?.reminderId === 'string') return `/reminders/${data.reminderId}`;
  // A deadline or a moment (sheet 011): its own screen
  if (data?.type === 'TASK' && typeof data.taskId === 'string') return `/tasks/${data.taskId}`;
  if (data?.type === 'EVENT' && typeof data.eventId === 'string') return `/events/${data.eventId}`;
  if (data?.type === 'HABIT' && typeof data.habitId === 'string') return `/habits/${data.habitId}`;
  // The recap of the day opens the review of the day, where it is always there to read
  if (data?.type === 'DAILY_RECAP') return '/review?period=day';
  // A failed automatic backup: its settings, to pick the folder again or try now
  if (data?.type === 'AUTO_BACKUP_FAILED') return '/settings?section=data';
  return null;
}

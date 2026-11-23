/**
 * The "Terminer" and "Dans 1 h" buttons of the reminder notifications.
 *
 * On Android the buttons no longer open the app: expo-notifications runs the background task
 * below, even when the app was closed. When the app is open, its response listener gets the
 * tap instead. Both paths come here, and a tap is handled once only.
 */

import {
  notificationActionFor,
  REMINDER_ACTION_SNOOZE_MINUTES,
  REMINDER_ACTION_TASK,
} from '@/domain/rules/reminder-notification-rules';
import { format } from 'date-fns';
import { HabitRepository } from '@/repositories/habit-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { HabitUseCases } from '@/use-cases/habit-use-cases';
import { NotificationService } from '@/services/notification-service';
import { completeReminder, snoozeReminder } from '@/use-cases/reminder-use-cases';
import { logger } from '@/utils/logger';

export { REMINDER_ACTION_TASK };

export type ReminderActionOutcome = 'completed' | 'snoozed' | 'skipped';

export interface ReminderActionRequest {
  actionIdentifier: string;
  notificationIdentifier: string;
  reminderId: string;
  /** When the notification was shown: with the two above, tells one tap from another. */
  date: number;
}

const handled = new Set<string>();

/** Completes or snoozes the reminder of a tapped button, once per tap. */
export async function runReminderAction(request: ReminderActionRequest): Promise<ReminderActionOutcome> {
  const action = notificationActionFor(request.actionIdentifier);
  // Only the buttons of a reminder are handled here ("Fait" of a habit: runHabitAction)
  if (action !== 'complete' && action !== 'snooze') return 'skipped';

  const key = `${request.notificationIdentifier}:${request.actionIdentifier}:${request.date}`;
  if (handled.has(key)) return 'skipped';
  handled.add(key);

  await NotificationService.dismiss(request.notificationIdentifier);
  const reminder = await ReminderRepository.findById(request.reminderId);
  // Already done or removed, from a second tap or another screen: nothing left to do
  if (!reminder || reminder.status === 'COMPLETED' || reminder.status === 'DELETED') return 'skipped';

  if (action === 'complete') {
    await completeReminder(reminder);
    return 'completed';
  }
  await snoozeReminder(reminder, { kind: 'quick', minutes: REMINDER_ACTION_SNOOZE_MINUTES });
  return 'snoozed';
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** The reminder of a notification: its data comes as an object, or as JSON text from Android. */
export function reminderIdOf(content: unknown): string | null {
  const fields = record(content);
  if (!fields) return null;
  const data = record(fields.data);
  if (typeof data?.reminderId === 'string') return data.reminderId;
  if (typeof fields.dataString === 'string') {
    try {
      const parsed = record(JSON.parse(fields.dataString));
      if (typeof parsed?.reminderId === 'string') return parsed.reminderId;
    } catch {
      return null;
    }
  }
  return null;
}

/** What the background task receives for a tapped button, or null for anything else. */
export function parseBackgroundResponse(data: unknown): ReminderActionRequest | null {
  const response = record(data);
  const notification = record(response?.notification);
  const request = record(notification?.request);
  if (typeof response?.actionIdentifier !== 'string' || typeof request?.identifier !== 'string') return null;
  const reminderId = reminderIdOf(request.content);
  if (!reminderId) return null;
  return {
    actionIdentifier: response.actionIdentifier,
    notificationIdentifier: request.identifier,
    reminderId,
    date: typeof notification?.date === 'number' ? notification.date : 0,
  };
}

export interface HabitActionRequest {
  actionIdentifier: string;
  notificationIdentifier: string;
  habitId: string;
  /** When the notification was shown: the day it ticks. */
  date: number;
}

/** "Fait" on the notification of a habit (sheet 019): ticks the day it rang, once per tap. */
export async function runHabitAction(request: HabitActionRequest): Promise<'completed' | 'skipped'> {
  if (notificationActionFor(request.actionIdentifier) !== 'habitDone') return 'skipped';
  const key = `${request.notificationIdentifier}:${request.actionIdentifier}:${request.date}`;
  if (handled.has(key)) return 'skipped';
  handled.add(key);
  await NotificationService.dismiss(request.notificationIdentifier);
  const day = format(new Date(request.date || Date.now()), 'yyyy-MM-dd');
  // Already ticked, from the app or a second tap: the button never unticks
  if (await HabitRepository.isCompletedOn(request.habitId, day)) return 'skipped';
  await HabitUseCases.toggleHabitCompletion(request.habitId, day);
  return 'completed';
}

/** A text field of the data of a notification: an object, or JSON text from Android. */
function dataField(content: unknown, name: string): string | null {
  const fields = record(content);
  if (!fields) return null;
  const value = record(fields.data)?.[name];
  if (typeof value === 'string') return value;
  if (typeof fields.dataString === 'string') {
    try {
      const parsed = record(JSON.parse(fields.dataString))?.[name];
      return typeof parsed === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** What the background task receives for "Fait" on a habit, or null for anything else. */
export function parseBackgroundHabit(data: unknown): HabitActionRequest | null {
  const response = record(data);
  const notification = record(response?.notification);
  const request = record(notification?.request);
  if (typeof response?.actionIdentifier !== 'string' || typeof request?.identifier !== 'string') return null;
  const habitId = dataField(request.content, 'habitId');
  if (!habitId) return null;
  return {
    actionIdentifier: response.actionIdentifier,
    notificationIdentifier: request.identifier,
    habitId,
    date: typeof notification?.date === 'number' ? notification.date : 0,
  };
}

/** Body of the background task: never throws, the system would only retry. */
export async function handleBackgroundResponse(data: unknown): Promise<void> {
  const habit = parseBackgroundHabit(data);
  if (habit) {
    try {
      await runHabitAction(habit);
    } catch (error) {
      logger.error('[NotificationAction] Action de l habitude impossible', error);
    }
    return;
  }
  const request = parseBackgroundResponse(data);
  if (!request) return;
  try {
    await runReminderAction(request);
  } catch (error) {
    logger.error('[NotificationAction] Action du rappel impossible', error);
  }
}

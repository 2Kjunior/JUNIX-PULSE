/**
 * How loud a notification is: discreet, normal or alarm (study 001, 12.6; sheet 011).
 * The level depends on what rings, its priority and the time of day. Pure: no phone, no
 * database, so every case is tested. A new criterion (the type of a moment) belongs here.
 */

import type { ReminderPriority } from '../entities';

export type NotificationLevel = 'discreet' | 'normal' | 'alarm';

/** From the quietest to the loudest: one level up or down is one step in this list. */
export const NOTIFICATION_LEVELS: readonly NotificationLevel[] = ['discreet', 'normal', 'alarm'];

/** What rings: a reminder, a deadline (the day before, the day itself), a moment (before it, time to leave). */
export type NotificationMoment = 'reminder' | 'taskEve' | 'taskDay' | 'momentBefore' | 'momentLeave';

/** The level of each moment before the criteria. The evening before a deadline only informs. */
export const BASE_LEVELS: Readonly<Record<NotificationMoment, NotificationLevel>> = {
  reminder: 'normal',
  taskEve: 'discreet',
  taskDay: 'normal',
  momentBefore: 'normal',
  momentLeave: 'normal',
};

/** The night, in whole hours of the phone's clock. The same start and end: no night. */
export interface QuietHours {
  startHour: number;
  endHour: number;
}

export const DEFAULT_QUIET_HOURS: QuietHours = { startHour: 22, endHour: 7 };

/** The night chosen in the settings, or the default one for settings saved before it existed. */
export function quietHoursOf(settings: { quietHoursStart?: number; quietHoursEnd?: number }): QuietHours {
  return {
    startHour: settings.quietHoursStart ?? DEFAULT_QUIET_HOURS.startHour,
    endHour: settings.quietHoursEnd ?? DEFAULT_QUIET_HOURS.endHour,
  };
}

export function isQuietTime(at: Date, quiet: QuietHours): boolean {
  const { startHour, endHour } = quiet;
  if (startHour === endHour) return false;
  const hour = at.getHours();
  // 22 to 7 goes past midnight; 1 to 6 does not
  return startHour > endHour ? hour >= startHour || hour < endHour : hour >= startHour && hour < endHour;
}

export interface NotificationLevelInput {
  moment: NotificationMoment;
  priority?: ReminderPriority;
  at: Date;
  quietHours?: QuietHours;
}

export function notificationLevelFor({
  moment,
  priority,
  at,
  quietHours = DEFAULT_QUIET_HOURS,
}: NotificationLevelInput): NotificationLevel {
  const loudest = NOTIFICATION_LEVELS.length - 1;
  let index = NOTIFICATION_LEVELS.indexOf(BASE_LEVELS[moment]);
  // Urgent goes up one level
  if (priority === 'URGENT') index = Math.min(index + 1, loudest);
  // At night everything goes down one level, except the alarm
  if (index < loudest && isQuietTime(at, quietHours)) index = Math.max(index - 1, 0);
  return NOTIFICATION_LEVELS[index];
}

/** The kind of Android channel of a level. With the sound switched off, nothing rings. */
export type NotificationChannelKind = 'discreet' | 'normal' | 'alarm' | 'silent';

export function notificationChannelFor(level: NotificationLevel, soundOn: boolean): NotificationChannelKind {
  if (level === 'discreet') return 'discreet';
  return soundOn ? level : 'silent';
}

/** The level kept in a notification; one planned before the levels existed was normal. */
export function levelOf(value: unknown): NotificationLevel {
  return NOTIFICATION_LEVELS.includes(value as NotificationLevel) ? (value as NotificationLevel) : 'normal';
}

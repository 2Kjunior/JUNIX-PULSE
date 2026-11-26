/**
 * How loud a notification is: discreet, normal or alarm (study 001, 6-B and 12.6; sheets 011 and 023).
 * In order:
 * 1. the level the person chose for this item, if any ("Auto" chooses none);
 * 2. otherwise its priority (sheet 032, study 16.8): Urgente is always an alarm, Basse is discreet;
 *    Normale and Haute take the default level of the family (settings; normal at first), moved
 *    one step by the type of a moment (a mourning stays discreet, leaving for a journey is an
 *    alarm). The evening before a deadline is one step under its day;
 * 3. at night, everything goes down one step, except the alarm.
 * Pure: no phone, no database, so every case is tested. A new criterion belongs here.
 */

import type { AlertLevel, MomentKind, ReminderPriority } from '../entities';
import { ALERT_LEVELS } from '../enums';
import { MOMENT_KIND_ALERT_SHIFT } from './moment-kind-rules';

export type NotificationLevel = AlertLevel;

/** From the quietest to the loudest: one level up or down is one step in this list. */
export const NOTIFICATION_LEVELS: readonly NotificationLevel[] = ALERT_LEVELS;

/** What rings: a reminder, a deadline (the day before, the day itself), a moment (before it, time to leave). */
export type NotificationMoment = 'reminder' | 'taskEve' | 'taskDay' | 'momentBefore' | 'momentLeave' | 'habit';

/** The level of each moment before the criteria, with the default settings. The evening before a deadline only informs. */
export const BASE_LEVELS: Readonly<Record<NotificationMoment, NotificationLevel>> = {
  reminder: 'normal',
  taskEve: 'discreet',
  taskDay: 'normal',
  momentBefore: 'normal',
  momentLeave: 'normal',
  habit: 'normal',
};

// ─── Default level of each family, in the settings (sheet 023) ─────────────────────────────

/** The families whose default level the settings choose. */
export const ALERT_FAMILIES = ['reminder', 'deadline', 'moment', 'habit'] as const;
export type AlertFamily = (typeof ALERT_FAMILIES)[number];
export type AlertDefaults = Readonly<Record<AlertFamily, NotificationLevel>>;

export const DEFAULT_ALERT_DEFAULTS: AlertDefaults = { reminder: 'normal', deadline: 'normal', moment: 'normal', habit: 'normal' };

export function alertFamilyOf(moment: NotificationMoment): AlertFamily {
  switch (moment) {
    case 'taskEve':
    case 'taskDay':
      return 'deadline';
    case 'momentBefore':
    case 'momentLeave':
      return 'moment';
    default:
      return moment;
  }
}

function isLevel(value: unknown): value is NotificationLevel {
  return NOTIFICATION_LEVELS.includes(value as NotificationLevel);
}

/**
 * The defaults kept in the settings as "reminder=normal;deadline=alarm…". Anything missing or
 * unknown keeps its default, so settings saved before (or by another version) always read.
 */
export function alertDefaultsOf(text: string | null | undefined): AlertDefaults {
  const defaults: Record<AlertFamily, NotificationLevel> = { ...DEFAULT_ALERT_DEFAULTS };
  for (const pair of (text ?? '').split(';')) {
    const [family, level] = pair.split('=').map(part => part.trim());
    if ((ALERT_FAMILIES as readonly string[]).includes(family) && isLevel(level)) defaults[family as AlertFamily] = level;
  }
  return defaults;
}

export function alertDefaultsText(defaults: AlertDefaults): string {
  return ALERT_FAMILIES.map(family => `${family}=${defaults[family]}`).join(';');
}

// ─── The night ────────────────────────────────────────────────────────────────────────────

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

// ─── The level of one notification ───────────────────────────────────────────────────────

export interface NotificationLevelInput {
  moment: NotificationMoment;
  priority?: ReminderPriority;
  at: Date;
  quietHours?: QuietHours;
  /** The level chosen for this item; null or absent is "Auto". */
  chosen?: NotificationLevel | null;
  /** The type of the moment, for momentBefore and momentLeave. */
  momentKind?: MomentKind;
  /** The default level of each family, from the settings. */
  defaults?: AlertDefaults;
}

const step = (index: number, by: number) => Math.min(Math.max(index + by, 0), NOTIFICATION_LEVELS.length - 1);

export function notificationLevelFor({
  moment,
  priority,
  at,
  quietHours = DEFAULT_QUIET_HOURS,
  chosen,
  momentKind,
  defaults = DEFAULT_ALERT_DEFAULTS,
}: NotificationLevelInput): NotificationLevel {
  const loudest = NOTIFICATION_LEVELS.length - 1;
  let index: number;
  if (chosen && isLevel(chosen)) {
    index = NOTIFICATION_LEVELS.indexOf(chosen);
  } else {
    if (priority === 'URGENT') {
      // Urgente rings as an alarm, whatever the family and the type (sheet 032)
      index = loudest;
    } else if (priority === 'LOW') {
      index = 0;
    } else {
      index = NOTIFICATION_LEVELS.indexOf(defaults[alertFamilyOf(moment)]);
      if (momentKind && (moment === 'momentBefore' || moment === 'momentLeave')) {
        const shift = MOMENT_KIND_ALERT_SHIFT[momentKind];
        index = step(index, moment === 'momentLeave' ? shift.leave : shift.before);
      }
    }
    // The evening before a deadline only informs: one step below the day itself
    if (moment === 'taskEve') index = step(index, -1);
  }
  // At night everything goes down one level, except the alarm
  if (index < loudest && isQuietTime(at, quietHours)) index = step(index, -1);
  return NOTIFICATION_LEVELS[index];
}

/**
 * Haute rings at the normal level but insists (sheet 032): a longer vibration, on channels of
 * their own. An alarm already insists; a discreet notification never does.
 */
export function insistsFor(priority: ReminderPriority | undefined, level: NotificationLevel): boolean {
  return priority === 'HIGH' && level === 'normal';
}

/**
 * Whether a thing rings as an alarm, for its alarm clock on the cards (sheets 031 and 033): a level
 * chosen before sheet 032 decides; otherwise Urgente is an alarm.
 */
export function ringsAsAlarm(item: { alertLevel?: NotificationLevel | null; priority?: ReminderPriority }): boolean {
  if (item.alertLevel) return item.alertLevel === 'alarm';
  return item.priority === 'URGENT';
}

/** The kind of Android channel of a level. With the sound switched off, nothing rings. */
export type NotificationChannelKind = 'discreet' | 'normal' | 'alarm' | 'silent';

export function notificationChannelFor(level: NotificationLevel, soundOn: boolean): NotificationChannelKind {
  if (level === 'discreet') return 'discreet';
  return soundOn ? level : 'silent';
}

/** The level kept in a notification; one planned before the levels existed was normal. */
export function levelOf(value: unknown): NotificationLevel {
  return isLevel(value) ? value : 'normal';
}

/** A level chosen for an item, as saved: null for "Auto" or anything unknown. */
export function chosenLevelOf(value: unknown): NotificationLevel | null {
  return isLevel(value) ? value : null;
}

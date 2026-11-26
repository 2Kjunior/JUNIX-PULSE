/**
 * Which notifications the phone should hold for the tasks with a deadline and for the moments
 * (study 001, 12.6; sheet 011). The reminders keep their own rule (reminder-notification-rules).
 * - a task with a deadline: the day before at 18:00 and the day itself at 9:00;
 * - a moment: 15 minutes before it starts, and the time to leave when it has a place and a
 *   travel time (the "Leave … min before" of the form).
 */

import { Event, Task } from '../entities';
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import { MOMENT_KIND_TONES, momentKindOf, type MomentTone } from './moment-kind-rules';
import {
  AlertDefaults,
  DEFAULT_ALERT_DEFAULTS,
  DEFAULT_QUIET_HOURS,
  NotificationLevel,
  NotificationMoment,
  insistsFor,
  notificationLevelFor,
  QuietHours,
} from './notification-level-rules';

export const ITEM_IDENTIFIER_PREFIX = 'item-';
export const TASK_EVE_HOUR = 18;
export const TASK_DAY_HOUR = 9;
export const MOMENT_BEFORE_MINUTES = 15;
/** Places on the phone for these notifications, the nearest first; the reminders keep theirs. */
export const MAX_SCHEDULED_ITEMS = 40;
/** Moments further away are planned by a later sync. */
export const MOMENT_HORIZON_DAYS = 30;

export type ItemNotificationType = 'TASK' | 'EVENT';

export interface PlannedItemNotification {
  identifier: string;
  itemType: ItemNotificationType;
  itemId: string;
  moment: NotificationMoment;
  title: string;
  body: string;
  scheduledAt: Date;
  level: NotificationLevel;
  /** The tone of a moment (festive, neutral, sober): its sound follows it (sheet 031). */
  tone?: MomentTone;
  /** Haute: it insists, with a longer vibration (sheet 032). */
  insists?: boolean;
}

export interface ItemPlanInput {
  tasks: readonly Task[];
  events: readonly Event[];
  now: Date;
  language?: AppLanguage;
  quietHours?: QuietHours;
  /** The default level of each family, from the settings (sheet 023). */
  alertDefaults?: AlertDefaults;
}

const MINUTE = 60 * 1000;

/** A 'YYYY-MM-DD' day at an hour of the phone's clock, or null for a date that does not read. */
function dayAt(ymd: string, hour: number, dayShift = 0): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayShift, hour, 0, 0, 0);
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function planItemNotifications({
  tasks,
  events,
  now,
  language = 'fr',
  quietHours = DEFAULT_QUIET_HOURS,
  alertDefaults = DEFAULT_ALERT_DEFAULTS,
}: ItemPlanInput): PlannedItemNotification[] {
  const planned: PlannedItemNotification[] = [];
  const add = (
    item: Omit<PlannedItemNotification, 'identifier' | 'level' | 'tone' | 'insists'>,
    priority?: Task['priority'],
    // A moment: its type and the level chosen for it (sheet 023)
    moment?: Pick<Event, 'momentKind' | 'alertLevel'>
  ) => {
    if (item.scheduledAt <= now) return;
    const level = notificationLevelFor({
      moment: item.moment,
      priority,
      at: item.scheduledAt,
      quietHours,
      defaults: alertDefaults,
      chosen: moment?.alertLevel,
      momentKind: moment?.momentKind,
    });
    planned.push({
      ...item,
      // The time is in the identifier: a new date gives a new notification, and the old one is cancelled
      identifier: `${ITEM_IDENTIFIER_PREFIX}${item.itemType.toLowerCase()}-${item.itemId}-${item.moment}-${item.scheduledAt.getTime()}`,
      level,
      ...(item.itemType === 'EVENT' ? { tone: MOMENT_KIND_TONES[momentKindOf(moment?.momentKind)] } : {}),
      ...(insistsFor(priority, level) ? { insists: true } : {}),
    });
  };

  for (const task of tasks) {
    if (task.deletedAt || task.status === 'COMPLETED' || !task.dueDate) continue;
    const base = { itemType: 'TASK' as const, itemId: task.id, title: task.title };
    const eve = dayAt(task.dueDate, TASK_EVE_HOUR, -1);
    const day = dayAt(task.dueDate, TASK_DAY_HOUR);
    if (eve) add({ ...base, moment: 'taskEve', scheduledAt: eve, body: translate(language, 'itemNotif.taskEve') }, task.priority);
    if (day) add({ ...base, moment: 'taskDay', scheduledAt: day, body: translate(language, 'itemNotif.taskDay') }, task.priority);
  }

  const horizon = now.getTime() + MOMENT_HORIZON_DAYS * 24 * 60 * MINUTE;
  for (const event of events) {
    const start = new Date(event.startAt);
    if (event.deletedAt || Number.isNaN(start.getTime()) || start.getTime() > horizon) continue;
    const base = { itemType: 'EVENT' as const, itemId: event.id, title: event.title };
    const place = event.location?.trim() ?? '';
    const travel = event.travelBufferMinutes ?? 0;
    const leaves = place !== '' && travel > 0;
    if (leaves) {
      add({
        ...base,
        moment: 'momentLeave',
        scheduledAt: new Date(start.getTime() - travel * MINUTE),
        body: translate(language, 'itemNotif.momentLeave', { place, time: clock(start) }),
      }, event.priority, event);
    }
    // Leaving already warns this early or earlier: a second notice would only repeat it
    if (!leaves || travel < MOMENT_BEFORE_MINUTES) {
      add({
        ...base,
        moment: 'momentBefore',
        scheduledAt: new Date(start.getTime() - MOMENT_BEFORE_MINUTES * MINUTE),
        body: translate(language, 'itemNotif.momentBefore', { time: clock(start) }),
      }, event.priority, event);
    }
  }

  return planned.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()).slice(0, MAX_SCHEDULED_ITEMS);
}

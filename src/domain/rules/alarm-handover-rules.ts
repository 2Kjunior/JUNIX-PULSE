/**
 * Which notifications the alarm of Junix takes over (study 001, 16.9; sheet 034): on Android, with
 * the module, everything at the Alarm level rings until a gesture; the rest stays an ordinary
 * notification. Pure: the three sync services read it, the tests check it.
 */
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import type { NotificationLevel } from './notification-level-rules';
import { SOUNDS, type SoundChoice } from './sound-rules';

/** What Android receives for one alarm (the same shape as the module's NativeAlarm). */
export interface AlarmHandover {
  id: string;
  at: number;
  title: string;
  body: string;
  sound: string;
  url: string;
  stopLabel: string;
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
  /** What it is, on the page of the alarm (sheet 035). */
  kindLabel: string;
  openLabel: string;
  /** A sound of the phone, rung first; `sound` is the safety net (sheet 037). */
  soundUri: string;
  /** "Terminer", and the link that ends the thing; '' for a moment, which has nothing to end (sheet 039). */
  doneLabel: string;
  doneUrl: string;
}

/** The link that ends a thing from its alarm: junixpulse://alarm-done?type=reminder&id=… (sheet 039). */
export function alarmDoneUrl(kind: AlarmKind, itemId: string | undefined): string {
  if (!itemId || kind === 'moment') return '';
  return `junixpulse://alarm-done?type=${kind}&id=${encodeURIComponent(itemId)}`;
}

/** What rings, for the page of the alarm. */
export type AlarmKind = 'reminder' | 'task' | 'moment' | 'habit';

/** The planned notifications that ring as alarms, and the ones that stay notifications. */
export function splitAlarms<T extends { level: NotificationLevel }>(
  planned: readonly T[],
  nativeAlarms: boolean
): { alarms: T[]; notifications: T[] } {
  if (!nativeAlarms) return { alarms: [], notifications: [...planned] };
  return {
    alarms: planned.filter(item => item.level === 'alarm'),
    notifications: planned.filter(item => item.level !== 'alarm'),
  };
}

/** The link that opens a thing in the app from the alarm: junixpulse://reminders/… */
export function alarmUrl(route: string | null): string {
  return route ? `junixpulse:/${route.startsWith('/') ? route : `/${route}`}` : '';
}

/** One planned notification as an alarm, in the language of the person. */
export function alarmOf(
  item: { identifier: string; title: string; body: string; scheduledAt: Date },
  sound: SoundChoice,
  route: string | null,
  language: AppLanguage,
  kind: AlarmKind = 'reminder',
  soundUri = '',
  itemId?: string
): AlarmHandover {
  const doneUrl = alarmDoneUrl(kind, itemId);
  return {
    id: item.identifier,
    at: item.scheduledAt.getTime(),
    title: item.title,
    body: item.body,
    sound: sound === 'none' ? '' : SOUNDS[sound].file,
    url: alarmUrl(route),
    stopLabel: translate(language, 'alarm.stop'),
    snoozeLabel: translate(language, 'alarm.snooze'),
    missedTitle: translate(language, 'alarm.missed'),
    channelName: translate(language, 'alarm.channel'),
    kindLabel: translate(language, `alarm.kind.${kind}`),
    openLabel: translate(language, 'alarm.open'),
    soundUri,
    doneLabel: doneUrl ? translate(language, 'alarm.done') : '',
    doneUrl,
  };
}

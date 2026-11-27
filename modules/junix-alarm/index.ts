/**
 * The alarm of Junix that keeps ringing (study 001, 16.9; sheet 034): the side of the app.
 * Android only; elsewhere (web, tests, an old build without the module) `available` is false and
 * nothing is done: the app keeps its ordinary notifications.
 */
import { requireOptionalNativeModule } from 'expo';

/** One alarm, as the app hands it over. The words are in the language of the person. */
export interface NativeAlarm {
  id: string;
  /** When it rings, in milliseconds since 1970. */
  at: number;
  title: string;
  body: string;
  /** Its sound in res/raw (junix_alarm…), or '' for the vibration alone. */
  sound: string;
  /** The link that opens it in the app (junixpulse://…), or ''. */
  url: string;
  stopLabel: string;
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
  /** What it is, on the page of the alarm: "Rappel · Urgente" (sheet 035). */
  kindLabel: string;
  /** "Ouvrir dans Junix" (sheet 035). */
  openLabel: string;
  /** A sound of the phone (content://…), rung first; `sound` is the safety net (sheet 037). */
  soundUri: string;
}

/** A sound of the phone chosen for the alarms (sheet 037). */
export interface PickedSound {
  uri: string;
  name: string;
  kind: 'ringtone' | 'music';
}

interface JunixAlarmNative {
  replaceGroup(group: string, alarms: NativeAlarm[]): Promise<number>;
  plannedIds(): string[];
  canScheduleExact(): boolean;
  ringingId(): string | null;
  stopRinging(): void;
  canUseFullScreen(): boolean;
  openFullScreenSettings(): boolean;
  pickRingtone(current: string | null): Promise<PickedSound | null>;
  pickMusic(): Promise<PickedSound | null>;
  previewUri(uri: string, durationMs: number): boolean;
  stopPreview(): void;
}

const native = requireOptionalNativeModule<JunixAlarmNative>('JunixAlarm');

export const JunixAlarm = {
  /** True on an Android build that has the module. */
  available: native !== null,

  /** The alarms of one group (reminder, item, habit) become exactly these. */
  async replaceGroup(group: 'reminder' | 'item' | 'habit', alarms: NativeAlarm[]): Promise<void> {
    if (!native) return;
    await native.replaceGroup(group, alarms);
  },

  plannedIds(): string[] {
    return native ? native.plannedIds() : [];
  },

  ringingId(): string | null {
    return native ? native.ringingId() : null;
  },

  stopRinging(): void {
    native?.stopRinging();
  },

  /** Whether the page of the alarm may light the locked screen; null without the module (sheet 035). */
  canUseFullScreen(): boolean | null {
    return native ? native.canUseFullScreen() : null;
  },

  /** The list of the ringtones of Android; null when nothing is chosen or without the module (sheet 037). */
  async pickRingtone(current: string | null): Promise<PickedSound | null> {
    return native ? native.pickRingtone(current) : null;
  },

  /** A file of music, kept readable for the alarms; null when nothing is chosen. */
  async pickMusic(): Promise<PickedSound | null> {
    return native ? native.pickMusic() : null;
  },

  /** Plays a sound of the phone a few seconds; false when it cannot be read. */
  previewUri(uri: string, durationMs = 6000): boolean {
    return native ? native.previewUri(uri, durationMs) : false;
  },

  stopPreview(): void {
    native?.stopPreview();
  },

  /** Opens the page of Android to allow it; false when it could not be opened. */
  openFullScreenSettings(): boolean {
    return native ? native.openFullScreenSettings() : false;
  },
};

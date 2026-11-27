/**
 * The bridge to the alarm of Junix (sheet 034): on Android with the module, the sync services hand
 * it the notifications of the Alarm level, which then ring until a gesture. Elsewhere, or if the
 * handover fails, nothing changes: they stay ordinary notifications, never lost.
 */
import { Platform } from 'react-native';

import { JunixAlarm } from '../../modules/junix-alarm';
import type { AlarmHandover } from '../domain/rules/alarm-handover-rules';
import type { DeviceSound } from '../domain/rules/sound-rules';
import { logger } from '../utils/logger';

/** Whether this phone has the alarm of Junix. */
export function nativeAlarmsOn(): boolean {
  return Platform.OS === 'android' && JunixAlarm.available;
}

/**
 * Whether the page of the alarm may light the locked screen (sheet 035); null when this phone has
 * no alarm of Junix (web, old build): the settings then show nothing about it.
 */
export function fullScreenAlarmsAllowed(): boolean | null {
  if (!nativeAlarmsOn()) return null;
  try {
    return JunixAlarm.canUseFullScreen();
  } catch {
    return null;
  }
}

/** Opens the page of Android where the person allows it. */
export function openFullScreenAlarmSettings(): boolean {
  return nativeAlarmsOn() ? JunixAlarm.openFullScreenSettings() : false;
}

/** A sound of the phone for the alarms (sheet 037): a ringtone of Android, or a music; null if none. */
export async function pickPhoneSound(kind: 'ringtone' | 'music', current: string | null): Promise<DeviceSound | null> {
  if (!nativeAlarmsOn()) return null;
  try {
    const picked = kind === 'ringtone' ? await JunixAlarm.pickRingtone(current) : await JunixAlarm.pickMusic();
    return picked && picked.uri.startsWith('content://') ? { kind: picked.kind, uri: picked.uri, name: picked.name } : null;
  } catch (error) {
    logger.warn('[AlarmBridge] Choix du son du téléphone impossible', error);
    return null;
  }
}

/** Hears a sound of the phone a few seconds, on the alarm volume. */
export function previewPhoneSound(uri: string): void {
  if (nativeAlarmsOn()) JunixAlarm.previewUri(uri, 6000);
}

/** The alarms of one group become exactly these; true when Android took them. */
export async function handOverAlarms(group: 'reminder' | 'item' | 'habit', alarms: AlarmHandover[]): Promise<boolean> {
  if (!nativeAlarmsOn()) return false;
  try {
    await JunixAlarm.replaceGroup(group, alarms);
    return true;
  } catch (error) {
    logger.warn('[AlarmBridge] Les alarmes restent des notifications', error);
    return false;
  }
}

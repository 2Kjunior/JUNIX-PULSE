/**
 * The bridge to the alarm of Junix (sheet 034): on Android with the module, the sync services hand
 * it the notifications of the Alarm level, which then ring until a gesture. Elsewhere, or if the
 * handover fails, nothing changes: they stay ordinary notifications, never lost.
 */
import { Platform } from 'react-native';

import { JunixAlarm } from '../../modules/junix-alarm';
import type { AlarmHandover } from '../domain/rules/alarm-handover-rules';
import { phoneChannelId, phoneSoundKey, type DeviceSound, type SoundPrefs } from '../domain/rules/sound-rules';
import type { NotificationLevel } from '../domain/rules/notification-level-rules';
import type { AppLanguage } from '../domain/rules/language-rules';
import { translate } from '../i18n/translate';
import type { PhoneChannel } from '../../modules/junix-alarm';
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

/** A music of the phone (sheets 037 and 039); null if none. The ringtones of Android are gone (039). */
export async function pickPhoneSound(kind: 'ringtone' | 'music', _current: string | null): Promise<DeviceSound | null> {
  if (!nativeAlarmsOn() || kind !== 'music') return null;
  try {
    const picked = await JunixAlarm.pickMusic();
    return picked && picked.uri.startsWith('content://') ? { kind: picked.kind, uri: picked.uri, name: picked.name } : null;
  } catch (error) {
    logger.warn('[AlarmBridge] Choix du son du téléphone impossible', error);
    return null;
  }
}

/**
 * The channels of the musics of the phone for the discreet and normal notifications (sheet 039), from
 * the settings: made when missing, the ones of musics no longer chosen removed. The sync services call
 * it before they plan: a notification never goes to a channel that does not exist.
 */
export function syncPhoneChannels(prefs: SoundPrefs | undefined, language: AppLanguage): void {
  if (!nativeAlarmsOn()) return;
  const channels: PhoneChannel[] = [];
  for (const level of ['discreet', 'normal'] as const) {
    const device = prefs?.devices?.[level];
    if (!device) continue;
    for (const insists of level === 'normal' ? [false, true] : [false]) {
      channels.push({
        id: phoneChannelId(level, device, insists),
        name: translate(language, 'notifChannel.phoneName', {
          level: translate(language, insists ? 'priority.high' : `alertLevel.${level}`),
          name: device.name || '…',
        }),
        description: translate(language, 'notifChannel.phoneDesc'),
        level,
        uri: device.uri,
        insists,
      });
    }
  }
  try {
    JunixAlarm.syncPhoneChannels(channels);
  } catch (error) {
    logger.warn('[AlarmBridge] Canaux des musiques du téléphone', error);
  }
}

/**
 * What an ordinary notification takes of a music of the phone (sheet 039): its channel, the mark
 * kept in its data (a new music plans it again) and its address (heard in the app). Nothing on the
 * web or without the module: the sound of Junix rings.
 */
export function phoneSoundOf(
  level: NotificationLevel,
  device: DeviceSound | undefined,
  insists = false
): { channel: string; key: string; uri: string } | undefined {
  if (!device || level === 'alarm' || !nativeAlarmsOn()) return undefined;
  return { channel: phoneChannelId(level, device, insists), key: phoneSoundKey(device), uri: device.uri };
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

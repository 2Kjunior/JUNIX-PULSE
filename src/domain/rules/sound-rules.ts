/**
 * The sounds of Junix (study 001, 6-D and 16.7; sheet 031): which one rings for a notification.
 *
 * Each level has its sound, chosen in the settings: discreet (Léger, or none), normal (Pulse,
 * Cristal, Goutte, Léger) and alarm (Alarme, Réveil, Aube, Marche). A moment keeps the sound of
 * its tone when the settings say so (on at first): Festif for a birthday or a party at the normal
 * level, Sobre for a mourning or a ceremony, discreet or normal. An alarm always keeps its own.
 * With the sound of the notifications off, nothing rings.
 *
 * Pure: the screens and the services read it, the tests check every case. A new sound is a line
 * in SOUNDS (and its file in assets/sounds, made by scripts/sons/composer-sons.js).
 */
import type { NotificationLevel } from './notification-level-rules';
import type { MomentTone } from './moment-kind-rules';

export const SOUND_IDS = ['pulse', 'soft', 'festive', 'sober', 'alarm', 'wake', 'crystal', 'drop', 'dawn', 'march'] as const;
export type SoundId = (typeof SOUND_IDS)[number];
/** What rings: a sound, or nothing. */
export type SoundChoice = SoundId | 'none';

export interface SoundDefinition {
  id: SoundId;
  /** The file in assets/sounds, and on Android its name in res/raw (no extension). */
  file: string;
  /** Its name in the settings: sound.<id>. */
  labelKey: `sound.${SoundId}`;
  /** It repeats without a seam (the alarms, for the alarm that keeps ringing, 9-B). */
  loops: boolean;
}

export const SOUNDS: Readonly<Record<SoundId, SoundDefinition>> = {
  pulse: { id: 'pulse', file: 'junix_pulse_notification', labelKey: 'sound.pulse', loops: false },
  soft: { id: 'soft', file: 'junix_soft', labelKey: 'sound.soft', loops: false },
  festive: { id: 'festive', file: 'junix_festive', labelKey: 'sound.festive', loops: false },
  sober: { id: 'sober', file: 'junix_sober', labelKey: 'sound.sober', loops: false },
  alarm: { id: 'alarm', file: 'junix_alarm', labelKey: 'sound.alarm', loops: true },
  wake: { id: 'wake', file: 'junix_wake', labelKey: 'sound.wake', loops: true },
  crystal: { id: 'crystal', file: 'junix_crystal', labelKey: 'sound.crystal', loops: false },
  drop: { id: 'drop', file: 'junix_drop', labelKey: 'sound.drop', loops: false },
  dawn: { id: 'dawn', file: 'junix_dawn', labelKey: 'sound.dawn', loops: true },
  march: { id: 'march', file: 'junix_march', labelKey: 'sound.march', loops: true },
};

/** The sounds each level can choose, in the order the settings show them. */
export const SOUND_CHOICES: Readonly<Record<NotificationLevel, readonly SoundChoice[]>> = {
  discreet: ['soft', 'none'],
  normal: ['pulse', 'crystal', 'drop', 'soft'],
  alarm: ['alarm', 'wake', 'dawn', 'march'],
};

/** A sound of the phone (study 16.10; sheets 037 and 039): a music of the phone (a ringtone, before 039). */
export interface DeviceSound {
  kind: 'ringtone' | 'music';
  /** Its address on the phone (content://…). */
  uri: string;
  /** Its name, as the phone gives it ("Argon", "Mon titre"). */
  name: string;
}

export interface SoundPrefs {
  discreet: SoundChoice;
  normal: SoundChoice;
  /** The sound of Junix of the alarms; with a sound of the phone, its safety net. */
  alarm: SoundChoice;
  /** A festive or sober moment keeps the sound of its tone. */
  momentTones: boolean;
  /**
   * The sound of the phone of each priority, rather than the sound of Junix (sheets 037 and 039);
   * the sound of Junix of the level stays its safety net.
   */
  devices?: Partial<Record<NotificationLevel, DeviceSound>>;
}

/** The key of each level in the text of the settings: "device" stays the one of the alarms (sheet 037). */
const DEVICE_KEYS: Readonly<Record<NotificationLevel, string>> = {
  alarm: 'device',
  normal: 'device.normal',
  discreet: 'device.discreet',
};

export const DEFAULT_SOUND_PREFS: Readonly<SoundPrefs> = { discreet: 'soft', normal: 'pulse', alarm: 'alarm', momentTones: true };

/**
 * The settings read from their text ("discreet=soft;normal=pulse;alarm=wake;tones=1"). A value
 * missing, unknown or not allowed for its level keeps its default: old settings always read.
 */
export function soundPrefsOf(text: string | null | undefined): SoundPrefs {
  const prefs: SoundPrefs = { ...DEFAULT_SOUND_PREFS };
  for (const pair of (text ?? '').split(';')) {
    const [key, value] = pair.split('=').map(part => part.trim());
    if (key === 'tones') prefs.momentTones = value !== '0';
    else if (key.startsWith('device')) {
      const level = (Object.keys(DEVICE_KEYS) as NotificationLevel[]).find(each => DEVICE_KEYS[each] === key);
      const device = deviceSoundOf(value);
      if (level && device) prefs.devices = { ...prefs.devices, [level]: device };
    }
    else if (key === 'discreet' || key === 'normal' || key === 'alarm') {
      if ((SOUND_CHOICES[key] as readonly string[]).includes(value)) prefs[key] = value as SoundChoice;
    }
  }
  return prefs;
}

export function soundPrefsText(prefs: SoundPrefs): string {
  const devices = (['alarm', 'normal', 'discreet'] as const)
    .map(level => {
      const device = prefs.devices?.[level];
      return device ? `;${DEVICE_KEYS[level]}=${device.kind}|${encodeURIComponent(device.uri)}|${encodeURIComponent(device.name)}` : '';
    })
    .join('');
  return `discreet=${prefs.discreet};normal=${prefs.normal};alarm=${prefs.alarm};tones=${prefs.momentTones ? 1 : 0}${devices}`;
}

/** "ringtone|content%3A…|Argon": a sound of the phone kept in the settings; anything else, none. */
function deviceSoundOf(text: string | undefined): DeviceSound | undefined {
  const [kind, uri, name] = (text ?? '').split('|');
  if ((kind !== 'ringtone' && kind !== 'music') || !uri) return undefined;
  try {
    const address = decodeURIComponent(uri);
    if (!address.startsWith('content://')) return undefined;
    return { kind, uri: address, name: decodeURIComponent(name ?? '') };
  } catch {
    return undefined;
  }
}

/**
 * The sound of the phone a notification rings with (sheets 037 and 039): the one of its level, with
 * the sound on. A moment that keeps the sound of its tone (Festif, Sobre) keeps it; an alarm always
 * takes its own. Otherwise none, and the sound of Junix rings.
 */
export function deviceSoundFor({
  level,
  tone,
  prefs = DEFAULT_SOUND_PREFS,
  soundOn = true,
}: {
  level: NotificationLevel;
  tone?: MomentTone;
  prefs?: SoundPrefs;
  soundOn?: boolean;
}): DeviceSound | undefined {
  if (!soundOn) return undefined;
  if (level !== 'alarm' && prefs.momentTones && (tone === 'sober' || (level === 'normal' && tone === 'festive'))) return undefined;
  return prefs.devices?.[level];
}

/** A short fixed mark of an address, for the names of the channels and the data of a notification. */
function markOf(uri: string): string {
  let hash = 5381;
  for (let i = 0; i < uri.length; i++) hash = ((hash << 5) + hash + uri.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

/** What a notification keeps of its sound of the phone: a new music plans it again (sheet 039). */
export function phoneSoundKey(device: DeviceSound): string {
  return `phone-${markOf(device.uri)}`;
}

/**
 * The channel of Android that rings a sound of the phone at a level (sheet 039): its sound is fixed
 * when it is made, so each music has its own; Haute insists on its own one, as the sounds of Junix.
 */
export function phoneChannelId(level: NotificationLevel, device: DeviceSound, insists = false): string {
  return `junix-pulse-phone-${level}${insists && level === 'normal' ? '-insist' : ''}-${markOf(device.uri)}-v1`;
}

/** The sound of one notification: its level, the tone of its moment if any, the settings. */
export function soundFor({
  level,
  tone,
  prefs = DEFAULT_SOUND_PREFS,
  soundOn = true,
}: {
  level: NotificationLevel;
  tone?: MomentTone;
  prefs?: SoundPrefs;
  soundOn?: boolean;
}): SoundChoice {
  if (!soundOn) return 'none';
  if (level === 'alarm') return prefs.alarm;
  if (prefs.momentTones && tone === 'sober') return 'sober';
  if (level === 'normal' && prefs.momentTones && tone === 'festive') return 'festive';
  return prefs[level];
}

/**
 * The Android channel of a level and a sound. A channel's sound cannot change once created
 * (Android): each pair has its own. Without sound, the channels that existed before keep serving.
 */
export function soundChannelId(level: NotificationLevel, sound: SoundChoice, insists = false): string {
  if (sound === 'none') return level === 'discreet' ? 'junix-pulse-level-discreet-v1' : 'junix-pulse-reminders-silent-v1';
  // Haute (sheet 032): the same sound, a longer vibration; only the normal level insists
  if (insists && level === 'normal') return `junix-pulse-sound-normal-${sound}-insist-v1`;
  return `junix-pulse-sound-${level}-${sound}-v1`;
}

/** Every pair of level and sound a notification can use, and the insisting ones: the channels to create. */
export function soundChannels(): { level: NotificationLevel; sound: SoundId; insists?: boolean }[] {
  const pairs: { level: NotificationLevel; sound: SoundId; insists?: boolean }[] = [];
  const add = (level: NotificationLevel, sound: SoundChoice) => {
    if (sound !== 'none' && !pairs.some(pair => pair.level === level && pair.sound === sound)) pairs.push({ level, sound });
  };
  (Object.keys(SOUND_CHOICES) as NotificationLevel[]).forEach(level => SOUND_CHOICES[level].forEach(sound => add(level, sound)));
  // The tones of the moments
  add('discreet', 'sober');
  add('normal', 'sober');
  add('normal', 'festive');
  // Haute insists at the normal level, with each sound of that level (sheet 032)
  for (const pair of pairs.filter(item => item.level === 'normal')) pairs.push({ ...pair, insists: true });
  return pairs;
}

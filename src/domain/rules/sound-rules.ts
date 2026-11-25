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

export interface SoundPrefs {
  discreet: SoundChoice;
  normal: SoundChoice;
  alarm: SoundChoice;
  /** A festive or sober moment keeps the sound of its tone. */
  momentTones: boolean;
}

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
    else if (key === 'discreet' || key === 'normal' || key === 'alarm') {
      if ((SOUND_CHOICES[key] as readonly string[]).includes(value)) prefs[key] = value as SoundChoice;
    }
  }
  return prefs;
}

export function soundPrefsText(prefs: SoundPrefs): string {
  return `discreet=${prefs.discreet};normal=${prefs.normal};alarm=${prefs.alarm};tones=${prefs.momentTones ? 1 : 0}`;
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
export function soundChannelId(level: NotificationLevel, sound: SoundChoice): string {
  if (sound === 'none') return level === 'discreet' ? 'junix-pulse-level-discreet-v1' : 'junix-pulse-reminders-silent-v1';
  return `junix-pulse-sound-${level}-${sound}-v1`;
}

/** Every pair of level and sound a notification can use: the channels to create. */
export function soundChannels(): { level: NotificationLevel; sound: SoundId }[] {
  const pairs: { level: NotificationLevel; sound: SoundId }[] = [];
  const add = (level: NotificationLevel, sound: SoundChoice) => {
    if (sound !== 'none' && !pairs.some(pair => pair.level === level && pair.sound === sound)) pairs.push({ level, sound });
  };
  (Object.keys(SOUND_CHOICES) as NotificationLevel[]).forEach(level => SOUND_CHOICES[level].forEach(sound => add(level, sound)));
  // The tones of the moments
  add('discreet', 'sober');
  add('normal', 'sober');
  add('normal', 'festive');
  return pairs;
}

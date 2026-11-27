import {
  DEFAULT_SOUND_PREFS,
  deviceSoundFor,
  SOUNDS,
  SOUND_CHOICES,
  soundChannelId,
  soundChannels,
  soundFor,
  soundPrefsOf,
  soundPrefsText,
} from '../sound-rules';

describe('sound-rules (sheet 031)', () => {
  it('gives each level its sound, and nothing when the sound is off', () => {
    expect(soundFor({ level: 'discreet' })).toBe('soft');
    expect(soundFor({ level: 'normal' })).toBe('pulse');
    expect(soundFor({ level: 'alarm' })).toBe('alarm');
    expect(soundFor({ level: 'alarm', soundOn: false })).toBe('none');
  });

  it('keeps the tone of a moment, unless the settings say otherwise', () => {
    expect(soundFor({ level: 'normal', tone: 'festive' })).toBe('festive');
    expect(soundFor({ level: 'normal', tone: 'sober' })).toBe('sober');
    // A mourning goes down to discreet: it keeps its sober sound, never the light one
    expect(soundFor({ level: 'discreet', tone: 'sober' })).toBe('sober');
    // A festive moment at night (discreet) takes the discreet sound
    expect(soundFor({ level: 'discreet', tone: 'festive' })).toBe('soft');
    // An alarm keeps the alarm sound, whatever the tone
    expect(soundFor({ level: 'alarm', tone: 'festive' })).toBe('alarm');
    const noTones = { ...DEFAULT_SOUND_PREFS, momentTones: false };
    expect(soundFor({ level: 'normal', tone: 'festive', prefs: noTones })).toBe('pulse');
  });

  it('follows the chosen sounds', () => {
    const prefs = { discreet: 'none', normal: 'crystal', alarm: 'wake', momentTones: true } as const;
    expect(soundFor({ level: 'discreet', prefs })).toBe('none');
    expect(soundFor({ level: 'normal', prefs })).toBe('crystal');
    expect(soundFor({ level: 'alarm', prefs })).toBe('wake');
  });

  it('reads the settings strictly and writes them back', () => {
    expect(soundPrefsOf(null)).toEqual(DEFAULT_SOUND_PREFS);
    expect(soundPrefsOf('discreet=none;normal=drop;alarm=march;tones=0')).toEqual({ discreet: 'none', normal: 'drop', alarm: 'march', momentTones: false });
    // A sound not allowed for its level keeps the default
    expect(soundPrefsOf('normal=wake;alarm=pulse;discreet=festive')).toEqual(DEFAULT_SOUND_PREFS);
    const prefs = { discreet: 'soft', normal: 'crystal', alarm: 'dawn', momentTones: true } as const;
    expect(soundPrefsOf(soundPrefsText(prefs))).toEqual(prefs);
  });

  it('gives a channel to every pair, the silent ones reused', () => {
    expect(soundChannelId('alarm', 'wake')).toBe('junix-pulse-sound-alarm-wake-v1');
    expect(soundChannelId('discreet', 'none')).toBe('junix-pulse-level-discreet-v1');
    expect(soundChannelId('normal', 'none')).toBe('junix-pulse-reminders-silent-v1');
    const pairs = soundChannels();
    // Every sound a level can choose, and the tones of the moments
    for (const level of ['discreet', 'normal', 'alarm'] as const) {
      for (const sound of SOUND_CHOICES[level]) if (sound !== 'none') expect(pairs).toContainEqual({ level, sound });
    }
    expect(pairs).toContainEqual({ level: 'normal', sound: 'festive' });
    expect(pairs).toContainEqual({ level: 'discreet', sound: 'sober' });
    expect(new Set(pairs.map(pair => soundChannelId(pair.level, pair.sound, pair.insists))).size).toBe(pairs.length);
    // Haute insists at the normal level only, with each of its sounds (sheet 032)
    expect(soundChannelId('normal', 'pulse', true)).toBe('junix-pulse-sound-normal-pulse-insist-v1');
    expect(soundChannelId('alarm', 'wake', true)).toBe('junix-pulse-sound-alarm-wake-v1');
    expect(pairs).toContainEqual({ level: 'normal', sound: 'festive', insists: true });
  });

  it('names each file as Android wants it in res/raw', () => {
    for (const sound of Object.values(SOUNDS)) expect(sound.file).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('keeps a sound of the phone for the alarms, with the sound of Junix as safety net (sheet 037)', () => {
    const prefs = {
      ...DEFAULT_SOUND_PREFS,
      alarm: 'wake' as const,
      alarmDevice: { kind: 'music' as const, uri: 'content://media/audio/42', name: 'Mon titre; 2|bis' },
    };
    // Written and read back, even with ";" and "|" in the name
    expect(soundPrefsOf(soundPrefsText(prefs))).toEqual(prefs);
    // An address that is not a content of the phone, or an unknown kind: ignored
    expect(soundPrefsOf('device=music|file%3A%2F%2Fx|a').alarmDevice).toBeUndefined();
    expect(soundPrefsOf('device=video|content%3A%2F%2Fx|a').alarmDevice).toBeUndefined();
    // Only an alarm rings with it, and only with the sound on
    expect(deviceSoundFor({ level: 'alarm', prefs })?.name).toBe('Mon titre; 2|bis');
    expect(deviceSoundFor({ level: 'normal', prefs })).toBeUndefined();
    expect(deviceSoundFor({ level: 'alarm', prefs, soundOn: false })).toBeUndefined();
    // The sound of Junix stays the one of the ordinary notification of an alarm
    expect(soundFor({ level: 'alarm', prefs })).toBe('wake');
  });
});

import {
  DEFAULT_SOUND_PREFS,
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
    expect(new Set(pairs.map(pair => soundChannelId(pair.level, pair.sound))).size).toBe(pairs.length);
  });

  it('names each file as Android wants it in res/raw', () => {
    for (const sound of Object.values(SOUNDS)) expect(sound.file).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});

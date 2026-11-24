import {
  alertDefaultsOf,
  alertDefaultsText,
  alertFamilyOf,
  chosenLevelOf,
  DEFAULT_ALERT_DEFAULTS,
  notificationLevelFor,
} from '../notification-level-rules';

// 15:00 is day, 23:00 is night with the default night (22 to 7)
const DAY = new Date('2026-11-24T15:00:00');
const NIGHT = new Date('2026-11-24T23:00:00');

describe('the alert hierarchy (study 001, 6-B; sheet 023)', () => {
  it('gives the same levels as before with the default settings', () => {
    expect(notificationLevelFor({ moment: 'reminder', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'taskEve', at: DAY })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'taskDay', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'reminder', priority: 'URGENT', at: DAY })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'reminder', at: NIGHT })).toBe('discreet');
  });

  it('follows the default level of each family', () => {
    const defaults = { ...DEFAULT_ALERT_DEFAULTS, reminder: 'alarm' as const, moment: 'discreet' as const, deadline: 'alarm' as const };
    expect(notificationLevelFor({ moment: 'reminder', at: DAY, defaults })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'momentBefore', at: DAY, defaults })).toBe('discreet');
    // The evening before stays one step below the day itself
    expect(notificationLevelFor({ moment: 'taskDay', at: DAY, defaults })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'taskEve', at: DAY, defaults })).toBe('normal');
    expect(notificationLevelFor({ moment: 'habit', at: DAY, defaults })).toBe('normal');
  });

  it('moves a moment by its type', () => {
    expect(notificationLevelFor({ moment: 'momentBefore', momentKind: 'mourning', at: DAY })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'momentLeave', momentKind: 'mourning', at: DAY })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'momentLeave', momentKind: 'travel', at: DAY })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'momentBefore', momentKind: 'travel', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', momentKind: 'birthday', at: DAY })).toBe('normal');
    // The type of a moment says nothing of a reminder
    expect(notificationLevelFor({ moment: 'reminder', momentKind: 'mourning', at: DAY })).toBe('normal');
  });

  it('keeps the level chosen for an item, whatever the settings, the type or the urgency', () => {
    const defaults = { ...DEFAULT_ALERT_DEFAULTS, reminder: 'alarm' as const };
    expect(notificationLevelFor({ moment: 'reminder', chosen: 'discreet', priority: 'URGENT', at: DAY, defaults })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'momentLeave', chosen: 'normal', momentKind: 'travel', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', chosen: 'alarm', momentKind: 'mourning', at: DAY })).toBe('alarm');
  });

  it('lowers everything at night but the alarm, even a chosen level', () => {
    expect(notificationLevelFor({ moment: 'reminder', chosen: 'normal', at: NIGHT })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'reminder', chosen: 'alarm', at: NIGHT })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'momentLeave', momentKind: 'travel', at: NIGHT })).toBe('alarm');
  });
});

describe('the default levels in the settings', () => {
  it('reads what was saved, and the default for anything missing or unknown', () => {
    expect(alertDefaultsOf(undefined)).toEqual(DEFAULT_ALERT_DEFAULTS);
    expect(alertDefaultsOf('')).toEqual(DEFAULT_ALERT_DEFAULTS);
    expect(alertDefaultsOf('reminder=alarm;moment=loud;sound=alarm')).toEqual({ ...DEFAULT_ALERT_DEFAULTS, reminder: 'alarm' });
  });

  it('writes what it reads', () => {
    const defaults = { reminder: 'alarm', deadline: 'discreet', moment: 'normal', habit: 'discreet' } as const;
    expect(alertDefaultsOf(alertDefaultsText(defaults))).toEqual(defaults);
  });

  it('groups what rings in four families', () => {
    expect(alertFamilyOf('taskEve')).toBe('deadline');
    expect(alertFamilyOf('momentLeave')).toBe('moment');
    expect(alertFamilyOf('habit')).toBe('habit');
  });

  it('reads a saved choice, Auto being none', () => {
    expect(chosenLevelOf('alarm')).toBe('alarm');
    expect(chosenLevelOf(null)).toBeNull();
    expect(chosenLevelOf('loud')).toBeNull();
  });
});

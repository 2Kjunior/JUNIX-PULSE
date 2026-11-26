import {
  DEFAULT_QUIET_HOURS,
  insistsFor,
  ringsAsAlarm,
  isQuietTime,
  levelOf,
  notificationChannelFor,
  notificationLevelFor,
  quietHoursOf,
} from '../notification-level-rules';

/** A day of November 2026 at this hour and a half, on the phone's clock. */
const at = (hour: number) => new Date(2026, 10, 25, hour, 30);

describe('notification levels', () => {
  it('gives each moment its level by day', () => {
    expect(notificationLevelFor({ moment: 'reminder', at: at(10) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'taskEve', at: at(18) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'taskDay', at: at(9) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', at: at(14) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentLeave', at: at(14) })).toBe('normal');
  });

  it('raises what is urgent by one level, up to the alarm', () => {
    expect(notificationLevelFor({ moment: 'reminder', priority: 'URGENT', at: at(10) })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'taskEve', priority: 'URGENT', at: at(18) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'reminder', priority: 'HIGH', at: at(10) })).toBe('normal');
  });

  it('lowers everything at night, except the alarm', () => {
    expect(notificationLevelFor({ moment: 'reminder', at: at(23) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'reminder', at: at(3) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'taskEve', at: at(23) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'reminder', priority: 'URGENT', at: at(23) })).toBe('alarm');
  });

  it('follows the night chosen in the settings', () => {
    const quiet = { startHour: 23, endHour: 6 };
    expect(isQuietTime(at(22), quiet)).toBe(false);
    expect(isQuietTime(at(23), quiet)).toBe(true);
    expect(isQuietTime(at(5), quiet)).toBe(true);
    expect(isQuietTime(at(6), quiet)).toBe(false);
    expect(isQuietTime(at(3), { startHour: 1, endHour: 6 })).toBe(true);
    expect(isQuietTime(at(3), { startHour: 7, endHour: 7 })).toBe(false);
    expect(notificationLevelFor({ moment: 'reminder', at: at(22), quietHours: quiet })).toBe('normal');
    expect(quietHoursOf({})).toEqual(DEFAULT_QUIET_HOURS);
    expect(quietHoursOf({ quietHoursStart: 23, quietHoursEnd: 6 })).toEqual(quiet);
  });

  it('gives each level its channel, silent when the sound is off', () => {
    expect(notificationChannelFor('alarm', true)).toBe('alarm');
    expect(notificationChannelFor('alarm', false)).toBe('silent');
    expect(notificationChannelFor('normal', false)).toBe('silent');
    expect(notificationChannelFor('discreet', true)).toBe('discreet');
    expect(levelOf(undefined)).toBe('normal');
    expect(levelOf('alarm')).toBe('alarm');
    expect(levelOf('loud')).toBe('normal');
  });

  it('lets the priority choose the level (sheet 032)', () => {
    const loud = { reminder: 'alarm', deadline: 'alarm', moment: 'alarm', habit: 'alarm' } as const;
    const quiet = { reminder: 'discreet', deadline: 'discreet', moment: 'discreet', habit: 'discreet' } as const;
    // Basse is discreet, even when the family rings as an alarm
    expect(notificationLevelFor({ moment: 'reminder', priority: 'LOW', at: at(10), defaults: loud })).toBe('discreet');
    // Urgente is an alarm, even for a quiet family or a mourning
    expect(notificationLevelFor({ moment: 'reminder', priority: 'URGENT', at: at(10), defaults: quiet })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'momentBefore', priority: 'URGENT', momentKind: 'mourning', at: at(10) })).toBe('alarm');
    // Its deadline: an alarm on the day, normal the evening before
    expect(notificationLevelFor({ moment: 'taskDay', priority: 'URGENT', at: at(9) })).toBe('alarm');
    // Normale and Haute follow the family and the type
    expect(notificationLevelFor({ moment: 'momentBefore', priority: 'HIGH', momentKind: 'mourning', at: at(10) })).toBe('discreet');
  });

  it('shows the alarm clock for an urgent thing, or a level chosen as alarm (sheet 033)', () => {
    expect(ringsAsAlarm({ priority: 'URGENT' })).toBe(true);
    expect(ringsAsAlarm({ priority: 'HIGH' })).toBe(false);
    expect(ringsAsAlarm({ priority: 'NORMAL', alertLevel: 'alarm' })).toBe(true);
    // A level chosen before sheet 032 still decides
    expect(ringsAsAlarm({ priority: 'URGENT', alertLevel: 'discreet' })).toBe(false);
  });

  it('makes Haute insist at the normal level only', () => {
    expect(insistsFor('HIGH', 'normal')).toBe(true);
    expect(insistsFor('HIGH', 'discreet')).toBe(false);
    expect(insistsFor('NORMAL', 'normal')).toBe(false);
    expect(insistsFor(undefined, 'alarm')).toBe(false);
  });
});

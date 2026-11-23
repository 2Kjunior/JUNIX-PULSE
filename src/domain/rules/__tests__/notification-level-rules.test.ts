import {
  DEFAULT_QUIET_HOURS,
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
});

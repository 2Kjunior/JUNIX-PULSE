import { alarmOf, alarmUrl, splitAlarms } from '../alarm-handover-rules';

describe('alarm-handover-rules (sheet 034)', () => {
  const planned = [
    { id: 'a', level: 'alarm' as const },
    { id: 'n', level: 'normal' as const },
    { id: 'd', level: 'discreet' as const },
  ];

  it('hands the Alarm level to the alarm of Junix, and only with the module', () => {
    expect(splitAlarms(planned, true)).toEqual({ alarms: [planned[0]], notifications: [planned[1], planned[2]] });
    // Without the module (web, an old build): everything stays a notification
    expect(splitAlarms(planned, false)).toEqual({ alarms: [], notifications: planned });
  });

  it('makes the link that opens the thing in the app', () => {
    expect(alarmUrl('/reminders/r1')).toBe('junixpulse://reminders/r1');
    expect(alarmUrl('tasks/t1')).toBe('junixpulse://tasks/t1');
    expect(alarmUrl(null)).toBe('');
  });

  it('gives Android the sound file and the words of the person', () => {
    const at = new Date(2026, 10, 27, 7, 30);
    const alarm = alarmOf({ identifier: 'reminder-r1-1', title: 'Prendre le train', body: 'Rappel', scheduledAt: at }, 'wake', '/reminders/r1', 'fr');
    expect(alarm).toMatchObject({
      id: 'reminder-r1-1',
      at: at.getTime(),
      title: 'Prendre le train',
      sound: 'junix_wake',
      url: 'junixpulse://reminders/r1',
      stopLabel: 'Arrêter',
      snoozeLabel: 'Plus tard · 10 min',
      missedTitle: 'Alarme manquée',
    });
    // The sound off: the vibration alone
    expect(alarmOf({ identifier: 'x', title: 't', body: 'b', scheduledAt: at }, 'none', null, 'en')).toMatchObject({ sound: '', url: '', stopLabel: 'Stop' });
  });
});

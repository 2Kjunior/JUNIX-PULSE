import { RecurrenceRule, Reminder } from '../../entities';
import {
  MAX_RECURRING_OCCURRENCES,
  MAX_SCHEDULED_REMINDERS,
  notificationRoute,
  planReminderNotifications,
} from '../reminder-notification-rules';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const DAILY: RecurrenceRule = { id: 'rule', type: 'DAILY', interval: 1 };

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'r1',
  title: 'Appeler',
  scheduledAt: '2026-06-15T18:00:00.000Z',
  timezone: 'UTC',
  priority: 'NORMAL',
  status: 'UPCOMING',
  actionType: 'NONE',
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

describe('planReminderNotifications', () => {
  it('plans one notification for a one-off reminder', () => {
    const [planned, ...others] = planReminderNotifications([{ reminder: reminder(), rule: null }], NOW);

    expect(others).toEqual([]);
    expect(planned).toMatchObject({ reminderId: 'r1', title: 'Appeler', body: 'Rappel Junix Pulse' });
    expect(planned.scheduledAt.toISOString()).toBe('2026-06-15T18:00:00.000Z');
  });

  it('plans several occurrences ahead for a recurring reminder, each with its own identifier', () => {
    const planned = planReminderNotifications([{ reminder: reminder(), rule: DAILY }], NOW);

    expect(planned).toHaveLength(MAX_RECURRING_OCCURRENCES);
    expect(new Set(planned.map(item => item.identifier)).size).toBe(MAX_RECURRING_OCCURRENCES);
    expect(planned[1].scheduledAt.toISOString()).toBe('2026-06-16T18:00:00.000Z');
  });

  it('stops at the end date of the rule', () => {
    const rule = { ...DAILY, endDate: '2026-06-17T23:00:00.000Z' };

    expect(planReminderNotifications([{ reminder: reminder(), rule }], NOW)).toHaveLength(3);
  });

  it('resumes a recurring reminder from its next future occurrence', () => {
    const late = reminder({ scheduledAt: '2026-06-10T18:00:00.000Z' });

    const planned = planReminderNotifications([{ reminder: late, rule: DAILY }], NOW);

    expect(planned[0].scheduledAt.toISOString()).toBe('2026-06-15T18:00:00.000Z');
  });

  it('skips a one-off reminder already past', () => {
    const late = reminder({ scheduledAt: '2026-06-10T18:00:00.000Z' });

    expect(planReminderNotifications([{ reminder: late, rule: null }], NOW)).toEqual([]);
  });

  it.each<Reminder['status']>(['COMPLETED', 'DELETED', 'MISSED'])('skips a reminder that is %s', status => {
    expect(planReminderNotifications([{ reminder: reminder({ status }), rule: null }], NOW)).toEqual([]);
  });

  it('rings a snoozed occurrence once, and says it was snoozed', () => {
    const snoozed = reminder({ status: 'SNOOZED', notes: 'Le dentiste' });

    const planned = planReminderNotifications([{ reminder: snoozed, rule: DAILY }], NOW);

    expect(planned).toHaveLength(1);
    expect(planned[0].body).toBe('Rappel reporté — Le dentiste');
  });

  it('keeps the nearest notifications within the limit of the phone', () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      reminder: reminder({ id: `r${index}`, scheduledAt: `2026-06-${16 + index}T08:00:00.000Z` }),
      rule: DAILY,
    }));

    const planned = planReminderNotifications(many, NOW);

    expect(planned).toHaveLength(MAX_SCHEDULED_REMINDERS);
    const times = planned.map(item => item.scheduledAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(planned[0].reminderId).toBe('r0');
  });
});

describe('notificationRoute', () => {
  it('opens the reminder, or the home screen for a recap', () => {
    expect(notificationRoute({ reminderId: 'r1', type: 'REMINDER' })).toBe('/reminders/r1');
    expect(notificationRoute({ type: 'DAILY_RECAP' })).toBe('/review?period=day');
    expect(notificationRoute({ type: 'AUTO_BACKUP_FAILED' })).toBe('/settings?section=data');
  });

  it('opens nothing in particular otherwise', () => {
    expect(notificationRoute({ type: 'FOCUS_END' })).toBeNull();
    expect(notificationRoute(undefined)).toBeNull();
  });
});

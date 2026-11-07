/**
 * Phase 2: the deadline of a task (badge, order, Pulse's warning) and the reminders to confirm
 * (repeats after the ring, kept by the next syncs, stopped once done, never above the cap).
 */

import { deadlineInfo, isDeadlineToAnnounce, sortByDeadline } from '@/domain/rules/deadline-rules';
import { dueMascotTimeTriggers, MascotTimeInput } from '@/domain/rules/mascot-time-rules';
import { triggerToMascotMessage } from '@/domain/rules/mascot-trigger-message-rules';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import {
  CONFIRMATION_INTERVAL_MINUTES,
  CONFIRMATION_REPEATS,
  MAX_SCHEDULED_REMINDERS,
  planReminderNotifications,
  ReminderToPlan,
} from '@/domain/rules/reminder-notification-rules';
import type { Reminder } from '@/domain/entities';

const now = new Date(2026, 10, 7, 15, 0); // samedi 7 novembre 2026, 15:00
const MINUTE = 60 * 1000;

describe('deadline of a task', () => {
  it('counts the days and only turns orange from the day before', () => {
    expect(deadlineInfo('2026-11-10', now)).toEqual({ daysLeft: 3, tone: 'calm' });
    expect(deadlineInfo('2026-11-08', now)).toEqual({ daysLeft: 1, tone: 'soon' });
    expect(deadlineInfo('2026-11-07', now)).toEqual({ daysLeft: 0, tone: 'today' });
    expect(deadlineInfo('2026-11-05', now)).toEqual({ daysLeft: -2, tone: 'late' });
    expect(deadlineInfo(undefined, now)).toBeNull();
    expect(deadlineInfo('7 nov', now)).toBeNull();
  });

  it('puts the nearest deadlines first and keeps the others in their order', () => {
    const tasks = [{ id: 'a' }, { id: 'b', dueDate: '2026-11-20' }, { id: 'c' }, { id: 'd', dueDate: '2026-11-09' }];
    expect(sortByDeadline(tasks).map(task => task.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('lets Pulse mention an open task due in one or two days', () => {
    expect(isDeadlineToAnnounce('2026-11-09', false, now)).toBe(true);
    expect(isDeadlineToAnnounce('2026-11-08', false, now)).toBe(true);
    expect(isDeadlineToAnnounce('2026-11-10', false, now)).toBe(false);
    expect(isDeadlineToAnnounce('2026-11-07', false, now)).toBe(false);
    expect(isDeadlineToAnnounce('2026-11-09', true, now)).toBe(false);
  });

  it('becomes a message of Pulse during the day, once per task and date', () => {
    const input: MascotTimeInput = {
      now: now.getTime(),
      hour: 15,
      dayKey: '2026-11-07',
      morningBriefingHour: 8,
      endOfDayHour: 20,
      briefingsEnabled: false,
      focusState: 'idle',
      events: [],
      blocks: [],
      todayTaskTotal: 0,
      todayTaskCompleted: 0,
      firedKeys: new Set(),
      deadlines: [{ id: 't1', dueDate: '2026-11-09' }],
    };
    const [trigger] = dueMascotTimeTriggers(input);
    expect(trigger).toMatchObject({ kind: 'DEADLINE_SOON', key: 'DEADLINE_SOON:t1:2026-11-09' });
    expect(dueMascotTimeTriggers({ ...input, firedKeys: new Set([trigger.key]) })).toHaveLength(0);
    expect(dueMascotTimeTriggers({ ...input, hour: 21 })).toHaveLength(0);

    const spoken = triggerToMascotMessage(trigger, {
      remindersToday: 0,
      tasksTotal: 0,
      tasksDone: 0,
      events: {},
      deadlines: { t1: { title: 'Devoir de maths', daysLeft: 2 } },
    });
    expect(spoken).toEqual({ id: 'DEADLINE_SOON', params: { title: 'Devoir de maths', days: 2 } });
    const text = resolveMascotMessage(
      spoken!.id,
      spoken!.params,
      { presence: 'full', address: 'vous', tone: 'warm', useFirstName: false, language: 'fr' } as never,
      null
    );
    expect(text).toBe('« Devoir de maths » est à rendre dans 2 jours. On s\'y met ?');
  });
});

describe('reminder to confirm', () => {
  const reminder = (overrides: Partial<Reminder>): ReminderToPlan => ({
    reminder: {
      id: 'med',
      title: 'Médicament',
      scheduledAt: new Date(now.getTime() + 10 * MINUTE).toISOString(),
      timezone: 'UTC',
      priority: 'NORMAL',
      status: 'UPCOMING',
      actionType: 'NONE',
      requiresConfirmation: true,
      createdAt: '',
      updatedAt: '',
      ...overrides,
    } as Reminder,
    rule: null,
  });

  it('rings again three times, five minutes apart, after its time', () => {
    const planned = planReminderNotifications([reminder({})], now);
    expect(planned).toHaveLength(1 + CONFIRMATION_REPEATS);
    const ring = planned[0].scheduledAt.getTime();
    expect(planned.slice(1).map(item => (item.scheduledAt.getTime() - ring) / MINUTE)).toEqual([
      CONFIRMATION_INTERVAL_MINUTES,
      2 * CONFIRMATION_INTERVAL_MINUTES,
      3 * CONFIRMATION_INTERVAL_MINUTES,
    ]);
    expect(planned[1].identifier).toMatch(/^reminder-med-\d+-r1$/);
    expect(planned[1].body).toContain('Terminer');
  });

  it('keeps the repeats still to come once its time has passed, so a sync does not drop them', () => {
    const rangSixMinutesAgo = reminder({ scheduledAt: new Date(now.getTime() - 6 * MINUTE).toISOString() });
    const planned = planReminderNotifications([rangSixMinutesAgo], now);
    expect(planned.map(item => item.identifier.slice(-2))).toEqual(['r2', 'r3']);
  });

  it('stops once done, and rings only once without the option', () => {
    expect(planReminderNotifications([reminder({ status: 'COMPLETED' })], now)).toHaveLength(0);
    expect(planReminderNotifications([reminder({ requiresConfirmation: false })], now)).toHaveLength(1);
  });

  it('never pushes a reminder of its own out to make room for repeats', () => {
    const others = Array.from({ length: MAX_SCHEDULED_REMINDERS }, (_, index) =>
      reminder({ id: `r${index}`, requiresConfirmation: false, scheduledAt: new Date(now.getTime() + (index + 1) * 60 * MINUTE).toISOString() })
    );
    const planned = planReminderNotifications([reminder({}), ...others], now);
    expect(planned).toHaveLength(MAX_SCHEDULED_REMINDERS);
    // A repeat ends with "-<time>-r<turn>"
    expect(planned.some(item => /-\d+-r\d$/.test(item.identifier))).toBe(false);
    // ...whereas with room left, the repeats are there
    const roomy = planReminderNotifications([reminder({}), ...others.slice(0, 10)], now);
    expect(roomy.filter(item => /-\d+-r\d$/.test(item.identifier))).toHaveLength(CONFIRMATION_REPEATS);
  });
});

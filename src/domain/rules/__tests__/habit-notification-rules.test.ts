import type { Habit } from '../../entities';
import { notificationActionFor, notificationRoute } from '../reminder-notification-rules';
import { HABIT_ACTION_DONE, parseReminderTime, planHabitNotifications } from '../habit-notification-rules';

/** Wednesday 25 November 2026, 10:00. */
const now = new Date(2026, 10, 25, 10, 0);

const habit = (over: Partial<Habit> = {}): Habit =>
  ({
    id: 'h1',
    title: 'Méditer',
    frequency: 'DAILY',
    status: 'ACTIVE',
    reminderTime: '08:00',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '',
    ...over,
  }) as Habit;

const days = (planned: ReturnType<typeof planHabitNotifications>) =>
  planned.map(item => `${item.scheduledAt.getDate()} ${item.scheduledAt.getHours()}:${item.scheduledAt.getMinutes()}`);

describe('a habit that rings', () => {
  it('rings every day at its time, from the next one', () => {
    const planned = planHabitNotifications({ habits: [{ habit: habit(), completedDates: [] }], now });
    expect(days(planned)).toEqual(['26 8:0', '27 8:0', '28 8:0', '29 8:0', '30 8:0', '1 8:0']);
    expect(planned[0].body).toBe('C’est le moment. Touche « Fait » quand c’est fait.'.replace(/’/g, "'"));
  });

  it('does not ring a day already ticked', () => {
    const planned = planHabitNotifications({ habits: [{ habit: habit(), completedDates: ['2026-11-26'] }], now });
    expect(days(planned)[0]).toBe('27 8:0');
  });

  it('stops for the week once a weekly target is reached, and starts again on Monday', () => {
    const weekly = habit({ frequency: 'WEEKLY', targetDaysPerWeek: 2 });
    const planned = planHabitNotifications({ habits: [{ habit: weekly, completedDates: ['2026-11-23', '2026-11-24'] }], now });
    expect(days(planned)).toEqual(['30 8:0', '1 8:0']);
  });

  it('stays silent without a time, in a pause, or once deleted', () => {
    const silent = [habit({ reminderTime: undefined }), habit({ id: 'h2', status: 'PAUSED' }), habit({ id: 'h3', deletedAt: 'x' })];
    expect(planHabitNotifications({ habits: silent.map(item => ({ habit: item, completedDates: [] })), now })).toEqual([]);
  });

  it('is quieter at night', () => {
    const planned = planHabitNotifications({ habits: [{ habit: habit({ reminderTime: '23:00' }), completedDates: [] }], now });
    expect(planned[0].level).toBe('discreet');
  });

  it('reads its time, and its button ticks it and opens it', () => {
    expect(parseReminderTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseReminderTime('25:00')).toBeNull();
    expect(notificationActionFor(HABIT_ACTION_DONE)).toBe('habitDone');
    expect(notificationRoute({ type: 'HABIT', habitId: 'h1' })).toBe('/habits/h1');
  });
});

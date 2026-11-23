import { Event, Task } from '../../entities';
import { MAX_SCHEDULED_ITEMS, planItemNotifications } from '../item-notification-rules';

const now = new Date(2026, 10, 20, 12, 0);

const task = (over: Partial<Task> = {}): Task =>
  ({
    id: 't1',
    title: 'Rendre le dossier',
    status: 'SCHEDULED',
    priority: 'NORMAL',
    dueDate: '2026-11-25',
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Task;

const event = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  title: 'Dîner chez Léa',
  startAt: new Date(2026, 10, 22, 19, 0).toISOString(),
  endAt: new Date(2026, 10, 22, 21, 0).toISOString(),
  timezone: 'Europe/Paris',
  type: 'BUSY',
  createdAt: '',
  updatedAt: '',
  ...over,
});

const summary = (items: ReturnType<typeof planItemNotifications>) =>
  items.map(item => [item.moment, item.scheduledAt.getDate(), item.scheduledAt.getHours(), item.scheduledAt.getMinutes(), item.level]);

describe('notifications of tasks and moments', () => {
  it('warns of a deadline the day before at 18:00, quietly, and the day itself at 9:00', () => {
    const planned = planItemNotifications({ tasks: [task()], events: [], now });
    expect(summary(planned)).toEqual([
      ['taskEve', 24, 18, 0, 'discreet'],
      ['taskDay', 25, 9, 0, 'normal'],
    ]);
    expect(planned[0].body).toBe('À rendre demain.');
    expect(planned[1].body).toBe("À rendre aujourd'hui.");
    expect(planned[1].identifier.startsWith('item-task-t1-taskDay-')).toBe(true);
  });

  it('rings the alarm on the day of an urgent deadline', () => {
    const planned = planItemNotifications({ tasks: [task({ priority: 'URGENT' })], events: [], now });
    expect(planned.map(item => item.level)).toEqual(['normal', 'alarm']);
  });

  it('forgets the tasks done, deleted, without a deadline, or already past', () => {
    const tasks = [
      task({ status: 'COMPLETED' }),
      task({ id: 't2', deletedAt: '2026-11-19T10:00:00Z' }),
      task({ id: 't3', dueDate: undefined }),
      task({ id: 't4', dueDate: '2026-11-20' }),
      task({ id: 't5', dueDate: 'demain' }),
    ];
    expect(planItemNotifications({ tasks, events: [], now })).toEqual([]);
  });

  it('warns 15 minutes before a moment', () => {
    const planned = planItemNotifications({ tasks: [], events: [event()], now });
    expect(summary(planned)).toEqual([['momentBefore', 22, 18, 45, 'normal']]);
    expect(planned[0].body).toBe('Commence à 19:00.');
  });

  it('says when to leave for a moment with a place, instead of a second early notice', () => {
    const far = planItemNotifications({ tasks: [], events: [event({ location: 'Chez Léa', travelBufferMinutes: 30 })], now });
    expect(summary(far)).toEqual([['momentLeave', 22, 18, 30, 'normal']]);
    expect(far[0].body).toBe('Il est temps de partir : Chez Léa, à 19:00.');

    const near = planItemNotifications({ tasks: [], events: [event({ location: 'Chez Léa', travelBufferMinutes: 10 })], now });
    expect(summary(near)).toEqual([
      ['momentBefore', 22, 18, 45, 'normal'],
      ['momentLeave', 22, 18, 50, 'normal'],
    ]);

    const noPlace = planItemNotifications({ tasks: [], events: [event({ travelBufferMinutes: 30 })], now });
    expect(summary(noPlace)).toEqual([['momentBefore', 22, 18, 45, 'normal']]);
  });

  it('gives a new identifier when the date moves, so the old notification is cancelled', () => {
    const before = planItemNotifications({ tasks: [task()], events: [], now });
    const after = planItemNotifications({ tasks: [task({ dueDate: '2026-11-26' })], events: [], now });
    expect(after[0].identifier).not.toBe(before[0].identifier);
  });

  it('plans only the moments of the next 30 days, and at most 40 notifications', () => {
    const later = event({ startAt: new Date(2026, 11, 31, 19, 0).toISOString() });
    expect(planItemNotifications({ tasks: [], events: [later], now })).toEqual([]);

    const many = Array.from({ length: 30 }, (_, n) => task({ id: `t${n}` }));
    expect(planItemNotifications({ tasks: many, events: [], now })).toHaveLength(MAX_SCHEDULED_ITEMS);
  });

  it('speaks English when the app does', () => {
    const planned = planItemNotifications({ tasks: [task()], events: [], now, language: 'en' });
    expect(planned.map(item => item.body)).toEqual(['Due tomorrow.', 'Due today.']);
  });
});

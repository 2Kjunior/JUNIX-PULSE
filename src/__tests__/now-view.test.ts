/**
 * Phase 4, "Maintenant": the order of the next things to do, the heavy day, what "Alléger"
 * moves to tomorrow (never an urgent task, a deadline of today nor a reminder), and the gestures.
 */

import {
  isDayOverloaded,
  NOW_LATER_MINUTES,
  NOW_REMINDER_WINDOW_MINUTES,
  nowQueue,
  tasksToLighten,
  type NowReminderInput,
  type NowTaskInput,
} from '@/domain/rules/now-rules';
import { WORRIED_ITEM_THRESHOLD } from '@/domain/rules/mascot-mood-rules';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { NowUseCases } from '@/use-cases/now-use-cases';
import { completeReminder, snoozeReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

jest.mock('@/repositories/reminder-repository', () => ({ ReminderRepository: { findAll: jest.fn(), findById: jest.fn() } }));
jest.mock('@/repositories/task-repository', () => ({
  TaskRepository: { findForDate: jest.fn(), findById: jest.fn(), update: jest.fn() },
}));
jest.mock('@/use-cases/reminder-use-cases', () => ({ completeReminder: jest.fn(), snoozeReminder: jest.fn() }));
jest.mock('@/use-cases/task-use-cases', () => ({ TaskUseCases: { toggleComplete: jest.fn(), rescheduleTasks: jest.fn() } }));

const now = new Date(2026, 10, 7, 10, 0);
const at = (hours: number, minutes = 0, day = 7) => new Date(2026, 10, day, hours, minutes).toISOString();

const reminder = (id: string, scheduledAt: string, status = 'UPCOMING'): NowReminderInput => ({
  id,
  title: id,
  scheduledAt,
  status,
  priority: 'NORMAL',
});
const task = (id: string, priority: NowTaskInput['priority'] = 'NORMAL', dueDate?: string, status = 'SCHEDULED') => ({
  id,
  title: id,
  priority,
  dueDate,
  status,
  scheduledDate: '2026-11-07',
});

beforeEach(() => jest.clearAllMocks());

describe('the order of "Maintenant"', () => {
  it('puts the reminders due within half an hour first, then the tasks; later reminders stay in the feed', () => {
    const queue = nowQueue(
      [
        reminder('evening', at(18)),
        reminder('in-30-min', at(10, 30)),
        reminder('in-45-min', at(10, 45)),
        reminder('late-yesterday', at(17, 0, 6), 'TRIGGERED'),
        reminder('done', at(9), 'COMPLETED'),
        reminder('tomorrow', at(9, 0, 8)),
      ],
      [task('normal'), task('urgent', 'URGENT')],
      now
    );
    expect(queue.map(item => item.id)).toEqual(['late-yesterday', 'in-30-min', 'urgent', 'normal']);
    expect(queue[0]).toEqual(expect.objectContaining({ kind: 'reminder', overdue: true }));
    expect(queue[1]).toEqual(expect.objectContaining({ overdue: false }));
  });

  it('orders the tasks: deadline today or passed first, then priority, then the nearest deadline', () => {
    const queue = nowQueue(
      [],
      [
        task('low', 'LOW'),
        task('high-later', 'HIGH', '2026-11-20'),
        task('normal-due-today', 'NORMAL', '2026-11-07'),
        task('high-soon', 'HIGH', '2026-11-09'),
        task('finished', 'URGENT', undefined, 'COMPLETED'),
      ],
      now
    );
    expect(queue.map(item => item.id)).toEqual(['normal-due-today', 'high-soon', 'high-later', 'low']);
  });

  it('never shows straight back a reminder put off with Plus tard', () => {
    const putOff = new Date(now.getTime() + NOW_LATER_MINUTES * 60_000).toISOString();
    expect(nowQueue([reminder('put-off', putOff, 'SNOOZED')], [], now)).toEqual([]);
    expect(NOW_LATER_MINUTES).toBeGreaterThan(NOW_REMINDER_WINDOW_MINUTES);
  });

  it('is empty on a free day', () => {
    expect(nowQueue([], [], now)).toEqual([]);
  });
});

describe('a heavy day and "Alléger"', () => {
  it('is heavy from the same number of open things that worries Pulse', () => {
    const tasks = Array.from({ length: WORRIED_ITEM_THRESHOLD - 1 }, (_, index) => task(`t${index}`));
    expect(isDayOverloaded([], tasks, now)).toBe(false);
    expect(isDayOverloaded([reminder('r', at(15))], tasks, now)).toBe(true);
    expect(isDayOverloaded([reminder('r', at(15, 0, 8))], tasks, now)).toBe(false);
  });

  it('moves only the tasks that can wait', () => {
    const lightened = tasksToLighten(
      [
        task('normal'),
        task('low', 'LOW'),
        task('urgent', 'URGENT'),
        task('high', 'HIGH'),
        task('due-today', 'LOW', '2026-11-07'),
        task('late', 'NORMAL', '2026-11-01'),
        task('due-next-week', 'NORMAL', '2026-11-14'),
        task('done', 'LOW', undefined, 'COMPLETED'),
      ],
      now
    );
    expect(lightened.map(item => item.id)).toEqual(['normal', 'low', 'due-next-week']);
  });
});

describe('the gestures of "Maintenant"', () => {
  it('"Fait" completes a reminder, or ticks a task', async () => {
    const rem = { id: 'r1', status: 'TRIGGERED' };
    jest.mocked(ReminderRepository.findById).mockResolvedValue(rem as never);
    await NowUseCases.done({ kind: 'reminder', id: 'r1', title: 'r1', at: now, overdue: true, priority: 'NORMAL' });
    expect(completeReminder).toHaveBeenCalledWith(rem);

    jest.mocked(TaskRepository.findById).mockResolvedValue({ id: 't1', status: 'SCHEDULED' } as never);
    await NowUseCases.done({ kind: 'task', id: 't1', title: 't1', priority: 'NORMAL' });
    expect(TaskUseCases.toggleComplete).toHaveBeenCalledWith('t1');
  });

  it('"Fait" never reopens a task already done elsewhere', async () => {
    jest.mocked(TaskRepository.findById).mockResolvedValue({ id: 't1', status: 'COMPLETED' } as never);
    await NowUseCases.done({ kind: 'task', id: 't1', title: 't1', priority: 'NORMAL' });
    expect(TaskUseCases.toggleComplete).not.toHaveBeenCalled();
  });

  it('"Plus tard" brings a reminder back in an hour and moves a task to tomorrow', async () => {
    const rem = { id: 'r1', status: 'TRIGGERED' };
    jest.mocked(ReminderRepository.findById).mockResolvedValue(rem as never);
    await NowUseCases.later({ kind: 'reminder', id: 'r1', title: 'r1', at: now, overdue: true, priority: 'NORMAL' }, now);
    expect(snoozeReminder).toHaveBeenCalledWith(rem, { kind: 'quick', minutes: NOW_LATER_MINUTES });

    await NowUseCases.later({ kind: 'task', id: 't1', title: 't1', priority: 'NORMAL' }, now);
    expect(TaskUseCases.rescheduleTasks).toHaveBeenCalledWith(['t1'], '2026-11-08');
  });

  it('"Alléger" moves the tasks that can wait to tomorrow, and undo puts them back', async () => {
    jest.mocked(TaskRepository.findForDate).mockResolvedValue([task('normal'), task('urgent', 'URGENT')] as never);
    const { count, undo } = await NowUseCases.lighten(now);
    expect(count).toBe(1);
    expect(TaskUseCases.rescheduleTasks).toHaveBeenCalledWith(['normal'], '2026-11-08');
    await undo();
    expect(TaskRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'normal', scheduledDate: '2026-11-07', status: 'SCHEDULED' })
    );
  });
});

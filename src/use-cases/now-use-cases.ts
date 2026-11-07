/**
 * "Maintenant": reading the queue of the next things to do, and the three gestures it offers.
 * - Fait: the reminder is completed (its people get the exchange), the task is ticked.
 * - Plus tard: the reminder comes back in an hour, the task moves to tomorrow.
 * - Alléger: on a heavy day, the tasks that can wait move to tomorrow, with a way back.
 */

import { addDays, format } from 'date-fns';

import {
  isDayOverloaded,
  NOW_LATER_MINUTES,
  nowQueue,
  tasksToLighten,
  type NowItem,
} from '../domain/rules/now-rules';
import { ReminderRepository } from '../repositories/reminder-repository';
import { TaskRepository } from '../repositories/task-repository';
import { completeReminder, snoozeReminder } from './reminder-use-cases';
import { TaskUseCases } from './task-use-cases';

export interface NowState {
  queue: NowItem[];
  /** As many open things today as worry Pulse. */
  overloaded: boolean;
  /** How many tasks "Alléger" would move to tomorrow. */
  lightenCount: number;
}

const tomorrow = (now: Date) => format(addDays(now, 1), 'yyyy-MM-dd');

export const NowUseCases = {
  async load(now = new Date()): Promise<NowState> {
    const [reminders, tasks] = await Promise.all([
      ReminderRepository.findAll(),
      TaskRepository.findForDate(format(now, 'yyyy-MM-dd')),
    ]);
    return {
      queue: nowQueue(reminders, tasks, now),
      overloaded: isDayOverloaded(reminders, tasks, now),
      lightenCount: tasksToLighten(tasks, now).length,
    };
  },

  async done(item: NowItem): Promise<void> {
    if (item.kind === 'reminder') {
      const reminder = await ReminderRepository.findById(item.id);
      if (reminder && reminder.status !== 'COMPLETED') await completeReminder(reminder);
      return;
    }
    const task = await TaskRepository.findById(item.id);
    if (task && task.status !== 'COMPLETED') await TaskUseCases.toggleComplete(item.id);
  },

  async later(item: NowItem, now = new Date()): Promise<void> {
    if (item.kind === 'reminder') {
      const reminder = await ReminderRepository.findById(item.id);
      if (reminder) await snoozeReminder(reminder, { kind: 'quick', minutes: NOW_LATER_MINUTES });
      return;
    }
    await TaskUseCases.rescheduleTasks([item.id], tomorrow(now));
  },

  /** Moves the tasks that can wait to tomorrow; undo puts each back where it was. */
  async lighten(now = new Date()): Promise<{ count: number; undo: () => Promise<void> }> {
    const tasks = tasksToLighten(await TaskRepository.findForDate(format(now, 'yyyy-MM-dd')), now);
    await TaskUseCases.rescheduleTasks(
      tasks.map(task => task.id),
      tomorrow(now)
    );
    return {
      count: tasks.length,
      undo: async () => {
        const updatedAt = new Date().toISOString();
        for (const task of tasks) {
          await TaskRepository.update({ id: task.id, scheduledDate: task.scheduledDate, status: task.status, updatedAt });
        }
      },
    };
  },
};

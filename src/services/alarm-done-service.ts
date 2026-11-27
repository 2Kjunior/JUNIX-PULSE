/**
 * "Terminer" on an alarm (sheet 039): the thing is ended, as the buttons of the notifications end it
 * (sheet 014). A reminder is completed, a task ticked, a habit ticked for today. Never twice: a thing
 * already done, or removed, is left as it is.
 */
import { format } from 'date-fns';

import { HabitRepository } from '@/repositories/habit-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { HabitUseCases } from '@/use-cases/habit-use-cases';
import { completeReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

export type AlarmDoneResult = 'done' | 'already' | 'missing';

export async function completeFromAlarm(type: string | undefined, id: string | undefined, now = new Date()): Promise<AlarmDoneResult> {
  if (!id) return 'missing';
  if (type === 'reminder') {
    const reminder = await ReminderRepository.findById(id);
    if (!reminder || reminder.status === 'DELETED') return 'missing';
    if (reminder.status === 'COMPLETED') return 'already';
    await completeReminder(reminder);
    return 'done';
  }
  if (type === 'task') {
    const task = await TaskRepository.findById(id);
    if (!task || task.deletedAt) return 'missing';
    if (task.status === 'COMPLETED') return 'already';
    await TaskUseCases.toggleComplete(id);
    return 'done';
  }
  if (type === 'habit') {
    const day = format(now, 'yyyy-MM-dd');
    if (await HabitRepository.isCompletedOn(id, day)) return 'already';
    await HabitUseCases.toggleHabitCompletion(id, day);
    return 'done';
  }
  return 'missing';
}

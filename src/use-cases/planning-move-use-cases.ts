/**
 * Moving a card in the Planning (study 001, 12.4; sheet 026). Each move is saved at once and
 * gives back a way to undo it, for the "Annuler" of the banner. The notifications follow, through
 * the same use-cases as the forms. The phone's own calendar is never changed.
 */
import type { Event, Reminder, RecurrenceRule, Task } from '@/domain/entities';
import { dayKey, movedRange, movedStart, shiftedRecurrence } from '@/domain/rules/planning-move-rules';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';

import { EventUseCases } from './event-use-cases';
import { updateReminder } from './reminder-use-cases';

export type Undo = () => Promise<void>;

/** A moment moves: the start by minutes and days, the length stays. */
export async function moveEvent(
  event: Event,
  minutes: number,
  days: number,
  step?: number
): Promise<{ undo: Undo; start: Date } | null> {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const next = movedRange(start, end, minutes, days, step);
  if (next.start.getTime() === start.getTime()) return null;
  await EventUseCases.updateEvent({ id: event.id, startAt: next.start, endAt: next.end });
  return {
    start: next.start,
    undo: () => EventUseCases.updateEvent({ id: event.id, startAt: start, endAt: end }),
  };
}

/** The repeat of a reminder, or null when it has none. */
export async function repeatOf(reminder: Reminder): Promise<RecurrenceRule | null> {
  if (!reminder.recurrenceRuleId) return null;
  return ReminderRepository.findRecurrenceRule(reminder.recurrenceRuleId);
}

/**
 * A reminder moves; a repeating one moves with its whole series (the caller asked first):
 * "every Monday" dropped on a Tuesday becomes "every Tuesday".
 */
export async function moveReminder(
  reminder: Reminder,
  minutes: number,
  days: number,
  repeat: RecurrenceRule | null,
  step?: number
): Promise<{ undo: Undo; start: Date } | null> {
  const before = new Date(reminder.scheduledAt);
  const after = movedStart(before, minutes, days, step);
  if (after.getTime() === before.getTime()) return null;
  const newRule = repeat ? shiftedRecurrence(repeat, before, after) : null;
  await updateReminder({ id: reminder.id, scheduledAt: after, ...(newRule ? { recurrenceRule: newRule } : {}) });
  return {
    start: after,
    undo: async () => {
      // Back to the old rule itself: it stays in the data when a new one is made
      if (newRule && repeat) await ReminderRepository.update({ id: reminder.id, recurrenceRuleId: repeat.id, updatedAt: new Date().toISOString() });
      await updateReminder({ id: reminder.id, scheduledAt: before });
    },
  };
}

/** A task changes day (it has no time); its state comes back too on undo. */
export async function moveTask(task: Task, toDay: Date): Promise<{ undo: Undo; start: Date } | null> {
  const day = dayKey(toDay);
  if (task.scheduledDate === day) return null;
  const now = () => new Date().toISOString();
  await TaskRepository.update({ id: task.id, scheduledDate: day, updatedAt: now() });
  return {
    start: toDay,
    undo: () => TaskRepository.update({ id: task.id, scheduledDate: task.scheduledDate ?? null, status: task.status, updatedAt: now() }),
  };
}

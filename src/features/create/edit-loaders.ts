/**
 * What the forms read before changing a saved item (sheet 022): one function per family, which
 * returns the values the form shows, or null when the item no longer exists.
 */

import type { AlertLevel, EventType, MomentKind, Reminder, ReminderPriority, TaskStatus } from '@/domain/entities';
import { simpleRecurrenceOf, splitAlertMoment, type SimpleRecurrence } from '@/domain/rules/item-edit-rules';
import { momentKindOf } from '@/domain/rules/moment-kind-rules';
import { chosenLevelOf } from '@/domain/rules/notification-level-rules';
import { EventRepository } from '@/repositories/event-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TagRepository } from '@/repositories/tag-repository';
import { TaskRepository } from '@/repositories/task-repository';

/** A "To do" opened to be changed: a reminder (it rings) or a task (it does not). */
export interface TodoEditTarget {
  kind: 'reminder' | 'task';
  id: string;
}

export interface TodoEditValues {
  title: string;
  notes: string;
  day: string | undefined;
  time: { hour: number; minute: number };
  priority: ReminderPriority;
  actionType: Reminder['actionType'];
  /** It repeats; `recurrence` is null when the form cannot show how (the rule is kept). */
  repeat: boolean;
  recurrence: SimpleRecurrence | null;
  confirm: boolean;
  /** The level chosen for a reminder (sheet 023), null for "Auto". */
  alertLevel: AlertLevel | null;
  dueDate: string | undefined;
  estimatedMinutes: number | undefined;
  personIds: string[];
  tagIds: string[];
  /** The saved alert time of a reminder, to tell whether the person moved it. */
  scheduledAt: Date | null;
  /** The saved status of a task, from which the new one follows. */
  status: TaskStatus | null;
}

export async function loadTodoForEdit(target: TodoEditTarget): Promise<TodoEditValues | null> {
  if (target.kind === 'reminder') {
    const reminder = await ReminderRepository.findById(target.id);
    if (!reminder) return null;
    const scheduledAt = new Date(reminder.scheduledAt);
    const { day, time } = splitAlertMoment(scheduledAt);
    const [personIds, tagIds, rule] = await Promise.all([
      ReminderRepository.findPersonIds(reminder.id),
      TagRepository.findIdsFor('reminder', reminder.id),
      reminder.recurrenceRuleId ? ReminderRepository.findRecurrenceRule(reminder.recurrenceRuleId) : Promise.resolve(null),
    ]);
    return {
      title: reminder.title,
      notes: reminder.notes ?? '',
      day,
      time,
      priority: reminder.priority,
      actionType: reminder.actionType,
      repeat: Boolean(rule),
      recurrence: simpleRecurrenceOf(rule),
      confirm: Boolean(reminder.requiresConfirmation),
      alertLevel: chosenLevelOf(reminder.alertLevel),
      dueDate: undefined,
      estimatedMinutes: undefined,
      personIds,
      tagIds,
      scheduledAt,
      status: null,
    };
  }

  const task = await TaskRepository.findById(target.id);
  if (!task) return null;
  const [personIds, tagIds] = await Promise.all([
    TaskRepository.findPersonIds(task.id),
    TagRepository.findIdsFor('task', task.id),
  ]);
  return {
    title: task.title,
    notes: task.description ?? '',
    day: task.scheduledDate,
    time: { hour: 9, minute: 0 },
    priority: task.priority,
    actionType: 'NONE',
    repeat: false,
    recurrence: null,
    confirm: false,
    alertLevel: null,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    personIds,
    tagIds,
    scheduledAt: null,
    status: task.status,
  };
}

export interface MomentEditValues {
  title: string;
  notes: string;
  startAt: Date;
  endAt: Date;
  location: string;
  travelBufferMinutes: number;
  type: EventType;
  momentKind: MomentKind;
  alertLevel: AlertLevel | null;
  personIds: string[];
  tagIds: string[];
}

export async function loadMomentForEdit(id: string): Promise<MomentEditValues | null> {
  const event = await EventRepository.findById(id);
  if (!event) return null;
  const [persons, tagIds] = await Promise.all([EventRepository.findEventPersons(id), TagRepository.findIdsFor('event', id)]);
  return {
    title: event.title,
    notes: event.notes ?? '',
    startAt: new Date(event.startAt),
    endAt: new Date(event.endAt),
    location: event.location ?? '',
    travelBufferMinutes: event.travelBufferMinutes ?? 0,
    type: event.type,
    momentKind: momentKindOf(event.momentKind),
    alertLevel: chosenLevelOf(event.alertLevel),
    personIds: persons.map(person => person.id),
    tagIds,
  };
}

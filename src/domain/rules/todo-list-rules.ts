/**
 * The single "To do" tab (study 001, 12.10 n° 4 and section 14; sheet 015): the reminders (with
 * an alert) and the tasks (without) in one list, filtered at the top and sorted by moment.
 * Pure: a section or a filter added tomorrow is a line here and its test.
 */

import type { Reminder, ReminderPriority, Task } from '../entities';
import { ringsAsAlarm } from './notification-level-rules';
import type { SwatchId } from '../../constants/color-themes';

export type TodoFilter = 'all' | 'alert' | 'noAlert';
export const TODO_FILTERS: readonly TodoFilter[] = ['all', 'alert', 'noAlert'];

export type TodoSectionId = 'overdue' | 'today' | 'tomorrow' | 'later' | 'noDate' | 'done';
export const TODO_SECTION_ORDER: readonly TodoSectionId[] = ['overdue', 'today', 'tomorrow', 'later', 'noDate', 'done'];

/** The things done that stay in sight, the most recent first. */
export const MAX_DONE_SHOWN = 15;

const PRIORITY_WEIGHT: Readonly<Record<ReminderPriority, number>> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export interface TodoEntry {
  kind: 'task' | 'reminder';
  id: string;
  title: string;
  /** A reminder: when it rings. A task: its planned day, or else its deadline (at noon). */
  when: Date | null;
  /** A task counts by its day, a reminder by its hour. */
  dayOnly: boolean;
  done: boolean;
  doneAt?: string;
  priority: ReminderPriority;
  tagIds: readonly string[];
  /** A reminder set to ring as an Alarm (sheet 031): its card shows the alarm clock. */
  alarm?: boolean;
  /** A task: its time to do it and its Focus time so far (sheet 033). */
  estimatedMinutes?: number;
  focusMinutes?: number;
  /** The colour chosen for its card (sheet 043). */
  color?: SwatchId;
}

export interface TodoSection {
  id: TodoSectionId;
  entries: TodoEntry[];
}

/** The filter asked by a link ("?filter=alert"), or everything. */
export function filterFromParam(value?: string | string[]): TodoFilter {
  const text = Array.isArray(value) ? value[0] : value;
  return TODO_FILTERS.includes(text as TodoFilter) ? (text as TodoFilter) : 'all';
}

function noonOf(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0) : null;
}

export function entryFromTask(task: Task, tagIds: readonly string[] = []): TodoEntry {
  const day = task.scheduledDate ?? task.dueDate;
  return {
    kind: 'task',
    id: task.id,
    title: task.title,
    when: day ? noonOf(day) : null,
    dayOnly: true,
    done: task.status === 'COMPLETED',
    doneAt: task.completedAt,
    priority: task.priority,
    estimatedMinutes: task.estimatedMinutes,
    focusMinutes: task.focusMinutes,
    color: task.color,
    tagIds,
  };
}

export function entryFromReminder(reminder: Reminder, tagIds: readonly string[] = []): TodoEntry {
  const when = new Date(reminder.scheduledAt);
  return {
    kind: 'reminder',
    id: reminder.id,
    title: reminder.title,
    when: Number.isNaN(when.getTime()) ? null : when,
    dayOnly: false,
    done: reminder.status === 'COMPLETED',
    doneAt: reminder.completedAt,
    priority: reminder.priority,
    alarm: ringsAsAlarm(reminder),
    color: reminder.color,
    tagIds,
  };
}

function startOfDay(date: Date, plusDays = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + plusDays);
}

function matches(entry: TodoEntry, filter: TodoFilter): boolean {
  return filter === 'all' || (filter === 'alert') === (entry.kind === 'reminder');
}

function sectionOf(entry: TodoEntry, now: Date): TodoSectionId {
  if (entry.done) return 'done';
  if (!entry.when) return 'noDate';
  const late = entry.dayOnly ? entry.when < startOfDay(now) : entry.when < now;
  if (late) return 'overdue';
  if (entry.when < startOfDay(now, 1)) return 'today';
  if (entry.when < startOfDay(now, 2)) return 'tomorrow';
  return 'later';
}

/** The sections to show, in order, without the empty ones. */
export function todoSections(
  entries: readonly TodoEntry[],
  filter: TodoFilter,
  now: Date,
  tagId: string | null = null
): TodoSection[] {
  const groups = new Map<TodoSectionId, TodoEntry[]>(TODO_SECTION_ORDER.map(id => [id, []]));
  for (const entry of entries) {
    if (!matches(entry, filter) || (tagId && !entry.tagIds.includes(tagId))) continue;
    groups.get(sectionOf(entry, now))?.push(entry);
  }
  const byTime = (a: TodoEntry, b: TodoEntry) =>
    (a.when?.getTime() ?? Infinity) - (b.when?.getTime() ?? Infinity) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  return TODO_SECTION_ORDER.map(id => {
    const list = groups.get(id) ?? [];
    const sorted =
      id === 'done'
        ? [...list].sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, MAX_DONE_SHOWN)
        : id === 'noDate'
          ? [...list].sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])
          : [...list].sort(byTime);
    return { id, entries: sorted };
  }).filter(section => section.entries.length > 0);
}

/** How many open things each filter holds, for the counts at the top. */
export function todoCounts(entries: readonly TodoEntry[]): Record<TodoFilter, number> {
  const open = entries.filter(entry => !entry.done);
  return {
    all: open.length,
    alert: open.filter(entry => entry.kind === 'reminder').length,
    noAlert: open.filter(entry => entry.kind === 'task').length,
  };
}

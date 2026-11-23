/**
 * The create forms of the two families (study 001, 12.2 "2-B"; sheet 012): each family declares
 * its sections, in order, and the fields folded under "More options". One set of bricks draws
 * them, so a field added or removed tomorrow is a line here and its brick, not every screen.
 */

import type { ItemFamily } from './item-kinds';

export type FormSectionId = 'what' | 'when' | 'alert' | 'slot' | 'where' | 'leave' | 'who' | 'more';
export type MoreFieldId = 'priority' | 'deadline' | 'duration' | 'subtasks' | 'tags' | 'availability';

export interface ItemFormDefinition {
  sections: readonly FormSectionId[];
  more: readonly MoreFieldId[];
}

export const ITEM_FORMS: Readonly<Record<ItemFamily, ItemFormDefinition>> = {
  todo: {
    sections: ['what', 'when', 'alert', 'who', 'more'],
    more: ['priority', 'deadline', 'duration', 'subtasks', 'tags'],
  },
  moment: {
    sections: ['what', 'slot', 'where', 'leave', 'who', 'more'],
    more: ['availability', 'tags'],
  },
};

/** "Time to do it", in minutes; none at first. */
export const TODO_DURATION_OPTIONS: readonly (number | undefined)[] = [undefined, 15, 30, 45, 60, 120];
/** "Leave … min before", in minutes; 0 is no reminder to leave. */
export const LEAVE_OPTIONS: readonly number[] = [0, 15, 30, 45, 60];

export interface FormState {
  alert?: boolean;
  place?: string;
}

/**
 * With an alert, a todo is saved as a reminder: the priority moves under the alert, and what a
 * reminder does not have (deadline, time to do it, subtasks) is not offered.
 */
const HIDDEN_WITH_ALERT: readonly MoreFieldId[] = ['priority', 'deadline', 'duration', 'subtasks'];

/** The sections to draw, in order: "Leave … min before" only once a place is written. */
export function visibleSections(family: ItemFamily, state: FormState = {}): FormSectionId[] {
  return ITEM_FORMS[family].sections.filter(section => section !== 'leave' || (state.place ?? '').trim() !== '');
}

/** The fields under "More options". */
export function visibleMoreFields(family: ItemFamily, state: FormState = {}): MoreFieldId[] {
  return ITEM_FORMS[family].more.filter(field => !(family === 'todo' && state.alert && HIDDEN_WITH_ALERT.includes(field)));
}

/** The day of a 'YYYY-MM-DD…' route parameter, or undefined. */
export function dayParam(value?: string): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? '');
  return match ? match[1] : undefined;
}

/** The hour of a route parameter (0 to 23), or undefined. */
export function hourParam(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : undefined;
}

/** When the alert of a todo rings: its day (today when none) at the chosen time, on the phone's clock. */
export function alertMoment(day: string | undefined, time: { hour: number; minute: number }, now: Date): Date {
  const parts = dayParam(day)?.split('-').map(Number);
  const [year, month, date] = parts ?? [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  return new Date(year, month - 1, date, time.hour, time.minute, 0, 0);
}

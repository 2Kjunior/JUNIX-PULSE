/**
 * The Planning: Day · Week · Month and moving a card with the finger (study 001, 12.4; sheet 026).
 * Pure rules: where a card lands, how a repeat follows it, the month grid and its dots,
 * and how the cards of a day share the width. The screens draw, these rules decide.
 */
import type { RecurrenceRule } from '../entities';

/** A card lands on a quarter of an hour: 19:00 or 19:15, never 19:07. */
export const SNAP_MINUTES = 15;

/** The height of one hour in the Day view, in points (the Week view keeps its own 48). */
export const DAY_HOUR_HEIGHT = 64;

/** The Day view shows at least 07:00 to 22:00, more when something is earlier or later. */
export const DAY_FIRST_HOUR = 7;
export const DAY_LAST_HOUR = 22;

/** The dots of a day in the Month view; beyond, "+2". */
export const MONTH_DOTS_MAX = 3;

/** The nearest quarter of an hour (0 stays 0, -7 becomes -0 and is given as 0). */
export function snapMinutes(minutes: number): number {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  return snapped === 0 ? 0 : snapped;
}

/** How many minutes a vertical move of the finger means, already on a quarter of an hour. */
export function minutesForOffset(offsetY: number, hourHeight: number): number {
  if (hourHeight <= 0) return 0;
  return snapMinutes((offsetY / hourHeight) * 60);
}

/** How many columns (days) a horizontal move means: half a column is enough to change day. */
export function columnsForOffset(offsetX: number, columnWidth: number): number {
  if (columnWidth <= 0) return 0;
  const columns = Math.round(offsetX / columnWidth);
  return columns === 0 ? 0 : columns;
}

/** Keeps a column inside the week (0 to 6, or the number of columns given). */
export function clampColumn(column: number, count = 7): number {
  return Math.min(count - 1, Math.max(0, column));
}

/** A start moved by minutes and days; the time of day is put back on a quarter of an hour. */
export function movedStart(start: Date, minutes: number, days: number): Date {
  const next = new Date(start.getTime());
  next.setDate(next.getDate() + days);
  next.setMinutes(next.getMinutes() + minutes);
  const sinceMidnight = next.getHours() * 60 + next.getMinutes();
  const snapped = snapMinutes(sinceMidnight);
  next.setHours(0, 0, 0, 0);
  next.setMinutes(snapped);
  return next;
}

/** A moment moved: the start moves, the length stays the same. */
export function movedRange(start: Date, end: Date, minutes: number, days: number): { start: Date; end: Date } {
  const nextStart = movedStart(start, minutes, days);
  const length = Math.max(0, end.getTime() - start.getTime());
  return { start: nextStart, end: new Date(nextStart.getTime() + length) };
}

/** True when nothing changes (dropped where it was). */
export function isSamePlace(before: Date, after: Date): boolean {
  return before.getTime() === after.getTime();
}

/** The day of a date, as YYYY-MM-DD on the phone's clock. */
export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A YYYY-MM-DD day as a local date at midnight. */
export function dayFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** The number of whole days from one day to another (the clock change does not count). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

/**
 * A repeat follows the card that moves to another day (the whole series, study 12.4):
 * "every Monday" moved to Tuesday becomes "every Tuesday"; "the 5th of each month" moved to
 * the 8th becomes "the 8th". Null when the repeat does not need to change (same day, daily).
 */
export function shiftedRecurrence(
  saved: RecurrenceRule | Omit<RecurrenceRule, 'id'>,
  from: Date,
  to: Date
): Omit<RecurrenceRule, 'id'> | null {
  // The new repeat is a new rule: it never takes the id of the old one
  const { id: _oldId, ...rule } = saved as RecurrenceRule;
  const days = daysBetween(from, to);
  if (days === 0) return null;
  if (rule.type === 'WEEKLY' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const shift = ((days % 7) + 7) % 7;
    if (shift === 0) return null;
    const moved = rule.daysOfWeek.map(day => (day + shift) % 7).sort((a, b) => a - b);
    return { ...rule, daysOfWeek: moved };
  }
  if (rule.type === 'MONTHLY' && rule.dayOfMonth !== undefined && !rule.weekPosition) {
    if (rule.dayOfMonth === to.getDate()) return null;
    return { ...rule, dayOfMonth: to.getDate() };
  }
  return null;
}

/** The 42 days (6 weeks, Monday first) that show a month, with the days of the months around. */
export function monthGrid(anyDayOfMonth: Date): Date[] {
  const first = new Date(anyDayOfMonth.getFullYear(), anyDayOfMonth.getMonth(), 1);
  const back = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - back);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** The first and last day shown by a month grid, as YYYY-MM-DD. */
export function monthGridRange(anyDayOfMonth: Date): { from: string; to: string } {
  const days = monthGrid(anyDayOfMonth);
  return { from: dayKey(days[0]), to: dayKey(days[days.length - 1]) };
}

/** The dots of a day: the first colours, and how many more. */
export function dayDots(colors: readonly string[], max = MONTH_DOTS_MAX): { dots: string[]; more: number } {
  return { dots: colors.slice(0, max), more: Math.max(0, colors.length - max) };
}

/** The hours a day shows: 07:00 to 22:00 at least, more for an earlier or a later card. */
export function dayHours(items: readonly { startMin: number; endMin: number }[]): { first: number; last: number } {
  let first = DAY_FIRST_HOUR;
  let last = DAY_LAST_HOUR;
  for (const item of items) {
    first = Math.min(first, Math.floor(item.startMin / 60));
    last = Math.max(last, Math.min(24, Math.ceil(item.endMin / 60)));
  }
  return { first: Math.max(0, first), last };
}

export interface DayLayoutItem {
  id: string;
  /** Minutes since midnight. */
  startMin: number;
  endMin: number;
}

export interface DayLayoutBox {
  id: string;
  top: number;
  height: number;
  /** Its column among the cards at the same time, and how many columns there are. */
  column: number;
  columns: number;
}

/**
 * Where each card of a day goes: its height follows its length (at least a quarter of an hour),
 * and cards at the same time share the width side by side (at most 3 columns on a phone).
 */
export function layoutDay(items: readonly DayLayoutItem[], firstHour: number, hourHeight: number): DayLayoutBox[] {
  const sorted = [...items]
    .map(item => ({ ...item, endMin: Math.max(item.endMin, item.startMin + SNAP_MINUTES) }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const boxes: DayLayoutBox[] = [];
  let group: { item: (typeof sorted)[number]; column: number }[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];

  const close = () => {
    const columns = Math.min(3, Math.max(1, columnEnds.length));
    for (const { item, column } of group) {
      boxes.push({
        id: item.id,
        top: ((item.startMin - firstHour * 60) / 60) * hourHeight,
        height: Math.max(28, ((item.endMin - item.startMin) / 60) * hourHeight - 2),
        column: Math.min(column, columns - 1),
        columns,
      });
    }
    group = [];
    columnEnds = [];
  };

  for (const item of sorted) {
    if (group.length > 0 && item.startMin >= groupEnd) close();
    let column = columnEnds.findIndex(end => end <= item.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(item.endMin);
    } else {
      columnEnds[column] = item.endMin;
    }
    group.push({ item, column });
    groupEnd = group.length === 1 ? item.endMin : Math.max(groupEnd, item.endMin);
  }
  if (group.length > 0) close();
  return boxes;
}

/** Minutes since midnight of a date. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

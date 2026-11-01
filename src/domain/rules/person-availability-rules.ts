/**
 * Pure rules on the time where a person lives and when they accept to be called.
 *
 * A person has an IANA timezone and a window (days of the week, a start and an end hour) in
 * their own local time. From them the rules tell what time it is there, whether now is a good
 * moment to call, and when the next good moment starts. Only `Intl` is used, so the rules run
 * the same in the app and in the tests.
 */

import type { PersonAvailability } from '../entities';

export type { PersonAvailability };

/** Monday to Sunday, 9:00 to 20:00: where the form starts when availability is switched on. */
export const DEFAULT_AVAILABILITY: PersonAvailability = {
  days: [1, 2, 3, 4, 5, 6, 7],
  startMinutes: 9 * 60,
  endMinutes: 20 * 60,
};

const WEEKDAYS: Readonly<Record<string, number>> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export interface ZonedParts {
  year: number;
  month: number; // 1 to 12
  day: number;
  hour: number; // 0 to 23
  minute: number;
  weekday: number; // 1 = Monday to 7 = Sunday
}

export function isValidTimezone(timezone: string | null | undefined): timezone is string {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** The wall clock of a timezone at an instant. */
export function zonedParts(instant: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  }).formatToParts(instant);

  const read = (type: string): string => parts.find(part => part.type === type)?.value ?? '';
  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')) % 24, // Some engines write midnight as 24
    minute: Number(read('minute')),
    weekday: WEEKDAYS[read('weekday')] ?? 1,
  };
}

/** Minutes the timezone is ahead of UTC at an instant (negative when behind). */
export function timezoneOffsetMinutes(instant: Date, timezone: string): number {
  const parts = zonedParts(instant, timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const wholeMinutes = Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS;
  return Math.round((asUtc - wholeMinutes) / MINUTE_MS);
}

/** The instant at which the wall clock of a timezone shows the given date and time. */
export function zonedToInstant(
  timezone: string,
  date: { year: number; month: number; day: number },
  minutesOfDay: number
): Date {
  const wallAsUtc = Date.UTC(date.year, date.month - 1, date.day, 0, minutesOfDay);
  // The offset is read at a first guess, then once more at the result: it differs across a clock change
  const first = wallAsUtc - timezoneOffsetMinutes(new Date(wallAsUtc), timezone) * MINUTE_MS;
  return new Date(wallAsUtc - timezoneOffsetMinutes(new Date(first), timezone) * MINUTE_MS);
}

/** "14:32": the time of day in a timezone, 24 hours. */
export function formatLocalTime(instant: Date, timezone: string): string {
  const { hour, minute } = zonedParts(instant, timezone);
  return formatMinutes(hour * 60 + minute);
}

/** "08:00" for 480. */
export function formatMinutes(minutesOfDay: number): string {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isValidAvailability(value: PersonAvailability): boolean {
  return (
    value.days.length > 0 &&
    value.days.every(day => Number.isInteger(day) && day >= 1 && day <= 7) &&
    Number.isInteger(value.startMinutes) &&
    Number.isInteger(value.endMinutes) &&
    value.startMinutes >= 0 &&
    value.endMinutes <= 24 * 60 &&
    value.startMinutes < value.endMinutes
  );
}

/** Reads what was stored: null for nothing, or for anything that is not a valid availability. */
export function parseAvailability(stored: string | null | undefined): PersonAvailability | null {
  if (!stored) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (typeof value !== 'object' || value === null) return null;
    const { days, startMinutes, endMinutes } = value as Record<string, unknown>;
    if (!Array.isArray(days) || typeof startMinutes !== 'number' || typeof endMinutes !== 'number') return null;
    const candidate: PersonAvailability = {
      days: [...new Set(days.filter((day): day is number => typeof day === 'number'))].sort((a, b) => a - b),
      startMinutes,
      endMinutes,
    };
    return isValidAvailability(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function serializeAvailability(value: PersonAvailability): string {
  return JSON.stringify({
    days: [...new Set(value.days)].sort((a, b) => a - b),
    startMinutes: value.startMinutes,
    endMinutes: value.endMinutes,
  });
}

/** True when the instant falls inside the window of the person, in their local time. */
export function isAvailableAt(availability: PersonAvailability, timezone: string, instant: Date): boolean {
  const { weekday, hour, minute } = zonedParts(instant, timezone);
  const minutes = hour * 60 + minute;
  return (
    availability.days.includes(weekday) && minutes >= availability.startMinutes && minutes < availability.endMinutes
  );
}

/**
 * The first moment, from `from` on, at which the person can be called: `from` itself when they
 * can be called then, otherwise the start of the next window. Null when no window comes within
 * the horizon (a week and a day by default).
 */
export function nextAvailableStart(
  availability: PersonAvailability,
  timezone: string,
  from: Date,
  horizonDays = 8
): Date | null {
  if (isAvailableAt(availability, timezone, from)) return from;

  const today = zonedParts(from, timezone);
  for (let offset = 0; offset <= horizonDays; offset += 1) {
    // Noon of the day avoids any clock change when stepping from a day to the next
    const noon = zonedToInstant(timezone, today, 12 * 60).getTime() + offset * DAY_MS;
    const day = zonedParts(new Date(noon), timezone);
    if (!availability.days.includes(day.weekday)) continue;
    const start = zonedToInstant(timezone, day, availability.startMinutes);
    if (start.getTime() > from.getTime()) return start;
  }
  return null;
}

// ─── What to show about a person ────────────────────────────────────────────────────────────

/** Sunday is 7: the same numbering as the days of an availability. */
export const WEEKDAY_NAMES_FR: readonly string[] = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
];

export interface MomentLabel {
  weekday: number; // 1 to 7
  time: string; // "14:32"
}

export type PersonTimeState =
  | { kind: 'local-time-only'; localTime: string; weekday: number }
  | { kind: 'available'; localTime: string; weekday: number; untilTime: string }
  | {
      kind: 'unavailable';
      localTime: string;
      weekday: number;
      /** The next opening, once in the time of the person and once in the time of the user. */
      next: { there: MomentLabel; here: MomentLabel; sameDay: boolean } | null;
    };

function momentLabel(instant: Date, timezone: string): MomentLabel {
  const { weekday } = zonedParts(instant, timezone);
  return { weekday, time: formatLocalTime(instant, timezone) };
}

/**
 * What to tell about a person at a given moment: their local time, and, when they gave a
 * window, whether they can be called now or when they can next be, in their time and in the
 * time of the user.
 */
export function personTimeState(
  person: { timezone: string; availability?: PersonAvailability | null },
  now: Date,
  userTimezone: string
): PersonTimeState {
  const { weekday } = zonedParts(now, person.timezone);
  const localTime = formatLocalTime(now, person.timezone);

  if (!person.availability) return { kind: 'local-time-only', localTime, weekday };

  if (isAvailableAt(person.availability, person.timezone, now)) {
    return { kind: 'available', localTime, weekday, untilTime: formatMinutes(person.availability.endMinutes) };
  }

  const start = nextAvailableStart(person.availability, person.timezone, now);
  if (!start) return { kind: 'unavailable', localTime, weekday, next: null };

  const there = momentLabel(start, person.timezone);
  const here = momentLabel(start, userTimezone);
  const nowHere = zonedParts(now, userTimezone);
  const startHere = zonedParts(start, userTimezone);
  const sameDay = nowHere.year === startHere.year && nowHere.month === startHere.month && nowHere.day === startHere.day;
  return { kind: 'unavailable', localTime, weekday, next: { there, here, sameDay } };
}

// ─── Planning a call ────────────────────────────────────────────────────────────────────────

export type CallAdvice =
  /** The zone is known but no window was given: only the time there. */
  | { kind: 'info'; localTime: string }
  /** The moment falls inside the window of the person. */
  | { kind: 'inside'; localTime: string }
  /** The moment falls outside it; `suggestion` is the next opening, or null when none is near. */
  | {
      kind: 'outside';
      localTime: string;
      suggestion: { instant: Date; there: MomentLabel; here: MomentLabel } | null;
    };

/**
 * What to say about calling a person at a planned moment: the time it will be there and, when
 * they gave a window, whether it suits them, with the next opening to offer instead. Null when
 * nothing is known about where the person lives.
 */
export function callAdvice(
  person: { timezone?: string; availability?: PersonAvailability | null },
  at: Date,
  userTimezone: string
): CallAdvice | null {
  if (!isValidTimezone(person.timezone)) return null;
  const localTime = formatLocalTime(at, person.timezone);

  if (!person.availability) return { kind: 'info', localTime };
  if (isAvailableAt(person.availability, person.timezone, at)) return { kind: 'inside', localTime };

  const start = nextAvailableStart(person.availability, person.timezone, at);
  return {
    kind: 'outside',
    localTime,
    suggestion: start
      ? { instant: start, there: momentLabel(start, person.timezone), here: momentLabel(start, userTimezone) }
      : null,
  };
}

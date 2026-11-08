/**
 * The minutes of Focus done today, kept in the encrypted database so they survive a restart and
 * start again at zero each new day. Only finished sessions count, as the Pulse tab says.
 */

import { format } from 'date-fns';

import { MascotStateRepository } from '../repositories/mascot-state-repository';

const KEY = 'focus:today';

interface FocusDay {
  day: string;
  minutes: number;
}

function parse(raw: string | null): FocusDay | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' && value !== null &&
      typeof (value as FocusDay).day === 'string' &&
      typeof (value as FocusDay).minutes === 'number'
    ) {
      return value as FocusDay;
    }
  } catch {
    // Unreadable: the day starts again
  }
  return null;
}

/** The minutes of Focus finished today; zero on a new day. */
export async function getTodayFocusMinutes(now = new Date()): Promise<number> {
  const stored = parse(await MascotStateRepository.get(KEY));
  return stored && stored.day === format(now, 'yyyy-MM-dd') ? stored.minutes : 0;
}

/** Adds a finished session to today's minutes and returns the new total. */
export async function addFocusMinutes(minutes: number, now = new Date()): Promise<number> {
  const total = (await getTodayFocusMinutes(now)) + Math.max(0, Math.round(minutes));
  await MascotStateRepository.set(KEY, JSON.stringify({ day: format(now, 'yyyy-MM-dd'), minutes: total }));
  return total;
}

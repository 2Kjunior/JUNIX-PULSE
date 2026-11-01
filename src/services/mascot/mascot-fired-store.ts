/**
 * Remembers which time triggers the mascot has already shown today, so each one is said once.
 * Kept on the device in the secure store; when it is unavailable (web) it lives in memory only.
 * Only today's keys are kept: a new day starts with an empty list.
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'junix_pulse_mascot_fired';

interface FiredDay {
  day: string;
  keys: string[];
}

let cache: FiredDay | null = null;

async function load(day: string): Promise<FiredDay> {
  if (cache && cache.day === day) return cache;

  let stored: FiredDay | null = null;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (
        typeof value === 'object' && value !== null &&
        typeof (value as FiredDay).day === 'string' &&
        Array.isArray((value as FiredDay).keys)
      ) {
        stored = {
          day: (value as FiredDay).day,
          keys: (value as FiredDay).keys.filter((key): key is string => typeof key === 'string'),
        };
      }
    }
  } catch {
    // Unavailable or unreadable: start the day afresh
  }

  cache = stored && stored.day === day ? stored : { day, keys: [] };
  return cache;
}

export async function loadFiredKeys(day: string): Promise<Set<string>> {
  return new Set((await load(day)).keys);
}

export async function markTriggerFired(day: string, key: string): Promise<void> {
  const current = await load(day);
  if (current.keys.includes(key)) return;
  current.keys.push(key);
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Kept in memory for this session
  }
}

/** For tests. */
export function resetFiredStoreCache(): void {
  cache = null;
}

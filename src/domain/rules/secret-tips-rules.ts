/**
 * The secrets of Pulse (study 001, 16.13; sheet 046): what the onboarding does not show, found
 * while using the app. After a few days, Pulse tells one of them now and then on the home screen,
 * in this order, each once: « Tu savais ? … ».
 *
 * Pure: what was seen, the days of the last tip and of the last secret are read by the caller.
 */

import { tipDay } from './gesture-tip-rules';
import type { MascotMessageId } from './mascot-message-catalog';

export interface SecretTip {
  /** Remembered as a tip: "Oublier les astuces vues" gives the secrets back too. */
  id: string;
  message: MascotMessageId;
}

/** In the order they are told: the most useful first. */
export const SECRET_TIPS: readonly SecretTip[] = [
  { id: 'secret:dictateAll', message: 'SECRET_DICTATE_ALL' },
  { id: 'secret:focus', message: 'SECRET_FOCUS' },
  { id: 'secret:themes', message: 'SECRET_THEMES' },
  { id: 'secret:cardColor', message: 'SECRET_CARD_COLOR' },
  { id: 'secret:sanctum', message: 'SECRET_SANCTUM' },
  { id: 'secret:widget', message: 'SECRET_WIDGET' },
];

/** The first secret waits this many days of use. */
export const SECRET_FIRST_AFTER_DAYS = 3;
/** Then one every this many days at most. */
export const SECRET_EVERY_DAYS = 3;
/** Where the day of the last secret is kept. */
export const LAST_SECRET_DAY_ID = 'secret:lastDay';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from one YYYY-MM-DD to another (negative if before). */
function daysBetween(from: string, to: string): number {
  const at = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((at(to) - at(from)) / DAY_MS);
}

/**
 * The secret to tell now, or null: not in the first days, never on a day another tip was given,
 * at most one every few days, and the first one not told yet.
 */
export function secretDue({
  seen,
  startedAt,
  lastTipDay,
  lastSecretDay,
  now,
}: {
  seen: ReadonlySet<string>;
  /** When the app was first opened (the settings' creation). */
  startedAt: Date;
  lastTipDay: string | null;
  lastSecretDay: string | null;
  now: Date;
}): SecretTip | null {
  const today = tipDay(now);
  if (daysBetween(tipDay(startedAt), today) < SECRET_FIRST_AFTER_DAYS) return null;
  if (lastTipDay === today) return null;
  if (lastSecretDay && daysBetween(lastSecretDay, today) < SECRET_EVERY_DAYS) return null;
  return SECRET_TIPS.find(secret => !seen.has(secret.id)) ?? null;
}

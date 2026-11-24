/**
 * The gesture tips (study 001, 3-A and 12.3; sheet 024): each one is given once, when it is
 * useful (a list with at least two cards for the swipe), and never on a day another tip was
 * already given. Pure: what was seen and the last day are read by the caller.
 * The tips of the Planning (long press to move) and of the invitations come with their own
 * chantiers (n° 8 and n° 7): a line here and a sentence of Pulse each.
 */

import type { MascotMessageId } from './mascot-message-catalog';

export type GestureTipId = 'swipe';

export interface GestureTip {
  id: GestureTipId;
  message: MascotMessageId;
  /** The tip waits until there are at least this many cards. */
  minCards: number;
}

export const GESTURE_TIPS: Readonly<Record<GestureTipId, GestureTip>> = {
  swipe: { id: 'swipe', message: 'TIP_SWIPE', minCards: 2 },
};

/** Where the day of the last tip is kept, with the tips seen ("Oublier les astuces vues" clears it too). */
export const LAST_TIP_DAY_ID = 'lastDay';

/** The day of the phone's clock, as YYYY-MM-DD. */
export function tipDay(at: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function gestureTipDue({
  tip,
  cardCount,
  seen,
  lastTipDay,
  now,
}: {
  tip: GestureTip;
  cardCount: number;
  seen: boolean;
  lastTipDay: string | null;
  now: Date;
}): boolean {
  return !seen && cardCount >= tip.minCards && lastTipDay !== tipDay(now);
}

/** The card opens a moment after the list shows, stays open long enough to read, then closes. */
export const PEEK_DELAY_MS = 900;
export const PEEK_OPEN_MS = 1400;

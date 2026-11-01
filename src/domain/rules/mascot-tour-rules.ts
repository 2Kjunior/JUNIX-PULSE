/**
 * Pure rules for the home tour (four stops) and the first visit tip of each screen.
 * The tour points at four things on the home screen, one after the other, and never twice.
 * A first visit tip is one bubble, shown once per screen. What was seen is remembered by the
 * caller; nothing here reads the database or the screen.
 */

import type { MascotMessageId } from './mascot-message-catalog';

// ─── First visit tips ───────────────────────────────────────────────────────────────────────

export type TipScreen = 'reminders' | 'tasks' | 'calendar' | 'people' | 'pulse';

export const TIP_MESSAGES: Record<TipScreen, MascotMessageId> = {
  reminders: 'TIP_REMINDERS',
  tasks: 'TIP_TASKS',
  calendar: 'TIP_CALENDAR',
  people: 'TIP_PEOPLE',
  pulse: 'TIP_PULSE',
};

export const TIP_SCREENS = Object.keys(TIP_MESSAGES) as TipScreen[];

/** Key under which "this tip was seen" is remembered. */
export function tipKey(id: string): string {
  return `tip:${id}`;
}

export const HOME_TOUR_TIP_ID = 'tour:home';

/** The screen of the main tabs a route stands for, or null for the home screen and other routes. */
export function tipScreenFromSegments(segments: readonly string[]): TipScreen | null {
  if (segments[0] !== '(tabs)') return null;
  const screen = segments[1];
  return (TIP_SCREENS as readonly string[]).includes(screen) ? (screen as TipScreen) : null;
}

/** True when the route is the home screen of the main tabs. */
export function isHomeSegments(segments: readonly string[]): boolean {
  return segments[0] === '(tabs)' && (segments.length === 1 || segments[1] === 'index');
}

// ─── Home tour ──────────────────────────────────────────────────────────────────────────────

export type TourStopId = 'pillars' | 'quickAdd' | 'timeline' | 'mascot';

export const TOUR_STOPS: readonly { id: TourStopId; message: MascotMessageId }[] = [
  { id: 'pillars', message: 'TOUR_PILLARS' },
  { id: 'quickAdd', message: 'TOUR_QUICK_ADD' },
  { id: 'timeline', message: 'TOUR_TIMELINE' },
  { id: 'mascot', message: 'TOUR_MASCOT' },
];

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourScreen {
  width: number;
  height: number;
  topInset: number;
  /** Height at the bottom taken by the tab bar. */
  bottomReserve: number;
}

export const MIN_TOUR_STOPS = 2;

/**
 * The stops that can be shown: those whose target was measured and sits fully on screen,
 * in tour order. A tour with fewer than two such stops is not worth giving.
 */
export function planTour(
  measured: Readonly<Partial<Record<TourStopId, TourRect | null>>>,
  screen: TourScreen
): TourStopId[] {
  const visible = TOUR_STOPS.map(stop => stop.id).filter(id => {
    const rect = measured[id];
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    return (
      rect.y >= screen.topInset &&
      rect.y + rect.height <= screen.height - screen.bottomReserve &&
      rect.x >= 0 &&
      rect.x + rect.width <= screen.width + 1
    );
  });
  return visible.length >= MIN_TOUR_STOPS ? visible : [];
}

export const TOUR_BUBBLE_HEIGHT = 150;
export const TOUR_HIGHLIGHT_PADDING = 6;
export const TOUR_GAP = 12;

export interface TourBubblePlacement {
  side: 'below' | 'above';
  /** Distance from the top of the screen. */
  top: number;
  highlight: TourRect;
}

/** Puts the bubble under the target when there is room, above it otherwise. */
export function placeTourBubble(rect: TourRect, screen: TourScreen): TourBubblePlacement {
  const highlight: TourRect = {
    x: rect.x - TOUR_HIGHLIGHT_PADDING,
    y: rect.y - TOUR_HIGHLIGHT_PADDING,
    width: rect.width + 2 * TOUR_HIGHLIGHT_PADDING,
    height: rect.height + 2 * TOUR_HIGHLIGHT_PADDING,
  };

  const roomBelow = screen.height - screen.bottomReserve - (highlight.y + highlight.height);
  if (roomBelow >= TOUR_BUBBLE_HEIGHT + TOUR_GAP) {
    return { side: 'below', top: highlight.y + highlight.height + TOUR_GAP, highlight };
  }

  const top = Math.max(screen.topInset, highlight.y - TOUR_GAP - TOUR_BUBBLE_HEIGHT);
  return { side: 'above', top, highlight };
}

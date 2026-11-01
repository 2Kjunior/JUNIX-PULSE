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

/**
 * A rect measured in window coordinates, expressed in the coordinates of the layer that draws
 * on top of the screen. Both are measured the same way, so whatever the platform adds to
 * "window" coordinates (the status bar on some Android phones) cancels out.
 */
export function relativeToLayer(rect: TourRect, layerOrigin: { x: number; y: number }): TourRect {
  return { ...rect, x: rect.x - layerOrigin.x, y: rect.y - layerOrigin.y };
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
/** Widest a tour or tip bubble gets, so it stays a bubble on a tablet or a wide window. */
export const TOUR_BUBBLE_MAX_WIDTH = 360;
export const TOUR_HIGHLIGHT_PADDING = 6;
export const TOUR_GAP = 12;

export interface TourBubblePlacement {
  side: 'below' | 'above';
  /** Distance from the top of the screen. */
  top: number;
  highlight: TourRect;
}

/**
 * Puts the bubble under the target when there is room, above it otherwise. When the bubble fits
 * on neither side (a large target on a short screen), it takes the side with more room and stays
 * on screen, over the target rather than off the screen. `bubbleHeight` is the measured height,
 * which grows with the user's text size; until it is known the default estimate is used.
 */
export function placeTourBubble(
  rect: TourRect,
  screen: TourScreen,
  bubbleHeight: number = TOUR_BUBBLE_HEIGHT
): TourBubblePlacement {
  const highlight: TourRect = {
    x: rect.x - TOUR_HIGHLIGHT_PADDING,
    y: rect.y - TOUR_HIGHLIGHT_PADDING,
    width: rect.width + 2 * TOUR_HIGHLIGHT_PADDING,
    height: rect.height + 2 * TOUR_HIGHLIGHT_PADDING,
  };

  const needed = bubbleHeight + TOUR_GAP;
  const roomBelow = screen.height - screen.bottomReserve - (highlight.y + highlight.height);
  const roomAbove = highlight.y - screen.topInset;

  if (roomBelow >= needed) {
    return { side: 'below', top: highlight.y + highlight.height + TOUR_GAP, highlight };
  }
  if (roomAbove >= needed) {
    return { side: 'above', top: highlight.y - TOUR_GAP - bubbleHeight, highlight };
  }

  const lowest = Math.max(screen.topInset, screen.height - screen.bottomReserve - bubbleHeight);
  const clamp = (top: number) => Math.min(lowest, Math.max(screen.topInset, top));
  if (roomBelow >= roomAbove) {
    return { side: 'below', top: clamp(highlight.y + highlight.height + TOUR_GAP), highlight };
  }
  return { side: 'above', top: clamp(highlight.y - TOUR_GAP - bubbleHeight), highlight };
}

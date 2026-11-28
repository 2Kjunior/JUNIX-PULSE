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

export type TourStopId =
  | 'pillars'
  | 'quickAdd'
  | 'timeline'
  | 'mascot'
  // The other tabs (sheet 045)
  | 'todoFilter'
  | 'todoCard'
  | 'todoMore'
  | 'planViews'
  | 'planList'
  | 'peopleCard'
  | 'peopleAdd';

export interface TourStop {
  id: TourStopId;
  message: MascotMessageId;
}

/** The tabs that have a tour (sheet 045): the home screen, À faire, the Planning and Proches. */
export type TourId = 'home' | 'todo' | 'planning' | 'people';

export const SCREEN_TOURS: Readonly<Record<TourId, { tipId: string; stops: readonly TourStop[] }>> = {
  home: {
    tipId: 'tour:home',
    stops: [
      { id: 'pillars', message: 'TOUR_PILLARS' },
      { id: 'quickAdd', message: 'TOUR_QUICK_ADD' },
      { id: 'timeline', message: 'TOUR_TIMELINE' },
      { id: 'mascot', message: 'TOUR_MASCOT' },
    ],
  },
  // The two ways a card is swiped, and its ⋯: deleting is no longer hidden
  todo: {
    tipId: 'tour:todo',
    stops: [
      { id: 'todoFilter', message: 'TOUR_TODO_FILTER' },
      { id: 'todoCard', message: 'TOUR_TODO_SWIPE' },
      { id: 'todoMore', message: 'TOUR_TODO_MORE' },
    ],
  },
  planning: {
    tipId: 'tour:planning',
    stops: [
      { id: 'planViews', message: 'TOUR_PLAN_VIEWS' },
      { id: 'planList', message: 'TOUR_PLAN_MOVE' },
    ],
  },
  people: {
    tipId: 'tour:people',
    stops: [
      { id: 'peopleCard', message: 'TOUR_PEOPLE_CARD' },
      { id: 'peopleAdd', message: 'TOUR_PEOPLE_ADD' },
    ],
  },
};

/** The four stops of the home tour, as before. */
export const TOUR_STOPS: readonly TourStop[] = SCREEN_TOURS.home.stops;

/** The tour of the tab a route stands for, or null. */
export function tourFromSegments(segments: readonly string[]): TourId | null {
  if (isHomeSegments(segments)) return 'home';
  if (segments[0] !== '(tabs)') return null;
  if (segments[1] === 'tasks') return 'todo';
  if (segments[1] === 'calendar') return 'planning';
  if (segments[1] === 'people') return 'people';
  return null;
}

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
 * in tour order. A home tour with fewer than two such stops is not worth giving; the tour of
 * another tab (sheet 045) may have one (the Planning in Month view has no card of the day).
 */
export function planTour(
  measured: Readonly<Partial<Record<TourStopId, TourRect | null>>>,
  screen: TourScreen,
  stops: readonly TourStop[] = TOUR_STOPS,
  minStops: number = MIN_TOUR_STOPS
): TourStopId[] {
  const visible = stops.map(stop => stop.id).filter(id => {
    const rect = measured[id];
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    return (
      rect.y >= screen.topInset &&
      rect.y + rect.height <= screen.height - screen.bottomReserve &&
      rect.x >= 0 &&
      rect.x + rect.width <= screen.width + 1
    );
  });
  return visible.length >= minStops ? visible : [];
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

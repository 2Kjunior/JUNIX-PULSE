/**
 * The Week view of the Planning (study 001, 16.12; sheet 047): the zoom, where to scroll for
 * « Maintenant » or for an item, and the items of the « Cette semaine » band. Pure: the sizes of
 * the screen and the items are given by the caller.
 */

/** A zoom level: the width of a day and the height of an hour. 0 is « Semaine entière ». */
export interface WeekZoom {
  /** null: the 7 days fit the width of the grid. */
  dayWidth: number | null;
  hourHeight: number;
}

export const WEEK_ZOOM_LEVELS: readonly WeekZoom[] = [
  { dayWidth: null, hourHeight: 48 },
  { dayWidth: 96, hourHeight: 64 },
  // The size of before (sheet 028): two GlowCards side by side stay readable
  { dayWidth: 128, hourHeight: 88 },
  { dayWidth: 176, hourHeight: 112 },
];

/** The level the grid opens on: the size of before. */
export const DEFAULT_WEEK_ZOOM = 2;
/** « Semaine entière ». */
export const FIT_WEEK_ZOOM = 0;

/** A pinch spread this much (or more) zooms in one level; pinched this much, zooms out one. */
export const PINCH_IN_SCALE = 1.15;
export const PINCH_OUT_SCALE = 0.87;

export function clampZoom(level: number): number {
  return Math.max(0, Math.min(WEEK_ZOOM_LEVELS.length - 1, level));
}

/** The level after a pinch of this scale (1 = no change). */
export function zoomAfterPinch(level: number, scale: number): number {
  if (scale >= PINCH_IN_SCALE) return clampZoom(level + 1);
  if (scale <= PINCH_OUT_SCALE) return clampZoom(level - 1);
  return level;
}

/** The width of a day and the height of an hour at this level, for a grid of this width (the days' part). */
export function weekSizes(level: number, daysAreaWidth: number, dayCount = 7): { dayWidth: number; hourHeight: number } {
  const zoom = WEEK_ZOOM_LEVELS[clampZoom(level)];
  const fit = Math.max(32, Math.floor(daysAreaWidth / dayCount));
  return { dayWidth: zoom.dayWidth ?? fit, hourHeight: zoom.hourHeight };
}

/**
 * Where to scroll so that a day and a time sit in view: the day centred when it can be, the time
 * a third down the visible height. Never below 0 nor past the end.
 */
export function scrollTargetFor({
  dayIndex,
  minutes,
  startHour,
  dayWidth,
  hourHeight,
  dayCount = 7,
  totalHours,
  viewport,
}: {
  dayIndex: number;
  minutes: number;
  startHour: number;
  dayWidth: number;
  hourHeight: number;
  dayCount?: number;
  totalHours: number;
  /** The visible part of the days' area. */
  viewport: { width: number; height: number };
}): { x: number; y: number } {
  const maxX = Math.max(0, dayCount * dayWidth - viewport.width);
  const maxY = Math.max(0, totalHours * hourHeight - viewport.height);
  const x = dayIndex * dayWidth - (viewport.width - dayWidth) / 2;
  const y = ((minutes - startHour * 60) / 60) * hourHeight - viewport.height / 3;
  return { x: Math.round(Math.max(0, Math.min(maxX, x))), y: Math.round(Math.max(0, Math.min(maxY, y))) };
}

export interface WeekBandItem {
  id: string;
  label: string;
  /** Index of its day in the shown week (0 to 6). */
  dayIndex: number;
  /** Minutes from midnight. */
  minutes: number;
  startTime: string;
}

/**
 * The items of the « Cette semaine » band: in the order of the week, by day then by time; in the
 * current week, only what is still to come (from the current hour). At most `limit`.
 */
export function weekBandItems(
  items: readonly WeekBandItem[],
  { todayIndex, nowMinutes, limit = 12 }: { todayIndex: number | null; nowMinutes: number; limit?: number }
): WeekBandItem[] {
  return items
    .filter(item => todayIndex === null || item.dayIndex > todayIndex || (item.dayIndex === todayIndex && item.minutes >= nowMinutes - 59))
    .slice()
    .sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes)
    .slice(0, limit);
}

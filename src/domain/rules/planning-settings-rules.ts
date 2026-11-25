/**
 * The Planning settings (study 001, 12.8; sheet 028): the view it opens on, the first day of the
 * week and the step of a move. Kept as one short text in the settings row, read strictly: a value
 * missing, old or damaged falls back to the default, so nothing breaks.
 */
import type { WeekStart } from './planning-move-rules';

export const PLANNING_VIEWS = ['agenda', 'timetable', 'week', 'month'] as const;
export type PlanningView = (typeof PLANNING_VIEWS)[number];

/** The steps a card can move by, in minutes. */
export const DRAG_STEPS = [5, 10, 15, 30] as const;
export type DragStep = (typeof DRAG_STEPS)[number];

export interface PlanningPrefs {
  openView: PlanningView;
  weekStart: WeekStart;
  dragStep: DragStep;
}

/** What the Planning did before these settings existed: the list, Monday, a quarter of an hour. */
export const DEFAULT_PLANNING_PREFS: Readonly<PlanningPrefs> = { openView: 'agenda', weekStart: 1, dragStep: 15 };

/** The settings read from their text; each value checked on its own. */
export function planningPrefsOf(text: string | null | undefined): PlanningPrefs {
  let raw: Record<string, unknown> = {};
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>;
    } catch {
      raw = {};
    }
  }
  const openView = (PLANNING_VIEWS as readonly unknown[]).includes(raw.openView) ? (raw.openView as PlanningView) : DEFAULT_PLANNING_PREFS.openView;
  const weekStart = raw.weekStart === 0 || raw.weekStart === 1 ? raw.weekStart : DEFAULT_PLANNING_PREFS.weekStart;
  const dragStep = (DRAG_STEPS as readonly unknown[]).includes(raw.dragStep) ? (raw.dragStep as DragStep) : DEFAULT_PLANNING_PREFS.dragStep;
  return { openView, weekStart, dragStep };
}

/** The settings as the text kept in the settings row. */
export function planningPrefsText(prefs: PlanningPrefs): string {
  return JSON.stringify({ openView: prefs.openView, weekStart: prefs.weekStart, dragStep: prefs.dragStep });
}

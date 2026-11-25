/**
 * The Planning settings (study 001, 12.8; sheets 028 and 029), kept as one short text in the
 * settings row and read strictly: a value missing, old or damaged falls back to the default.
 *  - the step of a move: chosen in the Paramètres;
 *  - the view it opens on: the one used last, kept by the Planning itself;
 *  - the first day of the week: no longer read here; it follows the language (weekStartOf).
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

/**
 * The first day of the week from the language of the app (sheet 029): the language says it
 * (date-fns: 1 in French, 0 in American English); anything else is taken as Monday.
 */
export function weekStartOf(fromLanguage: number | undefined): WeekStart {
  return fromLanguage === 0 ? 0 : 1;
}

/**
 * Règles métier pures pour les habitudes.
 * BR-011 : une habitude en pause ne doit pas être traitée comme un échec.
 * Le streak est calculé en excluant les jours couverts par une pause active.
 */

import {
  parseISO,
  differenceInDays,
  eachDayOfInterval,
  format,
  startOfDay,
  subDays,
  isWithinInterval,
  isBefore,
  isSameDay,
  addDays,
  addWeeks,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { Habit, HabitCompletion, HabitPause } from '../entities';

/**
 * A habit "n times a week" keeps its streak as long as each week reaches its target: a day of
 * rest is part of the plan. The streak still counts the times it was done.
 */
export type HabitRhythm = Pick<Habit, 'frequency' | 'targetDaysPerWeek' | 'createdAt'>;

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/** The days of the week of this date, Monday to Sunday. */
function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/**
 * How a week went: the times the habit was done, and whether it reached its target. A week with
 * a pause never fails; the week the habit was created asks only for the days it had left.
 */
function weekResult(
  weekStart: Date,
  completedDates: ReadonlySet<string>,
  pauses: HabitPause[],
  rhythm: HabitRhythm
): { done: number; reached: boolean } {
  const createdOn = startOfDay(parseISO(rhythm.createdAt));
  const days = weekDays(weekStart).filter(day => !isBefore(day, createdOn));
  const done = days.filter(day => completedDates.has(format(day, 'yyyy-MM-dd'))).length;
  if (days.some(day => isDayPaused(day, pauses))) return { done, reached: true };
  const target = Math.min(Math.max(1, rhythm.targetDaysPerWeek ?? 1), days.length);
  return { done, reached: done >= target };
}

function weeklyCurrentStreak(completions: HabitCompletion[], pauses: HabitPause[], now: Date, rhythm: HabitRhythm): number {
  const completedDates = new Set(completions.map(c => c.completedDate));
  const createdWeek = startOfWeek(parseISO(rhythm.createdAt), WEEK_OPTIONS);
  const thisWeek = startOfWeek(now, WEEK_OPTIONS);
  // The week in progress counts what is done, and is never a failure before it ends
  let streak = weekResult(thisWeek, completedDates, pauses, rhythm).done;
  for (let week = subWeeks(thisWeek, 1); !isBefore(week, createdWeek); week = subWeeks(week, 1)) {
    const result = weekResult(week, completedDates, pauses, rhythm);
    if (!result.reached) break;
    streak += result.done;
    if (differenceInDays(thisWeek, week) > 730) break;
  }
  return streak;
}

function weeklyBestStreak(completions: HabitCompletion[], pauses: HabitPause[], rhythm: HabitRhythm, now: Date): number {
  const completedDates = new Set(completions.map(c => c.completedDate));
  const thisWeek = startOfWeek(now, WEEK_OPTIONS);
  let best = 0;
  let current = 0;
  for (let week = startOfWeek(parseISO(rhythm.createdAt), WEEK_OPTIONS); !isBefore(thisWeek, week); week = addWeeks(week, 1)) {
    const result = weekResult(week, completedDates, pauses, rhythm);
    if (result.reached || week.getTime() === thisWeek.getTime()) {
      current += result.done;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/**
 * Détermine si un jour donné est couvert par une période de pause.
 */
export function isDayPaused(date: Date, pauses: HabitPause[]): boolean {
  return pauses.some(pause => {
    const start = parseISO(pause.startDate);
    const end = pause.endDate ? parseISO(pause.endDate) : new Date();
    return isWithinInterval(startOfDay(date), {
      start: startOfDay(start),
      end: startOfDay(end),
    });
  });
}

/**
 * Calcule le streak courant d'une habitude quotidienne.
 * Un jour sans complétion ET sans pause rompt le streak.
 * Les jours en pause sont ignorés (ni comptés, ni rompants).
 */
export function calculateCurrentStreak(
  completions: HabitCompletion[],
  pauses: HabitPause[],
  now: Date = new Date(),
  rhythm?: HabitRhythm
): number {
  if (rhythm?.frequency === 'WEEKLY') return weeklyCurrentStreak(completions, pauses, now, rhythm);
  const completedDates = new Set(completions.map(c => c.completedDate));
  let streak = 0;
  let day = startOfDay(now);

  // Remonter dans le temps jusqu'à trouver un jour non validé et non en pause
  while (true) {
    const dayStr = format(day, 'yyyy-MM-dd');
    const paused = isDayPaused(day, pauses);
    const completed = completedDates.has(dayStr);

    if (paused) {
      // Jour en pause : ignorer, continuer à remonter
      day = subDays(day, 1);
      continue;
    }

    if (completed) {
      streak++;
      day = subDays(day, 1);
    } else if (isSameDay(day, startOfDay(now))) {
      // Aujourd'hui non validé mais pas encore fini : ne rompt pas le streak
      day = subDays(day, 1);
    } else {
      // Jour passé non validé et non en pause : streak rompu
      break;
    }

    // Limite de sécurité : ne pas remonter plus d'un an
    if (differenceInDays(startOfDay(now), day) > 365) break;
  }

  return streak;
}

/**
 * Calcule le meilleur streak jamais atteint.
 */
export function calculateBestStreak(
  completions: HabitCompletion[],
  pauses: HabitPause[],
  createdAt: string,
  rhythm?: HabitRhythm
): number {
  if (completions.length === 0) return 0;
  if (rhythm?.frequency === 'WEEKLY') return weeklyBestStreak(completions, pauses, rhythm, new Date());

  const completedDates = new Set(completions.map(c => c.completedDate));
  const start = parseISO(createdAt);
  const end = new Date();

  const allDays = eachDayOfInterval({ start, end });

  let best = 0;
  let current = 0;

  for (const day of allDays) {
    const dayStr = format(day, 'yyyy-MM-dd');
    const paused = isDayPaused(day, pauses);

    if (paused) continue;  // Jours de pause ignorés

    if (completedDates.has(dayStr)) {
      current++;
      if (current > best) best = current;
    } else if (isBefore(startOfDay(day), startOfDay(new Date()))) {
      // Jour passé sans complétion et sans pause : reset
      current = 0;
    }
  }

  return best;
}

/**
 * Détermine si l'habitude a été validée aujourd'hui.
 */
export function isCompletedToday(completions: HabitCompletion[], now: Date = new Date()): boolean {
  const todayStr = format(startOfDay(now), 'yyyy-MM-dd');
  return completions.some(c => c.completedDate === todayStr);
}

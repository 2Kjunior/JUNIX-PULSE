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
} from 'date-fns';
import { HabitCompletion, HabitPause } from '../entities';

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
  now: Date = new Date()
): number {
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
  createdAt: string
): number {
  if (completions.length === 0) return 0;

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

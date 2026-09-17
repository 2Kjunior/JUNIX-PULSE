/**
 * Règles métier pures pour les rappels.
 * Ces fonctions sont déterministes et testables indépendamment de la couche UI.
 */

import {
  addDays,
  addWeeks,
  addMonths,
  setDay,
  getDay,
  lastDayOfMonth,
  setDate,
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
  format,
} from 'date-fns';
import { ReminderStatus, WeekPosition } from '../enums';
import { RecurrenceRule, Reminder } from '../entities';

/**
 * Détermine si un rappel est dans un état terminal (pas de nouvelle occurrence possible).
 */
export function isReminderTerminal(status: ReminderStatus): boolean {
  return status === 'COMPLETED' || status === 'DELETED';
}

/**
 * Détermine si un rappel planifié dans le passé sans action est "manqué".
 * BR-002 : un rappel manqué est distinct d'un rappel terminé.
 */
export function isReminderMissed(scheduledAt: string, now: Date = new Date()): boolean {
  const scheduled = parseISO(scheduledAt);
  // Marge de 2 minutes : la notification peut arriver légèrement après l'heure exacte
  const threshold = addDays(scheduled, 0);
  threshold.setMinutes(threshold.getMinutes() + 2);
  return isBefore(threshold, now);
}

/**
 * Calcule la prochaine date d'occurrence d'un rappel récurrent
 * à partir d'une occurrence donnée.
 * BR-004 : une récurrence est une règle, pas une simple copie visuelle.
 *
 * La date retournée conserve l'heure locale de la règle originale.
 */
export function getNextOccurrence(
  currentScheduledAt: string,
  rule: RecurrenceRule
): string | null {
  const current = parseISO(currentScheduledAt);

  // Si la règle a une date de fin dépassée, pas de prochaine occurrence
  if (rule.endDate && isAfter(current, parseISO(rule.endDate))) {
    return null;
  }

  let next: Date;

  switch (rule.type) {
    case 'DAILY':
      next = addDays(current, rule.interval);
      break;

    case 'WEEKLY': {
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        // Fallback : même jour chaque semaine
        next = addWeeks(current, rule.interval);
        break;
      }
      // Trouver le prochain jour de la semaine dans la liste
      const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
      const currentDay = getDay(current);
      const nextDayInWeek = sortedDays.find(d => d > currentDay);

      if (nextDayInWeek !== undefined) {
        // Même semaine, jour suivant
        next = setDay(current, nextDayInWeek);
      } else {
        // Semaine suivante, premier jour de la liste
        next = setDay(addWeeks(current, rule.interval), sortedDays[0]);
      }
      break;
    }

    case 'MONTHLY': {
      if (rule.weekPosition && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // ex: "dernier vendredi du mois"
        next = getNthWeekdayOfMonth(
          addMonths(current, rule.interval),
          rule.daysOfWeek[0],
          rule.weekPosition
        );
      } else if (rule.dayOfMonth) {
        const base = addMonths(current, rule.interval);
        const lastDay = lastDayOfMonth(base).getDate();
        next = setDate(base, Math.min(rule.dayOfMonth, lastDay));
      } else {
        next = addMonths(current, rule.interval);
      }
      break;
    }

    case 'CUSTOM_INTERVAL':
      next = addDays(current, rule.interval);
      break;

    default:
      return null;
  }

  // Vérifier que la prochaine occurrence est avant la date de fin de la règle
  if (rule.endDate && isAfter(next, parseISO(rule.endDate))) {
    return null;
  }

  return next.toISOString();
}

/**
 * Retourne le Nième jour de la semaine d'un mois donné.
 * ex: 3ème lundi de mars, dernier vendredi d'avril.
 */
function getNthWeekdayOfMonth(
  monthDate: Date,
  dayOfWeek: number,
  position: WeekPosition
): Date {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  if (position === 'LAST') {
    // Partir de la fin du mois
    let day = lastDayOfMonth(monthDate);
    while (getDay(day) !== dayOfWeek) {
      day = addDays(day, -1);
    }
    return day;
  }

  const positionMap: Record<string, number> = {
    FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4,
  };
  const target = positionMap[position] ?? 1;
  let count = 0;
  let day = new Date(year, month, 1);

  while (day.getMonth() === month) {
    if (getDay(day) === dayOfWeek) {
      count++;
      if (count === target) return day;
    }
    day = addDays(day, 1);
  }

  // Fallback si le mois n'a pas assez de semaines : dernier trouvé
  day = addDays(day, -1);
  while (getDay(day) !== dayOfWeek) {
    day = addDays(day, -1);
  }
  return day;
}

/**
 * Retourne la durée de snooze en minutes selon les options standard Junix Pulse.
 */
export const SNOOZE_OPTIONS_MINUTES = [10, 30, 60, 120] as const;
export type SnoozeOption = (typeof SNOOZE_OPTIONS_MINUTES)[number];

/**
 * Calcule la nouvelle date d'échéance après un snooze.
 * BR-003 : un snooze crée une nouvelle échéance pour l'occurrence concernée.
 */
export function computeSnoozeUntil(minutes: number, now: Date = new Date()): string {
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}

/**
 * Durée maximale pour l'undo de suppression (en millisecondes).
 * BR : suppression logique avec annulation possible pendant ~30 secondes.
 */
export const UNDO_DELETE_TIMEOUT_MS = 30_000;

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
function computeSingleStepNext(current: Date, rule: RecurrenceRule): Date | null {
  const interval = Math.max(1, rule.interval || 1);

  switch (rule.type) {
    case 'DAILY':
      return addDays(current, interval);

    case 'WEEKLY': {
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        // Fallback : même jour chaque semaine
        return addWeeks(current, interval);
      }
      // Trouver le prochain jour de la semaine dans la liste
      const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
      const currentDay = getDay(current);
      const nextDayInWeek = sortedDays.find((d) => d > currentDay);

      if (nextDayInWeek !== undefined) {
        // Même semaine, jour suivant
        return setDay(current, nextDayInWeek);
      } else {
        // Semaine suivante, premier jour de la liste
        return setDay(addWeeks(current, interval), sortedDays[0]);
      }
    }

    case 'MONTHLY': {
      if (rule.weekPosition && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // ex: "dernier vendredi du mois"
        return getNthWeekdayOfMonth(
          addMonths(current, interval),
          rule.daysOfWeek[0],
          rule.weekPosition
        );
      } else if (rule.dayOfMonth) {
        const base = addMonths(current, interval);
        const lastDay = lastDayOfMonth(base).getDate();
        return setDate(base, Math.min(rule.dayOfMonth, lastDay));
      } else {
        // DEF-15 : fixer le jour du mois de current pour éviter la dérive lors des transitions de mois
        const base = addMonths(current, interval);
        const originalDay = current.getDate();
        const lastDay = lastDayOfMonth(base).getDate();
        return setDate(base, Math.min(originalDay, lastDay));
      }
    }

    case 'CUSTOM_INTERVAL':
      return addDays(current, interval);

    default:
      return null;
  }
}

/**
 * Calcule la prochaine date d'occurrence d'un rappel récurrent
 * à partir d'une occurrence donnée.
 * BR-004 : une récurrence est une règle, pas une simple copie visuelle.
 *
 * La date retournée conserve l'heure locale de la règle originale.
 * Si referenceNow est fourni (DEF-04), avance jusqu'à la première occurrence strictement future.
 */
export function getNextOccurrence(
  currentScheduledAt: string,
  rule: RecurrenceRule,
  referenceNow?: Date
): string | null {
  const current = parseISO(currentScheduledAt);

  // Si la règle a une date de fin dépassée, pas de prochaine occurrence
  if (rule.endDate && isAfter(current, parseISO(rule.endDate))) {
    return null;
  }

  let next = computeSingleStepNext(current, rule);
  if (!next) return null;

  // Si referenceNow est fourni, avancer jusqu'à la première occurrence strictement future (DEF-04)
  if (referenceNow && !isAfter(next, referenceNow)) {
    let iterations = 0;
    const maxIterations = 500;
    while (next && !isAfter(next, referenceNow) && iterations < maxIterations) {
      iterations++;
      next = computeSingleStepNext(next, rule);
    }
  }

  if (!next) return null;

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
export const SNOOZE_OPTIONS_MINUTES = [15, 30, 60] as const;
export type SnoozeOption = (typeof SNOOZE_OPTIONS_MINUTES)[number];

/**
 * Calcule la nouvelle date d'échéance après un snooze.
 * BR-003 : un snooze crée une nouvelle échéance pour l'occurrence concernée.
 */
export function computeSnoozeUntil(minutes: number, now: Date = new Date()): string {
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}

/**
 * Calcule "demain à la même heure" à partir de l'heure d'origine du rappel.
 * BR-003b : "lendemain même heure" conserve l'heure locale exacte de scheduledAt,
 * mais projette toujours sur le premier lendemain strictement futur par rapport à now (Option A, DEF-04).
 *
 * Ex 1 : rappel à 09h00 aujourd'hui, snooze à 14h00 → demain à 09h00.
 * Ex 2 : rappel à 09h00 il y a 3 jours, snooze à 14h00 → demain à 09h00 (pas dans le passé !).
 * Ex 3 : rappel à 08h00 aujourd'hui, snooze à 07h30 → demain à 08h00.
 * Ex 4 : rappel futur dans 4 jours à 09h00 → lendemain de l'échéance à 09h00.
 */
export function computeSnoozeTomorrowSameTime(
  scheduledAt: string,
  now: Date = new Date()
): string {
  const original = parseISO(scheduledAt);
  const base = isAfter(original, now) ? original : now;
  const tomorrow = addDays(base, 1);

  tomorrow.setHours(
    original.getHours(),
    original.getMinutes(),
    original.getSeconds(),
    original.getMilliseconds()
  );

  return tomorrow.toISOString();
}

/**
 * Durée maximale pour l'undo de suppression (en millisecondes).
 * BR : suppression logique avec annulation possible pendant ~30 secondes.
 */
export const UNDO_DELETE_TIMEOUT_MS = 30_000;

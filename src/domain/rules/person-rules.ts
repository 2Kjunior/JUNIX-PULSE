/**
 * Règles métier pures pour les personnes et les relations.
 * BR-012 : Détection des contacts oubliés selon le seuil individuel de la personne.
 * Fonctions déterministes et testables indépendamment de l'UI et de SQLite.
 */

import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { Person } from '../entities';

export type ContactHealthStatus = 'OPTIMAL' | 'ATTENTION' | 'FORGOTTEN';

/**
 * Calcule le nombre entier de jours écoulés depuis la dernière interaction enregistrée.
 * Retourne null si aucune interaction n'a encore été enregistrée.
 */
export function daysSinceLastInteraction(
  lastInteractionAt?: string | null,
  now: Date = new Date()
): number | null {
  if (!lastInteractionAt || lastInteractionAt.trim().length === 0) {
    return null;
  }

  const lastDate = parseISO(lastInteractionAt);
  if (isNaN(lastDate.getTime())) {
    return null;
  }

  const days = differenceInDays(startOfDay(now), startOfDay(lastDate));
  // En cas d'interaction future ou de décalage d'horloge, retourne au minimum 0
  return Math.max(0, days);
}

/**
 * Détermine si un contact est considéré comme oublié / à recontacter (BR-012).
 * Règle métier :
 * - Si aucune interaction n'a encore eu lieu (lastInteractionAt == null), le contact
 *   est immédiatement considéré comme oublié (à recontacter pour lancer le premier contact).
 * - Sinon, il est oublié si le nombre de jours sans interaction atteint ou dépasse
 *   son seuil personnalisé (forgottenThresholdDays, par défaut 30).
 */
export function isPersonForgotten(
  person: Pick<Person, 'lastInteractionAt' | 'forgottenThresholdDays'>,
  now: Date = new Date()
): boolean {
  const threshold = person.forgottenThresholdDays ?? 30;

  if (!person.lastInteractionAt || person.lastInteractionAt.trim().length === 0) {
    return true;
  }

  const days = daysSinceLastInteraction(person.lastInteractionAt, now);
  if (days === null) {
    return true;
  }

  return days >= threshold;
}

/**
 * Calcule le statut de santé relationnelle d'un contact :
 * - FORGOTTEN : seuil d'oubli atteint ou jamais contacté.
 * - ATTENTION : entre 50% et 100% du seuil sans interaction (alerte préventive).
 * - OPTIMAL : moins de 50% du seuil (relation fraîchement entretenue).
 */
export function getContactHealthStatus(
  person: Pick<Person, 'lastInteractionAt' | 'forgottenThresholdDays'>,
  now: Date = new Date()
): ContactHealthStatus {
  const threshold = person.forgottenThresholdDays ?? 30;

  if (!person.lastInteractionAt || person.lastInteractionAt.trim().length === 0) {
    return 'FORGOTTEN';
  }

  const days = daysSinceLastInteraction(person.lastInteractionAt, now);
  if (days === null || days >= threshold) {
    return 'FORGOTTEN';
  }

  const halfThreshold = Math.floor(threshold / 2);
  if (days >= halfThreshold) {
    return 'ATTENTION';
  }

  return 'OPTIMAL';
}

/**
 * Détermine si l'anniversaire d'une personne arrive dans les N prochains jours.
 * Accepte les formats YYYY-MM-DD ou MM-DD.
 * Gère correctement la transition de fin d'année (ex: fin décembre vers début janvier).
 */
export function isBirthdaySoon(
  birthDate?: string | null,
  withinDays: number = 7,
  now: Date = new Date()
): boolean {
  if (!birthDate || birthDate.trim().length === 0) {
    return false;
  }

  const parts = birthDate.trim().split('-');
  let month: number;
  let day: number;

  if (parts.length === 3) {
    // YYYY-MM-DD
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (parts.length === 2) {
    // MM-DD
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
  } else {
    return false;
  }

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const currentYear = now.getFullYear();
  const currentStart = startOfDay(now);

  // Tester l'anniversaire pour l'année en cours
  const bdayThisYear = new Date(currentYear, month - 1, day);
  const diffThisYear = differenceInDays(startOfDay(bdayThisYear), currentStart);

  if (diffThisYear >= 0 && diffThisYear <= withinDays) {
    return true;
  }

  // Tester l'anniversaire pour l'année suivante (pour les transitions fin décembre -> début janvier)
  const bdayNextYear = new Date(currentYear + 1, month - 1, day);
  const diffNextYear = differenceInDays(startOfDay(bdayNextYear), currentStart);

  return diffNextYear >= 0 && diffNextYear <= withinDays;
}

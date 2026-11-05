/**
 * Règles métier pures pour le traitement du langage naturel (NLP)
 * de la Capture Rapide (Quick Capture).
 *
 * Ces fonctions sont déterministes, isolées de React Native et testables unitairement.
 * Corrige DEF-10 :
 * 1. "après-demain" évalué strictement avant "demain"
 * 2. Heure explicite (19h, 19:30) prioritaire sur les raccourcis flous ("soir", "midi", "matin")
 * 3. Bornes lexicales strictes pour l'heure (évite faux positif sur "chez Paul 2 personnes")
 * 4. Frontières de mots entiers (\b) pour la recherche de contacts (évite que "Marc" matche "Marcher")
 */

import { addDays, nextDay, startOfDay } from 'date-fns';
import { ActionType, ReminderPriority } from '../enums';
import { Person } from '../entities';

export interface ParsedQuickCapture {
  cleanTitle: string;
  actionType: ActionType;
  targetPerson?: Person;
  targetDate: Date;
  targetTime: string; // 'HH:mm'
  priority: ReminderPriority;
}

const DAY_MAP: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Letters of French words, accents included: \b of JavaScript sees "é" as a separator, so
// "café" or "André" never matched with it
const WORD_CHARS = 'A-Za-z0-9_À-ÖØ-öø-ÿŒœ';

/** The pattern as whole words: neither preceded nor followed by a letter, accented or not. */
function hasWords(text: string, pattern: string): boolean {
  return new RegExp(`(?:^|[^${WORD_CHARS}])(?:${pattern})(?![${WORD_CHARS}])`, 'i').test(text);
}

/**
 * Analyse une saisie textuelle libre et extrait les intentions structurées.
 */
export function parseQuickCapture(
  input: string,
  persons: Person[] = [],
  now: Date = new Date()
): ParsedQuickCapture {
  const raw = input.trim();
  if (!raw) {
    return {
      cleanTitle: '',
      actionType: 'NONE',
      targetDate: startOfDay(now),
      targetTime: '09:00',
      priority: 'NORMAL',
    };
  }

  const lower = raw.toLowerCase();

  // ─── 1. Détecter l'action ────────────────────────────────────────────────────
  let detectedAction: ActionType = 'NONE';
  if (hasWords(lower, 'appeler|t[ée]l[ée]phoner|coup de fil')) {
    detectedAction = 'CALL';
  } else if (hasWords(lower, 'sms|message|[ée]crire un message|whatsapp')) {
    detectedAction = 'MESSAGE';
  } else if (hasWords(lower, 'mail|e-?mail|courriel|envoyer un mail')) {
    detectedAction = 'EMAIL';
  } else if (hasWords(lower, 'caf[ée]|d[ée]jeuner|d[îi]ner|voir|rencontrer|rdv')) {
    detectedAction = 'MEET';
  } else if (hasWords(lower, 'faire|acheter|pr[ée]parer|payer|ranger')) {
    detectedAction = 'TASK';
  }

  // ─── 2. Détecter la personne (avec frontières de mots entiers) ───────────────
  let matchedPerson: Person | undefined;
  for (const p of persons) {
    const fullName = p.displayName.trim();
    if (!fullName) continue;

    if (hasWords(raw, escapeRegex(fullName))) {
      matchedPerson = p;
      break;
    }

    const firstName = fullName.split(/\s+/)[0];
    if (firstName && firstName.length >= 3) {
      if (hasWords(raw, escapeRegex(firstName))) {
        matchedPerson = p;
        break;
      }
    }
  }

  // ─── 3. Détecter la date (ordre strict : après-demain AVANT demain) ───────────
  let targetDate = startOfDay(now);
  let explicitDateFound = true;

  if (hasWords(lower, 'apr[èe]s[- ]demain')) {
    // Règle 1 : après-demain en premier absolu car "après-demain" contient "demain"
    targetDate = addDays(startOfDay(now), 2);
  } else if (hasWords(lower, 'demain')) {
    targetDate = addDays(startOfDay(now), 1);
  } else if (hasWords(lower, "aujourd'?hui|ce soir|ce matin")) {
    targetDate = startOfDay(now);
  } else {
    explicitDateFound = false;
    // Recherche des jours de la semaine avec frontières de mots
    for (const [dayName, dayIndex] of Object.entries(DAY_MAP)) {
      if (hasWords(lower, dayName)) {
        targetDate = nextDay(startOfDay(now), dayIndex);
        explicitDateFound = true;
        break;
      }
    }
  }

  // ─── 4. Détecter l'heure ─────────────────────────────────────────────────────
  // Priorité absolue à une heure explicite (ex: "19h", "19h30", "19:30", "08h15")
  let targetTime = '09:00';
  let explicitTimeFound = false;

  // Format 1 : 14h, 14h30, 9h, 9h15
  const timeHMatch = lower.match(/\b([0-1]?[0-9]|2[0-3])h([0-5][0-9])?\b/i);
  if (timeHMatch) {
    const hours = timeHMatch[1].padStart(2, '0');
    const mins = (timeHMatch[2] || '00').padStart(2, '0');
    targetTime = `${hours}:${mins}`;
    explicitTimeFound = true;
  } else {
    // Format 2 : 14:30, 09:00, 9:30
    const timeColonMatch = lower.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/);
    if (timeColonMatch) {
      const hours = timeColonMatch[1].padStart(2, '0');
      const mins = timeColonMatch[2].padStart(2, '0');
      targetTime = `${hours}:${mins}`;
      explicitTimeFound = true;
    }
  }

  // Raccourcis flous appliqués UNIQUEMENT si aucune heure explicite n'a été saisie
  if (!explicitTimeFound) {
    if (hasWords(lower, 'ce soir|soir')) {
      targetTime = '20:30';
    } else if (hasWords(lower, 'apr[èe]s[- ]midi|aprem')) {
      // Before "midi", which "après-midi" contains
      targetTime = '15:00';
    } else if (hasWords(lower, 'midi')) {
      targetTime = '12:00';
    } else if (hasWords(lower, 'ce matin|matin')) {
      targetTime = '08:30';
    }
  }

  // ─── 5. Priorité ─────────────────────────────────────────────────────────────
  let priority: ReminderPriority = 'NORMAL';
  if (hasWords(lower, 'urgente?|importante?|critique|asap')) {
    priority = 'URGENT';
  }

  // No day given and the hour already passed today: the next one, rather than a time in the past
  if (!explicitDateFound) {
    const [hours, minutes] = targetTime.split(':').map(Number);
    const at = new Date(targetDate);
    at.setHours(hours, minutes, 0, 0);
    if (at <= now) targetDate = addDays(targetDate, 1);
  }

  return {
    cleanTitle: raw,
    actionType: detectedAction,
    targetPerson: matchedPerson,
    targetDate,
    targetTime,
    priority,
  };
}

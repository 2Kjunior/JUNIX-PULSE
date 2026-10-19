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
  if (/\b(appeler|t[ée]l[ée]phoner|coup de fil)\b/i.test(lower)) {
    detectedAction = 'CALL';
  } else if (/\b(sms|message|[ée]crire un message|whatsapp)\b/i.test(lower)) {
    detectedAction = 'MESSAGE';
  } else if (/\b(mail|email|courriel|envoyer un mail)\b/i.test(lower)) {
    detectedAction = 'EMAIL';
  } else if (/\b(caf[ée]|d[ée]jeuner|d[îi]ner|voir|rencontrer|rdv)\b/i.test(lower)) {
    detectedAction = 'MEET';
  } else if (/\b(faire|acheter|pr[ée]parer|payer|ranger)\b/i.test(lower)) {
    detectedAction = 'TASK';
  }

  // ─── 2. Détecter la personne (avec frontières de mots entiers) ───────────────
  let matchedPerson: Person | undefined;
  for (const p of persons) {
    const fullName = p.displayName.trim();
    if (!fullName) continue;

    const regexFull = new RegExp(`\\b${escapeRegex(fullName)}\\b`, 'i');
    if (regexFull.test(raw)) {
      matchedPerson = p;
      break;
    }

    const firstName = fullName.split(/\s+/)[0];
    if (firstName && firstName.length >= 3) {
      const regexFirst = new RegExp(`\\b${escapeRegex(firstName)}\\b`, 'i');
      if (regexFirst.test(raw)) {
        matchedPerson = p;
        break;
      }
    }
  }

  // ─── 3. Détecter la date (ordre strict : après-demain AVANT demain) ───────────
  let targetDate = startOfDay(now);

  if (/\bapr[èe]s[- ]demain\b/i.test(lower)) {
    // Règle 1 : après-demain en premier absolu car "après-demain" contient "demain"
    targetDate = addDays(startOfDay(now), 2);
  } else if (/\bdemain\b/i.test(lower)) {
    targetDate = addDays(startOfDay(now), 1);
  } else if (/\b(aujourd'?hui|ce soir|ce matin)\b/i.test(lower)) {
    targetDate = startOfDay(now);
  } else {
    // Recherche des jours de la semaine avec frontières de mots
    for (const [dayName, dayIndex] of Object.entries(DAY_MAP)) {
      const dayRegex = new RegExp(`\\b${dayName}\\b`, 'i');
      if (dayRegex.test(lower)) {
        targetDate = nextDay(startOfDay(now), dayIndex);
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
    if (/\b(ce soir|soir)\b/i.test(lower)) {
      targetTime = '20:30';
    } else if (/\bmidi\b/i.test(lower)) {
      targetTime = '12:00';
    } else if (/\b(ce matin|matin)\b/i.test(lower)) {
      targetTime = '08:30';
    }
  }

  // ─── 5. Priorité ─────────────────────────────────────────────────────────────
  let priority: ReminderPriority = 'NORMAL';
  if (/\b(urgent|importante?|critique|asap)\b/i.test(lower)) {
    priority = 'URGENT';
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

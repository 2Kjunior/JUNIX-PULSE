/**
 * Règles métier pures pour le traitement du langage naturel (NLP)
 * de la Capture Rapide (Quick Capture), en français et en anglais.
 *
 * Ces fonctions sont déterministes, isolées de React Native et testables unitairement.
 * Corrige DEF-10 :
 * 1. "après-demain" évalué strictement avant "demain"
 * 2. Heure explicite (19h, 19:30) prioritaire sur les raccourcis flous ("soir", "midi", "matin")
 * 3. Bornes lexicales strictes pour l'heure (évite faux positif sur "chez Paul 2 personnes")
 * 4. Frontières de mots entiers pour la recherche de contacts (évite que "Marc" matche "Marcher")
 *
 * Comprend aussi : "dans 2 heures", "in 3 days", "la semaine prochaine", "le 12", "12/11",
 * "12 novembre", "tous les lundis", "every day"... et propose une tâche plutôt qu'un rappel
 * quand la phrase décrit une chose à faire sans heure.
 */

import { addDays, addHours, addMinutes, addMonths, nextDay, nextMonday, startOfDay, startOfMonth } from 'date-fns';
import { ActionType, ReminderPriority } from '../enums';
import { Person, RecurrenceRule } from '../entities';

export type CaptureKind = 'reminder' | 'task';
export type CaptureLanguage = 'fr' | 'en';
export type CaptureRecurrence = Omit<RecurrenceRule, 'id'>;

export interface ParsedQuickCapture {
  cleanTitle: string;
  actionType: ActionType;
  targetPerson?: Person;
  targetDate: Date;
  targetTime: string; // 'HH:mm'
  priority: ReminderPriority;
  /** A task when the text describes something to do without an hour, a reminder otherwise. */
  kind: CaptureKind;
  /** "tous les lundis", "every day"...: the reminder repeats. */
  recurrence?: CaptureRecurrence;
}

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const WEEKDAYS: readonly { pattern: string; day: Weekday }[] = [
  { pattern: 'dimanches?|sundays?', day: 0 },
  { pattern: 'lundis?|mondays?', day: 1 },
  { pattern: 'mardis?|tuesdays?', day: 2 },
  { pattern: 'mercredis?|wednesdays?', day: 3 },
  { pattern: 'jeudis?|thursdays?', day: 4 },
  { pattern: 'vendredis?|fridays?', day: 5 },
  { pattern: 'samedis?|saturdays?', day: 6 },
];

const MONTHS: readonly { pattern: string; month: number }[] = [
  { pattern: 'janvier|janv|january|jan', month: 0 },
  { pattern: 'f[ée]vrier|f[ée]vr|february|feb', month: 1 },
  { pattern: 'mars|march|mar', month: 2 },
  { pattern: 'avril|avr|april|apr', month: 3 },
  { pattern: 'mai|may', month: 4 },
  { pattern: 'juin|june|jun', month: 5 },
  { pattern: 'juillet|juil|july|jul', month: 6 },
  { pattern: 'ao[ûu]t|august|aug', month: 7 },
  { pattern: 'septembre|sept|september|sep', month: 8 },
  { pattern: 'octobre|oct|october', month: 9 },
  { pattern: 'novembre|nov|november', month: 10 },
  { pattern: 'd[ée]cembre|d[ée]c|december|dec', month: 11 },
];

const MONTH_PATTERN = MONTHS.map(month => month.pattern).join('|');

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Letters of French words, accents included: \b of JavaScript sees "é" as a separator, so
// "café" or "André" never matched with it
const WORD_CHARS = 'A-Za-z0-9_À-ÖØ-öø-ÿŒœ';

function wordsRegex(pattern: string, flags = 'i'): RegExp {
  return new RegExp(`(?:^|[^${WORD_CHARS}])(?:${pattern})(?![${WORD_CHARS}])`, flags);
}

/** The pattern as whole words: neither preceded nor followed by a letter, accented or not. */
function hasWords(text: string, pattern: string): boolean {
  return wordsRegex(pattern).test(text);
}

/** The groups of the first match of the pattern as whole words, or null. */
function matchWords(text: string, pattern: string): RegExpMatchArray | null {
  return text.match(wordsRegex(pattern));
}

function toTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function numberOf(word: string): number {
  if (/^(une?|an|a|one)$/i.test(word)) return 1;
  return Number(word);
}

function monthOf(word: string): number | null {
  return MONTHS.find(month => new RegExp(`^(?:${month.pattern})$`, 'i').test(word))?.month ?? null;
}

/** That day and month, this year, or next year when already past. Null when it does not exist. */
function upcomingDate(day: number, month: number, year: number | null, now: Date): Date | null {
  const date = new Date(year ?? now.getFullYear(), month, day);
  if (date.getMonth() !== month || date.getDate() !== day) return null;
  if (year === null && date < startOfDay(now)) date.setFullYear(date.getFullYear() + 1);
  return date;
}

function detectAction(lower: string): ActionType {
  if (hasWords(lower, 'appeler|rappeler|relancer|recontacter|t[ée]l[ée]phoner|coup de fil|call|call back|phone|ring|follow up')) {
    return 'CALL';
  }
  if (hasWords(lower, 'sms|message|[ée]crire un message|whatsapp|texter|text')) return 'MESSAGE';
  if (hasWords(lower, 'mail|e-?mail|courriel|envoyer un mail')) return 'EMAIL';
  if (hasWords(lower, 'caf[ée]|d[ée]jeuner|d[îi]ner|voir|rencontrer|rdv|coffee|lunch|dinner|meet|see')) {
    return 'MEET';
  }
  if (hasWords(lower, 'faire|acheter|pr[ée]parer|payer|ranger|nettoyer|buy|do|prepare|pay|clean|tidy')) {
    return 'TASK';
  }
  return 'NONE';
}

function detectPerson(raw: string, persons: Person[]): Person | undefined {
  for (const person of persons) {
    const fullName = person.displayName.trim();
    if (!fullName) continue;
    if (hasWords(raw, escapeRegex(fullName))) return person;
    const firstName = fullName.split(/\s+/)[0];
    if (firstName && firstName.length >= 3 && hasWords(raw, escapeRegex(firstName))) return person;
  }
  return undefined;
}

interface Moment {
  date: Date;
  explicitDate: boolean;
  /** An exact instant ("dans 2 heures"): the hour is known too. */
  time?: string;
}

/** "dans 2 heures", "in 30 min", "dans 3 jours", "in a week"... */
function relativeMoment(lower: string, now: Date): Moment | null {
  const amount = '(\\d+|une?|an|a|one)';
  const halfHour = matchWords(lower, "dans une demi[- ]heure|in half an hour");
  if (halfHour) {
    const at = addMinutes(now, 30);
    return { date: startOfDay(at), explicitDate: true, time: toTime(at) };
  }
  const minutes = matchWords(lower, `(?:dans|in) ${amount} ?(?:minutes?|mins?|mn)`);
  if (minutes) {
    const at = addMinutes(now, numberOf(minutes[1]));
    return { date: startOfDay(at), explicitDate: true, time: toTime(at) };
  }
  const hours = matchWords(lower, `(?:dans|in) ${amount} ?(?:heures?|hours?|hrs?|h)`);
  if (hours) {
    const at = addHours(now, numberOf(hours[1]));
    return { date: startOfDay(at), explicitDate: true, time: toTime(at) };
  }
  const days = matchWords(lower, `(?:dans|in) ${amount} ?(?:jours?|days?)`);
  if (days) return { date: addDays(startOfDay(now), numberOf(days[1])), explicitDate: true };
  const weeks = matchWords(lower, `(?:dans|in) ${amount} ?(?:semaines?|weeks?)`);
  if (weeks) return { date: addDays(startOfDay(now), 7 * numberOf(weeks[1])), explicitDate: true };
  if (hasWords(lower, 'la semaine prochaine|semaine prochaine|next week')) {
    return { date: nextMonday(startOfDay(now)), explicitDate: true };
  }
  if (hasWords(lower, 'le mois prochain|mois prochain|next month')) {
    return { date: addMonths(startOfMonth(now), 1), explicitDate: true };
  }
  return null;
}

/** "12/11", "12/11/2026", "12 novembre", "november 12", "le 12", "on the 12th". */
function calendarDate(lower: string, now: Date, language: CaptureLanguage): Date | null {
  const numeric = lower.match(/(?:^|[^\d/:])(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?![\d/:])/);
  if (numeric) {
    const [first, second] = [Number(numeric[1]), Number(numeric[2])];
    const [day, month] = language === 'en' ? [second, first] : [first, second];
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : null;
    const date = upcomingDate(day, month - 1, year, now);
    if (date) return date;
  }
  const dayMonth = matchWords(lower, `(\\d{1,2})(?:er|st|nd|rd|th)? (${MONTH_PATTERN})\\.?`);
  if (dayMonth) {
    const month = monthOf(dayMonth[2]);
    const date = month === null ? null : upcomingDate(Number(dayMonth[1]), month, null, now);
    if (date) return date;
  }
  const monthDay = matchWords(lower, `(${MONTH_PATTERN})\\.? (\\d{1,2})(?:st|nd|rd|th)?`);
  if (monthDay) {
    const month = monthOf(monthDay[1]);
    const date = month === null ? null : upcomingDate(Number(monthDay[2]), month, null, now);
    if (date) return date;
  }
  const dayOnly = matchWords(lower, '(?:le|on the) (\\d{1,2})(?:er|st|nd|rd|th)?');
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    for (let offset = 0; offset < 12; offset++) {
      const month = addMonths(startOfMonth(now), offset);
      const date = upcomingDate(day, month.getMonth(), month.getFullYear(), now);
      if (date && date >= startOfDay(now)) return date;
    }
  }
  return null;
}

function namedDay(lower: string, now: Date, weekdaysRepeat: boolean): Moment | null {
  // Règle 1 : après-demain en premier absolu car "après-demain" contient "demain"
  if (hasWords(lower, 'apr[èe]s[- ]demain|the day after tomorrow|day after tomorrow')) {
    return { date: addDays(startOfDay(now), 2), explicitDate: true };
  }
  if (hasWords(lower, 'demain|tomorrow')) return { date: addDays(startOfDay(now), 1), explicitDate: true };
  if (hasWords(lower, "aujourd'?hui|ce soir|ce matin|cet apr[èe]s[- ]midi|today|tonight|this (?:morning|afternoon|evening)")) {
    return { date: startOfDay(now), explicitDate: true };
  }
  // The days of "tous les lundis" are the repetition, not a date
  if (weekdaysRepeat) return null;
  for (const { pattern, day } of WEEKDAYS) {
    if (hasWords(lower, pattern)) return { date: nextDay(startOfDay(now), day), explicitDate: true };
  }
  return null;
}

/** An hour given in the text: "19h", "19h30", "19:30", "6pm", "6:30 pm", "noon". */
function explicitTime(lower: string): string | null {
  const meridiem = lower.match(/(?:^|[^\d:])(1[0-2]|0?[1-9])(?::([0-5][0-9]))? ?(am|pm)(?![a-z])/i);
  if (meridiem) {
    let hours = Number(meridiem[1]) % 12;
    if (meridiem[3].toLowerCase() === 'pm') hours += 12;
    return `${String(hours).padStart(2, '0')}:${meridiem[2] ?? '00'}`;
  }
  // Format 1 : 14h, 14h30, 9h, 9h15
  const hMatch = lower.match(/\b([0-1]?[0-9]|2[0-3])h([0-5][0-9])?\b/i);
  if (hMatch) return `${hMatch[1].padStart(2, '0')}:${(hMatch[2] || '00').padStart(2, '0')}`;
  // Format 2 : 14:30, 09:00, 9:30
  const colonMatch = lower.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/);
  if (colonMatch) return `${colonMatch[1].padStart(2, '0')}:${colonMatch[2]}`;
  if (hasWords(lower, 'noon')) return '12:00';
  if (hasWords(lower, 'minuit|midnight')) return '00:00';
  return null;
}

/** Raccourcis flous, appliqués UNIQUEMENT si aucune heure explicite n'a été saisie. */
function vagueTime(lower: string): string | null {
  if (hasWords(lower, 'ce soir|soir|tonight|evening')) return '20:30';
  // Before "midi", which "après-midi" contains
  if (hasWords(lower, 'apr[èe]s[- ]midi|aprem|afternoon')) return '15:00';
  if (hasWords(lower, 'midi')) return '12:00';
  if (hasWords(lower, 'ce matin|matin|morning')) return '08:30';
  return null;
}

const EVERY = '(?:tous les|toutes les|chaque|every|each)';

function detectRecurrence(lower: string): CaptureRecurrence | undefined {
  const everyDays = matchWords(lower, `(?:tous les|every) (\\d+) (?:jours|days)`);
  if (everyDays && Number(everyDays[1]) > 0) return { type: 'DAILY', interval: Number(everyDays[1]) };
  if (hasWords(lower, `${EVERY} (?:jours?|days?)|quotidiennement|daily`)) return { type: 'DAILY', interval: 1 };
  if (hasWords(lower, 'en semaine|on weekdays|every weekday|weekdays')) {
    return { type: 'WEEKLY', interval: 1, daysOfWeek: [1, 2, 3, 4, 5] };
  }
  if (hasWords(lower, `${EVERY} (?:${WEEKDAYS.map(item => item.pattern).join('|')})`)) {
    // Every day named in the text: "tous les lundis et jeudis"
    const days = WEEKDAYS.filter(item => hasWords(lower, item.pattern)).map(item => item.day);
    return { type: 'WEEKLY', interval: 1, daysOfWeek: days };
  }
  if (hasWords(lower, `${EVERY} (?:semaines?|weeks?)|weekly|hebdomadaire`)) return { type: 'WEEKLY', interval: 1 };
  if (hasWords(lower, `${EVERY} (?:mois|months?)|monthly|mensuel(?:lement)?`)) return { type: 'MONTHLY', interval: 1 };
  return undefined;
}

function atTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const at = new Date(date);
  at.setHours(hours, minutes, 0, 0);
  return at;
}

/**
 * Analyse une saisie textuelle libre et extrait les intentions structurées.
 * Both languages are read at once; `language` only decides how "12/11" is read (day first in
 * French, month first in English).
 */
export function parseQuickCapture(
  input: string,
  persons: Person[] = [],
  now: Date = new Date(),
  language: CaptureLanguage = 'fr'
): ParsedQuickCapture {
  const raw = input.trim();
  if (!raw) {
    return {
      cleanTitle: '',
      actionType: 'NONE',
      targetDate: startOfDay(now),
      targetTime: '09:00',
      priority: 'NORMAL',
      kind: 'reminder',
    };
  }

  const lower = raw.toLowerCase();
  const actionType = detectAction(lower);
  const targetPerson = detectPerson(raw, persons);
  const recurrence = detectRecurrence(lower);

  // Date: a relative moment first ("dans 2 heures" holds a "h" that is not an hour of the day),
  // then a calendar date, then a named day
  const relative = relativeMoment(lower, now);
  const calendar = relative ? null : calendarDate(lower, now, language);
  const moment: Moment =
    relative ?? (calendar ? { date: calendar, explicitDate: true } : namedDay(lower, now, !!recurrence?.daysOfWeek?.length)) ?? {
      date: startOfDay(now),
      explicitDate: false,
    };

  // The relative part is left out of the hour search: "dans 2h" is not 02:00
  const timeText = relative ? lower.replace(/(?:dans|in) \S+ ?(?:heures?|hours?|hrs?|h|minutes?|mins?|mn)/i, ' ') : lower;
  const givenTime = moment.time ?? explicitTime(timeText);
  const targetTime = givenTime ?? vagueTime(lower) ?? '09:00';

  let priority: ReminderPriority = 'NORMAL';
  if (hasWords(lower, 'urgente?|importante?|critique|asap|critical|important')) priority = 'URGENT';

  // A thing to do without an hour nor repetition is a task of the day, not a reminder
  const kind: CaptureKind = actionType === 'TASK' && !givenTime && !recurrence ? 'task' : 'reminder';

  let targetDate = moment.date;
  if (recurrence?.type === 'WEEKLY' && recurrence.daysOfWeek?.length && !moment.explicitDate) {
    // First day of the repetition, today included while its hour is still ahead
    for (let offset = 0; offset < 8; offset++) {
      const candidate = addDays(startOfDay(now), offset);
      if (recurrence.daysOfWeek.includes(candidate.getDay()) && atTime(candidate, targetTime) > now) {
        targetDate = candidate;
        break;
      }
    }
  } else if (!moment.explicitDate && kind === 'reminder' && atTime(targetDate, targetTime) <= now) {
    // No day given and the hour already passed today: the next one, rather than a time in the past
    targetDate = addDays(targetDate, 1);
  }

  const weeklyDays =
    recurrence?.type === 'WEEKLY' && !recurrence.daysOfWeek?.length ? [targetDate.getDay()] : recurrence?.daysOfWeek;
  const fullRecurrence: CaptureRecurrence | undefined = recurrence && {
    ...recurrence,
    ...(recurrence.type === 'WEEKLY' ? { daysOfWeek: weeklyDays } : {}),
    ...(recurrence.type === 'MONTHLY' ? { dayOfMonth: targetDate.getDate() } : {}),
  };

  return {
    cleanTitle: raw,
    actionType,
    targetPerson,
    targetDate,
    targetTime,
    priority,
    kind,
    recurrence: fullRecurrence,
  };
}

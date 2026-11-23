/**
 * "Dictate everything" in the create forms (sheets 013 and 014): one spoken sentence fills and
 * touches every field it speaks of, and the title keeps only what was not understood.
 * It reuses the analysis of the quick capture (capture-rules, unchanged) for the day, the hour,
 * the person, the action and the repetition, and adds: the priority, the deadline, the time to
 * do it, "to confirm", the notes, and for a moment its place and its end. Pure: tested alone.
 */

import { format } from 'date-fns';

import type { ActionType, Person, ReminderPriority } from '../entities';
import { parseQuickCapture, type CaptureLanguage } from './capture-rules';

/** A moment without a said end lasts one hour. */
export const DEFAULT_MOMENT_MINUTES = 60;
/** The choices of "Time to do it" in the form; a said time takes the nearest one. */
export const TASK_LENGTH_CHOICES: readonly number[] = [15, 30, 45, 60, 120];

export type FormRecurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface TodoFill {
  title: string;
  /** 'YYYY-MM-DD', or undefined when no day is said and nothing rings. */
  day?: string;
  alert: boolean;
  time: { hour: number; minute: number };
  priority: ReminderPriority;
  actionType: ActionType;
  personId?: string;
  recurrence?: FormRecurrence;
  confirm: boolean;
  dueDate?: string;
  estimatedMinutes?: number;
  notes?: string;
}

export interface MomentFill {
  title: string;
  start: Date;
  end: Date;
  place?: string;
  personId?: string;
  notes?: string;
}

interface Found<T> {
  value: T;
  /** The words of the sentence it came from, taken out of the title. */
  raw: string;
}

/** The start and the end of a word, accented letters included (\b does not know them). */
const LEAD = String.raw`(?:^|[\s,;])`;
const SEP = String.raw`(?=$|[\s,.;!?])`;

/** An hour of the day is said: "18h", "8:30", "7pm", "ce soir", "dans 2 heures"… */
const CLOCK_TIME =
  /\b\d{1,2}\s*(?:h|:)\s*\d{0,2}(?!\d)|\b\d{1,2}\s*(?:am|pm)\b|(?:^|\s)(?:ce soir|ce matin|cet après-midi|à midi|a midi|tonight|this morning|this evening|at noon)(?=$|[\s,.;!?])|\b(?:dans|in)\s+\d+\s*(?:minutes?|mins?|heures?|h|hours?)\b/i;

/** Today is said, so "Today" is chosen even without an alert. */
const TODAY_WORDS = /(?:^|\s)(?:aujourd'hui|aujourd’hui|ce soir|ce matin|cet après-midi|today|tonight)(?=$|[\s,.;!?])/i;

/** Words that may belong to a date; a run of them is a date only with an anchor below. */
const DATE_WORD =
  /^(?:le|la|du|de|des|ce|cette|on|the|of|prochain|prochaine|matin|soir|après-midi|morning|evening|afternoon|demain|après-demain|apres-demain|aujourd'hui|aujourd’hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|semaine|mois|fin|\d{1,2}(?:er)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}|next|tomorrow|today|week|month|end|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}(?:st|nd|rd|th))$/i;
const DATE_ANCHOR =
  /^(?:demain|après-demain|apres-demain|aujourd'hui|aujourd’hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|semaine|mois|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow|today|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december)$/i;

/** Where a place stops: a day, an hour, a length, or a punctuation mark. */
const PLACE_END = String.raw`(?=\s+(?:demain|après-demain|apres-demain|aujourd|ce\s+(?:soir|matin|midi|week)|cet\s|cette\s|le\s+\d|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|à\s+\d|a\s+\d|vers\s+\d|de\s+\d|pendant|durant|jusqu|dans\s+\d|tous|toutes|tomorrow|today|tonight|this\s|on\s|at\s+\d|from\s+\d|for\s+\d|until|next|every|in\s+\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\s*[,.;!?]|\s*$)`;

const PLACE_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`\b(chez\s+[^,.;!?]+?)` + PLACE_END, 'i'),
  new RegExp(String.raw`(?:^|\s)(?:à|a)\s+((?:la\s+|l['’])[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
  new RegExp(String.raw`(?:^|\s)((?:au|aux)\s+[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
  new RegExp(String.raw`\bat\s+(?!noon\b|midnight\b|night\b)((?:the\s+)?[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
];

/** Checked in this order: "pas urgent" is low before "urgent" is urgent, "assez urgent" is high. */
const PRIORITY_PATTERNS: readonly [ReminderPriority, RegExp][] = [
  ['LOW', new RegExp(LEAD + String.raw`(pas\s+(?:très\s+|trop\s+|si\s+)?(?:urgente?|pressée?|importante?)|priorité\s+(?:basse|faible)|(?:basse|faible)\s+priorité|quand\s+j['’]ai\s+le\s+temps|not\s+urgent|low\s+priority|no\s+rush)` + SEP, 'i')],
  ['HIGH', new RegExp(LEAD + String.raw`(assez\s+urgente?|priorité\s+(?:haute|élevée)|haute\s+priorité|high\s+priority)` + SEP, 'i')],
  ['URGENT', new RegExp(LEAD + String.raw`((?:(?:situation|c['’]est)\s+)?(?:(?:très|tres)\s+)*urgente?|urgentissime|critique|priorité\s+(?:max(?:imale|imum)?|absolue)|(?:top|max(?:imum)?)\s+priority|very\s+urgent|asap)` + SEP, 'i')],
  ['HIGH', new RegExp(LEAD + String.raw`(importante?)` + SEP, 'i')],
];

const NOTES = new RegExp(LEAD + String.raw`(?:note|notes|remarque|précision|precision)(?:\s*:\s*|\s+que\s+)(.+)$`, 'i');
const DEADLINE_KEY = new RegExp(LEAD + String.raw`(?:au\s+plus\s+tard|avant|deadline|échéance|echeance|due|before|by)\s+`, 'gi');
const TASK_LENGTH = new RegExp(
  LEAD +
    String.raw`(?:(?:ça|ca|cela)\s+)?(?:me\s+)?(?:prend(?:ra)?|durée(?:\s+de)?|duree(?:\s+de)?|it\s+takes|takes)\s+(?:environ\s+|about\s+|around\s+)?(\d+)\s*(h|heures?|hours?|min|mins|minutes?)\s*(\d{2})?` +
    SEP,
  'i'
);
const CONFIRM = new RegExp(
  LEAD + String.raw`(à\s+confirmer|a\s+confirmer|insiste|insister|relance(?:-moi)?|jusqu['’]à\s+ce\s+que\s+je\s+confirme|keep\s+reminding(?:\s+me)?|until\s+i\s+confirm|insist)` + SEP,
  'i'
);
const RECURRENCE_WORDS = new RegExp(LEAD + String.raw`(?:tous\s+les|toutes\s+les|chaque|every)\s+\S+(?:\s+(?:matins?|soirs?|jours?|semaines?|mois))?` + SEP, 'gi');
const LENGTH_WORDS = /\b(?:pendant|durant|for)\s+\d+\s*(?:h|heures?|hours?|hrs?|min|mins|minutes?)\s*\d{0,2}/gi;
const UNTIL_WORDS = /\b(?:jusqu['’]?\s*(?:à|a)|until)\s+\d{1,2}(?:\s*(?:h|:)\s*\d{0,2}|\s*(?:am|pm))?/gi;
const TIME_WORDS: readonly RegExp[] = [
  /(?:^|\s)(?:(?:à|a|vers|at|around)\s+)?\d{1,2}\s*(?:h|:)\s*\d{0,2}(?!\d)/gi,
  /(?:^|\s)(?:at\s+)?\d{1,2}\s*(?:am|pm)\b/gi,
  /(?:^|\s)(?:ce\s+soir|ce\s+matin|cet\s+après-midi|à\s+midi|a\s+midi|tonight|this\s+morning|this\s+evening|at\s+noon)(?=$|[\s,.;!?])/gi,
  /(?:^|\s)(?:dans|in)\s+\d+\s*(?:minutes?|mins?|heures?|h|hours?|jours?|days?|semaines?|weeks?)(?=$|[\s,.;!?])/gi,
];
const TRAILING_LINKS = /[\s,;:–-]+(?:le|la|les|à|a|au|aux|et|de|du|pour|on|at|the|and|in|of|avec)?[\s,;:.!?–-]*$/i;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function findPlace(sentence: string): Found<string> | undefined {
  for (const pattern of PLACE_PATTERNS) {
    const match = pattern.exec(sentence);
    const place = match?.[1]?.trim();
    if (match && place) return { value: capitalize(place), raw: match[0] };
  }
  return undefined;
}

/** The place said in a sentence, with a capital letter, or undefined. */
export function placeOf(sentence: string): string | undefined {
  return findPlace(sentence)?.value;
}

/** The priority said, or undefined: the form then keeps Normal. */
export function priorityOf(sentence: string): Found<ReminderPriority> | undefined {
  for (const [value, pattern] of PRIORITY_PATTERNS) {
    const match = pattern.exec(sentence);
    if (match) return { value, raw: match[0] };
  }
  return undefined;
}

function notesOf(sentence: string): Found<string> | undefined {
  const match = NOTES.exec(sentence);
  const notes = match?.[1]?.trim();
  return match && notes ? { value: capitalize(notes), raw: match[0] } : undefined;
}

function taskLengthOf(sentence: string): Found<number> | undefined {
  const match = TASK_LENGTH.exec(sentence);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const minutes = match[2].toLowerCase().startsWith('h') ? amount * 60 + Number(match[3] ?? 0) : amount;
  if (minutes <= 0) return undefined;
  const nearest = TASK_LENGTH_CHOICES.reduce((best, choice) => (Math.abs(choice - minutes) < Math.abs(best - minutes) ? choice : best));
  return { value: nearest, raw: match[0] };
}

function confirmOf(sentence: string): Found<boolean> | undefined {
  const match = CONFIRM.exec(sentence);
  return match ? { value: true, raw: match[0] } : undefined;
}

/** "avant vendredi", "au plus tard le 12 décembre", "due tomorrow": a deadline, when what follows is a date. */
function deadlineOf(sentence: string, now: Date, language: CaptureLanguage): Found<string> | undefined {
  for (const match of sentence.matchAll(DEADLINE_KEY)) {
    const rest = sentence.slice((match.index ?? 0) + match[0].length).split(/\s+/);
    const taken: string[] = [];
    for (const word of rest) {
      const bare = word.replace(/[,.;!?]+$/, '');
      if (!DATE_WORD.test(bare)) break;
      taken.push(word);
      if (bare !== word) break;
    }
    if (!taken.some(word => DATE_ANCHOR.test(word.replace(/[,.;!?]+$/, '')))) continue;
    const phrase = taken.join(' ').replace(/[,.;!?]+$/, '');
    const due = format(parseQuickCapture(phrase, [], now, language).targetDate, 'yyyy-MM-dd');
    if (due !== format(now, 'yyyy-MM-dd') || TODAY_WORDS.test(phrase)) {
      return { value: due, raw: match[0] + taken.join(' ') };
    }
  }
  return undefined;
}

/** The end of a moment: a length or an end hour said, else one hour after the start. */
export function endOf(sentence: string, start: Date): Date {
  const lower = sentence.toLowerCase();
  const length = /\b(?:pendant|durant|for)\s+(\d+)\s*(h|heures?|hours?|hrs?|min|mins|minutes?)\s*(\d{1,2})?\b/.exec(lower);
  if (length) {
    const amount = Number(length[1]);
    const minutes = length[2].startsWith('h') ? amount * 60 + Number(length[3] ?? 0) : amount;
    if (minutes > 0) return new Date(start.getTime() + minutes * 60000);
  }
  const untilFr = /\bjusqu['’]?\s*(?:à|a)\s+(\d{1,2})\s*(?:h|:)\s*(\d{2})?/.exec(lower);
  const untilEn = /\buntil\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/.exec(lower);
  const until = untilFr ?? untilEn;
  if (until) {
    let hour = Number(until[1]);
    if (untilEn && until === untilEn && until[3] === 'pm' && hour < 12) hour += 12;
    const end = new Date(start);
    end.setHours(hour, Number(until[2] ?? 0), 0, 0);
    if (end > start) return end;
  }
  return new Date(start.getTime() + DEFAULT_MOMENT_MINUTES * 60000);
}

/** Takes out the runs of date words that hold a real date ("le lundi 30 novembre", "demain"). */
function withoutDates(text: string): string {
  const kept: string[] = [];
  let run: string[] = [];
  let anchored = false;
  const flush = () => {
    if (!anchored) kept.push(...run);
    run = [];
    anchored = false;
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const bare = word.replace(/[,.;!?]+$/, '');
    if (DATE_WORD.test(bare)) {
      run.push(word);
      if (DATE_ANCHOR.test(bare)) anchored = true;
      if (bare !== word) flush();
    } else {
      flush();
      kept.push(word);
    }
  }
  flush();
  return kept.join(' ');
}

/**
 * A day is really said: a day or month name, "demain", "le 12", "dans 3 jours", today. The quick capture
 * proposes tomorrow on its own once 9:00 has passed: that is not a day said.
 */
function saysADay(text: string): boolean {
  if (TODAY_WORDS.test(text) || /(?:^|\s)(?:le|on|the)\s+\d{1,2}(?:er|st|nd|rd|th)?(?=$|[\s,.;!?])/i.test(text)) return true;
  if (/(?:^|\s)(?:dans|in)\s+\d+\s*(?:jours?|days?|semaines?|weeks?|mois|months?)(?=$|[\s,.;!?])/i.test(text)) return true;
  return text.split(/\s+/).some(word => DATE_ANCHOR.test(word.replace(/[,.;!?]+$/, '')));
}

/** The title: the sentence without what was understood; the whole sentence if nothing is left. */
export function titleWithout(sentence: string, understood: readonly string[], extra: readonly RegExp[] = []): string {
  let text = ` ${sentence} `;
  for (const raw of understood) if (raw) text = text.replace(raw, ' ');
  for (const pattern of [RECURRENCE_WORDS, ...extra, ...TIME_WORDS]) text = text.replace(pattern, ' ');
  text = withoutDates(text.replace(/\s+/g, ' '));
  let previous = '';
  while (previous !== text) {
    previous = text;
    text = text.replace(TRAILING_LINKS, '').replace(/^[\s,;:.!?–-]+/, '');
  }
  return text ? capitalize(text) : sentence.trim();
}

function formRecurrence(type?: string): FormRecurrence | undefined {
  return type === 'DAILY' || type === 'WEEKLY' || type === 'MONTHLY' ? type : undefined;
}

function clockOf(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

function without(sentence: string, parts: readonly (Found<unknown> | undefined)[]): string {
  return parts.reduce((text, part) => (part ? text.replace(part.raw, ' ') : text), sentence);
}

export function todoFromSentence(
  sentence: string,
  persons: readonly Person[],
  now: Date,
  language: CaptureLanguage = 'fr'
): TodoFill {
  const notes = notesOf(sentence);
  const deadline = deadlineOf(without(sentence, [notes]), now, language);
  const length = taskLengthOf(sentence);
  // The day, the hour and the repetition are read without the deadline, the length and the notes
  const rest = without(sentence, [notes, deadline, length]);
  const parsed = parseQuickCapture(rest, [...persons], now, language);
  const recurrence = formRecurrence(parsed.recurrence?.type);
  const alert = CLOCK_TIME.test(rest) || Boolean(recurrence);
  const day = format(parsed.targetDate, 'yyyy-MM-dd');
  const daySaid = saysADay(rest);
  const priority = priorityOf(rest);
  const confirm = confirmOf(rest);
  return {
    title: titleWithout(sentence, [notes, deadline, length, priority, confirm].map(part => part?.raw ?? '')),
    day: alert || daySaid ? day : undefined,
    alert,
    time: clockOf(parsed.targetTime),
    priority: priority?.value ?? 'NORMAL',
    actionType: parsed.actionType,
    personId: parsed.targetPerson?.id,
    recurrence,
    confirm: Boolean(confirm),
    dueDate: deadline?.value,
    estimatedMinutes: length?.value,
    notes: notes?.value,
  };
}

export function momentFromSentence(
  sentence: string,
  persons: readonly Person[],
  now: Date,
  language: CaptureLanguage = 'fr'
): MomentFill {
  const notes = notesOf(sentence);
  const place = findPlace(without(sentence, [notes]));
  // The start is read without the length ("pendant 2h" is not 02:00) and without the notes
  const rest = without(sentence, [notes]).replace(LENGTH_WORDS, ' ').replace(UNTIL_WORDS, ' ');
  const parsed = parseQuickCapture(rest, [...persons], now, language);
  const { hour, minute } = clockOf(parsed.targetTime);
  const start = new Date(parsed.targetDate);
  start.setHours(hour, minute, 0, 0);
  return {
    title: titleWithout(sentence, [notes?.raw ?? '', place?.raw ?? '', priorityOf(sentence)?.raw ?? ''], [LENGTH_WORDS, UNTIL_WORDS]),
    start,
    end: endOf(without(sentence, [notes]), start),
    place: place?.value,
    personId: parsed.targetPerson?.id,
    notes: notes?.value,
  };
}

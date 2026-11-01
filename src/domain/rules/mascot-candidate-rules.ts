/**
 * Pure rules deciding which proposals the mascot may make, and reconciling them with the
 * suggestions already stored.
 *
 * From the facts of the day they build the candidates: P1 to P7, P10, P11 and P12 (P3 only once
 * the evening has come). Reconciliation then creates the new ones and expires the pending ones
 * that stopped being true. A suggestion the user just decided is not made again the same day.
 * Candidates come in priority order, most pressing first.
 */

import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

import { EventType, SuggestionType, TaskStatus } from '../enums';
import { daysSinceLastInteraction, isPersonForgotten } from './person-rules';
import { formatFrenchTime } from './mascot-suggestion-rules';

// ─── Thresholds (decisions 3 to 6 of the reference document) ─────────────────────────────────

export const OVERLOADED_DAY_THRESHOLD = 8;
export const LINGERING_TASK_DAYS = 14;
export const GOAL_WARNING_DAYS = 7;
export const WELCOME_BACK_DAYS = 3;
export const BIRTHDAY_WARNING_DAYS = 3;
export const STREAK_ALERT_LATEST_HOUR = 18;
export const STREAK_ALERT_LEAD_HOURS = 2;
export const DECISION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ─── Facts and candidates ───────────────────────────────────────────────────────────────────

export interface CandidatePerson {
  id: string;
  displayName: string;
  birthDate?: string | null; // YYYY-MM-DD
  lastInteractionAt?: string;
  forgottenThresholdDays: number;
}

export interface CandidateReminder {
  id: string;
  title: string;
  scheduledAt: string;
}

export interface CandidateHabit {
  id: string;
  title: string;
  active: boolean;
  currentStreak: number;
  completedToday: boolean;
}

export interface CandidateTask {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
}

export interface CandidateEvent {
  id: string;
  startAt: string;
  endAt: string;
  type: EventType;
}

export interface CandidateGoal {
  id: string;
  title: string;
  active: boolean;
  daysLeft: number | null;
  progress: number | null;
}

export interface CandidateFacts {
  now: Date;
  endOfDayHour: number;
  persons: readonly CandidatePerson[];
  missedReminders: readonly CandidateReminder[];
  habits: readonly CandidateHabit[];
  /** Tasks scheduled for today, done or not. */
  todayTasks: readonly CandidateTask[];
  /** Inbox tasks: no date, not done. */
  inboxTasks: readonly CandidateTask[];
  /** Events, reminders and tasks planned for tomorrow, counted together. */
  tomorrowItemCount: number;
  tomorrowEvents: readonly CandidateEvent[];
  goals: readonly CandidateGoal[];
  daysSinceLastOpen: number | null;
  /** Reminders that are due or missed and still wait for the user. */
  waitingReminderCount: number;
}

export interface SuggestionCandidate {
  type: SuggestionType;
  targetId: string;
  targetType: string;
  title: string;
  explanation: string;
  proposedData: string;
  expiresAt?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────────────

/** Days until the next birthday: 0 today, null when the date is unreadable. */
export function daysUntilBirthday(birthDate: string | null | undefined, now: Date): number | null {
  if (!birthDate) return null;
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(birthDate.trim());
  if (!match) return null;
  const month = Number(match[1]) - 1;
  const day = Number(match[2]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  const today = startOfDay(now);
  const occurrence = (year: number): Date => {
    // 29 February in a year without one falls on the 28th
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  };

  let next = occurrence(today.getFullYear());
  if (next < today) next = occurrence(today.getFullYear() + 1);
  return differenceInCalendarDays(next, today);
}

/** Hour from which a streak at risk is worth mentioning: 18 h, or 2 h before the evening review. */
export function streakAlertHour(endOfDayHour: number): number {
  return Math.max(0, Math.min(STREAK_ALERT_LATEST_HOUR, endOfDayHour - STREAK_ALERT_LEAD_HOURS));
}

function endOfToday(now: Date): string {
  return addDays(startOfDay(now), 1).toISOString();
}

function dayKey(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function overlaps(a: CandidateEvent, b: CandidateEvent): boolean {
  const aStart = new Date(a.startAt).getTime();
  const aEnd = new Date(a.endAt).getTime();
  const bStart = new Date(b.startAt).getTime();
  const bEnd = new Date(b.endAt).getTime();
  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;
  return aStart < bEnd && bStart < aEnd;
}

/** The first pair of busy events that overlap, or null. */
export function findBusyConflict(
  events: readonly CandidateEvent[]
): { first: CandidateEvent; second: CandidateEvent } | null {
  const busy = events
    .filter(event => event.type === 'BUSY')
    .slice()
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  for (let i = 0; i < busy.length; i += 1) {
    for (let j = i + 1; j < busy.length; j += 1) {
      if (overlaps(busy[i], busy[j])) return { first: busy[i], second: busy[j] };
    }
  }
  return null;
}

// ─── Candidates ─────────────────────────────────────────────────────────────────────────────

export function buildSuggestionCandidates(facts: CandidateFacts): SuggestionCandidate[] {
  const { now } = facts;
  const hour = now.getHours();
  const today = dayKey(now);
  const candidates: SuggestionCandidate[] = [];

  // P2: a missed reminder to move
  for (const reminder of facts.missedReminders) {
    candidates.push({
      type: 'RESCHEDULE_REMINDER',
      targetId: reminder.id,
      targetType: 'reminder',
      title: `Replanifier le rappel "${reminder.title}"`,
      explanation: "Ce rappel n'a pas été validé à l'heure prévue. Voulez-vous le reporter à demain même heure ?",
      proposedData: JSON.stringify({ title: reminder.title, time: formatFrenchTime(new Date(reminder.scheduledAt)) }),
    });
  }

  // P7: two busy events that overlap tomorrow
  const conflict = findBusyConflict(facts.tomorrowEvents);
  if (conflict) {
    const laterStart = Math.max(new Date(conflict.first.startAt).getTime(), new Date(conflict.second.startAt).getTime());
    candidates.push({
      type: 'PLANNING_CONFLICT',
      targetId: `${conflict.first.id}:${conflict.second.id}`,
      targetType: 'event',
      title: 'Deux événements se chevauchent demain',
      explanation: "Deux événements « occupé » se chevauchent demain. Voulez-vous les consulter ?",
      proposedData: JSON.stringify({ time: formatFrenchTime(new Date(laterStart)) }),
    });
  }

  // P3: a streak at risk, only from the evening on
  if (hour >= streakAlertHour(facts.endOfDayHour)) {
    for (const habit of facts.habits) {
      if (habit.active && !habit.completedToday && habit.currentStreak > 0) {
        candidates.push({
          type: 'HABIT_REMINDER',
          targetId: habit.id,
          targetType: 'habit',
          title: `Maintenir la série sur "${habit.title}"`,
          explanation: `Vous avez actuellement une série de ${habit.currentStreak} jours. N'oubliez pas de la valider aujourd'hui !`,
          proposedData: JSON.stringify({ title: habit.title, streak: habit.currentStreak }),
          expiresAt: endOfToday(now),
        });
      }
    }
  }

  // P4: a birthday three days away, then the day itself
  for (const person of facts.persons) {
    const days = daysUntilBirthday(person.birthDate, now);
    if (days === null || (days !== 0 && days !== BIRTHDAY_WARNING_DAYS)) continue;
    candidates.push({
      type: 'BIRTHDAY_REMINDER',
      targetId: `${person.id}:${days}`,
      targetType: 'person',
      title: days === 0 ? `Anniversaire de ${person.displayName} aujourd'hui` : `Anniversaire de ${person.displayName} dans ${days} jours`,
      explanation: `${person.displayName} fête son anniversaire ${days === 0 ? "aujourd'hui" : `dans ${days} jours`}.`,
      proposedData: JSON.stringify({ person: person.displayName, days, personId: person.id }),
    });
  }

  // P1: a person who has not heard from the user for too long
  for (const person of facts.persons) {
    if (!isPersonForgotten(person, now)) continue;
    const days = daysSinceLastInteraction(person.lastInteractionAt, now) ?? person.forgottenThresholdDays;
    candidates.push({
      type: 'FORGOTTEN_CONTACT',
      targetId: person.id,
      targetType: 'person',
      title: `Prendre des nouvelles de ${person.displayName}`,
      explanation: `Vous n'avez pas interagi avec ${person.displayName} depuis plus de ${person.forgottenThresholdDays} jours.`,
      proposedData: JSON.stringify({ person: person.displayName, days }),
    });
  }

  // P10: a goal due within a week
  for (const goal of facts.goals) {
    if (!goal.active || goal.daysLeft === null) continue;
    if (goal.daysLeft < 1 || goal.daysLeft > GOAL_WARNING_DAYS) continue;
    candidates.push({
      type: 'GOAL_APPROACHING',
      targetId: goal.id,
      targetType: 'goal',
      title: `L'objectif "${goal.title}" approche`,
      explanation: `Échéance dans ${goal.daysLeft} jours.`,
      proposedData: JSON.stringify({ goal: goal.title, days: goal.daysLeft, percent: Math.round(goal.progress ?? 0) }),
    });
  }

  // P5: today's unfinished tasks, from the evening review hour
  const unfinished = facts.todayTasks.filter(task => task.status !== 'COMPLETED');
  if (hour >= facts.endOfDayHour && unfinished.length > 0) {
    candidates.push({
      type: 'POSTPONE_TASK',
      targetId: `tasks:${today}`,
      targetType: 'task',
      title: `Décaler ${unfinished.length} tâche(s) à demain`,
      explanation: "Ces tâches d'aujourd'hui ne sont pas terminées. Voulez-vous les décaler à demain ?",
      proposedData: JSON.stringify({ count: unfinished.length, taskIds: unfinished.map(task => task.id) }),
      expiresAt: endOfToday(now),
    });
  }

  // P6: a very full tomorrow
  if (facts.tomorrowItemCount >= OVERLOADED_DAY_THRESHOLD) {
    candidates.push({
      type: 'OVERLOADED_DAY',
      targetId: `tomorrow:${today}`,
      targetType: 'day',
      title: 'Demain est très chargé',
      explanation: `${facts.tomorrowItemCount} éléments sont prévus demain.`,
      proposedData: JSON.stringify({ count: facts.tomorrowItemCount }),
      expiresAt: endOfToday(now),
    });
  }

  // P11: the oldest Inbox task that has lingered too long
  const lingering = facts.inboxTasks
    .map(task => ({ task, days: differenceInCalendarDays(startOfDay(now), startOfDay(parseISO(task.createdAt))) }))
    .filter(entry => Number.isFinite(entry.days) && entry.days >= LINGERING_TASK_DAYS)
    .sort((a, b) => b.days - a.days)[0];
  if (lingering) {
    candidates.push({
      type: 'LINGERING_TASK',
      targetId: lingering.task.id,
      targetType: 'task',
      title: `"${lingering.task.title}" traîne depuis ${lingering.days} jours`,
      explanation: 'Cette tâche attend dans votre Inbox sans date. Voulez-vous la planifier ?',
      proposedData: JSON.stringify({ title: lingering.task.title, days: lingering.days }),
    });
  }

  // P12: back after a few days away, with reminders waiting
  if (
    facts.daysSinceLastOpen !== null &&
    facts.daysSinceLastOpen >= WELCOME_BACK_DAYS &&
    facts.waitingReminderCount > 0
  ) {
    candidates.push({
      type: 'WELCOME_BACK',
      targetId: `welcome:${today}`,
      targetType: 'day',
      title: 'Content de vous revoir',
      explanation: `${facts.waitingReminderCount} rappels vous attendent.`,
      proposedData: JSON.stringify({ count: facts.waitingReminderCount }),
      expiresAt: endOfToday(now),
    });
  }

  return candidates;
}

// ─── Reconciliation with what is stored ──────────────────────────────────────────────────────

export interface StoredSuggestion {
  id: string;
  type: SuggestionType;
  status: string;
  targetId?: string | null;
  expiresAt?: string | null;
  decidedAt?: string | null;
}

export interface Reconciliation {
  toCreate: SuggestionCandidate[];
  /** Ids of pending suggestions that are no longer true, or whose time is up. */
  toExpire: string[];
}

const keyOf = (type: SuggestionType, targetId: string | null | undefined) => `${type}:${targetId ?? ''}`;

export function reconcileSuggestions(params: {
  candidates: readonly SuggestionCandidate[];
  pending: readonly StoredSuggestion[];
  decided: readonly StoredSuggestion[];
  now: Date;
}): Reconciliation {
  const { candidates, pending, decided, now } = params;

  const candidateKeys = new Set(candidates.map(candidate => keyOf(candidate.type, candidate.targetId)));
  const pendingKeys = new Set(pending.map(item => keyOf(item.type, item.targetId)));

  // What the user decided lately is not offered again straight away
  const decidedKeys = new Set(
    decided
      .filter(item => item.status === 'ACCEPTED' || item.status === 'REFUSED' || item.status === 'MODIFIED')
      .filter(item => {
        if (!item.decidedAt) return false;
        const at = new Date(item.decidedAt).getTime();
        return !Number.isNaN(at) && now.getTime() - at < DECISION_COOLDOWN_MS;
      })
      .map(item => keyOf(item.type, item.targetId))
  );

  const toExpire = pending
    .filter(item => {
      const timeIsUp = item.expiresAt ? new Date(item.expiresAt).getTime() <= now.getTime() : false;
      return timeIsUp || !candidateKeys.has(keyOf(item.type, item.targetId));
    })
    .map(item => item.id);

  const toCreate = candidates.filter(candidate => {
    const key = keyOf(candidate.type, candidate.targetId);
    return !pendingKeys.has(key) && !decidedKeys.has(key);
  });

  return { toCreate, toExpire };
}

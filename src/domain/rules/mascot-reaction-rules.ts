/**
 * Pure rules computing how the Pulse mascot reacts to an event.
 * Weight = base + priority + effort or rarity, reduced by habituation on repeated user actions.
 * Deterministic and testable without React or SQLite.
 */

import { ReminderPriority } from '../enums';
import { FocusState } from './focus-rules';
import { isNightHour, MascotMood } from './mascot-mood-rules';
import { MascotPresence } from './mascot-preferences';

export type MascotEvent =
  | { type: 'TASK_COMPLETED'; priority: ReminderPriority; subtaskCount?: number }
  | { type: 'DAY_CLEARED' }
  | { type: 'REMINDER_COMPLETED'; priority: ReminderPriority }
  | { type: 'REMINDER_SNOOZED' }
  | { type: 'REMINDER_ARRIVED'; priority: ReminderPriority }
  | { type: 'REMINDER_MISSED'; priority: ReminderPriority }
  | { type: 'EVENT_APPROACHING'; minutesUntilStart: number }
  | { type: 'HABIT_COMPLETED'; streakDays: number }
  | { type: 'GOAL_COMPLETED' }
  | { type: 'FOCUS_COMPLETED'; durationMinutes: number }
  | { type: 'SUGGESTION_ACCEPTED' }
  | { type: 'SUGGESTION_DISMISSED' }
  | { type: 'ITEM_CREATED' }
  | { type: 'ITEM_DELETED' }
  | { type: 'PERSON_CONTACTED'; wasForgotten: boolean }
  | { type: 'SUBTASK_COMPLETED' }
  | { type: 'BACKUP_DONE' }
  | { type: 'HABIT_RESUMED' };

export type MascotEventType = MascotEvent['type'];
export type MascotReactionLevel = 'micro' | 'small' | 'medium' | 'large';

export const REACTION_BASE_WEIGHTS = {
  TASK_COMPLETED: 0.25,
  DAY_CLEARED: 0.85,
  REMINDER_COMPLETED: 0.28,
  REMINDER_SNOOZED: 0.1,
  HABIT_COMPLETED: 0.15,
  GOAL_COMPLETED: 1,
  FOCUS_COMPLETED: 0.3,
  SUGGESTION_ACCEPTED: 0.3,
  SUGGESTION_DISMISSED: 0.1,
  ITEM_CREATED: 0.12,
  ITEM_DELETED: 0.1,
  PERSON_CONTACTED: 0.3,
  SUBTASK_COMPLETED: 0.1,
  BACKUP_DONE: 0.2,
  HABIT_RESUMED: 0.1,
} as const;

/** Contacting a person who had been forgotten (past their threshold) deserves a stronger reaction. */
export const FORGOTTEN_CONTACT_WEIGHT = 0.5;

export const PRIORITY_BONUS: Record<ReminderPriority, number> = {
  URGENT: 0.25,
  HIGH: 0.15,
  NORMAL: 0.05,
  LOW: 0,
};

export const SUBTASK_BONUS = 0.05;
export const MAX_BONUS_SUBTASKS = 3;
export const FOCUS_BONUS_MAX = 0.5;
export const FOCUS_BONUS_FULL_MINUTES = 60;

export const HABITUATION_FACTOR = 0.75;
export const HABITUATION_WINDOW_MS = 10 * 60 * 1000;
export const REACTION_COOLDOWN_MS = 1500;
export const REACTION_MAX_DURATION_MS = 2500;

export const REACTION_DURATIONS_MS: Record<MascotReactionLevel, number> = {
  micro: 700,
  small: 1100,
  medium: 1700,
  large: 2400,
};

export const REACTION_LEVEL_THRESHOLDS = {
  small: 0.2,
  medium: 0.45,
  large: 0.75,
} as const;

/** Events the user triggers directly. Only these habituate: an incoming alert must stay visible. */
const USER_ACTION_EVENTS: readonly MascotEventType[] = [
  'TASK_COMPLETED',
  'DAY_CLEARED',
  'REMINDER_COMPLETED',
  'REMINDER_SNOOZED',
  'HABIT_COMPLETED',
  'GOAL_COMPLETED',
  'FOCUS_COMPLETED',
  'SUGGESTION_ACCEPTED',
  'SUGGESTION_DISMISSED',
  'ITEM_CREATED',
  'ITEM_DELETED',
  'PERSON_CONTACTED',
  'SUBTASK_COMPLETED',
  'BACKUP_DONE',
  'HABIT_RESUMED',
];

const NEUTRAL_EVENTS: readonly MascotEventType[] = [
  'REMINDER_SNOOZED',
  'SUGGESTION_DISMISSED',
  'ITEM_DELETED',
];

export interface MascotReactionContext {
  now: number; // Epoch milliseconds
  hour: number; // Local hour, 0 to 23
  keyboardOpen: boolean;
  focusState: FocusState;
  history: readonly { type: MascotEventType; at: number }[]; // Previously emitted reactions
  lastReaction: { weight: number; at: number } | null;
  presence?: MascotPresence; // Defaults to 'full'
}

export interface MascotReaction {
  eventType: MascotEventType;
  mood: MascotMood;
  level: MascotReactionLevel;
  weight: number; // 0 to 1, rounded to two decimals
  durationMs: number;
  attentive: boolean; // Calm mood with the attentive pose
}

export function reactionLevelForWeight(weight: number): MascotReactionLevel {
  if (weight >= REACTION_LEVEL_THRESHOLDS.large) return 'large';
  if (weight >= REACTION_LEVEL_THRESHOLDS.medium) return 'medium';
  if (weight >= REACTION_LEVEL_THRESHOLDS.small) return 'small';
  return 'micro';
}

function habitStreakBonus(streakDays: number): number {
  if (streakDays >= 30) return 0.6;
  if (streakDays >= 7) return 0.4;
  if (streakDays >= 3) return 0.15;
  return 0;
}

function focusDurationBonus(durationMinutes: number): number {
  const ratio = Math.max(0, durationMinutes) / FOCUS_BONUS_FULL_MINUTES;
  return Math.min(FOCUS_BONUS_MAX, ratio * FOCUS_BONUS_MAX);
}

/**
 * Raw weight of an event before habituation, or null when it deserves no reaction.
 */
function eventWeight(event: MascotEvent): number | null {
  switch (event.type) {
    case 'TASK_COMPLETED': {
      const subtasks = Math.min(MAX_BONUS_SUBTASKS, Math.max(0, event.subtaskCount ?? 0));
      return (
        REACTION_BASE_WEIGHTS.TASK_COMPLETED +
        PRIORITY_BONUS[event.priority] +
        subtasks * SUBTASK_BONUS
      );
    }
    case 'REMINDER_COMPLETED':
      return REACTION_BASE_WEIGHTS.REMINDER_COMPLETED + PRIORITY_BONUS[event.priority];
    case 'REMINDER_ARRIVED':
      if (event.priority === 'LOW') return null;
      if (event.priority === 'NORMAL') return 0.15;
      return REACTION_BASE_WEIGHTS.REMINDER_COMPLETED + PRIORITY_BONUS[event.priority];
    case 'REMINDER_MISSED':
      if (event.priority === 'LOW') return null;
      return event.priority === 'URGENT' ? 0.3 : 0.15;
    case 'EVENT_APPROACHING':
      return event.minutesUntilStart <= 15 ? 0.3 : 0.15;
    case 'HABIT_COMPLETED':
      return REACTION_BASE_WEIGHTS.HABIT_COMPLETED + habitStreakBonus(event.streakDays);
    case 'FOCUS_COMPLETED':
      return REACTION_BASE_WEIGHTS.FOCUS_COMPLETED + focusDurationBonus(event.durationMinutes);
    case 'PERSON_CONTACTED':
      return event.wasForgotten ? FORGOTTEN_CONTACT_WEIGHT : REACTION_BASE_WEIGHTS.PERSON_CONTACTED;
    default:
      return REACTION_BASE_WEIGHTS[event.type];
  }
}

function isUrgentArrival(event: MascotEvent): boolean {
  return event.type === 'REMINDER_ARRIVED' && event.priority === 'URGENT';
}

function isSuppressed(event: MascotEvent, context: MascotReactionContext): boolean {
  if (context.presence === 'off') return true;
  if (context.keyboardOpen) return true;
  if (
    (context.focusState === 'running' || context.focusState === 'paused') &&
    event.type !== 'FOCUS_COMPLETED'
  ) {
    return true;
  }
  return isNightHour(context.hour) && !isUrgentArrival(event);
}

function habituationFactor(type: MascotEventType, context: MascotReactionContext): number {
  if (!USER_ACTION_EVENTS.includes(type)) return 1;
  const repetitions = context.history.filter(
    entry => entry.type === type && context.now - entry.at < HABITUATION_WINDOW_MS
  ).length;
  return HABITUATION_FACTOR ** repetitions;
}

function reactionMood(event: MascotEvent, level: MascotReactionLevel): { mood: MascotMood; attentive: boolean } {
  if (event.type === 'REMINDER_MISSED' || isUrgentArrival(event)) {
    return { mood: 'alert', attentive: false };
  }
  if (event.type === 'REMINDER_ARRIVED' || event.type === 'EVENT_APPROACHING') {
    return { mood: 'calm', attentive: true };
  }
  if (NEUTRAL_EVENTS.includes(event.type)) {
    return { mood: 'calm', attentive: false };
  }
  return { mood: level === 'large' ? 'party' : 'happy', attentive: false };
}

/**
 * Computes the reaction to an event, or null when it must stay silent.
 * Inside the cooldown only a stronger reaction goes through, so a cleared day
 * replaces the reaction to the task that cleared it.
 */
export function computeMascotReaction(
  event: MascotEvent,
  context: MascotReactionContext
): MascotReaction | null {
  if (isSuppressed(event, context)) return null;

  const rawWeight = eventWeight(event);
  if (rawWeight === null) return null;

  const scaled = rawWeight * habituationFactor(event.type, context);
  const weight = Math.round(Math.min(1, scaled) * 100) / 100;

  const { lastReaction } = context;
  if (
    lastReaction &&
    context.now - lastReaction.at < REACTION_COOLDOWN_MS &&
    weight <= lastReaction.weight
  ) {
    return null;
  }

  const level = reactionLevelForWeight(weight);
  // Discreet presence keeps only the reactions of medium level and above
  if (context.presence === 'discreet' && (level === 'micro' || level === 'small')) return null;

  return {
    eventType: event.type,
    ...reactionMood(event, level),
    level,
    weight,
    durationMs: Math.min(REACTION_MAX_DURATION_MS, REACTION_DURATIONS_MS[level]),
  };
}

/**
 * Pure rules linking the suggestion engine to the mascot's voice.
 * A suggestion carries its message parameters in `proposedData`, so the mascot can phrase it
 * from the catalogue in the user's tu/vous and tone. Older suggestions without those
 * parameters fall back to their stored title.
 */

import { SuggestionType } from '../enums';
import { MascotMessageId } from './mascot-message-catalog';
import { MascotMessageParams } from './mascot-message-rules';
import { MascotMood } from './mascot-mood-rules';
import { MascotProposalId } from './mascot-preferences';

/** The twelve proposals of the brief that an existing suggestion type stands for. */
const PROPOSAL_BY_TYPE: Record<SuggestionType, MascotProposalId> = {
  FORGOTTEN_CONTACT: 'P1',
  RESCHEDULE_REMINDER: 'P2',
  HABIT_REMINDER: 'P3',
  BIRTHDAY_REMINDER: 'P4',
  POSTPONE_TASK: 'P5',
  OVERLOADED_DAY: 'P6',
  PLANNING_CONFLICT: 'P7',
};

const MESSAGE_BY_TYPE: Record<SuggestionType, MascotMessageId> = {
  FORGOTTEN_CONTACT: 'FORGOTTEN_CONTACT',
  RESCHEDULE_REMINDER: 'MISSED_REMINDER',
  HABIT_REMINDER: 'STREAK_AT_RISK',
  BIRTHDAY_REMINDER: 'BIRTHDAY_SOON',
  POSTPONE_TASK: 'TASKS_TO_POSTPONE',
  OVERLOADED_DAY: 'OVERLOADED_DAY',
  PLANNING_CONFLICT: 'PLANNING_CONFLICT',
};

/** Mood of the small mascot shown with a proposal: it follows the type, never alarms. */
const MOOD_BY_TYPE: Record<SuggestionType, MascotMood> = {
  FORGOTTEN_CONTACT: 'calm',
  RESCHEDULE_REMINDER: 'alert',
  HABIT_REMINDER: 'happy',
  BIRTHDAY_REMINDER: 'party',
  POSTPONE_TASK: 'calm',
  OVERLOADED_DAY: 'alert',
  PLANNING_CONFLICT: 'alert',
};

/** Parameters each message needs, with the type each one must have. */
const REQUIRED_PARAMS: Record<SuggestionType, Readonly<Record<string, 'string' | 'number'>>> = {
  FORGOTTEN_CONTACT: { days: 'number', person: 'string' },
  RESCHEDULE_REMINDER: { title: 'string', time: 'string' },
  HABIT_REMINDER: { streak: 'number', title: 'string' },
  BIRTHDAY_REMINDER: { days: 'number', person: 'string' },
  POSTPONE_TASK: { count: 'number' },
  OVERLOADED_DAY: { count: 'number' },
  PLANNING_CONFLICT: { time: 'string' },
};

export interface SuggestionLike {
  type: SuggestionType;
  title: string;
  proposedData?: string | null;
}

export interface MascotSuggestionMessage {
  id: MascotMessageId;
  params: MascotMessageParams;
}

export function suggestionProposalId(type: SuggestionType): MascotProposalId {
  return PROPOSAL_BY_TYPE[type];
}

export function suggestionMood(type: SuggestionType): MascotMood {
  return MOOD_BY_TYPE[type];
}

/** "9 h" or "9 h 30": the way a time of day is said aloud in French. */
export function formatFrenchTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`;
}

function parseParams(proposedData: string | null | undefined): Record<string, unknown> | null {
  if (!proposedData) return null;
  try {
    const value: unknown = JSON.parse(proposedData);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * The catalogue message of a suggestion, or null when its parameters are missing or malformed.
 * The caller then shows the stored title instead.
 */
export function suggestionToMascotMessage(suggestion: SuggestionLike): MascotSuggestionMessage | null {
  const data = parseParams(suggestion.proposedData);
  if (!data) return null;

  const params: Record<string, string | number> = {};
  for (const [key, kind] of Object.entries(REQUIRED_PARAMS[suggestion.type])) {
    const value = data[key];
    if (typeof value !== kind) return null;
    if (kind === 'number' && !Number.isFinite(value)) return null;
    params[key] = value as string | number;
  }

  return { id: MESSAGE_BY_TYPE[suggestion.type], params };
}

// ─── Parameter builders used when the engine creates a suggestion ────────────────────────────

function serialize(params: MascotMessageParams): string {
  return JSON.stringify(params);
}

export function forgottenContactData(personName: string, days: number): string {
  return serialize({ person: personName, days });
}

export function missedReminderData(title: string, scheduledAt: Date): string {
  return serialize({ title, time: formatFrenchTime(scheduledAt) });
}

export function streakAtRiskData(title: string, streak: number): string {
  return serialize({ title, streak });
}

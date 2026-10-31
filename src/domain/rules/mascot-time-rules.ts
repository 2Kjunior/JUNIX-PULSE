/**
 * Pure rules deciding which time-driven mascot interventions are due:
 * morning briefing, upcoming events, planning blocks and evening review.
 * The caller resolves dates (day key, event and block timestamps); nothing here reads the clock.
 */

import { FocusState } from './focus-rules';
import { isNightHour, MascotMood } from './mascot-mood-rules';

export type MascotTimeTriggerKind =
  | 'MORNING_BRIEFING'
  | 'EVENT_IN_60'
  | 'EVENT_IN_15'
  | 'EVENT_DEPARTURE'
  | 'EVENT_START'
  | 'PLANNING_BLOCK_START'
  | 'EVENING_REVIEW';

export type PlanningBlockKind = 'WORK' | 'STUDY' | 'SPORT' | 'REST' | 'HOUSE' | 'OTHER' | 'FREE';
export type TimeTriggerLevel = 'micro' | 'small';

/** A trigger stays due for this long after its moment, so a short absence does not lose it. */
export const TRIGGER_GRACE_MS = 5 * 60 * 1000;
export const EVENT_FIRST_WARNING_MINUTES = 60;
export const EVENT_SECOND_WARNING_MINUTES = 15;

export interface MascotTimeEvent {
  id: string;
  startAt: number; // Epoch milliseconds
  travelBufferMinutes: number;
  hasLocation: boolean;
}

export interface MascotTimeBlock {
  id: string;
  kind: PlanningBlockKind;
  startAt: number; // Epoch milliseconds, resolved by the caller for today
}

export interface MascotTimeInput {
  now: number;
  hour: number; // Local hour, 0 to 23
  dayKey: string; // Local date, e.g. 2026-10-31
  morningBriefingHour: number;
  endOfDayHour: number;
  briefingsEnabled: boolean; // Existing switch for the morning and evening summaries
  focusState: FocusState;
  events: readonly MascotTimeEvent[];
  blocks: readonly MascotTimeBlock[];
  todayTaskTotal: number;
  todayTaskCompleted: number;
  firedKeys: ReadonlySet<string>;
}

export interface MascotTimeTrigger {
  key: string; // Unique per occurrence: the caller stores it once the trigger has been shown
  kind: MascotTimeTriggerKind;
  subjectId: string | null;
  dueAt: number;
  mood: MascotMood;
  attentive: boolean;
  level: TimeTriggerLevel;
  hasMessage: boolean;
  proposesFocus: boolean;
}

const MINUTE_MS = 60 * 1000;

function isDue(now: number, dueAt: number): boolean {
  return now >= dueAt && now - dueAt < TRIGGER_GRACE_MS;
}

function eventTriggers(input: MascotTimeInput): MascotTimeTrigger[] {
  const triggers: MascotTimeTrigger[] = [];

  for (const event of input.events) {
    const base = { subjectId: event.id, hasMessage: true, proposesFocus: false } as const;
    const keyFor = (kind: MascotTimeTriggerKind) => `${kind}:${event.id}:${event.startAt}`;

    const firstAt = event.startAt - EVENT_FIRST_WARNING_MINUTES * MINUTE_MS;
    if (isDue(input.now, firstAt)) {
      triggers.push({
        ...base, key: keyFor('EVENT_IN_60'), kind: 'EVENT_IN_60', dueAt: firstAt,
        mood: 'calm', attentive: true, level: 'micro',
      });
    }

    const secondAt = event.startAt - EVENT_SECOND_WARNING_MINUTES * MINUTE_MS;
    if (isDue(input.now, secondAt)) {
      triggers.push({
        ...base, key: keyFor('EVENT_IN_15'), kind: 'EVENT_IN_15', dueAt: secondAt,
        mood: 'calm', attentive: true, level: 'small',
      });
    }

    if (event.hasLocation && event.travelBufferMinutes > 0) {
      const departureAt = event.startAt - event.travelBufferMinutes * MINUTE_MS;
      if (isDue(input.now, departureAt)) {
        triggers.push({
          ...base, key: keyFor('EVENT_DEPARTURE'), kind: 'EVENT_DEPARTURE', dueAt: departureAt,
          mood: 'calm', attentive: true, level: 'small',
        });
      }
    }

    if (isDue(input.now, event.startAt)) {
      triggers.push({
        ...base, key: keyFor('EVENT_START'), kind: 'EVENT_START', dueAt: event.startAt,
        mood: 'calm', attentive: true, level: 'small',
      });
    }
  }

  return triggers;
}

function blockTrigger(block: MascotTimeBlock): Omit<MascotTimeTrigger, 'key' | 'kind' | 'subjectId' | 'dueAt'> | null {
  switch (block.kind) {
    case 'WORK':
    case 'STUDY':
      return { mood: 'calm', attentive: true, level: 'micro', hasMessage: true, proposesFocus: true };
    case 'SPORT':
      return { mood: 'happy', attentive: false, level: 'micro', hasMessage: true, proposesFocus: false };
    case 'REST':
    case 'HOUSE':
    case 'OTHER':
      return { mood: 'calm', attentive: false, level: 'micro', hasMessage: false, proposesFocus: false };
    case 'FREE':
      return null;
  }
}

function blockTriggers(input: MascotTimeInput): MascotTimeTrigger[] {
  const triggers: MascotTimeTrigger[] = [];
  for (const block of input.blocks) {
    const shape = blockTrigger(block);
    if (!shape || !isDue(input.now, block.startAt)) continue;
    triggers.push({
      ...shape,
      key: `PLANNING_BLOCK_START:${block.id}:${block.startAt}`,
      kind: 'PLANNING_BLOCK_START',
      subjectId: block.id,
      dueAt: block.startAt,
    });
  }
  return triggers;
}

function dailyTriggers(input: MascotTimeInput): MascotTimeTrigger[] {
  if (!input.briefingsEnabled) return [];
  const triggers: MascotTimeTrigger[] = [];

  // First opening after the briefing hour, until the evening review takes over
  if (input.hour >= input.morningBriefingHour && input.hour < input.endOfDayHour) {
    triggers.push({
      key: `MORNING_BRIEFING:${input.dayKey}`,
      kind: 'MORNING_BRIEFING',
      subjectId: null,
      dueAt: 0,
      mood: 'happy',
      attentive: false,
      level: 'small',
      hasMessage: true,
      proposesFocus: false,
    });
  }

  if (input.hour >= input.endOfDayHour) {
    const allDone = input.todayTaskTotal > 0 && input.todayTaskCompleted >= input.todayTaskTotal;
    triggers.push({
      key: `EVENING_REVIEW:${input.dayKey}`,
      kind: 'EVENING_REVIEW',
      subjectId: null,
      dueAt: 0,
      mood: allDone ? 'happy' : 'calm',
      attentive: false,
      level: 'small',
      hasMessage: true,
      proposesFocus: false,
    });
  }

  return triggers;
}

/**
 * Time-driven interventions due right now, oldest first, minus those already shown.
 * Nothing is due at night or during a Focus session.
 */
export function dueMascotTimeTriggers(input: MascotTimeInput): MascotTimeTrigger[] {
  if (isNightHour(input.hour)) return [];
  if (input.focusState === 'running' || input.focusState === 'paused') return [];

  return [...dailyTriggers(input), ...eventTriggers(input), ...blockTriggers(input)]
    .filter(trigger => !input.firedKeys.has(trigger.key))
    .sort((a, b) => a.dueAt - b.dueAt);
}

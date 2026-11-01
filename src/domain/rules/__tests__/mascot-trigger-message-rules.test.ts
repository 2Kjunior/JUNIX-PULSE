/**
 * Unit tests for the messages of the time triggers.
 */

import { resolveMascotMessage } from '../mascot-message-rules';
import { DEFAULT_MASCOT_PREFERENCES } from '../mascot-preferences';
import { dueMascotTimeTriggers, MascotTimeInput, MascotTimeTrigger } from '../mascot-time-rules';
import { triggerToMascotMessage, TriggerMessageContext } from '../mascot-trigger-message-rules';

const NOON = new Date(2026, 9, 31, 12, 0).getTime();
const MIN = 60 * 1000;

const trigger = (overrides: Partial<MascotTimeTrigger>): MascotTimeTrigger => ({
  key: 'k', kind: 'MORNING_BRIEFING', subjectId: null, dueAt: 0, mood: 'happy', attentive: false,
  level: 'small', hasMessage: true, proposesFocus: false, ...overrides,
});

const context = (overrides: Partial<TriggerMessageContext> = {}): TriggerMessageContext => ({
  remindersToday: 2, tasksTotal: 5, tasksDone: 4,
  events: { e1: { title: 'Réunion', startAt: new Date(2026, 9, 31, 15, 30).getTime(), location: 'Cocody' } },
  ...overrides,
});

describe('triggerToMascotMessage', () => {
  it('gives the morning briefing the counts of the day', () => {
    expect(triggerToMascotMessage(trigger({ kind: 'MORNING_BRIEFING' }), context())).toEqual({
      id: 'MORNING_BRIEFING', params: { reminders: 2, count: 5 },
    });
  });

  it('stays quiet on an empty morning, not on a half empty one', () => {
    expect(triggerToMascotMessage(trigger({ kind: 'MORNING_BRIEFING' }), context({ remindersToday: 0, tasksTotal: 0 }))).toBeNull();
    expect(triggerToMascotMessage(trigger({ kind: 'MORNING_BRIEFING' }), context({ remindersToday: 0 }))).not.toBeNull();
  });

  it('gives the evening review the day\'s score, and stays quiet without tasks', () => {
    expect(triggerToMascotMessage(trigger({ kind: 'EVENING_REVIEW' }), context())).toEqual({
      id: 'EVENING_REVIEW', params: { done: 4, total: 5 },
    });
    expect(triggerToMascotMessage(trigger({ kind: 'EVENING_REVIEW' }), context({ tasksTotal: 0, tasksDone: 0 }))).toBeNull();
  });

  it.each([
    ['EVENT_IN_60', { title: 'Réunion', time: '15 h 30' }],
    ['EVENT_IN_15', { title: 'Réunion' }],
    ['EVENT_DEPARTURE', { place: 'Cocody' }],
    ['EVENT_START', { title: 'Réunion' }],
  ] as const)('names the event for %s', (kind, params) => {
    expect(triggerToMascotMessage(trigger({ kind, subjectId: 'e1' }), context())).toEqual({ id: kind, params });
  });

  it('stays quiet for an unknown event or a departure without a place', () => {
    expect(triggerToMascotMessage(trigger({ kind: 'EVENT_START', subjectId: 'zzz' }), context())).toBeNull();
    expect(triggerToMascotMessage(trigger({ kind: 'EVENT_START', subjectId: null }), context())).toBeNull();
    const noPlace = context({ events: { e1: { title: 'x', startAt: NOON } } });
    expect(triggerToMascotMessage(trigger({ kind: 'EVENT_DEPARTURE', subjectId: 'e1' }), noPlace)).toBeNull();
  });

  it('says nothing for a trigger flagged as silent, and for planning blocks', () => {
    expect(triggerToMascotMessage(trigger({ hasMessage: false }), context())).toBeNull();
    expect(triggerToMascotMessage(trigger({ kind: 'PLANNING_BLOCK_START', subjectId: 'b1' }), context())).toBeNull();
  });

  it('feeds the catalogue with everything it needs', () => {
    const input: MascotTimeInput = {
      now: NOON, hour: 12, dayKey: '2026-10-31', morningBriefingHour: 8, endOfDayHour: 20, briefingsEnabled: true,
      focusState: 'idle', blocks: [], todayTaskTotal: 5, todayTaskCompleted: 4, firedKeys: new Set(),
      events: [{ id: 'e1', startAt: NOON + 15 * MIN, travelBufferMinutes: 15, hasLocation: true }],
    };
    const ctx = context({ events: { e1: { title: 'Réunion', startAt: NOON + 15 * MIN, location: 'Cocody' } } });
    const due = dueMascotTimeTriggers(input);
    expect(due.length).toBeGreaterThanOrEqual(3);
    for (const item of due) {
      const message = triggerToMascotMessage(item, ctx);
      if (!message) continue;
      expect(resolveMascotMessage(message.id, message.params, DEFAULT_MASCOT_PREFERENCES, 'Awa')).not.toMatch(/[{}]/);
    }
  });
});

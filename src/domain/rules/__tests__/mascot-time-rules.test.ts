/**
 * Unit tests for the time-driven mascot interventions.
 */

import {
  dueMascotTimeTriggers,
  MascotTimeInput,
  TRIGGER_GRACE_MS,
} from '../mascot-time-rules';

const MIN = 60 * 1000;
const NOON = 1_000_000_000;

const base: MascotTimeInput = {
  now: NOON,
  hour: 12,
  dayKey: '2026-10-31',
  morningBriefingHour: 8,
  endOfDayHour: 20,
  briefingsEnabled: true,
  focusState: 'idle',
  events: [],
  blocks: [],
  todayTaskTotal: 4,
  todayTaskCompleted: 1,
  firedKeys: new Set(),
};

const due = (overrides: Partial<MascotTimeInput>) => dueMascotTimeTriggers({ ...base, ...overrides });
const kinds = (overrides: Partial<MascotTimeInput>) => due(overrides).map(t => t.kind);

const event = (startInMin: number, extra: Partial<{ travelBufferMinutes: number; hasLocation: boolean }> = {}) => ({
  id: 'e1',
  startAt: NOON + startInMin * MIN,
  travelBufferMinutes: 0,
  hasLocation: false,
  ...extra,
});

describe('morning briefing', () => {
  it('is due once the briefing hour has passed, once a day', () => {
    expect(kinds({ hour: 8 })).toEqual(['MORNING_BRIEFING']);
    expect(kinds({ hour: 7 })).toEqual([]);
    expect(kinds({ hour: 19 })).toEqual(['MORNING_BRIEFING']);
  });

  it('is not repeated once fired', () => {
    expect(kinds({ firedKeys: new Set(['MORNING_BRIEFING:2026-10-31']) })).toEqual([]);
  });

  it('is due again the next day', () => {
    expect(kinds({ dayKey: '2026-11-01', firedKeys: new Set(['MORNING_BRIEFING:2026-10-31']) })).toEqual([
      'MORNING_BRIEFING',
    ]);
  });

  it('follows the existing switch', () => {
    expect(kinds({ briefingsEnabled: false })).toEqual([]);
  });

  it('respects a custom hour', () => {
    expect(kinds({ hour: 9, morningBriefingHour: 10 })).toEqual([]);
    expect(kinds({ hour: 10, morningBriefingHour: 10 })).toEqual(['MORNING_BRIEFING']);
  });
});

describe('evening review', () => {
  it('replaces the briefing from the end of day hour', () => {
    expect(kinds({ hour: 20 })).toEqual(['EVENING_REVIEW']);
  });

  it('is happy when everything is done and calm otherwise', () => {
    expect(due({ hour: 21, todayTaskTotal: 3, todayTaskCompleted: 3 })[0].mood).toBe('happy');
    expect(due({ hour: 21, todayTaskTotal: 3, todayTaskCompleted: 1 })[0].mood).toBe('calm');
    expect(due({ hour: 21, todayTaskTotal: 0, todayTaskCompleted: 0 })[0].mood).toBe('calm');
  });

  it('follows the existing switch', () => {
    expect(kinds({ hour: 21, briefingsEnabled: false })).toEqual([]);
  });
});

describe('events', () => {
  it.each([
    [60, 'EVENT_IN_60', 'micro'],
    [15, 'EVENT_IN_15', 'small'],
    [0, 'EVENT_START', 'small'],
  ] as const)('an event starting in %i minutes triggers %s', (_label, kind, level) => {
    const result = due({ hour: 12, events: [event(_label)], firedKeys: new Set(['MORNING_BRIEFING:2026-10-31']) });
    const trigger = result.find(t => t.kind === kind);
    expect(trigger).toMatchObject({ attentive: true, mood: 'calm', level, subjectId: 'e1' });
  });

  it('stays quiet for an event far away', () => {
    expect(kinds({ events: [event(180)], firedKeys: new Set(['MORNING_BRIEFING:2026-10-31']) })).toEqual([]);
  });

  it('warns at departure time only when a place is known', () => {
    const fired = new Set(['MORNING_BRIEFING:2026-10-31']);
    expect(kinds({ events: [event(25, { travelBufferMinutes: 25, hasLocation: true })], firedKeys: fired })).toContain(
      'EVENT_DEPARTURE'
    );
    expect(kinds({ events: [event(25, { travelBufferMinutes: 25, hasLocation: false })], firedKeys: fired })).not.toContain(
      'EVENT_DEPARTURE'
    );
    expect(kinds({ events: [event(25, { travelBufferMinutes: 0, hasLocation: true })], firedKeys: fired })).not.toContain(
      'EVENT_DEPARTURE'
    );
  });

  it('keeps a trigger due during the grace period only', () => {
    const fired = new Set(['MORNING_BRIEFING:2026-10-31']);
    const e = event(-1);
    expect(kinds({ events: [e], firedKeys: fired })).toContain('EVENT_START');
    const late = { ...e, startAt: NOON - TRIGGER_GRACE_MS };
    expect(kinds({ events: [late], firedKeys: fired })).not.toContain('EVENT_START');
  });

  it('does not repeat a fired trigger, but fires again if the event moves', () => {
    const fired = new Set(['MORNING_BRIEFING:2026-10-31']);
    const e = event(15);
    const key = due({ events: [e], firedKeys: fired }).find(t => t.kind === 'EVENT_IN_15')!.key;
    expect(kinds({ events: [e], firedKeys: new Set([...fired, key]) })).toEqual([]);
    const moved = { ...e, startAt: e.startAt + 30 * MIN };
    expect(kinds({ events: [{ ...moved, startAt: NOON + 15 * MIN }], firedKeys: new Set([...fired, key]) })).toEqual([]);
    const key2 = due({ events: [{ ...e, id: 'e2' }], firedKeys: fired }).find(t => t.kind === 'EVENT_IN_15')!.key;
    expect(key2).not.toBe(key);
  });
});

describe('planning blocks', () => {
  const fired = new Set(['MORNING_BRIEFING:2026-10-31']);
  const block = (kind: 'WORK' | 'STUDY' | 'SPORT' | 'REST' | 'HOUSE' | 'OTHER' | 'FREE') => ({
    id: 'b1',
    kind,
    startAt: NOON - MIN,
  });

  it.each(['WORK', 'STUDY'] as const)('a %s block proposes a Focus', kind => {
    expect(due({ blocks: [block(kind)], firedKeys: fired })[0]).toMatchObject({
      kind: 'PLANNING_BLOCK_START', mood: 'calm', attentive: true, level: 'micro', hasMessage: true, proposesFocus: true,
    });
  });

  it('a SPORT block is happy', () => {
    expect(due({ blocks: [block('SPORT')], firedKeys: fired })[0]).toMatchObject({
      mood: 'happy', level: 'micro', hasMessage: true, proposesFocus: false,
    });
  });

  it.each(['REST', 'HOUSE', 'OTHER'] as const)('a %s block is calm and silent', kind => {
    expect(due({ blocks: [block(kind)], firedKeys: fired })[0]).toMatchObject({
      mood: 'calm', hasMessage: false, proposesFocus: false,
    });
  });

  it('a FREE block triggers nothing', () => {
    expect(due({ blocks: [block('FREE')], firedKeys: fired })).toEqual([]);
  });
});

describe('quiet periods', () => {
  const eventNow = event(0);

  it.each([23, 0, 4])('nothing is due at %i h', hour => {
    expect(due({ hour, events: [eventNow] })).toEqual([]);
  });

  it.each(['running', 'paused'] as const)('nothing is due while focus is %s', focusState => {
    expect(due({ focusState, events: [eventNow] })).toEqual([]);
  });
});

describe('ordering', () => {
  it('returns the oldest due trigger first', () => {
    const fired = new Set(['MORNING_BRIEFING:2026-10-31']);
    const result = due({
      firedKeys: fired,
      events: [event(0), { ...event(0), id: 'e2', startAt: NOON - 2 * MIN }],
    });
    expect(result.map(t => t.subjectId)).toEqual(['e2', 'e1']);
  });
});

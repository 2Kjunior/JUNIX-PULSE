/**
 * Unit tests for the pure mascot reaction rules.
 */

import {
  computeMascotReaction,
  HABITUATION_WINDOW_MS,
  MascotEvent,
  MascotReactionContext,
  REACTION_COOLDOWN_MS,
  REACTION_DURATIONS_MS,
  REACTION_MAX_DURATION_MS,
  reactionLevelForWeight,
} from '../mascot-reaction-rules';

const NOW = 1_000_000_000;

const baseContext: MascotReactionContext = {
  now: NOW,
  hour: 12,
  keyboardOpen: false,
  focusState: 'idle',
  history: [],
  lastReaction: null,
};

const react = (event: MascotEvent, overrides: Partial<MascotReactionContext> = {}) =>
  computeMascotReaction(event, { ...baseContext, ...overrides });

describe('reactionLevelForWeight', () => {
  it.each([
    [0.19, 'micro'],
    [0.2, 'small'],
    [0.44, 'small'],
    [0.45, 'medium'],
    [0.74, 'medium'],
    [0.75, 'large'],
    [1, 'large'],
  ])('weight %f gives %s', (weight, level) => {
    expect(reactionLevelForWeight(weight)).toBe(level);
  });
});

describe('computeMascotReaction weights', () => {
  it.each<[string, MascotEvent, number, string, string]>([
    ['low priority task', { type: 'TASK_COMPLETED', priority: 'LOW' }, 0.25, 'small', 'happy'],
    ['normal priority task', { type: 'TASK_COMPLETED', priority: 'NORMAL' }, 0.3, 'small', 'happy'],
    ['high priority task', { type: 'TASK_COMPLETED', priority: 'HIGH' }, 0.4, 'small', 'happy'],
    ['urgent task', { type: 'TASK_COMPLETED', priority: 'URGENT' }, 0.5, 'medium', 'happy'],
    ['urgent task with 3 subtasks', { type: 'TASK_COMPLETED', priority: 'URGENT', subtaskCount: 3 }, 0.65, 'medium', 'happy'],
    ['urgent task with 8 subtasks', { type: 'TASK_COMPLETED', priority: 'URGENT', subtaskCount: 8 }, 0.65, 'medium', 'happy'],
    ['cleared day', { type: 'DAY_CLEARED' }, 0.85, 'large', 'party'],
    ['normal reminder', { type: 'REMINDER_COMPLETED', priority: 'NORMAL' }, 0.33, 'small', 'happy'],
    ['urgent reminder', { type: 'REMINDER_COMPLETED', priority: 'URGENT' }, 0.53, 'medium', 'happy'],
    ['habit, 2 day streak', { type: 'HABIT_COMPLETED', streakDays: 2 }, 0.15, 'micro', 'happy'],
    ['habit, 3 day streak', { type: 'HABIT_COMPLETED', streakDays: 3 }, 0.3, 'small', 'happy'],
    ['habit, 6 day streak', { type: 'HABIT_COMPLETED', streakDays: 6 }, 0.3, 'small', 'happy'],
    ['habit, 7 day streak', { type: 'HABIT_COMPLETED', streakDays: 7 }, 0.55, 'medium', 'happy'],
    ['habit, 29 day streak', { type: 'HABIT_COMPLETED', streakDays: 29 }, 0.55, 'medium', 'happy'],
    ['habit, 30 day streak', { type: 'HABIT_COMPLETED', streakDays: 30 }, 0.75, 'large', 'party'],
    ['goal', { type: 'GOAL_COMPLETED' }, 1, 'large', 'party'],
    ['5 min focus', { type: 'FOCUS_COMPLETED', durationMinutes: 5 }, 0.34, 'small', 'happy'],
    ['25 min focus', { type: 'FOCUS_COMPLETED', durationMinutes: 25 }, 0.51, 'medium', 'happy'],
    ['60 min focus', { type: 'FOCUS_COMPLETED', durationMinutes: 60 }, 0.8, 'large', 'party'],
    ['120 min focus', { type: 'FOCUS_COMPLETED', durationMinutes: 120 }, 0.8, 'large', 'party'],
    ['accepted suggestion', { type: 'SUGGESTION_ACCEPTED' }, 0.3, 'small', 'happy'],
    ['created item', { type: 'ITEM_CREATED' }, 0.12, 'micro', 'happy'],
    ['snoozed reminder', { type: 'REMINDER_SNOOZED' }, 0.1, 'micro', 'calm'],
    ['dismissed suggestion', { type: 'SUGGESTION_DISMISSED' }, 0.1, 'micro', 'calm'],
    ['deleted item', { type: 'ITEM_DELETED' }, 0.1, 'micro', 'calm'],
  ])('%s', (_label, event, weight, level, mood) => {
    expect(react(event)).toMatchObject({ weight, level, mood, attentive: false });
  });

  it('gives each level its duration, within the maximum', () => {
    const reaction = react({ type: 'GOAL_COMPLETED' });
    expect(reaction?.durationMs).toBe(REACTION_DURATIONS_MS.large);
    expect(Object.values(REACTION_DURATIONS_MS).every(ms => ms <= REACTION_MAX_DURATION_MS)).toBe(true);
  });

  it('ignores a negative focus duration', () => {
    expect(react({ type: 'FOCUS_COMPLETED', durationMinutes: -10 })?.weight).toBe(0.3);
  });
});

describe('computeMascotReaction incoming events', () => {
  it('raises an alert for an urgent reminder', () => {
    expect(react({ type: 'REMINDER_ARRIVED', priority: 'URGENT' })).toMatchObject({
      mood: 'alert',
      level: 'medium',
      attentive: false,
    });
  });

  it.each<[MascotEvent, string]>([
    [{ type: 'REMINDER_ARRIVED', priority: 'HIGH' }, 'small'],
    [{ type: 'REMINDER_ARRIVED', priority: 'NORMAL' }, 'micro'],
    [{ type: 'EVENT_APPROACHING', minutesUntilStart: 60 }, 'micro'],
    [{ type: 'EVENT_APPROACHING', minutesUntilStart: 15 }, 'small'],
  ])('stays calm and attentive for %j', (event, level) => {
    expect(react(event)).toMatchObject({ mood: 'calm', attentive: true, level });
  });

  it('does not react to a low priority reminder', () => {
    expect(react({ type: 'REMINDER_ARRIVED', priority: 'LOW' })).toBeNull();
    expect(react({ type: 'REMINDER_MISSED', priority: 'LOW' })).toBeNull();
  });

  it.each<[MascotEvent, string]>([
    [{ type: 'REMINDER_MISSED', priority: 'URGENT' }, 'small'],
    [{ type: 'REMINDER_MISSED', priority: 'HIGH' }, 'micro'],
    [{ type: 'REMINDER_MISSED', priority: 'NORMAL' }, 'micro'],
  ])('shows a soft alert for %j', (event, level) => {
    expect(react(event)).toMatchObject({ mood: 'alert', level });
  });
});

describe('computeMascotReaction habituation', () => {
  const task: MascotEvent = { type: 'TASK_COMPLETED', priority: 'URGENT' };
  const recent = { type: 'TASK_COMPLETED' as const, at: NOW - 60_000 };

  it('reduces the weight by 25 % per repetition', () => {
    expect(react(task, { history: [recent] })?.weight).toBe(0.38);
    expect(react(task, { history: [recent, recent] })?.weight).toBe(0.28);
  });

  it('never celebrates ten tasks in a row', () => {
    expect(react({ type: 'GOAL_COMPLETED' }, {
      history: [{ type: 'GOAL_COMPLETED', at: NOW - 60_000 }],
    })?.mood).toBe('party');
    expect(react({ type: 'GOAL_COMPLETED' }, {
      history: Array(3).fill({ type: 'GOAL_COMPLETED', at: NOW - 60_000 }),
    })?.mood).toBe('happy');
  });

  it('forgets repetitions once the window has passed', () => {
    const old = { type: 'TASK_COMPLETED' as const, at: NOW - HABITUATION_WINDOW_MS };
    expect(react(task, { history: [old] })?.weight).toBe(0.5);
  });

  it('only counts the same type of event', () => {
    expect(react(task, { history: [{ type: 'ITEM_CREATED', at: NOW - 60_000 }] })?.weight).toBe(0.5);
  });

  it('does not wear out incoming alerts', () => {
    const urgent: MascotEvent = { type: 'REMINDER_ARRIVED', priority: 'URGENT' };
    const history = [{ type: 'REMINDER_ARRIVED' as const, at: NOW - 60_000 }];
    expect(react(urgent, { history })?.weight).toBe(0.53);
  });
});

describe('computeMascotReaction cooldown', () => {
  const task: MascotEvent = { type: 'TASK_COMPLETED', priority: 'LOW' };

  it('drops a weaker or equal reaction inside the cooldown', () => {
    const lastReaction = { weight: 0.25, at: NOW - 500 };
    expect(react(task, { lastReaction })).toBeNull();
    expect(react({ type: 'ITEM_CREATED' }, { lastReaction })).toBeNull();
  });

  it('lets a stronger reaction replace it', () => {
    const lastReaction = { weight: 0.25, at: NOW - 500 };
    expect(react({ type: 'DAY_CLEARED' }, { lastReaction })?.mood).toBe('party');
  });

  it('reacts again once the cooldown has passed', () => {
    const lastReaction = { weight: 0.25, at: NOW - REACTION_COOLDOWN_MS };
    expect(react(task, { lastReaction })).not.toBeNull();
  });
});

describe('computeMascotReaction suppression', () => {
  const urgent: MascotEvent = { type: 'REMINDER_ARRIVED', priority: 'URGENT' };
  const focusEnd: MascotEvent = { type: 'FOCUS_COMPLETED', durationMinutes: 25 };
  const goal: MascotEvent = { type: 'GOAL_COMPLETED' };

  it('stays silent while the keyboard is open', () => {
    expect(react(goal, { keyboardOpen: true })).toBeNull();
    expect(react(urgent, { keyboardOpen: true })).toBeNull();
  });

  it.each(['running', 'paused'] as const)('stays silent while focus is %s, except for its own end', focusState => {
    expect(react(goal, { focusState })).toBeNull();
    expect(react(urgent, { focusState })).toBeNull();
    expect(react(focusEnd, { focusState })).not.toBeNull();
  });

  it.each([23, 0, 4])('stays silent at %i h, except for an urgent reminder', hour => {
    expect(react(goal, { hour })).toBeNull();
    expect(react({ type: 'REMINDER_ARRIVED', priority: 'HIGH' }, { hour })).toBeNull();
    expect(react(urgent, { hour })).not.toBeNull();
  });

  it.each([22, 5])('reacts normally at %i h', hour => {
    expect(react(goal, { hour })).not.toBeNull();
  });
});

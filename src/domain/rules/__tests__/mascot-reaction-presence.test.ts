/**
 * Unit tests for the step 1b additions to the reaction rules:
 * new event types and the presence setting.
 */

import {
  computeMascotReaction,
  MascotEvent,
  MascotReactionContext,
} from '../mascot-reaction-rules';

const NOW = 1_000_000_000;

const context: MascotReactionContext = {
  now: NOW,
  hour: 12,
  keyboardOpen: false,
  focusState: 'idle',
  history: [],
  lastReaction: null,
};

const react = (event: MascotEvent, overrides: Partial<MascotReactionContext> = {}) =>
  computeMascotReaction(event, { ...context, ...overrides });

describe('new event types', () => {
  it.each<[string, MascotEvent, number, string]>([
    ['contacting a person', { type: 'PERSON_CONTACTED', wasForgotten: false }, 0.3, 'small'],
    ['contacting a forgotten person', { type: 'PERSON_CONTACTED', wasForgotten: true }, 0.5, 'medium'],
    ['completing a subtask', { type: 'SUBTASK_COMPLETED' }, 0.1, 'micro'],
    ['a successful backup', { type: 'BACKUP_DONE' }, 0.2, 'small'],
    ['resuming a habit', { type: 'HABIT_RESUMED' }, 0.1, 'micro'],
  ])('%s', (_label, event, weight, level) => {
    expect(react(event)).toMatchObject({ weight, level, mood: 'happy', attentive: false });
  });

  it('habituates on repeated subtasks', () => {
    const history = [
      { type: 'SUBTASK_COMPLETED' as const, at: NOW - 1000 },
      { type: 'SUBTASK_COMPLETED' as const, at: NOW - 2000 },
    ];
    expect(react({ type: 'SUBTASK_COMPLETED' }, { history })?.weight).toBe(0.06);
  });
});

describe('presence setting', () => {
  const big: MascotEvent = { type: 'GOAL_COMPLETED' };
  const medium: MascotEvent = { type: 'TASK_COMPLETED', priority: 'URGENT' };
  const small: MascotEvent = { type: 'TASK_COMPLETED', priority: 'LOW' };
  const micro: MascotEvent = { type: 'ITEM_CREATED' };

  it('reacts to everything when full or unset', () => {
    for (const presence of [undefined, 'full' as const]) {
      for (const event of [big, medium, small, micro]) {
        expect(react(event, { presence })).not.toBeNull();
      }
    }
  });

  it('is completely silent when off, even for an urgent reminder', () => {
    for (const event of [big, medium, small, micro, { type: 'REMINDER_ARRIVED', priority: 'URGENT' } as const]) {
      expect(react(event, { presence: 'off' })).toBeNull();
    }
  });

  it('keeps only medium and large reactions when discreet', () => {
    expect(react(big, { presence: 'discreet' })).not.toBeNull();
    expect(react(medium, { presence: 'discreet' })).not.toBeNull();
    expect(react(small, { presence: 'discreet' })).toBeNull();
    expect(react(micro, { presence: 'discreet' })).toBeNull();
  });
});

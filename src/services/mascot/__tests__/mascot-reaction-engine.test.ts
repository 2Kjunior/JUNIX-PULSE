/**
 * Unit tests for the mascot event bus, runtime state and reaction engine.
 */

import { MascotEvent } from '../../../domain/rules/mascot-reaction-rules';
import { emitMascotEvent, subscribeMascotEvents } from '../mascot-event-bus';
import { createMascotReactionEngine, MascotReactionEnvironment } from '../mascot-reaction-engine';
import {
  getMascotFocusState,
  getMascotPresence,
  setMascotFocusState,
  setMascotPresence,
} from '../mascot-runtime';

const NOW = 5_000_000_000;

const env = (overrides: Partial<MascotReactionEnvironment> = {}): MascotReactionEnvironment => ({
  now: NOW,
  hour: 12,
  keyboardOpen: false,
  focusState: 'idle',
  presence: 'full',
  ...overrides,
});

const task: MascotEvent = { type: 'TASK_COMPLETED', priority: 'URGENT' };

describe('mascot event bus', () => {
  it('delivers an event to every listener', () => {
    const a = jest.fn();
    const b = jest.fn();
    const offA = subscribeMascotEvents(a);
    const offB = subscribeMascotEvents(b);
    emitMascotEvent({ type: 'ITEM_CREATED' });
    expect(a).toHaveBeenCalledWith({ type: 'ITEM_CREATED' });
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it('stops delivering once unsubscribed', () => {
    const listener = jest.fn();
    const off = subscribeMascotEvents(listener);
    off();
    emitMascotEvent({ type: 'ITEM_CREATED' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('never lets a failing listener break the caller or the others', () => {
    const after = jest.fn();
    const offBad = subscribeMascotEvents(() => {
      throw new Error('boom');
    });
    const offAfter = subscribeMascotEvents(after);
    expect(() => emitMascotEvent({ type: 'ITEM_DELETED' })).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    offBad();
    offAfter();
  });

  it('does nothing when nobody listens', () => {
    expect(() => emitMascotEvent({ type: 'BACKUP_DONE' })).not.toThrow();
  });
});

describe('mascot runtime state', () => {
  afterEach(() => {
    setMascotFocusState('idle');
    setMascotPresence('full');
  });

  it('starts idle and fully present', () => {
    expect(getMascotFocusState()).toBe('idle');
    expect(getMascotPresence()).toBe('full');
  });

  it('keeps what it is given', () => {
    setMascotFocusState('running');
    setMascotPresence('discreet');
    expect(getMascotFocusState()).toBe('running');
    expect(getMascotPresence()).toBe('discreet');
  });
});

describe('createMascotReactionEngine', () => {
  it('reacts to a first event', () => {
    const engine = createMascotReactionEngine();
    expect(engine.handle(task, env())).toMatchObject({ eventType: 'TASK_COMPLETED', weight: 0.5, level: 'medium' });
  });

  it('wears the reaction out when the same action repeats', () => {
    const engine = createMascotReactionEngine();
    const first = engine.handle(task, env({ now: NOW }));
    const second = engine.handle(task, env({ now: NOW + 10_000 }));
    const third = engine.handle(task, env({ now: NOW + 20_000 }));
    expect([first?.weight, second?.weight, third?.weight]).toEqual([0.5, 0.38, 0.28]);
  });

  it('forgets the repetitions after ten minutes', () => {
    const engine = createMascotReactionEngine();
    engine.handle(task, env({ now: NOW }));
    expect(engine.handle(task, env({ now: NOW + 11 * 60 * 1000 }))?.weight).toBe(0.5);
  });

  it('holds back a weaker reaction inside the cooldown and counts only what was shown', () => {
    const engine = createMascotReactionEngine();
    engine.handle(task, env({ now: NOW }));
    expect(engine.handle({ type: 'ITEM_CREATED' }, env({ now: NOW + 500 }))).toBeNull();
    // The dropped event left no trace: the same weak event later is not worn out
    expect(engine.handle({ type: 'ITEM_CREATED' }, env({ now: NOW + 5000 }))?.weight).toBe(0.12);
  });

  it('lets a stronger reaction replace the last one inside the cooldown', () => {
    const engine = createMascotReactionEngine();
    engine.handle({ type: 'TASK_COMPLETED', priority: 'LOW' }, env({ now: NOW }));
    expect(engine.handle({ type: 'DAY_CLEARED' }, env({ now: NOW + 300 }))).toMatchObject({
      level: 'large',
      mood: 'party',
    });
  });

  it('records nothing when the mascot stays silent', () => {
    const engine = createMascotReactionEngine();
    expect(engine.handle(task, env({ keyboardOpen: true }))).toBeNull();
    expect(engine.handle(task, env({ now: NOW + 100 }))?.weight).toBe(0.5);
  });

  it('is silent while focus runs, except for its own end', () => {
    const engine = createMascotReactionEngine();
    expect(engine.handle(task, env({ focusState: 'running' }))).toBeNull();
    expect(engine.handle({ type: 'FOCUS_COMPLETED', durationMinutes: 25 }, env({ focusState: 'running' }))).not.toBeNull();
  });

  it('follows the presence setting', () => {
    const engine = createMascotReactionEngine();
    expect(engine.handle(task, env({ presence: 'off' }))).toBeNull();
    expect(engine.handle({ type: 'ITEM_CREATED' }, env({ presence: 'discreet', now: NOW + 5000 }))).toBeNull();
    expect(engine.handle(task, env({ presence: 'discreet', now: NOW + 10_000 }))).not.toBeNull();
  });

  it('starts afresh after a reset', () => {
    const engine = createMascotReactionEngine();
    engine.handle(task, env());
    engine.reset();
    expect(engine.handle(task, env({ now: NOW + 100 }))?.weight).toBe(0.5);
  });
});

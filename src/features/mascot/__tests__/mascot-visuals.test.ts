/**
 * Unit tests for the pure pose and geometry helpers of the mascot drawing.
 */

import { computePointAt } from '@/domain/rules/mascot-guide-rules';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import { REACTION_DURATIONS_MS } from '@/domain/rules/mascot-reaction-rules';

import {
  GREET_ARMS,
  MASCOT_BASE_SIZE,
  MASCOT_SIZES,
  mascotDimensions,
  MOOD_VISUALS,
  REACTION_EFFECTS,
  resolveArmPose,
  toSvgId,
} from '../mascot-visuals';

const MOODS = Object.keys(MOOD_VISUALS) as MascotMood[];

describe('MOOD_VISUALS', () => {
  it('covers the six moods with the colours of the reference sheet', () => {
    expect(MOODS.sort()).toEqual(['alert', 'calm', 'focused', 'happy', 'party', 'sleepy']);
    expect(MOOD_VISUALS.calm.ring).toEqual(['#8B3DF0', '#0AE8F0']);
    expect(MOOD_VISUALS.alert.ring).toEqual(['#ff9a3d', '#ff4f8b']);
    expect(MOOD_VISUALS.party.ring).toEqual(['#ff5fa2', '#8B3DF0']);
  });

  it.each([
    ['calm', [8, -8]],
    ['happy', [105, -105]],
    ['focused', [4, -4]],
    ['alert', [158, -150]],
    ['sleepy', [-12, 14]],
    ['party', [150, -150]],
  ] as const)('rests the %s arms at %j', (mood, arms) => {
    expect(MOOD_VISUALS[mood].restArms).toEqual(arms);
  });

  it('keeps the focused mood nearly still and the alert mood agitated', () => {
    expect(MOOD_VISUALS.focused.swingDeg).toBeLessThan(MOOD_VISUALS.calm.swingDeg);
    expect(MOOD_VISUALS.alert.swingPeriodMs).toBeLessThan(MOOD_VISUALS.calm.swingPeriodMs);
  });
});

describe('resolveArmPose', () => {
  it('uses the resting arms of the mood by default', () => {
    expect(resolveArmPose('calm', 'rest', null)).toEqual({ left: 8, right: -8, swingDeg: 3, swingPeriodMs: 2400 });
  });

  it.each(['attentive', 'happy'] as const)('keeps the mood arms for the %s pose', pose => {
    expect(resolveArmPose('calm', pose, null).left).toBe(8);
  });

  it.each(MOODS)('raises the %s arms in a V when greeting', mood => {
    expect(resolveArmPose(mood, 'greet', null)).toEqual({
      left: GREET_ARMS.angles[0],
      right: GREET_ARMS.angles[1],
      swingDeg: GREET_ARMS.swingDeg,
      swingPeriodMs: GREET_ARMS.swingPeriodMs,
    });
  });

  it('stretches the right arm towards a target on the right and rests the other', () => {
    const pointAt = computePointAt({ x: 100, y: 100 }, { x: 200, y: 200 });
    expect(resolveArmPose('calm', 'pointAt', pointAt)).toMatchObject({ left: 8, right: -45, swingDeg: 0 });
  });

  it('stretches the left arm towards a target on the left and rests the other', () => {
    const pointAt = computePointAt({ x: 100, y: 100 }, { x: 0, y: 200 });
    expect(resolveArmPose('calm', 'pointAt', pointAt)).toMatchObject({ left: 45, right: -8, swingDeg: 0 });
  });

  it('keeps the mood arms when asked to point without a target', () => {
    expect(resolveArmPose('calm', 'pointAt', null).left).toBe(8);
  });
});

describe('mascotDimensions', () => {
  it('draws the 96 px base at the size of the reference sheet', () => {
    expect(mascotDimensions(MASCOT_BASE_SIZE)).toEqual({ width: 144, height: 130, scale: 1 });
  });

  it('scales the whole drawing with the orb', () => {
    expect(mascotDimensions(48)).toEqual({ width: 72, height: 65, scale: 0.5 });
  });

  it('includes the five guide sizes and the highlight size', () => {
    for (const size of [40, 48, 56, 72, 80, 96]) {
      expect(MASCOT_SIZES).toContain(size);
    }
  });
});

describe('REACTION_EFFECTS', () => {
  it('grows with the level', () => {
    const levels = ['micro', 'small', 'medium', 'large'] as const;
    for (let i = 1; i < levels.length; i += 1) {
      expect(REACTION_EFFECTS[levels[i]].scale).toBeGreaterThanOrEqual(REACTION_EFFECTS[levels[i - 1]].scale);
      expect(REACTION_EFFECTS[levels[i]].armLiftDeg).toBeGreaterThan(REACTION_EFFECTS[levels[i - 1]].armLiftDeg);
    }
  });

  it('has a duration for every level', () => {
    for (const level of Object.keys(REACTION_EFFECTS)) {
      expect(REACTION_DURATIONS_MS).toHaveProperty(level);
    }
  });
});

describe('toSvgId', () => {
  it.each([
    [':r1:', 'mr1'],
    ['_r_a2_', 'mra2'],
    ['«r5»', 'mr5'],
  ])('turns %s into a safe id', (reactId, expected) => {
    expect(toSvgId(reactId)).toBe(expected);
  });
});

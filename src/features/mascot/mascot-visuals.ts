/**
 * Visual constants of the Pulse mascot, taken from the reference sheet
 * (docs/mascot/mascot-reference.html): geometry, colours and arm angles per mood.
 * The drawing is made once on a 96 px orb and scaled, so every size shares one design.
 * Everything here is pure, so the pose logic is unit tested without a renderer.
 */

import type { GuidePointAt, GuidePose } from '@/domain/rules/mascot-guide-rules';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import type { MascotReactionLevel } from '@/domain/rules/mascot-reaction-rules';

/** Drawing space of the reference sheet. The orb sits at (80, 62) with a radius of 48. */
export const MASCOT_VIEWBOX = { minX: 8, minY: 0, width: 144, height: 130 } as const;
export const MASCOT_BASE_SIZE = 96;
export const MASCOT_ORB = { cx: 80, cy: 62, radius: 48, haloRadius: 62, clipRadius: 46 } as const;
export const MASCOT_ARM = { width: 7, height: 27, pivotY: 52, offsetX: 57 } as const;

/** One wave is 60 units wide; the liquid layer slides by exactly one wave per loop. */
export const MASCOT_LIQUID = {
  waveWidth: 60,
  pathStartX: -40,
  pathWidth: 270,
  surfaceY: 84,
  loopMs: 4500,
} as const;

export const MASCOT_BOB = { amplitude: 2.5, periodMs: 3400 } as const;

export const MASCOT_SIZES = [40, 48, 56, 72, 80, 96] as const;
export type MascotSize = (typeof MASCOT_SIZES)[number];

export interface MoodVisual {
  ring: readonly [string, string];
  liquid: readonly [string, string];
  /** Resting angles of the left and right arms, in degrees (0 hangs straight down). */
  restArms: readonly [number, number];
  /** How far the arms swing around their resting angle, and how long a full swing takes. */
  swingDeg: number;
  swingPeriodMs: number;
}

export const MOOD_VISUALS: Record<MascotMood, MoodVisual> = {
  calm: { ring: ['#8B3DF0', '#0AE8F0'], liquid: ['#b58bff', '#7fe9f2'], restArms: [8, -8], swingDeg: 3, swingPeriodMs: 2400 },
  happy: { ring: ['#8B3DF0', '#34d399'], liquid: ['#c4a0ff', '#8eecc0'], restArms: [105, -105], swingDeg: 8, swingPeriodMs: 700 },
  focused: { ring: ['#4a1fa8', '#0AE8F0'], liquid: ['#8f6bdc', '#58d4e6'], restArms: [4, -4], swingDeg: 0.8, swingPeriodMs: 3000 },
  alert: { ring: ['#ff9a3d', '#ff4f8b'], liquid: ['#ffc08a', '#ff9ab8'], restArms: [158, -150], swingDeg: 10, swingPeriodMs: 260 },
  sleepy: { ring: ['#b9a7ff', '#8aa0b8'], liquid: ['#d6cbff', '#b4c4d6'], restArms: [-12, 14], swingDeg: 2, swingPeriodMs: 3200 },
  party: { ring: ['#ff5fa2', '#8B3DF0'], liquid: ['#ffa6cf', '#b58bff'], restArms: [150, -150], swingDeg: 10, swingPeriodMs: 500 },
};

/** Arms of the "greet" pose: raised in a V, waving a little faster than the mood. */
export const GREET_ARMS = { angles: [150, -150], swingDeg: 6, swingPeriodMs: 600 } as const;

export interface ArmPose {
  left: number;
  right: number;
  swingDeg: number;
  swingPeriodMs: number;
}

/**
 * Arm angles for a mood and a pose. "greet" raises both arms in a V; "pointAt" stretches one
 * arm towards its target and leaves the other at rest. Any other pose keeps the mood's arms.
 */
export function resolveArmPose(mood: MascotMood, pose: GuidePose, pointAt: GuidePointAt | null): ArmPose {
  const visual = MOOD_VISUALS[mood];
  const [restLeft, restRight] = visual.restArms;
  const rest: ArmPose = {
    left: restLeft,
    right: restRight,
    swingDeg: visual.swingDeg,
    swingPeriodMs: visual.swingPeriodMs,
  };

  if (pose === 'greet') {
    return {
      left: GREET_ARMS.angles[0],
      right: GREET_ARMS.angles[1],
      swingDeg: GREET_ARMS.swingDeg,
      swingPeriodMs: GREET_ARMS.swingPeriodMs,
    };
  }

  if (pose === 'pointAt' && pointAt) {
    // A pointing arm holds still: a swing would make it miss its target
    return pointAt.arm === 'left'
      ? { ...rest, left: pointAt.angleDeg, swingDeg: 0 }
      : { ...rest, right: pointAt.angleDeg, swingDeg: 0 };
  }

  return rest;
}

/** Pixel size of the whole drawing (orb and arms) for an orb of the given size. */
export function mascotDimensions(size: number): { width: number; height: number; scale: number } {
  const scale = size / MASCOT_BASE_SIZE;
  return {
    width: MASCOT_VIEWBOX.width * scale,
    height: MASCOT_VIEWBOX.height * scale,
    scale,
  };
}

/** What a one-shot reaction does: a pulse of the whole body and a lift of the arms. */
export const REACTION_EFFECTS: Record<MascotReactionLevel, { scale: number; armLiftDeg: number }> = {
  micro: { scale: 1, armLiftDeg: 4 },
  small: { scale: 1.04, armLiftDeg: 10 },
  medium: { scale: 1.08, armLiftDeg: 35 },
  large: { scale: 1.12, armLiftDeg: 60 },
};

/** Removes the characters React puts in generated ids, which SVG url(#id) references cannot hold. */
export function toSvgId(reactId: string): string {
  return `m${reactId.replace(/[^A-Za-z0-9]/g, '')}`;
}

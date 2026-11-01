/**
 * Pure motion rules for the ambient background halos.
 * Source of truth for the keyframes: docs/ambient/junix-pulse-ambient-reference.html
 */

export interface AmbientPose {
  /** Horizontal offset, in % of the halo size. */
  readonly x: number;
  /** Vertical offset, in % of the halo size. */
  readonly y: number;
  readonly scale: number;
}

export interface AmbientKeyframe extends AmbientPose {
  /** Position in the cycle, from 0 to 1. */
  readonly at: number;
}

export interface AmbientMotion {
  /** Ordered keyframes: the first has `at: 0`, the last `at: 1`, and both share the same pose. */
  readonly keyframes: readonly AmbientKeyframe[];
  readonly durationMs: number;
  /** Head start in the cycle, so that the halos never repeat in sync. */
  readonly phaseMs: number;
}

/** Returns the pose of a halo after `elapsedMs`, with a sine easing on each segment. */
export function sampleAmbientPose(motion: AmbientMotion, elapsedMs: number): AmbientPose {
  'worklet';
  const { keyframes, durationMs, phaseMs } = motion;
  const progress = ((elapsedMs + phaseMs) % durationMs) / durationMs;

  let index = 0;
  while (index < keyframes.length - 2 && progress >= keyframes[index + 1].at) {
    index += 1;
  }

  const from = keyframes[index];
  const to = keyframes[index + 1];
  const segmentProgress = (progress - from.at) / (to.at - from.at);
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * segmentProgress);

  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    scale: from.scale + (to.scale - from.scale) * eased,
  };
}

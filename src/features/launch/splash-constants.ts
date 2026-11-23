/**
 * The launch animation, in numbers: colours, sizes, the timeline and its curves.
 * The orb itself is drawn from constants/orb-logo.
 */

import { Easing } from 'react-native-reanimated';

export const SPLASH_COLORS = {
  /** The dark surface of the app: the same as the system launch screen and the icon. */
  background: '#141317',
  glow: '#8B3DF0',
  ripple: '#0AE8F0',
  name: '#FFFFFF',
  tagline: '#7FE9F2',
} as const;

export const SPLASH_LAYOUT = {
  /** The orb's width on screen: 180 px for its 180 units. */
  orbSize: 180,
  /** The glow behind the orb. */
  glowSize: 300,
  /** The ripple leaves the ring and widens by this much. */
  rippleSpread: 56,
  nameGap: 28,
  nameRise: 16,
} as const;

/** The double heartbeat: the orb's size at the end of each step, and how long the step lasts. */
export const SPLASH_HEARTBEAT = [
  { scale: 1.06, ms: 140 },
  { scale: 1, ms: 140 },
  { scale: 1.035, ms: 120 },
  { scale: 1, ms: 220 },
] as const;

export const SPLASH_TIMINGS = {
  totalDurationMs: 4400,
  // Safety net: the app opens even if an animation never reports its end
  safetyTimeoutMs: 4800,
  reducedMotionHoldMs: 800,
  reducedMotionExitMs: 400,

  glowDurationMs: 600,
  ringDelayMs: 150,
  ringDurationMs: 1000,
  liquidDelayMs: 850,
  liquidDurationMs: 1000,
  beatDelayMs: 1750,
  beatDurationMs: 550,
  heartbeatDelayMs: 2300,
  rippleDelayMs: 2300,
  rippleDurationMs: 900,
  nameDelayMs: 2300,
  nameDurationMs: 700,
  greetDelayMs: 3000,
  greetDurationMs: 350,
  exitDelayMs: 3900,
  exitDurationMs: 500,
} as const;

export const SPLASH_EASINGS = {
  // Slow start and end: the ring draws itself
  ringDraw: Easing.bezier(0.65, 0, 0.25, 1),
  // Quick rise that settles gently: the liquid
  liquid: Easing.bezier(0.2, 0.9, 0.25, 1),
  // The name rising
  enterAndRise: Easing.bezier(0.2, 0.8, 0.2, 1),
  easeInOut: Easing.inOut(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeIn: Easing.in(Easing.ease),
};

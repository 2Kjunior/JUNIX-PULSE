/**
 * Pure rules placing the Pulse mascot while it guides the onboarding.
 * For a step, a direction and a screen size they give the place, the size, the path of the
 * move, the pose and whether the bubble shows. All values are in dp.
 * Motion values are copied from Duration.slow (theme.ts) and SPLASH_EASINGS.enterAndRise
 * (features/launch/splash-constants.ts) to avoid a dependency between features.
 */

import type { MascotMessageId } from './mascot-message-catalog';
import type { MascotMood } from './mascot-mood-rules';

export type GuideStep = 'welcome' | 'discover' | 'personalize' | 'schedule' | 'permissions' | 'home';
export type GuideDirection = 'forward' | 'back' | 'skip';
export type GuidePermissionPhase = 'ask' | 'done';
export type GuidePose = 'greet' | 'rest' | 'pointAt' | 'attentive' | 'happy';
export type GuideTransitionMode = 'arc' | 'fade';

export const GUIDE_SIZES = [40, 48, 56, 80, 96] as const;
export type GuideSize = (typeof GUIDE_SIZES)[number];

export const GUIDE_MOTION = {
  travelMs: 400, // Duration.slow
  travelEasing: [0.2, 0.8, 0.2, 1] as const, // SPLASH_EASINGS.enterAndRise
  maxArcDp: 24,
  armDelayMs: 60,
  bubbleHideMs: 150, // Duration.fast
  bubbleShowMs: 200,
  fadeMs: 200, // Reduced motion
  entryMs: 800,
  greetMs: 1700,
  landing: { damping: 14, stiffness: 220, squashY: 0.92 },
} as const;

export const GUIDE_LAYOUT = {
  topBarHeight: 64, // Step indicator and "Passer"
  buttonZoneHeight: 96, // Main button, forbidden to the mascot
  edgeMargin: 16,
  smallScreenHeight: 600,
  bubbleMaxWidthRatio: 0.7,
} as const;

export interface GuidePoint {
  x: number;
  y: number;
}

export interface GuideInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface GuideInput {
  step: GuideStep;
  direction: GuideDirection;
  phase?: GuidePermissionPhase; // Permissions step only
  screen: { width: number; height: number; insets: GuideInsets };
  keyboardOpen: boolean;
  reducedMotion: boolean;
  from: GuidePoint | null; // Current place of the mascot, null when it is not shown yet
  rowCenterY?: number; // Schedule step: height of the active row
  anchorY?: number; // Welcome step: height where the mascot stands, measured on the screen
  target?: GuidePoint; // Centre of the element to point at
}

export interface GuideTransition {
  mode: GuideTransitionMode;
  durationMs: number;
  arcHeightDp: number;
  arcSign: 1 | -1; // 1 bulges upward, -1 downward
  armDelayMs: number;
  squash: boolean; // Landing squash, only with motion
  bounceEntry: boolean; // First entry from below
}

export interface GuidePointAt {
  arm: 'left' | 'right';
  angleDeg: number;
}

export interface GuidePlacement {
  center: GuidePoint;
  size: GuideSize;
  pose: GuidePose;
  pointAt: GuidePointAt | null;
  bubbleVisible: boolean;
  bubbleMaxWidth: number;
  transition: GuideTransition;
  compact: boolean; // Small screen or landscape: a corner, bubble only
}

const MAX_ARM_ANGLE_DEG = 160;

export type GuidePermissionOutcome = 'ask' | 'granted' | 'denied';

export interface GuideMessage {
  id: MascotMessageId;
  mood: MascotMood;
}

/** What the mascot says on each step of the onboarding, and the mood it says it in. */
export function guideMessageFor(step: GuideStep, permission: GuidePermissionOutcome): GuideMessage | null {
  switch (step) {
    case 'welcome':
      return { id: 'WELCOME', mood: 'happy' };
    case 'discover':
      return { id: 'DISCOVER_INTRO', mood: 'calm' };
    case 'personalize':
      return { id: 'PERSONALIZE_NAME', mood: 'calm' };
    case 'schedule':
      return { id: 'SCHEDULE_INTRO', mood: 'calm' };
    case 'permissions':
      if (permission === 'granted') return { id: 'PERMISSION_GRANTED', mood: 'party' };
      if (permission === 'denied') return { id: 'PERMISSION_DENIED', mood: 'calm' };
      return { id: 'PERMISSION_ASK', mood: 'calm' };
    case 'home':
      return null; // The home tour has its own messages
  }
}

/** What the mascot says as it points at each of the three discovery cards, in order. */
export const DISCOVER_CARD_MESSAGES: readonly GuideMessage[] = [
  { id: 'DISCOVER_REMINDER', mood: 'calm' },
  { id: 'DISCOVER_TASK', mood: 'calm' },
  { id: 'DISCOVER_EVENT', mood: 'calm' },
];

/** The onboarding screens, in order, as the router names them. */
export const ONBOARDING_STEPS: readonly GuideStep[] = ['welcome', 'discover', 'personalize', 'schedule', 'permissions'];

/**
 * Direction of a move between two steps. Jumping straight to the last one from an earlier one
 * is the "Passer" shortcut: a direct trip, not a stroll through the steps in between.
 */
export function guideDirection(from: GuideStep | null, to: GuideStep): GuideDirection {
  if (!from) return 'forward';
  const fromIndex = ONBOARDING_STEPS.indexOf(from);
  const toIndex = ONBOARDING_STEPS.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return 'forward';
  if (toIndex < fromIndex) return 'back';
  if (toIndex - fromIndex > 1) return 'skip';
  return 'forward';
}

/**
 * Arm that reaches a target and the angle to rotate it by. An arm hangs down at 0 degrees;
 * a target on the right turns the right arm to a negative angle, on the left to a positive one.
 */
export function computePointAt(from: GuidePoint, to: GuidePoint): GuidePointAt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const raw = (Math.atan2(-dx, dy) * 180) / Math.PI;
  // "+ 0" turns a negative zero into 0
  const angleDeg = Math.max(-MAX_ARM_ANGLE_DEG, Math.min(MAX_ARM_ANGLE_DEG, Math.round(raw * 10) / 10)) + 0;
  return { arm: dx >= 0 ? 'right' : 'left', angleDeg };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wantedSize(input: GuideInput): GuideSize {
  switch (input.step) {
    case 'welcome':
      return 96;
    case 'schedule':
      return 48;
    case 'permissions':
      return input.phase === 'done' ? 80 : 56;
    case 'personalize':
      return input.keyboardOpen ? 40 : 56;
    case 'discover':
    case 'home':
      return 56;
  }
}

function wantedPose(input: GuideInput): GuidePose {
  switch (input.step) {
    case 'welcome':
      return input.reducedMotion ? 'rest' : 'greet';
    case 'discover':
    case 'schedule':
      return input.target ? 'pointAt' : 'rest';
    case 'personalize':
      return input.target ? 'pointAt' : 'attentive';
    case 'permissions':
      return input.phase === 'done' ? 'happy' : 'attentive';
    case 'home':
      return 'rest';
  }
}

function placeInBand(input: GuideInput, size: GuideSize, band: { top: number; bottom: number }): GuidePoint {
  const { width, insets } = input.screen;
  const half = size / 2;
  const left = insets.left + GUIDE_LAYOUT.edgeMargin + half;
  const right = width - insets.right - GUIDE_LAYOUT.edgeMargin - half;
  const topY = band.top + GUIDE_LAYOUT.edgeMargin + half;
  const span = band.bottom - band.top;

  switch (input.step) {
    case 'welcome':
      return { x: width / 2, y: input.anchorY ?? band.top + span * 0.35 };
    case 'discover':
      return { x: right, y: topY };
    case 'personalize':
    case 'home':
      return { x: left, y: topY };
    case 'schedule':
      return { x: right, y: input.rowCenterY ?? band.top + span / 2 };
    case 'permissions':
      return input.phase === 'done' ? { x: width / 2, y: band.top + span * 0.25 } : { x: right, y: topY };
  }
}

function buildTransition(input: GuideInput, to: GuidePoint, firstEntry: boolean): GuideTransition {
  const base = { armDelayMs: 0, squash: false, bounceEntry: false, arcHeightDp: 0, arcSign: 1 } as const;

  if (input.reducedMotion) {
    return { ...base, mode: 'fade', durationMs: GUIDE_MOTION.fadeMs };
  }

  if (!input.from) {
    return {
      ...base,
      mode: 'arc',
      durationMs: firstEntry ? GUIDE_MOTION.entryMs : GUIDE_MOTION.travelMs,
      squash: true,
      bounceEntry: firstEntry,
    };
  }

  const distance = Math.hypot(to.x - input.from.x, to.y - input.from.y);
  const arcHeightDp =
    input.direction === 'skip' ? 0 : Math.min(GUIDE_MOTION.maxArcDp, Math.round(distance * 0.25));

  return {
    mode: 'arc',
    durationMs: GUIDE_MOTION.travelMs,
    arcHeightDp,
    arcSign: input.direction === 'back' ? -1 : 1, // Going back follows the same path with the arc reversed
    armDelayMs: GUIDE_MOTION.armDelayMs,
    squash: true,
    bounceEntry: false,
  };
}

export function computeGuidePlacement(input: GuideInput): GuidePlacement {
  const { width, height, insets } = input.screen;
  const band = {
    top: insets.top + GUIDE_LAYOUT.topBarHeight,
    bottom: height - insets.bottom - GUIDE_LAYOUT.buttonZoneHeight,
  };

  const compact = height < GUIDE_LAYOUT.smallScreenHeight || width > height;
  let size: GuideSize = compact ? 40 : wantedSize(input);

  // Not enough free height between the top bar and the button zone: shrink to the smallest size
  if (band.bottom - band.top < size + 2 * GUIDE_LAYOUT.edgeMargin) size = 40;

  const raw = compact
    ? {
        x: insets.left + GUIDE_LAYOUT.edgeMargin + 20,
        y: band.top + GUIDE_LAYOUT.edgeMargin + 20,
      }
    : placeInBand(input, size, band);

  const half = size / 2;
  const center = {
    x: clamp(raw.x, insets.left + half, width - insets.right - half),
    y: clamp(raw.y, band.top + half, Math.max(band.top + half, band.bottom - half)),
  };

  const pose = wantedPose(input);
  const firstEntry = input.step === 'welcome' && !input.from;

  return {
    center,
    size,
    pose,
    pointAt: pose === 'pointAt' && input.target ? computePointAt(center, input.target) : null,
    bubbleVisible: !input.keyboardOpen,
    bubbleMaxWidth: Math.round(width * GUIDE_LAYOUT.bubbleMaxWidthRatio),
    transition: buildTransition(input, center, firstEntry),
    compact,
  };
}

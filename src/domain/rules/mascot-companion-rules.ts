/**
 * Pure rules for the Pulse companion: the one mascot that follows the user from screen to screen.
 *
 * They answer four questions without React or SQLite: which kind of screen is this, where does
 * the mascot wait on it, how does it travel when the screen changes, and how does it look and
 * stand (mood, pose, bubble) while it waits or reacts. The place is returned as a GuidePlacement,
 * so the mover that already guides the onboarding can draw it as it is.
 *
 * Rules kept here: the mascot never covers a text field (it steps aside when the keyboard is
 * open), keeps off the main button zone, and is simply not there when the user turned it off.
 */

import {
  buildTransition,
  computePointAt,
  GUIDE_LAYOUT,
  GuideDirection,
  GuideInsets,
  GuidePlacement,
  GuidePoint,
  GuidePointAt,
  GuidePose,
  GuideSize,
} from './mascot-guide-rules';
import type { MascotMessageId } from './mascot-message-catalog';
import type { MascotMood } from './mascot-mood-rules';
import type { MascotPresence } from './mascot-preferences';
import type { MascotEventType, MascotReactionLevel } from './mascot-reaction-rules';

// ─── Which screen is this ───────────────────────────────────────────────────────────────────

export type CompanionScreen =
  | 'home'
  | 'reminders'
  | 'tasks'
  | 'calendar'
  | 'people'
  | 'pulse'
  | 'list' // Stack list with a floating button: reminders, habits, goals
  | 'detail' // One item: task, reminder, person, event, habit, goal
  | 'form' // Creating or editing, or the quick capture
  | 'settings'
  | 'search'
  | 'sanctum'
  | 'focus'
  | 'onboarding' // The onboarding has its own guide
  | 'other';

export const TAB_SCREENS: readonly CompanionScreen[] = ['home', 'reminders', 'tasks', 'calendar', 'people', 'pulse'];

const TAB_SEGMENTS: Readonly<Record<string, CompanionScreen>> = {
  index: 'home',
  reminders: 'reminders',
  tasks: 'tasks',
  calendar: 'calendar',
  people: 'people',
  pulse: 'pulse',
};

const LIST_ROOTS: readonly string[] = ['reminders', 'habits', 'goals'];
const ITEM_ROOTS: readonly string[] = ['reminders', 'tasks', 'people', 'events', 'habits', 'goals'];

/** The kind of screen a router path stands for. Works from `useSegments()`. */
export function companionScreenFromSegments(segments: readonly string[]): CompanionScreen {
  const [first, second] = segments;
  if (!first) return 'other';
  if (first === '(onboarding)') return 'onboarding';
  if (first === '(tabs)') return TAB_SEGMENTS[second ?? 'index'] ?? 'other';

  switch (first) {
    case 'capture':
      return 'form';
    case 'settings':
      return 'settings';
    case 'search':
      return 'search';
    case 'sanctum':
      return 'sanctum';
    case 'focus':
      return 'focus';
  }

  if (ITEM_ROOTS.includes(first)) {
    if (second === 'new' || second === 'edit') return 'form';
    if (second === undefined || second === 'index') return LIST_ROOTS.includes(first) ? 'list' : 'other';
    return 'detail';
  }
  return 'other';
}

// ─── Where it waits ─────────────────────────────────────────────────────────────────────────

/**
 * - dock: low on the screen, above the tab bar when there is one, beside the floating button
 * - peek: small, in the top corner under the header. No screen uses it for now: forms, details,
 *   settings and search have fields or chips right under their header, which it would cover
 * - hidden: not there (private space, focus session, onboarding which has its own guide)
 */
export type CompanionZone = 'dock' | 'peek' | 'hidden';

export interface CompanionProfile {
  zone: CompanionZone;
  /** True when the floating tab bar sits at the bottom of the screen. */
  tabBar: boolean;
  /** The side it waits on: the one away from the main button, which is on the right. */
  side: 'left' | 'right';
  size: GuideSize;
}

const TAB_PROFILE: CompanionProfile = { zone: 'dock', tabBar: true, side: 'left', size: 48 };
const HIDDEN_PROFILE: CompanionProfile = { zone: 'hidden', tabBar: false, side: 'left', size: 40 };

export const COMPANION_PROFILES: Readonly<Record<CompanionScreen, CompanionProfile>> = {
  home: TAB_PROFILE,
  reminders: TAB_PROFILE,
  tasks: TAB_PROFILE,
  calendar: TAB_PROFILE,
  people: TAB_PROFILE,
  pulse: TAB_PROFILE,
  list: { zone: 'dock', tabBar: false, side: 'left', size: 48 },
  detail: HIDDEN_PROFILE,
  form: HIDDEN_PROFILE,
  settings: HIDDEN_PROFILE,
  search: HIDDEN_PROFILE,
  sanctum: HIDDEN_PROFILE,
  focus: HIDDEN_PROFILE,
  onboarding: HIDDEN_PROFILE,
  other: HIDDEN_PROFILE,
};

/** Height at the bottom taken by the floating tab bar, bottom inset not included. */
export const COMPANION_TAB_BAR_RESERVE = 110;
/** Room kept under the mascot on a screen without tab bar. */
export const COMPANION_BOTTOM_MARGIN = 24;
/** Width above which a bubble stops growing: on a tablet it stays a bubble, not a banner. */
export const COMPANION_BUBBLE_MAX_WIDTH = 360;

// ─── How it travels ─────────────────────────────────────────────────────────────────────────

/** Depth of a screen in the navigation: tabs at the root, lists one level in, items two. */
const SCREEN_DEPTH: Readonly<Record<CompanionScreen, number>> = {
  home: 0,
  reminders: 0,
  tasks: 0,
  calendar: 0,
  people: 0,
  pulse: 0,
  list: 1,
  settings: 1,
  search: 1,
  sanctum: 1,
  focus: 1,
  detail: 2,
  form: 2,
  onboarding: 0,
  other: 1,
};

/**
 * How the mascot moves from one screen to the next. Between tabs it follows the tab bar: to the
 * right is forward, to the left is back, and a jump over a tab is a straight trip. Going deeper
 * is forward, coming out is back.
 */
export function companionDirection(from: CompanionScreen | null, to: CompanionScreen): GuideDirection {
  if (!from || from === to) return 'forward';
  const fromTab = TAB_SCREENS.indexOf(from);
  const toTab = TAB_SCREENS.indexOf(to);
  if (fromTab >= 0 && toTab >= 0) {
    if (Math.abs(toTab - fromTab) > 1) return 'skip';
    return toTab > fromTab ? 'forward' : 'back';
  }
  return SCREEN_DEPTH[to] < SCREEN_DEPTH[from] ? 'back' : 'forward';
}

export interface CompanionPlacementInput {
  screen: CompanionScreen;
  presence: MascotPresence;
  direction: GuideDirection;
  window: { width: number; height: number; insets: GuideInsets };
  keyboardOpen: boolean;
  reducedMotion: boolean;
  /** Where the mascot stands now, null when it is not shown yet. */
  from: GuidePoint | null;
  /**
   * A place the screen itself holds for the mascot (the header of the home screen, the hero of
   * the Pulse tab), measured in the same coordinates as the window. It replaces the default
   * place and size: the screen decides where its own mascot stands.
   */
  anchor?: { center: GuidePoint; size: GuideSize };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Where the companion waits on a screen, and how it gets there. Null when it should not be
 * shown: the user turned it off, the screen is private or has its own guide, or the keyboard
 * is open (it never covers a field).
 */
export function computeCompanionPlacement(input: CompanionPlacementInput): GuidePlacement | null {
  const profile = COMPANION_PROFILES[input.screen];
  if (input.presence === 'off' || profile.zone === 'hidden' || input.keyboardOpen) return null;

  const { width, height, insets } = input.window;
  const compact = height < GUIDE_LAYOUT.smallScreenHeight || width > height;
  const size: GuideSize = input.anchor ? input.anchor.size : compact ? 40 : profile.size;
  const half = size / 2;

  let x: number;
  let y: number;
  if (input.anchor) {
    x = input.anchor.center.x;
    y = input.anchor.center.y;
  } else {
    x =
      profile.side === 'left'
        ? insets.left + GUIDE_LAYOUT.edgeMargin + half
        : width - insets.right - GUIDE_LAYOUT.edgeMargin - half;
    if (profile.zone === 'peek') {
      y = insets.top + GUIDE_LAYOUT.topBarHeight + GUIDE_LAYOUT.edgeMargin + half;
    } else {
      const reserve = profile.tabBar ? COMPANION_TAB_BAR_RESERVE : COMPANION_BOTTOM_MARGIN;
      y = height - insets.bottom - reserve - half;
    }
  }

  const center = {
    x: clamp(x, insets.left + half, width - insets.right - half),
    y: clamp(y, insets.top + half, height - insets.bottom - half),
  };

  return {
    center,
    size,
    pose: 'rest',
    pointAt: null,
    bubbleVisible: true,
    bubbleMaxWidth: Math.min(COMPANION_BUBBLE_MAX_WIDTH, Math.round(width * GUIDE_LAYOUT.bubbleMaxWidthRatio)),
    transition: buildTransition(input, center, false),
    compact,
  };
}

// ─── How it looks and stands ────────────────────────────────────────────────────────────────

/**
 * How long the mood of a reaction stays on the mascot, face and arms, once its gesture is over: long
 * enough for the user to see it. The gesture itself keeps the short duration of the reaction rules.
 * Only the doze, which has its own rules below, is not held this way.
 */
export const COMPANION_EXPRESSION_HOLD_MS: Readonly<Record<MascotReactionLevel, number>> = {
  micro: 2500,
  small: 3500,
  medium: 4500,
  large: 6000,
};

/** After this long without a touch, a calm or happy mascot dozes off. */
export const COMPANION_DOZE_AFTER_MS = 60_000;

export interface CompanionBehaviorInput {
  /** The mood of the day, as the mood rules derive it. */
  baseMood: MascotMood;
  /** The reaction being played, null when nothing happens. */
  reaction: { mood: MascotMood; level: MascotReactionLevel } | null;
  /** Time since the last touch on the app. */
  idleMs: number;
  screen: CompanionScreen;
  /** True while the mascot looks at the main button of the screen (see glanceTarget). */
  glancing?: boolean;
}

export interface CompanionBehavior {
  mood: MascotMood;
  pose: GuidePose;
}

const JOYFUL_MOODS: readonly MascotMood[] = ['happy', 'party'];
const DOZING_MOODS: readonly MascotMood[] = ['calm', 'happy'];
/** Screens where the user is busy with one thing: the mascot looks on, attentive. */
const ATTENTIVE_SCREENS: readonly CompanionScreen[] = ['form', 'detail'];

/**
 * Mood and pose of the companion. A reaction wins over everything: it takes its own mood, and
 * only a medium or large one raises the arms. Without a reaction the mascot dozes when nothing
 * has happened for a while (unless something is alert), looks on while the user fills a form,
 * and rests otherwise.
 */
export function companionBehavior(input: CompanionBehaviorInput): CompanionBehavior {
  if (input.reaction) {
    const { mood, level } = input.reaction;
    if (level === 'micro' || level === 'small') return { mood, pose: 'rest' };
    return { mood, pose: JOYFUL_MOODS.includes(mood) ? 'happy' : 'attentive' };
  }

  if (input.idleMs >= COMPANION_DOZE_AFTER_MS && DOZING_MOODS.includes(input.baseMood)) {
    return { mood: 'sleepy', pose: 'rest' };
  }

  if (input.glancing) return { mood: input.baseMood, pose: 'pointAt' };
  if (ATTENTIVE_SCREENS.includes(input.screen)) return { mood: input.baseMood, pose: 'attentive' };
  return { mood: input.baseMood, pose: 'rest' };
}

// ─── What the user can do here ──────────────────────────────────────────────────────────────

/** After this long on a screen without a touch, the mascot points at the main button. */
export const COMPANION_GLANCE_AFTER_MS = 12_000;
/** How long it keeps pointing. */
export const COMPANION_GLANCE_FOR_MS = 2_500;

/** Screens with a floating button on the right, which is what the user can do there. */
const MAIN_BUTTON_SCREENS: readonly CompanionScreen[] = ['reminders', 'tasks', 'calendar', 'people', 'list'];
/** Centre of the floating button from the right edge of the screen. */
const MAIN_BUTTON_CENTER_FROM_EDGE = GUIDE_LAYOUT.edgeMargin + 28;

/**
 * Where the main button of the screen is, as the mascot sees it from where it waits: on the
 * right, at its own height. Null on a screen without such a button, or when the mascot does not
 * wait on the left (the Home and Pulse mascot stands in the screen itself).
 */
export function glanceTarget(
  screen: CompanionScreen,
  placement: GuidePlacement,
  window: { width: number; insets: GuideInsets }
): GuidePoint | null {
  if (!MAIN_BUTTON_SCREENS.includes(screen) || COMPANION_PROFILES[screen].zone !== 'dock') return null;
  if (placement.center.x > window.width / 2) return null;
  return { x: window.width - window.insets.right - MAIN_BUTTON_CENTER_FROM_EDGE, y: placement.center.y };
}

/** The arm that reaches the target, from where the mascot stands. */
export function glancePointAt(placement: GuidePlacement, target: GuidePoint): GuidePointAt {
  return computePointAt(placement.center, target);
}

/**
 * What the companion says after a reaction, by the event that caused it. Events that already
 * have their own bubble (a reminder arriving, an event approaching) or that mean nothing to
 * celebrate (a deletion, a snooze) say nothing here.
 */
export function reactionMessageId(eventType: MascotEventType): MascotMessageId | null {
  switch (eventType) {
    case 'TASK_COMPLETED':
    case 'REMINDER_COMPLETED':
    case 'FOCUS_COMPLETED':
    case 'HABIT_COMPLETED':
    case 'HABIT_RESUMED':
    case 'SUGGESTION_ACCEPTED':
    case 'BACKUP_DONE':
      return 'REACT_DONE';
    case 'DAY_CLEARED':
      return 'REACT_DAY_CLEARED';
    case 'GOAL_COMPLETED':
      return 'REACT_GOAL';
    case 'PERSON_CONTACTED':
      return 'REACT_CONTACT';
    default:
      return null;
  }
}

/**
 * Whether a reaction also gets a short bubble. Small ones are only a gesture of the body and
 * arms. A discreet mascot speaks only for the large ones, a full one for medium and large.
 */
export function reactionHasBubble(level: MascotReactionLevel, presence: MascotPresence): boolean {
  if (presence === 'off') return false;
  if (presence === 'discreet') return level === 'large';
  return level === 'medium' || level === 'large';
}

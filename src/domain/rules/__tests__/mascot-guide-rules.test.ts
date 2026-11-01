/**
 * Unit tests for the onboarding guide placement.
 */

import {
  computeGuidePlacement,
  computePointAt,
  GUIDE_LAYOUT,
  GUIDE_MOTION,
  GUIDE_SIZES,
  GuideInput,
  GuideStep,
  guideDirection,
  guideMessageFor,
} from '../mascot-guide-rules';

const PHONE = { width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

const input = (overrides: Partial<GuideInput> = {}): GuideInput => ({
  step: 'discover',
  direction: 'forward',
  screen: PHONE,
  keyboardOpen: false,
  reducedMotion: false,
  from: { x: 100, y: 300 },
  ...overrides,
});

const place = (overrides: Partial<GuideInput> = {}) => computeGuidePlacement(input(overrides));

const forbidden = {
  topBarBottom: PHONE.insets.top + GUIDE_LAYOUT.topBarHeight,
  buttonZoneTop: PHONE.height - PHONE.insets.bottom - GUIDE_LAYOUT.buttonZoneHeight,
};

describe('computePointAt', () => {
  it('turns the right arm to a negative angle for a target on the right', () => {
    expect(computePointAt({ x: 100, y: 100 }, { x: 200, y: 200 })).toEqual({ arm: 'right', angleDeg: -45 });
  });

  it('turns the left arm to a positive angle for a target on the left', () => {
    expect(computePointAt({ x: 100, y: 100 }, { x: 0, y: 200 })).toEqual({ arm: 'left', angleDeg: 45 });
  });

  it('hangs straight down for a target right below', () => {
    expect(computePointAt({ x: 100, y: 100 }, { x: 100, y: 300 }).angleDeg).toBe(0);
  });

  it('points sideways for a target at the same height', () => {
    expect(computePointAt({ x: 100, y: 100 }, { x: 300, y: 100 })).toEqual({ arm: 'right', angleDeg: -90 });
  });

  it('never passes the maximum angle', () => {
    expect(Math.abs(computePointAt({ x: 100, y: 100 }, { x: 100, y: 0 }).angleDeg)).toBeLessThanOrEqual(160);
  });
});

describe('sizes', () => {
  it.each<[GuideStep, number]>([
    ['welcome', 96],
    ['discover', 56],
    ['personalize', 56],
    ['schedule', 48],
    ['permissions', 56],
    ['home', 56],
  ])('step %s uses %i px', (step, size) => {
    expect(place({ step }).size).toBe(size);
  });

  it('grows to 80 px once the permission is answered', () => {
    expect(place({ step: 'permissions', phase: 'done' }).size).toBe(80);
  });

  it('shrinks to 40 px while typing', () => {
    expect(place({ step: 'personalize', keyboardOpen: true }).size).toBe(40);
  });

  it('only ever uses the five allowed sizes', () => {
    const steps: GuideStep[] = ['welcome', 'discover', 'personalize', 'schedule', 'permissions', 'home'];
    for (const step of steps) {
      for (const keyboardOpen of [false, true]) {
        for (const phase of ['ask', 'done'] as const) {
          expect(GUIDE_SIZES).toContain(place({ step, keyboardOpen, phase }).size);
        }
      }
    }
  });
});

describe('places', () => {
  it('centres the welcome', () => {
    expect(place({ step: 'welcome', from: null }).center.x).toBe(PHONE.width / 2);
  });

  it('goes top right on the discovery step', () => {
    const { center, size } = place({ step: 'discover' });
    expect(center.x).toBe(PHONE.width - GUIDE_LAYOUT.edgeMargin - size / 2);
  });

  it('goes top left on the personalisation and the home screens', () => {
    for (const step of ['personalize', 'home'] as const) {
      const { center, size } = place({ step });
      expect(center.x).toBe(GUIDE_LAYOUT.edgeMargin + size / 2);
    }
  });

  it('follows the active row on the schedule step', () => {
    expect(place({ step: 'schedule', rowCenterY: 400 }).center).toMatchObject({ y: 400 });
  });

  it('moves to the centre once the permission is answered', () => {
    expect(place({ step: 'permissions', phase: 'ask' }).center.x).toBeGreaterThan(PHONE.width / 2);
    expect(place({ step: 'permissions', phase: 'done' }).center.x).toBe(PHONE.width / 2);
  });

  it('respects the safe areas', () => {
    const insets = { top: 47, bottom: 34, left: 44, right: 44 };
    const { center, size } = place({ step: 'discover', screen: { ...PHONE, insets } });
    expect(center.x + size / 2).toBeLessThanOrEqual(PHONE.width - insets.right);
    const left = place({ step: 'personalize', screen: { ...PHONE, insets } });
    expect(left.center.x - left.size / 2).toBeGreaterThanOrEqual(insets.left);
  });
});

describe('forbidden zones', () => {
  const steps: GuideStep[] = ['welcome', 'discover', 'personalize', 'schedule', 'permissions', 'home'];

  it.each([
    ['normal', PHONE],
    ['large safe areas', { ...PHONE, insets: { top: 80, bottom: 60, left: 0, right: 0 } }],
    ['small phone', { width: 360, height: 640, insets: { top: 24, bottom: 0, left: 0, right: 0 } }],
  ])('never covers the top bar or the button zone on a %s screen', (_label, screen) => {
    const top = screen.insets.top + GUIDE_LAYOUT.topBarHeight;
    const bottom = screen.height - screen.insets.bottom - GUIDE_LAYOUT.buttonZoneHeight;
    for (const step of steps) {
      for (const rowCenterY of [undefined, 0, 5000]) {
        const { center, size } = place({ step, screen, rowCenterY });
        expect(center.y - size / 2).toBeGreaterThanOrEqual(top);
        expect(center.y + size / 2).toBeLessThanOrEqual(bottom);
      }
    }
  });

  it('keeps clear of the top bar and the button on the reference phone', () => {
    const { center, size } = place({ step: 'schedule', rowCenterY: 5000 });
    expect(center.y + size / 2).toBeLessThanOrEqual(forbidden.buttonZoneTop);
    expect(place({ step: 'schedule', rowCenterY: 0 }).center.y - 24).toBeGreaterThanOrEqual(forbidden.topBarBottom);
  });
});

describe('compact screens', () => {
  it.each([
    ['short', { width: 360, height: 560, insets: { top: 24, bottom: 0, left: 0, right: 0 } }],
    ['landscape', { width: 844, height: 390, insets: { top: 0, bottom: 21, left: 47, right: 47 } }],
  ])('uses a 40 px corner on a %s screen and keeps the bubble', (_label, screen) => {
    const result = place({ step: 'welcome', screen });
    expect(result).toMatchObject({ size: 40, compact: true, bubbleVisible: true });
    expect(result.center.x).toBeLessThan(screen.width / 2);
  });

  it('is not compact on a normal phone', () => {
    expect(place().compact).toBe(false);
  });
});

describe('bubble', () => {
  it('never exceeds 70 % of the width', () => {
    expect(place().bubbleMaxWidth).toBe(Math.round(PHONE.width * 0.7));
  });

  it('folds while the keyboard is open', () => {
    expect(place({ step: 'personalize', keyboardOpen: true }).bubbleVisible).toBe(false);
    expect(place({ step: 'personalize', keyboardOpen: false }).bubbleVisible).toBe(true);
  });
});

describe('poses', () => {
  it('greets on the welcome, calmly with reduced motion', () => {
    expect(place({ step: 'welcome', from: null }).pose).toBe('greet');
    expect(place({ step: 'welcome', from: null, reducedMotion: true }).pose).toBe('rest');
  });

  it('points at a target and computes the arm', () => {
    const result = place({ step: 'discover', target: { x: 100, y: 400 } });
    expect(result.pose).toBe('pointAt');
    expect(result.pointAt).not.toBeNull();
    expect(result.pointAt?.arm).toBe('left');
  });

  it('rests on the discovery step without a target', () => {
    expect(place({ step: 'discover' })).toMatchObject({ pose: 'rest', pointAt: null });
  });

  it('listens on the personalisation step and points at the active field', () => {
    expect(place({ step: 'personalize' }).pose).toBe('attentive');
    expect(place({ step: 'personalize', target: { x: 200, y: 300 } }).pose).toBe('pointAt');
  });

  it('asks attentively then celebrates a granted permission', () => {
    expect(place({ step: 'permissions', phase: 'ask' }).pose).toBe('attentive');
    expect(place({ step: 'permissions', phase: 'done' }).pose).toBe('happy');
  });
});

describe('transition', () => {
  it('moves along an arc of at most 24 dp in 400 ms', () => {
    const { transition } = place({ from: { x: 50, y: 100 } });
    expect(transition).toMatchObject({
      mode: 'arc',
      durationMs: GUIDE_MOTION.travelMs,
      armDelayMs: GUIDE_MOTION.armDelayMs,
      squash: true,
    });
    expect(transition.arcHeightDp).toBeLessThanOrEqual(GUIDE_MOTION.maxArcDp);
    expect(transition.arcHeightDp).toBeGreaterThan(0);
  });

  it('reverses the arc when going back', () => {
    expect(place({ direction: 'forward' }).transition.arcSign).toBe(1);
    expect(place({ direction: 'back' }).transition.arcSign).toBe(-1);
  });

  it('goes straight when the user skips', () => {
    expect(place({ direction: 'skip' }).transition.arcHeightDp).toBe(0);
  });

  it('does not arc when it hardly moves', () => {
    const { center } = place();
    expect(place({ from: center }).transition.arcHeightDp).toBe(0);
  });

  it('enters from below with a bounce the first time', () => {
    expect(place({ step: 'welcome', from: null }).transition).toMatchObject({
      bounceEntry: true,
      durationMs: GUIDE_MOTION.entryMs,
    });
  });

  it('only fades with reduced motion, without bounce, arc or squash', () => {
    for (const from of [null, { x: 50, y: 100 }]) {
      expect(place({ reducedMotion: true, from }).transition).toEqual({
        mode: 'fade',
        durationMs: GUIDE_MOTION.fadeMs,
        arcHeightDp: 0,
        arcSign: 1,
        armDelayMs: 0,
        squash: false,
        bounceEntry: false,
      });
    }
  });

  it('starts from the current position, never queues', () => {
    const a = place({ from: { x: 10, y: 10 } }).transition.arcHeightDp;
    const b = place({ from: { x: 200, y: 600 } }).transition.arcHeightDp;
    expect(a).toBe(GUIDE_MOTION.maxArcDp);
    expect(b).toBe(GUIDE_MOTION.maxArcDp);
  });
});

describe('guideMessageFor', () => {
  it.each([
    ['welcome', 'ask', 'WELCOME', 'happy'],
    ['discover', 'ask', 'DISCOVER_INTRO', 'calm'],
    ['personalize', 'ask', 'PERSONALIZE_NAME', 'calm'],
    ['schedule', 'ask', 'SCHEDULE_INTRO', 'calm'],
    ['permissions', 'ask', 'PERMISSION_ASK', 'calm'],
    ['permissions', 'granted', 'PERMISSION_GRANTED', 'party'],
    ['permissions', 'denied', 'PERMISSION_DENIED', 'calm'],
  ] as const)('%s with permission %s says %s in a %s mood', (step, permission, id, mood) => {
    expect(guideMessageFor(step, permission)).toEqual({ id, mood });
  });

  it('only speaks about the permission on the last step', () => {
    expect(guideMessageFor('welcome', 'granted')?.id).toBe('WELCOME');
    expect(guideMessageFor('schedule', 'denied')?.id).toBe('SCHEDULE_INTRO');
  });

  it('leaves the home screen to its own tour', () => {
    expect(guideMessageFor('home', 'ask')).toBeNull();
  });
});

describe('guideDirection', () => {
  it.each([
    [null, 'welcome', 'forward'],
    ['welcome', 'discover', 'forward'],
    ['discover', 'personalize', 'forward'],
    ['permissions', 'schedule', 'back'],
    ['discover', 'welcome', 'back'],
    ['welcome', 'permissions', 'skip'],
    ['discover', 'permissions', 'skip'],
    ['schedule', 'permissions', 'forward'],
    ['personalize', 'personalize', 'forward'],
    ['home', 'welcome', 'forward'],
  ] as const)('from %s to %s is %s', (from, to, expected) => {
    expect(guideDirection(from, to)).toBe(expected);
  });
});

describe('the welcome anchor', () => {
  it('stands where the screen says, inside the free band', () => {
    expect(place({ step: 'welcome', from: null, anchorY: 200 }).center.y).toBe(200);
  });

  it('is kept out of the top bar', () => {
    expect(place({ step: 'welcome', from: null, anchorY: 10 }).center.y - 48).toBeGreaterThanOrEqual(forbidden.topBarBottom);
  });

  it('falls back to the free band when the screen has not said', () => {
    expect(place({ step: 'welcome', from: null }).center.y).toBeGreaterThan(forbidden.topBarBottom);
  });
});

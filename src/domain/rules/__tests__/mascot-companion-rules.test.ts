import { GUIDE_LAYOUT, GUIDE_MOTION } from '../mascot-guide-rules';
import {
  COMPANION_BOTTOM_MARGIN,
  COMPANION_BUBBLE_MAX_WIDTH,
  COMPANION_DOZE_AFTER_MS,
  COMPANION_PROFILES,
  COMPANION_TAB_BAR_RESERVE,
  companionBehavior,
  CompanionBehaviorInput,
  companionDirection,
  CompanionPlacementInput,
  companionScreenFromSegments,
  CompanionScreen,
  computeCompanionPlacement,
  reactionHasBubble,
  TAB_SCREENS,
} from '../mascot-companion-rules';

const PHONE = { width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

const placementInput = (overrides: Partial<CompanionPlacementInput> = {}): CompanionPlacementInput => ({
  screen: 'tasks',
  presence: 'full',
  direction: 'forward',
  window: PHONE,
  keyboardOpen: false,
  reducedMotion: false,
  from: null,
  ...overrides,
});

const place = (overrides: Partial<CompanionPlacementInput> = {}) => computeCompanionPlacement(placementInput(overrides));

const behaviorInput = (overrides: Partial<CompanionBehaviorInput> = {}): CompanionBehaviorInput => ({
  baseMood: 'calm',
  reaction: null,
  idleMs: 0,
  screen: 'home',
  ...overrides,
});

describe('companionScreenFromSegments', () => {
  it.each<[string[], CompanionScreen]>([
    [[], 'other'],
    [['(tabs)'], 'home'],
    [['(tabs)', 'index'], 'home'],
    [['(tabs)', 'reminders'], 'reminders'],
    [['(tabs)', 'tasks'], 'tasks'],
    [['(tabs)', 'calendar'], 'calendar'],
    [['(tabs)', 'people'], 'people'],
    [['(tabs)', 'pulse'], 'pulse'],
    [['(tabs)', 'unknown'], 'other'],
    [['(onboarding)', 'discover'], 'onboarding'],
    [['reminders'], 'list'],
    [['reminders', 'index'], 'list'],
    [['habits'], 'list'],
    [['goals', 'index'], 'list'],
    [['reminders', '[id]'], 'detail'],
    [['reminders', 'edit', '[id]'], 'form'],
    [['tasks', '[id]'], 'detail'],
    [['people', '[id]'], 'detail'],
    [['events', '[id]'], 'detail'],
    [['habits', '[id]'], 'detail'],
    [['goals', '[id]'], 'detail'],
    [['tasks', 'new'], 'form'],
    [['events', 'new'], 'form'],
    [['people', 'new'], 'form'],
    [['habits', 'new'], 'form'],
    [['goals', 'new'], 'form'],
    [['reminders', 'new'], 'form'],
    [['capture'], 'form'],
    [['settings'], 'settings'],
    [['search'], 'search'],
    [['sanctum'], 'sanctum'],
    [['focus'], 'focus'],
    [['dev', 'mascot'], 'other'],
    [['tasks'], 'other'], // A path nobody links to
  ])('reads %j as %s', (segments, expected) => {
    expect(companionScreenFromSegments(segments)).toBe(expected);
  });
});

describe('profiles', () => {
  it('has one for every kind of screen', () => {
    const screens: CompanionScreen[] = [
      ...TAB_SCREENS,
      'list',
      'detail',
      'form',
      'settings',
      'search',
      'sanctum',
      'focus',
      'onboarding',
      'other',
    ];
    expect(Object.keys(COMPANION_PROFILES).sort()).toEqual([...screens].sort());
  });

  it('docks on every tab, above the tab bar', () => {
    for (const screen of TAB_SCREENS) {
      expect(COMPANION_PROFILES[screen]).toMatchObject({ zone: 'dock', tabBar: true });
    }
  });

  it('is absent from the private space, the focus session and the onboarding', () => {
    for (const screen of ['sanctum', 'focus', 'onboarding', 'other'] as const) {
      expect(COMPANION_PROFILES[screen].zone).toBe('hidden');
    }
  });

  it('only peeks on screens with a form or a bottom action', () => {
    for (const screen of ['form', 'detail', 'settings', 'search'] as const) {
      expect(COMPANION_PROFILES[screen]).toMatchObject({ zone: 'peek', size: 40 });
    }
  });
});

describe('companionDirection', () => {
  it('is forward on a first screen and when the screen does not change', () => {
    expect(companionDirection(null, 'home')).toBe('forward');
    expect(companionDirection('tasks', 'tasks')).toBe('forward');
  });

  it('follows the tab bar: right is forward, left is back', () => {
    expect(companionDirection('home', 'reminders')).toBe('forward');
    expect(companionDirection('tasks', 'reminders')).toBe('back');
  });

  it('goes straight over a tab', () => {
    expect(companionDirection('home', 'tasks')).toBe('skip');
    expect(companionDirection('pulse', 'home')).toBe('skip');
  });

  it('is forward going deeper and back coming out', () => {
    expect(companionDirection('tasks', 'detail')).toBe('forward');
    expect(companionDirection('detail', 'tasks')).toBe('back');
    expect(companionDirection('list', 'form')).toBe('forward');
    expect(companionDirection('form', 'list')).toBe('back');
  });
});

describe('computeCompanionPlacement', () => {
  it('is absent when the mascot is turned off', () => {
    expect(place({ presence: 'off' })).toBeNull();
  });

  it('is absent on a screen where it is hidden', () => {
    for (const screen of ['sanctum', 'focus', 'onboarding', 'other'] as const) {
      expect(place({ screen })).toBeNull();
    }
  });

  it('steps aside when the keyboard is open: it never covers a field', () => {
    for (const screen of ['tasks', 'form', 'search', 'list'] as const) {
      expect(place({ screen, keyboardOpen: true })).toBeNull();
    }
  });

  it('is there for a full and for a discreet presence', () => {
    expect(place({ presence: 'full' })).not.toBeNull();
    expect(place({ presence: 'discreet' })).not.toBeNull();
  });

  describe('docked on a tab', () => {
    it('waits on the left, away from the floating button on the right', () => {
      const placement = place({ screen: 'tasks' });
      expect(placement?.center.x).toBe(GUIDE_LAYOUT.edgeMargin + 24);
      expect(placement?.center.x).toBeLessThan(PHONE.width / 2);
    });

    it('stands above the tab bar and the bottom inset', () => {
      const placement = place({ screen: 'tasks' });
      const bottom = (placement?.center.y ?? 0) + (placement?.size ?? 0) / 2;
      expect(bottom).toBe(PHONE.height - PHONE.insets.bottom - COMPANION_TAB_BAR_RESERVE);
    });

    it('uses the same place on every tab, so it does not wander', () => {
      const places = TAB_SCREENS.map(screen => place({ screen })?.center);
      for (const center of places) expect(center).toEqual(places[0]);
    });
  });

  describe('docked on a list without tab bar', () => {
    it('stands lower, just above the bottom margin', () => {
      const placement = place({ screen: 'list' });
      const bottom = (placement?.center.y ?? 0) + (placement?.size ?? 0) / 2;
      expect(bottom).toBe(PHONE.height - PHONE.insets.bottom - COMPANION_BOTTOM_MARGIN);
    });
  });

  describe('peeking', () => {
    it('is small, on the right, under the top bar', () => {
      const placement = place({ screen: 'form' });
      expect(placement?.size).toBe(40);
      expect(placement?.center.x).toBe(PHONE.width - GUIDE_LAYOUT.edgeMargin - 20);
      const top = (placement?.center.y ?? 0) - 20;
      expect(top).toBeGreaterThanOrEqual(PHONE.insets.top + GUIDE_LAYOUT.topBarHeight);
    });
  });

  describe('on every screen where it shows', () => {
    const shown = (Object.keys(COMPANION_PROFILES) as CompanionScreen[]).filter(
      screen => COMPANION_PROFILES[screen].zone !== 'hidden'
    );
    const windows = [
      { name: 'small phone', width: 320, height: 568, insets: { top: 24, bottom: 0, left: 0, right: 0 } },
      { name: 'phone with a notch', ...PHONE },
      { name: 'phone in landscape', width: 844, height: 390, insets: { top: 0, bottom: 21, left: 47, right: 47 } },
      { name: 'tablet', width: 820, height: 1180, insets: { top: 24, bottom: 20, left: 0, right: 0 } },
      { name: 'wide window', width: 1280, height: 800, insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    ];

    it.each(windows)('stays fully inside the safe area of a $name', ({ name: _name, ...window }) => {
      for (const screen of shown) {
        const placement = place({ screen, window });
        expect(placement).not.toBeNull();
        if (!placement) continue;
        const half = placement.size / 2;
        expect(placement.center.x - half).toBeGreaterThanOrEqual(window.insets.left);
        expect(placement.center.x + half).toBeLessThanOrEqual(window.width - window.insets.right);
        expect(placement.center.y - half).toBeGreaterThanOrEqual(window.insets.top);
        expect(placement.center.y + half).toBeLessThanOrEqual(window.height - window.insets.bottom);
      }
    });

    it('shrinks to 40 on a short or landscape screen', () => {
      expect(place({ screen: 'tasks', window: windows[0] })?.size).toBe(40);
      expect(place({ screen: 'tasks', window: windows[2] })?.size).toBe(40);
      expect(place({ screen: 'tasks', window: windows[1] })?.size).toBe(48);
    });
  });

  describe('bubble', () => {
    it('is allowed, and never wider than 70 % of the width', () => {
      const placement = place();
      expect(placement?.bubbleVisible).toBe(true);
      expect(placement?.bubbleMaxWidth).toBe(Math.round(PHONE.width * 0.7));
    });

    it('stays a bubble on a tablet', () => {
      const placement = place({ window: { width: 1024, height: 1366, insets: PHONE.insets } });
      expect(placement?.bubbleMaxWidth).toBe(COMPANION_BUBBLE_MAX_WIDTH);
    });
  });

  describe('transition', () => {
    it('appears with a short trip, without the onboarding entry bounce', () => {
      const transition = place({ from: null })?.transition;
      expect(transition).toMatchObject({ mode: 'arc', durationMs: GUIDE_MOTION.travelMs, bounceEntry: false });
    });

    it('travels in an arc from where it stands', () => {
      const transition = place({ from: { x: 200, y: 300 } })?.transition;
      expect(transition?.mode).toBe('arc');
      expect(transition?.arcHeightDp).toBeGreaterThan(0);
      expect(transition?.armDelayMs).toBe(GUIDE_MOTION.armDelayMs);
    });

    it('reverses the arc going back and straightens it on a skip', () => {
      const from = { x: 200, y: 300 };
      expect(place({ from, direction: 'back' })?.transition.arcSign).toBe(-1);
      expect(place({ from, direction: 'skip' })?.transition.arcHeightDp).toBe(0);
    });

    it('fades instead of travelling with reduced motion', () => {
      const transition = place({ from: { x: 200, y: 300 }, reducedMotion: true })?.transition;
      expect(transition).toMatchObject({ mode: 'fade', durationMs: GUIDE_MOTION.fadeMs, squash: false });
    });
  });

  it('rests, pointing at nothing', () => {
    expect(place()).toMatchObject({ pose: 'rest', pointAt: null });
  });
});

describe('companionBehavior', () => {
  it('rests in the mood of the day when nothing happens', () => {
    expect(companionBehavior(behaviorInput({ baseMood: 'focused' }))).toEqual({ mood: 'focused', pose: 'rest' });
  });

  it('looks on while the user fills a form or reads an item', () => {
    for (const screen of ['form', 'detail'] as const) {
      expect(companionBehavior(behaviorInput({ screen, baseMood: 'calm' }))).toEqual({ mood: 'calm', pose: 'attentive' });
    }
  });

  describe('reaction', () => {
    it('takes its own mood over the mood of the day', () => {
      const result = companionBehavior(behaviorInput({ baseMood: 'calm', reaction: { mood: 'happy', level: 'small' } }));
      expect(result.mood).toBe('happy');
    });

    it('is a gesture of the body only when micro or small', () => {
      for (const level of ['micro', 'small'] as const) {
        expect(companionBehavior(behaviorInput({ reaction: { mood: 'happy', level } })).pose).toBe('rest');
      }
    });

    it('raises the arms of a joyful mascot when medium or large', () => {
      for (const level of ['medium', 'large'] as const) {
        for (const mood of ['happy', 'party'] as const) {
          expect(companionBehavior(behaviorInput({ reaction: { mood, level } })).pose).toBe('happy');
        }
      }
    });

    it('stays attentive, not joyful, for an alert or a calm one', () => {
      for (const mood of ['alert', 'calm', 'focused'] as const) {
        expect(companionBehavior(behaviorInput({ reaction: { mood, level: 'large' } })).pose).toBe('attentive');
      }
    });

    it('wakes a mascot that was dozing', () => {
      const result = companionBehavior(
        behaviorInput({ idleMs: COMPANION_DOZE_AFTER_MS * 2, reaction: { mood: 'happy', level: 'medium' } })
      );
      expect(result.mood).toBe('happy');
    });
  });

  describe('dozing', () => {
    it('falls asleep after a minute of nothing, when calm or happy', () => {
      for (const baseMood of ['calm', 'happy'] as const) {
        expect(companionBehavior(behaviorInput({ baseMood, idleMs: COMPANION_DOZE_AFTER_MS }))).toEqual({
          mood: 'sleepy',
          pose: 'rest',
        });
      }
    });

    it('does not doze before the minute is over', () => {
      expect(companionBehavior(behaviorInput({ idleMs: COMPANION_DOZE_AFTER_MS - 1 })).mood).toBe('calm');
    });

    it('never dozes while something needs attention or a session runs', () => {
      for (const baseMood of ['alert', 'focused', 'party'] as const) {
        expect(companionBehavior(behaviorInput({ baseMood, idleMs: COMPANION_DOZE_AFTER_MS * 5 })).mood).toBe(baseMood);
      }
    });
  });
});

describe('reactionHasBubble', () => {
  it('speaks for a medium or a large reaction when full', () => {
    expect(reactionHasBubble('micro', 'full')).toBe(false);
    expect(reactionHasBubble('small', 'full')).toBe(false);
    expect(reactionHasBubble('medium', 'full')).toBe(true);
    expect(reactionHasBubble('large', 'full')).toBe(true);
  });

  it('speaks only for a large reaction when discreet', () => {
    expect(reactionHasBubble('medium', 'discreet')).toBe(false);
    expect(reactionHasBubble('large', 'discreet')).toBe(true);
  });

  it('never speaks when off', () => {
    expect(reactionHasBubble('large', 'off')).toBe(false);
  });
});

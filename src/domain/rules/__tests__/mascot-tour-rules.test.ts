/**
 * Unit tests for the home tour and the first visit tips.
 */

import { MASCOT_MESSAGES } from '../mascot-message-catalog';
import {
  HOME_TOUR_TIP_ID,
  isHomeSegments,
  MIN_TOUR_STOPS,
  placeTourBubble,
  planTour,
  relativeToLayer,
  TIP_MESSAGES,
  TIP_SCREENS,
  tipKey,
  tipScreenFromSegments,
  TOUR_BUBBLE_HEIGHT,
  TOUR_GAP,
  TOUR_HIGHLIGHT_PADDING,
  TOUR_STOPS,
  TourRect,
  TourScreen,
} from '../mascot-tour-rules';

const SCREEN: TourScreen = { width: 375, height: 812, topInset: 47, bottomReserve: 110 };

const rect = (y: number, height = 80, x = 16, width = 343): TourRect => ({ x, y, width, height });

describe('first visit tips', () => {
  it('has a tip for each screen, in the catalogue', () => {
    expect(TIP_SCREENS).toEqual(['reminders', 'tasks', 'calendar', 'people', 'pulse']);
    for (const screen of TIP_SCREENS) {
      expect(MASCOT_MESSAGES).toHaveProperty(TIP_MESSAGES[screen]);
    }
  });

  it('remembers a tip under its own key', () => {
    expect(tipKey('tasks')).toBe('tip:tasks');
    expect(tipKey(HOME_TOUR_TIP_ID)).toBe('tip:tour:home');
  });

  it.each([
    [['(tabs)', 'tasks'], 'tasks'],
    [['(tabs)', 'reminders'], 'reminders'],
    [['(tabs)', 'calendar'], 'calendar'],
    [['(tabs)', 'people'], 'people'],
    [['(tabs)', 'pulse'], 'pulse'],
    [['(tabs)'], null],
    [['(tabs)', 'index'], null],
    [['settings'], null],
    [['(onboarding)', 'discover'], null],
    [[], null],
  ])('%j is the tip screen %s', (segments, expected) => {
    expect(tipScreenFromSegments(segments)).toBe(expected);
  });

  it.each([
    [['(tabs)'], true],
    [['(tabs)', 'index'], true],
    [['(tabs)', 'tasks'], false],
    [['settings'], false],
    [[], false],
  ])('%j is the home screen: %s', (segments, expected) => {
    expect(isHomeSegments(segments)).toBe(expected);
  });
});

describe('relativeToLayer', () => {
  it('leaves a rect alone when the layer starts at the window origin', () => {
    expect(relativeToLayer(rect(200), { x: 0, y: 0 })).toEqual(rect(200));
  });

  it('cancels a shift the platform puts on every window measure', () => {
    // Everything is measured 51 too high, the layer included (it really starts at 0): the target is at 200
    const target = rect(149);
    const layer = { x: 0, y: -51 };
    expect(relativeToLayer(target, layer)).toEqual(rect(200));
  });

  it('keeps the size', () => {
    const moved = relativeToLayer(rect(100, 60, 20, 300), { x: 4, y: 30 });
    expect(moved).toEqual({ x: 16, y: 70, width: 300, height: 60 });
  });
});

describe('the tour', () => {
  it('has four stops, each with a catalogue message', () => {
    expect(TOUR_STOPS.map(stop => stop.id)).toEqual(['pillars', 'quickAdd', 'timeline', 'mascot']);
    for (const stop of TOUR_STOPS) {
      expect(MASCOT_MESSAGES).toHaveProperty(stop.message);
    }
  });

  describe('planTour', () => {
    const all = { pillars: rect(120), quickAdd: rect(330, 56), timeline: rect(430, 40), mascot: rect(60, 60, 16, 60) };

    it('keeps every stop that is fully on screen, in tour order', () => {
      expect(planTour(all, SCREEN)).toEqual(['pillars', 'quickAdd', 'timeline', 'mascot']);
    });

    it('drops a target that was not measured', () => {
      expect(planTour({ ...all, quickAdd: null }, SCREEN)).toEqual(['pillars', 'timeline', 'mascot']);
      expect(planTour({ ...all, timeline: undefined }, SCREEN)).toEqual(['pillars', 'quickAdd', 'mascot']);
    });

    it.each([
      ['hidden under the top', rect(20)],
      ['cut by the tab bar', rect(700, 80)],
      ['pushed past the bottom', rect(900)],
      ['empty', rect(300, 0)],
      ['beyond the right edge', rect(300, 80, 200, 343)],
    ])('drops a target that is %s', (_label, bad) => {
      expect(planTour({ ...all, quickAdd: bad }, SCREEN)).toEqual(['pillars', 'timeline', 'mascot']);
    });

    it('gives no tour when fewer than two stops can be shown', () => {
      expect(planTour({ pillars: rect(120) }, SCREEN)).toEqual([]);
      expect(planTour({}, SCREEN)).toEqual([]);
      expect(MIN_TOUR_STOPS).toBe(2);
      expect(planTour({ pillars: rect(120), mascot: rect(60) }, SCREEN)).toEqual(['pillars', 'mascot']);
    });
  });

  describe('placeTourBubble', () => {
    it('goes under a target near the top', () => {
      const placement = placeTourBubble(rect(120, 150), SCREEN);
      expect(placement.side).toBe('below');
      expect(placement.top).toBe(120 - TOUR_HIGHLIGHT_PADDING + 150 + 2 * TOUR_HIGHLIGHT_PADDING + TOUR_GAP);
    });

    it('goes above a target near the bottom', () => {
      const placement = placeTourBubble(rect(560, 60), SCREEN);
      expect(placement.side).toBe('above');
      expect(placement.top).toBe(560 - TOUR_HIGHLIGHT_PADDING - TOUR_GAP - TOUR_BUBBLE_HEIGHT);
    });

    it('never goes above the top inset', () => {
      const tall: TourScreen = { ...SCREEN, height: 400 };
      expect(placeTourBubble(rect(60, 200), tall).top).toBeGreaterThanOrEqual(tall.topInset);
    });

    it('uses the measured height of the bubble: a tall one (large text) no longer fits under the target', () => {
      const target = rect(400, 100);
      expect(placeTourBubble(target, SCREEN, 150).side).toBe('below');
      expect(placeTourBubble(target, SCREEN, 250).side).toBe('above');
    });

    it('stays on screen when it fits on neither side of a large target on a short screen', () => {
      const short: TourScreen = { width: 360, height: 560, topInset: 24, bottomReserve: 80 };
      const target = rect(60, 340);
      for (const bubbleHeight of [150, 220]) {
        const placement = placeTourBubble(target, short, bubbleHeight);
        expect(placement.top).toBeGreaterThanOrEqual(short.topInset);
        expect(placement.top + bubbleHeight).toBeLessThanOrEqual(short.height - short.bottomReserve);
      }
    });

    it('rings the target with a small margin', () => {
      expect(placeTourBubble(rect(120, 80, 16, 343), SCREEN).highlight).toEqual({
        x: 16 - TOUR_HIGHLIGHT_PADDING,
        y: 120 - TOUR_HIGHLIGHT_PADDING,
        width: 343 + 2 * TOUR_HIGHLIGHT_PADDING,
        height: 80 + 2 * TOUR_HIGHLIGHT_PADDING,
      });
    });

    it('keeps the bubble clear of the target whichever side it takes', () => {
      for (const y of [60, 200, 400, 560, 640]) {
        const target = rect(y, 60);
        const placement = placeTourBubble(target, SCREEN);
        const bubbleBottom = placement.top + TOUR_BUBBLE_HEIGHT;
        const clear =
          placement.side === 'below'
            ? placement.top >= placement.highlight.y + placement.highlight.height
            : bubbleBottom <= placement.highlight.y || placement.top === SCREEN.topInset;
        expect(clear).toBe(true);
      }
    });
  });
});

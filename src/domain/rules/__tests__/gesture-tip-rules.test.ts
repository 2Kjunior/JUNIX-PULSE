import { GESTURE_TIPS, gestureTipDue, tipDay } from '../gesture-tip-rules';
import { MASCOT_MESSAGES } from '../mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../mascot-message-catalog-en';

const NOW = new Date('2026-11-24T15:00:00');
const swipe = GESTURE_TIPS.swipe;

describe('the gesture tips (study 001, 12.3; sheet 024)', () => {
  it('waits for a list of at least two cards', () => {
    expect(gestureTipDue({ tip: swipe, cardCount: 1, seen: false, lastTipDay: null, now: NOW })).toBe(false);
    expect(gestureTipDue({ tip: swipe, cardCount: 2, seen: false, lastTipDay: null, now: NOW })).toBe(true);
  });

  it('is given once', () => {
    expect(gestureTipDue({ tip: swipe, cardCount: 5, seen: true, lastTipDay: null, now: NOW })).toBe(false);
  });

  it('never on a day another tip was given', () => {
    expect(gestureTipDue({ tip: swipe, cardCount: 5, seen: false, lastTipDay: '2026-11-24', now: NOW })).toBe(false);
    expect(gestureTipDue({ tip: swipe, cardCount: 5, seen: false, lastTipDay: '2026-11-23', now: NOW })).toBe(true);
  });

  it('reads the day on the phone clock', () => {
    expect(tipDay(new Date('2026-01-05T23:30:00'))).toBe('2026-01-05');
  });

  it('has a sentence of Pulse in both languages for every tip', () => {
    for (const tip of Object.values(GESTURE_TIPS)) {
      expect(MASCOT_MESSAGES[tip.message]).toBeDefined();
      expect(MASCOT_MESSAGES_EN[tip.message]).toBeDefined();
    }
  });
});

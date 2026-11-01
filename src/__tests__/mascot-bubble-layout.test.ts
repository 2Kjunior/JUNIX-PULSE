/**
 * Where a bubble goes next to the mascot that speaks.
 */

import type { GuidePlacement } from '../domain/rules/mascot-guide-rules';
import { layoutBubble, layoutBubbleAbove } from '../features/mascot/mascot-bubble-layout';

const WINDOW = { width: 390, height: 844 };

const placement = (x: number, y: number, size: 40 | 48 | 56 = 48): GuidePlacement => ({
  center: { x, y },
  size,
  pose: 'rest',
  pointAt: null,
  bubbleVisible: true,
  bubbleMaxWidth: 273,
  transition: { mode: 'arc', durationMs: 400, arcHeightDp: 0, arcSign: 1, armDelayMs: 0, squash: false, bounceEntry: false },
  compact: false,
});

describe('layoutBubble', () => {
  it('goes to the right of a mascot at the left of the screen, tail towards it', () => {
    const layout = layoutBubble(placement(40, 100), WINDOW.width);
    expect(layout.tailSide).toBe('left');
    expect(layout.style.left).toBeGreaterThan(40);
  });

  it('goes to the left of a mascot at the right of the screen', () => {
    const layout = layoutBubble(placement(350, 100), WINDOW.width);
    expect(layout.tailSide).toBe('right');
  });

  it('goes under a mascot in the middle', () => {
    expect(layoutBubble(placement(195, 100), WINDOW.width).tailSide).toBe('top');
  });
});

describe('layoutBubbleAbove', () => {
  it('rises above the mascot with the tail pointing down at it', () => {
    const layout = layoutBubbleAbove(placement(40, 700), WINDOW);
    expect(layout.tailSide).toBe('bottom');
    // Its bottom edge sits over the top of the mascot, not beside it
    const mascotTop = 700 - 24;
    const bubbleBottomFromTop = WINDOW.height - (layout.style.bottom as number);
    expect(bubbleBottomFromTop).toBeLessThan(mascotTop);
  });

  it('keeps clear of the left edge and inside the right one', () => {
    const left = layoutBubbleAbove(placement(30, 700), WINDOW);
    expect(left.style.left as number).toBeGreaterThanOrEqual(12);
    const right = layoutBubbleAbove(placement(360, 700), WINDOW);
    expect((right.style.left as number) + right.maxWidth).toBeLessThanOrEqual(WINDOW.width - 12);
  });
});

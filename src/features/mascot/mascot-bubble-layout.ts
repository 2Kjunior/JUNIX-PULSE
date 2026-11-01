/**
 * Where a bubble goes next to the mascot that speaks: beside it when it stands at a side of the
 * screen, under it when it is central. Shared by the onboarding guide and the companion.
 */

import type { ViewStyle } from 'react-native';

import type { GuidePlacement } from '@/domain/rules/mascot-guide-rules';

import type { BubbleTailSide } from './MascotBubble';

const BUBBLE_GAP_DP = 6;
const EDGE_MARGIN_DP = 12;
const BUBBLE_ABOVE_GAP_DP = 12;
/** The whole drawing, arms included, is 1.5 times as wide as the orb. */
const FOOTPRINT_HALF_WIDTH = 0.78;

export interface BubbleLayout {
  style: ViewStyle;
  maxWidth: number;
  tailSide: BubbleTailSide;
  centered: boolean;
}

export function layoutBubble(placement: GuidePlacement, windowWidth: number): BubbleLayout {
  const { center, size } = placement;
  const reach = size * FOOTPRINT_HALF_WIDTH + BUBBLE_GAP_DP;

  if (center.x < windowWidth * 0.4) {
    const left = center.x + reach;
    return {
      style: { position: 'absolute', left, top: center.y - size / 2 },
      maxWidth: Math.min(placement.bubbleMaxWidth, windowWidth - left - EDGE_MARGIN_DP),
      tailSide: 'left',
      centered: false,
    };
  }

  if (center.x > windowWidth * 0.6) {
    const right = windowWidth - (center.x - reach);
    return {
      style: { position: 'absolute', right, top: center.y - size / 2 },
      maxWidth: Math.min(placement.bubbleMaxWidth, center.x - reach - EDGE_MARGIN_DP),
      tailSide: 'right',
      centered: false,
    };
  }

  return {
    style: { position: 'absolute', left: 0, right: 0, top: center.y + size / 2 + 12, alignItems: 'center' },
    maxWidth: placement.bubbleMaxWidth,
    tailSide: 'top',
    centered: true,
  };
}

/**
 * A bubble above a mascot that waits low on the screen, next to the floating button and over
 * the tab bar: beside it the bubble would cover the button, so it rises above instead, its tail
 * pointing down at the mascot.
 */
export function layoutBubbleAbove(placement: GuidePlacement, windowSize: { width: number; height: number }): BubbleLayout {
  const { center, size } = placement;
  const left = Math.max(EDGE_MARGIN_DP, center.x - size * FOOTPRINT_HALF_WIDTH);
  return {
    style: { position: 'absolute', left, bottom: windowSize.height - (center.y - size / 2) + BUBBLE_ABOVE_GAP_DP },
    maxWidth: Math.min(placement.bubbleMaxWidth, windowSize.width - left - EDGE_MARGIN_DP),
    tailSide: 'bottom',
    centered: false,
  };
}

/**
 * CompanionAnchor: the place a screen holds for the mascot, where the companion comes to stand.
 *
 * It takes the room the mascot needs, draws nothing, and tells how to measure itself. The
 * companion asks for the measure when the user arrives on the screen, so nothing is computed on
 * every render. The mascot on the screen is the companion: there is never a second one.
 */

import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import type { CompanionScreen } from '@/domain/rules/mascot-companion-rules';
import type { GuideSize } from '@/domain/rules/mascot-guide-rules';
import type { TourRect } from '@/domain/rules/mascot-tour-rules';

import { mascotDimensions } from './mascot-visuals';

/** The screens that hold a place for the companion, and the size it takes there. */
export const ANCHORED_SCREENS: Readonly<Partial<Record<CompanionScreen, GuideSize>>> = {
  home: 56,
  pulse: 96,
};

const measurers = new Map<CompanionScreen, () => Promise<TourRect | null>>();

/** The place a screen holds for the mascot, in window coordinates, or null when it has none now. */
export async function measureCompanionAnchor(screen: CompanionScreen): Promise<TourRect | null> {
  const measure = measurers.get(screen);
  return measure ? measure() : null;
}

interface CompanionAnchorProps {
  screen: CompanionScreen;
  size: GuideSize;
  style?: StyleProp<ViewStyle>;
}

export function CompanionAnchor({ screen, size, style }: CompanionAnchorProps) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const { width, height } = mascotDimensions(size);

  useEffect(() => {
    measurers.set(screen, () => {
      return new Promise<TourRect | null>(resolve => {
        const node = ref.current;
        if (!node) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, w, h) => {
          resolve(w > 0 && h > 0 ? { x, y, width: w, height: h } : null);
        });
      });
    });
    return () => {
      measurers.delete(screen);
    };
  }, [screen]);

  // collapsable=false keeps the view on Android, where an empty view would be flattened away
  return (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height }, style]}
    />
  );
}

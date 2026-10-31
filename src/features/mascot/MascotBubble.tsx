/**
 * Message bubble of the Pulse mascot: glass, text only, at most two sentences,
 * never wider than 70 % of the screen, with a tail turned towards the mascot.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MascotGlassShell, useMascotGlassColors } from './MascotGlassShell';

export type BubbleTailSide = 'left' | 'right' | 'top' | 'bottom';

export interface MascotBubbleProps {
  text: string;
  /** Widest the bubble may be, in dp. Use 70 % of the window width. */
  maxWidth: number;
  /** Side of the bubble that faces the mascot. */
  tailSide?: BubbleTailSide;
  style?: StyleProp<ViewStyle>;
}

const TAIL_SIZE = 12;
const TAIL_OFFSET = 22;

function tailPosition(side: BubbleTailSide): ViewStyle {
  const half = -TAIL_SIZE / 2;
  switch (side) {
    case 'left':
      return { left: half, top: TAIL_OFFSET };
    case 'right':
      return { right: half, top: TAIL_OFFSET };
    case 'top':
      return { top: half, left: TAIL_OFFSET };
    case 'bottom':
      return { bottom: half, left: TAIL_OFFSET };
  }
}

export function MascotBubble({ text, maxWidth, tailSide = 'left', style }: MascotBubbleProps) {
  const { palette } = useTheme();
  const glass = useMascotGlassColors();

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[{ maxWidth }, style]}>
      <MascotGlassShell>
        <View style={styles.content}>
          <Text style={[styles.text, { color: palette.onSurface.primary }]}>{text}</Text>
        </View>
      </MascotGlassShell>
      {/* The tail is drawn outside the clipped shell so it can stick out of the bubble */}
      <View
        pointerEvents="none"
        style={[
          styles.tail,
          tailPosition(tailSide),
          { backgroundColor: glass.backgroundColor, borderColor: glass.borderColor },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    ...Typography.bodyMedium,
  },
  tail: {
    position: 'absolute',
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    borderWidth: StyleSheet.hairlineWidth * 2,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});

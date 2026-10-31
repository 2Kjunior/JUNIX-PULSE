/**
 * Message bubble of the Pulse mascot: glass, text only, at most two sentences,
 * never wider than 70 % of the screen, with a tail turned towards the mascot.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MascotGlassShell, useMascotGlassColors } from './MascotGlassShell';

export type BubbleTailSide = 'left' | 'right' | 'top' | 'bottom';

export interface MascotBubbleAction {
  label: string;
  onPress: () => void;
  /** The suggested answer, drawn filled. */
  primary?: boolean;
  accessibilityLabel?: string;
}

export interface MascotBubbleProps {
  text: string;
  /** Answers to a proposal. The user always decides: the mascot only asks. */
  actions?: readonly MascotBubbleAction[];
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

export function MascotBubble({ text, actions, maxWidth, tailSide = 'left', style }: MascotBubbleProps) {
  const { palette } = useTheme();
  const glass = useMascotGlassColors();

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[{ maxWidth }, style]}>
      <MascotGlassShell>
        <View style={styles.content}>
          <Text style={[styles.text, { color: palette.onSurface.primary }]}>{text}</Text>
          {actions && actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map(action => (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={action.accessibilityLabel ?? action.label}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={[
                    styles.action,
                    action.primary
                      ? { backgroundColor: palette.primary.default, borderColor: palette.primary.default }
                      : { borderColor: palette.outline.variant },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: action.primary ? palette.primary.on : palette.onSurface.variant },
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  action: {
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  actionLabel: {
    ...Typography.labelMedium,
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

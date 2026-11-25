/**
 * A card of the Planning that moves with the finger (study 001, 12.4; sheet 026).
 * A touch opens it; a long press lifts it, then it follows the finger by quarters of an hour
 * (and by days when the columns are given) and is put down where the finger leaves it.
 * Only this card moves and is drawn again; the movement runs off the main thread.
 * With a screen reader, the same moves are actions of the card ("15 minutes plus tard"…).
 */
import React, { useCallback, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useT } from '@/i18n';

/** How long the finger stays before the card lifts. */
export const LIFT_DELAY_MS = 350;

export interface DropPoint {
  /** How far the finger went, in points. */
  dx: number;
  dy: number;
  /** Where the finger was let go, on the screen. */
  x: number;
  y: number;
}

export interface DraggableBlockProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
  /** Where the finger left the card; not called for a card that cannot move. */
  onDrop?: (drop: DropPoint) => void;
  /** The same moves for a screen reader: minutes and days. */
  onMoveBy?: (minutes: number, days: number) => void;
  /** The card follows the finger by steps of this height (a quarter of an hour), 0 for free. */
  stepY?: number;
  /** And by columns of this width (a day), 0 for free. */
  stepX?: number;
  /** False for a card that cannot move (the phone's own calendar). */
  movable?: boolean;
  accessibilityLabel: string;
  /** Lets the parent know a card is lifted (for the scroll). */
  onLift?: (lifted: boolean) => void;
  /** Where the finger is while the card moves, on the screen (the Month view turns the page at its edges, sheet 027). */
  onDragMove?: (x: number, y: number) => void;
}

export function DraggableBlock({
  children,
  style,
  onPress,
  onDrop,
  onMoveBy,
  stepY = 0,
  stepX = 0,
  movable = true,
  accessibilityLabel,
  onLift,
  onDragMove,
}: DraggableBlockProps) {
  const t = useT();
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const lifted = useSharedValue(0);

  // The gesture always calls the same functions, which read the latest props: a parent drawn again
  // during a move (the Month view turning a page, sheet 027) never changes the gesture under the finger
  const latest = useRef({ onPress, onDrop, onLift, onDragMove });
  latest.current = { onPress, onDrop, onLift, onDragMove };
  const press = useCallback(() => latest.current.onPress(), []);
  const drop = useCallback((point: DropPoint) => latest.current.onDrop?.(point), []);
  const lift = useCallback((value: boolean) => latest.current.onLift?.(value), []);
  const follow = useCallback((x: number, y: number) => latest.current.onDragMove?.(x, y), []);
  const following = !!onDragMove;

  const pan = usePanGesture({
    enabled: movable && !!onDrop,
    activateAfterLongPress: LIFT_DELAY_MS,
    onActivate: () => {
      'worklet';
      lifted.value = withTiming(1, { duration: 120 });
      runOnJS(lift)(true);
    },
    onUpdate: event => {
      'worklet';
      // The card jumps from quarter to quarter: what you see is where it will land
      offsetY.value = stepY > 0 ? Math.round(event.translationY / stepY) * stepY : event.translationY;
      offsetX.value = stepX > 0 ? Math.round(event.translationX / stepX) * stepX : event.translationX;
      if (following) runOnJS(follow)(event.absoluteX, event.absoluteY);
    },
    onDeactivate: event => {
      'worklet';
      if (!event.canceled) {
        runOnJS(drop)({ dx: event.translationX, dy: event.translationY, x: event.absoluteX, y: event.absoluteY });
      }
    },
    onFinalize: () => {
      'worklet';
      offsetX.value = withTiming(0, { duration: 160 });
      offsetY.value = withTiming(0, { duration: 160 });
      lifted.value = withTiming(0, { duration: 160 });
      runOnJS(lift)(false);
    },
  });

  const tap = useTapGesture({
    onActivate: () => {
      'worklet';
      runOnJS(press)();
    },
  });

  // The long press wins; a short touch opens the card
  const gesture = useExclusiveGestures(pan, tap);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: 1 + lifted.value * 0.04 },
    ],
    opacity: 1 - lifted.value * 0.08,
    zIndex: lifted.value > 0 ? 50 : 1,
    elevation: lifted.value > 0 ? 8 : 0,
  }));

  const actions = movable && onMoveBy
    ? [
        { name: 'activate' },
        { name: 'later', label: t('planning.a11y.later') },
        { name: 'earlier', label: t('planning.a11y.earlier') },
        { name: 'nextDay', label: t('planning.a11y.nextDay') },
        { name: 'previousDay', label: t('planning.a11y.previousDay') },
      ]
    : [{ name: 'activate' }];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[style, animated]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={movable && onDrop ? t('planning.a11y.hint') : undefined}
        accessibilityActions={actions}
        onAccessibilityAction={event => {
          const name = event.nativeEvent.actionName;
          if (name === 'activate') onPress();
          else if (name === 'later') onMoveBy?.(15, 0);
          else if (name === 'earlier') onMoveBy?.(-15, 0);
          else if (name === 'nextDay') onMoveBy?.(0, 1);
          else if (name === 'previousDay') onMoveBy?.(0, -1);
        }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

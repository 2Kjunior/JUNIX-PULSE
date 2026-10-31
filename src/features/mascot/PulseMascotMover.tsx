/**
 * PulseMascotMover: moves the mascot between places on screen, as the onboarding guide does.
 *
 * One progress value drives place, size and arc, so a trip is a single UI-thread animation with
 * no re-render. A new placement starts from where the mascot currently is and never queues.
 * With reduced motion it fades out, jumps and fades in instead of travelling.
 * The layer lets every touch through: it never blocks a button.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GUIDE_MOTION, GuidePlacement } from '@/domain/rules/mascot-guide-rules';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';

import { MascotReactionTrigger, PulseMascot } from './PulseMascot';
import { MASCOT_BASE_SIZE, mascotDimensions } from './mascot-visuals';

const BASE = mascotDimensions(MASCOT_BASE_SIZE);
const ENTRY_OFFSET_Y = 160; // First entry: rises from this far below its place

export interface PulseMascotMoverProps {
  placement: GuidePlacement | null;
  mood: MascotMood;
  reaction?: MascotReactionTrigger | null;
  onArrive?: () => void;
}

export function PulseMascotMover({ placement, mood, reaction = null, onArrive }: PulseMascotMoverProps) {
  const fromX = useSharedValue(0);
  const fromY = useSharedValue(0);
  const fromScale = useSharedValue(1);
  const toX = useSharedValue(0);
  const toY = useSharedValue(0);
  const toScale = useSharedValue(1);
  const progress = useSharedValue(1);
  const arcHeight = useSharedValue(0);
  const arcSign = useSharedValue(1);
  const fadeMode = useSharedValue(0);
  const landing = useSharedValue(1);
  const visible = useSharedValue(0);
  const placedRef = useRef(false);
  // Kept in a ref so an inline callback never restarts the trip
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  useEffect(() => {
    if (!placement) {
      visible.value = withTiming(0, { duration: GUIDE_MOTION.fadeMs });
      placedRef.current = false;
      return;
    }

    const { center, size, transition } = placement;
    const targetScale = size / MASCOT_BASE_SIZE;

    if (placedRef.current) {
      // Start from the current position, so a new trip never jumps or waits for the last one
      const p = progress.value;
      fromX.value = fromX.value + (toX.value - fromX.value) * p;
      fromY.value = fromY.value + (toY.value - fromY.value) * p;
      fromScale.value = fromScale.value + (toScale.value - fromScale.value) * p;
    } else {
      fromX.value = center.x;
      fromY.value = transition.bounceEntry ? center.y + ENTRY_OFFSET_Y : center.y;
      fromScale.value = targetScale;
    }

    toX.value = center.x;
    toY.value = center.y;
    toScale.value = targetScale;
    arcHeight.value = transition.arcHeightDp;
    arcSign.value = transition.arcSign;
    fadeMode.value = transition.mode === 'fade' ? 1 : 0;
    visible.value = withTiming(1, { duration: GUIDE_MOTION.fadeMs });
    placedRef.current = true;

    const squash = transition.squash;
    const arrived = () => onArriveRef.current?.();
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: transition.durationMs, easing: Easing.bezier(...GUIDE_MOTION.travelEasing) },
      finished => {
        if (!finished) return;
        if (squash) {
          landing.value = GUIDE_MOTION.landing.squashY;
          landing.value = withSpring(1, {
            damping: GUIDE_MOTION.landing.damping,
            stiffness: GUIDE_MOTION.landing.stiffness,
          });
        }
        runOnJS(arrived)();
      }
    );
  }, [
    placement,
    progress, fromX, fromY, fromScale, toX, toY, toScale, arcHeight, arcSign, fadeMode, landing, visible,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const fading = fadeMode.value === 1;

    // Reduced motion: stay on the old place until half way, then show the new one
    const x = fading ? (p < 0.5 ? fromX.value : toX.value) : fromX.value + (toX.value - fromX.value) * p;
    const y = fading ? (p < 0.5 ? fromY.value : toY.value) : fromY.value + (toY.value - fromY.value) * p;
    const scale = fading ? toScale.value : fromScale.value + (toScale.value - fromScale.value) * p;
    const arc = fading ? 0 : Math.sin(Math.PI * p) * arcHeight.value * arcSign.value;

    return {
      opacity: visible.value * (fading ? Math.abs(2 * p - 1) : 1),
      transform: [
        { translateX: x - BASE.width / 2 },
        { translateY: y - arc - BASE.height / 2 },
        { scale },
        { scaleY: landing.value },
      ],
    };
  });

  if (!placement) return null;

  return (
    <Animated.View
      testID="pulse-mascot-mover"
      pointerEvents="none"
      style={[styles.layer, { width: BASE.width, height: BASE.height }, animatedStyle]}
    >
      <PulseMascot
        mood={mood}
        size={MASCOT_BASE_SIZE}
        pose={placement.pose}
        pointAt={placement.pointAt}
        reaction={reaction}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

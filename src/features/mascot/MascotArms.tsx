/**
 * The two floating glass capsules of the Pulse mascot.
 * Each arm pivots at the top of its capsule. Angles come from a pose, then a looping swing and
 * a one-shot reaction lift are added on the UI thread, so nothing re-renders while moving.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  ArmPose,
  MASCOT_ARM,
  MASCOT_ORB,
  MASCOT_VIEWBOX,
  MoodVisual,
} from './mascot-visuals';

const POSE_CHANGE_MS = 400; // Duration.slow, copied to keep features independent

interface MascotArmsProps {
  scale: number;
  pose: ArmPose;
  visual: MoodVisual;
  svgId: string;
  animated: boolean;
  /** 0 to 1 over a reaction; the arms lift by `liftDeg` at its peak. */
  reactionProgress: SharedValue<number>;
  liftDeg: SharedValue<number>;
}

interface ArmProps {
  side: 'left' | 'right';
  scale: number;
  baseDeg: SharedValue<number>;
  swing: SharedValue<number>;
  swingDeg: SharedValue<number>;
  reactionProgress: SharedValue<number>;
  liftDeg: SharedValue<number>;
  visual: MoodVisual;
  gradientId: string;
}

function Arm({ side, scale, baseDeg, swing, swingDeg, reactionProgress, liftDeg, visual, gradientId }: ArmProps) {
  const width = MASCOT_ARM.width * scale;
  const height = MASCOT_ARM.height * scale;
  const centerX = MASCOT_ORB.cx + (side === 'left' ? -MASCOT_ARM.offsetX : MASCOT_ARM.offsetX);
  const sign = side === 'left' ? 1 : -1;

  const animatedStyle = useAnimatedStyle(() => {
    const swingOffset = swingDeg.value * (2 * swing.value - 1);
    const lift = liftDeg.value * Math.sin(Math.PI * reactionProgress.value);
    const angle = baseDeg.value + swingOffset + sign * lift;
    // Rotate about the top edge of the capsule: move the pivot to the centre, rotate, move back
    return {
      transform: [{ translateY: -height / 2 }, { rotate: `${angle}deg` }, { translateY: height / 2 }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.arm,
        {
          left: (centerX - MASCOT_ARM.width / 2 - MASCOT_VIEWBOX.minX) * scale,
          top: MASCOT_ARM.pivotY * scale,
          width,
          height,
        },
        animatedStyle,
      ]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${MASCOT_ARM.width} ${MASCOT_ARM.height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
            <Stop offset="0.5" stopColor={visual.liquid[0]} stopOpacity={0.55} />
            <Stop offset="1" stopColor={visual.ring[1]} stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Rect x={0.5} y={0.5} width={6} height={26} rx={3} fill={`url(#${gradientId})`} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1} />
        <Rect x={2.2} y={3} width={1.6} height={12} rx={0.8} fill="#FFFFFF" opacity={0.7} />
      </Svg>
    </Animated.View>
  );
}

export function MascotArms({ scale, pose, visual, svgId, animated, reactionProgress, liftDeg }: MascotArmsProps) {
  const leftDeg = useSharedValue(pose.left);
  const rightDeg = useSharedValue(pose.right);
  const swingDeg = useSharedValue(pose.swingDeg);
  const swing = useSharedValue(0.5);

  useEffect(() => {
    leftDeg.value = withTiming(pose.left, { duration: POSE_CHANGE_MS, easing: Easing.inOut(Easing.ease) });
    rightDeg.value = withTiming(pose.right, { duration: POSE_CHANGE_MS, easing: Easing.inOut(Easing.ease) });
    swingDeg.value = pose.swingDeg;

    if (animated && pose.swingDeg > 0) {
      swing.value = 0;
      swing.value = withRepeat(
        withTiming(1, { duration: pose.swingPeriodMs / 2, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      swing.value = 0.5; // Centred: no swing offset
    }
  }, [animated, pose.left, pose.right, pose.swingDeg, pose.swingPeriodMs, leftDeg, rightDeg, swing, swingDeg]);

  const shared = { scale, swing, swingDeg, reactionProgress, liftDeg, visual };
  return (
    <>
      <Arm side="left" baseDeg={leftDeg} gradientId={`${svgId}al`} {...shared} />
      <Arm side="right" baseDeg={rightDeg} gradientId={`${svgId}ar`} {...shared} />
    </>
  );
}

const styles = StyleSheet.create({
  arm: {
    position: 'absolute',
  },
});

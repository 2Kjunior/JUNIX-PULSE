/**
 * PulseMascot: the liquid glass orb whose face is the pulse line, with two floating glass arms.
 *
 * Drawn once on a 96 px base and scaled, in layers from back to front:
 * halo, arms, glass body, liquid (one static wave that only slides), ring, face, highlight.
 * Animation (bob, liquid slide, arm swing, reaction pulse) runs on the UI thread.
 * The mascot is decorative: it is hidden from screen readers.
 */

import React, { useEffect, useId } from 'react';
import { StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import type { GuidePointAt, GuidePose } from '@/domain/rules/mascot-guide-rules';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import { MascotReactionLevel, REACTION_DURATIONS_MS } from '@/domain/rules/mascot-reaction-rules';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';

import { MascotArms } from './MascotArms';
import { MascotFace } from './MascotFace';
import {
  MASCOT_BOB,
  MASCOT_LIQUID,
  MASCOT_ORB,
  MASCOT_VIEWBOX,
  MascotSize,
  mascotDimensions,
  MOOD_VISUALS,
  REACTION_EFFECTS,
  resolveArmPose,
  toSvgId,
} from './mascot-visuals';

export interface MascotReactionTrigger {
  level: MascotReactionLevel;
  /** Change the key to replay the same level. */
  key: number;
}

export interface PulseMascotProps {
  mood: MascotMood;
  size?: MascotSize;
  pose?: GuidePose;
  pointAt?: GuidePointAt | null;
  reaction?: MascotReactionTrigger | null;
  /** False draws a still image, as does the system "reduce motion" setting. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VIEW_BOX = `${MASCOT_VIEWBOX.minX} ${MASCOT_VIEWBOX.minY} ${MASCOT_VIEWBOX.width} ${MASCOT_VIEWBOX.height}`;

// Wave of the reference sheet: one `q` then eight `t`, each 30 wide, closed below the orb
const WAVE_PATH = `M${MASCOT_LIQUID.pathStartX} ${MASCOT_LIQUID.surfaceY} q15 -9 30 0${' t30 0'.repeat(8)} V130 H${MASCOT_LIQUID.pathStartX}Z`;

export function PulseMascot({
  mood,
  size = 96,
  pose = 'rest',
  pointAt = null,
  reaction = null,
  animated = true,
  style,
}: PulseMascotProps) {
  const reduceMotion = useSafeReducedMotion();
  const moving = animated && !reduceMotion;
  const { width, height, scale } = mascotDimensions(size);
  const visual = MOOD_VISUALS[mood];
  const svgId = toSvgId(useId());

  const bob = useSharedValue(0);
  const liquidSlide = useSharedValue(0);
  const reactionProgress = useSharedValue(0);
  const reactionScale = useSharedValue(0);
  const liftDeg = useSharedValue(0);

  useEffect(() => {
    if (!moving) {
      bob.value = 0;
      liquidSlide.value = 0;
      return;
    }
    bob.value = withRepeat(
      withTiming(1, { duration: MASCOT_BOB.periodMs / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    liquidSlide.value = withRepeat(withTiming(1, { duration: MASCOT_LIQUID.loopMs, easing: Easing.linear }), -1, false);
  }, [moving, bob, liquidSlide]);

  useEffect(() => {
    if (!reaction || !moving) return;
    const effect = REACTION_EFFECTS[reaction.level];
    reactionScale.value = effect.scale - 1;
    liftDeg.value = effect.armLiftDeg;
    reactionProgress.value = 0;
    reactionProgress.value = withTiming(1, {
      duration: REACTION_DURATIONS_MS[reaction.level],
      easing: Easing.inOut(Easing.ease),
    });
  }, [reaction, moving, reactionProgress, reactionScale, liftDeg]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (2 * bob.value - 1) * MASCOT_BOB.amplitude * scale },
      { scale: 1 + reactionScale.value * Math.sin(Math.PI * reactionProgress.value) },
    ],
  }));

  const liquidStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -liquidSlide.value * MASCOT_LIQUID.waveWidth * scale }],
  }));

  const armPose = resolveArmPose(mood, pose, pointAt);
  const clip = MASCOT_ORB.clipRadius;
  const clipLeft = (MASCOT_ORB.cx - clip - MASCOT_VIEWBOX.minX) * scale;
  const clipTop = (MASCOT_ORB.cy - clip) * scale;

  return (
    <View
      style={[{ width, height }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        {/* Halo and glass body */}
        <Svg width={width} height={height} viewBox={VIEW_BOX} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`${svgId}h`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={visual.ring[1]} stopOpacity={0.38} />
              <Stop offset="0.6" stopColor={visual.ring[0]} stopOpacity={0.16} />
              <Stop offset="1" stopColor={visual.ring[0]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={MASCOT_ORB.cx} cy={MASCOT_ORB.cy} r={MASCOT_ORB.haloRadius} fill={`url(#${svgId}h)`} />
        </Svg>

        <MascotArms
          scale={scale}
          pose={armPose}
          visual={visual}
          svgId={svgId}
          animated={moving}
          reactionProgress={reactionProgress}
          liftDeg={liftDeg}
        />

        <Svg width={width} height={height} viewBox={VIEW_BOX} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${svgId}b`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.78} />
              <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.3} />
              <Stop offset="1" stopColor={visual.liquid[0]} stopOpacity={0.3} />
            </LinearGradient>
          </Defs>
          <Circle cx={MASCOT_ORB.cx} cy={MASCOT_ORB.cy} r={MASCOT_ORB.radius} fill={`url(#${svgId}b)`} />
        </Svg>

        {/* Liquid: a single static wave, clipped to the orb, that only slides sideways */}
        <View
          style={{
            position: 'absolute',
            left: clipLeft,
            top: clipTop,
            width: clip * 2 * scale,
            height: clip * 2 * scale,
            borderRadius: clip * scale,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: (MASCOT_LIQUID.pathStartX - (MASCOT_ORB.cx - clip)) * scale,
                top: 0,
                width: MASCOT_LIQUID.pathWidth * scale,
                height: clip * 2 * scale,
              },
              liquidStyle,
            ]}
          >
            <Svg
              width={MASCOT_LIQUID.pathWidth * scale}
              height={clip * 2 * scale}
              viewBox={`${MASCOT_LIQUID.pathStartX} ${MASCOT_ORB.cy - clip} ${MASCOT_LIQUID.pathWidth} ${clip * 2}`}
            >
              <Defs>
                <LinearGradient id={`${svgId}l`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={visual.liquid[0]} stopOpacity={0.78} />
                  <Stop offset="1" stopColor={visual.liquid[1]} stopOpacity={0.92} />
                </LinearGradient>
              </Defs>
              <Path d={WAVE_PATH} fill={`url(#${svgId}l)`} />
            </Svg>
          </Animated.View>
        </View>

        {/* Ring, face and highlight */}
        <Svg width={width} height={height} viewBox={VIEW_BOX} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${svgId}r`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={visual.ring[0]} />
              <Stop offset="1" stopColor={visual.ring[1]} />
            </LinearGradient>
            <RadialGradient id={`${svgId}s`} cx="35%" cy="25%" r="60%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={MASCOT_ORB.cx} cy={MASCOT_ORB.cy} r={47.4} fill="none" stroke={`url(#${svgId}r)`} strokeWidth={2.4} />
          <Circle cx={MASCOT_ORB.cx} cy={MASCOT_ORB.cy} r={45.6} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1} />
          <MascotFace mood={mood} />
          <Ellipse cx={62} cy={36} rx={17} ry={9} fill={`url(#${svgId}s)`} transform="rotate(-28 62 36)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

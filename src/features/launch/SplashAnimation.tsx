/**
 * The launch animation of Junix Pulse, around the orb A1 (study 001, sections 4, 12.7 and 12.10).
 *
 * Timeline (4.4 s, see SPLASH_TIMINGS):
 *  - 0.00 s: dark background, a violet glow lights up behind the orb
 *  - 0.15 s: the ring draws itself, clockwise from the left
 *  - 0.85 s: the liquid rises and sways
 *  - 1.75 s: the beat crosses the orb, then a double heartbeat and a ripple
 *  - 2.30 s: "JUNIX PULSE" rises under the orb
 *  - 3.00 s: if the mascot is on, the orb becomes Pulse, who waves
 *  - 3.90 s: everything fades out onto the app
 * Reduced motion: the finished logo for 0.8 s, then a fade. A tap anywhere skips it.
 */

import { createAudioPlayer } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { OrbMark } from '@/components/ui/OrbMark';
import { ORB_RING, ORB_VIEWBOX_SIZE } from '@/constants/orb-logo';
import { PulseMascot } from '@/features/mascot/PulseMascot';
import { MASCOT_BASE_SIZE, MASCOT_ORB, MASCOT_VIEWBOX } from '@/features/mascot/mascot-visuals';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';

import { SPLASH_COLORS, SPLASH_EASINGS, SPLASH_HEARTBEAT, SPLASH_LAYOUT, SPLASH_TIMINGS } from './splash-constants';
import { haloColorsOf } from '@/constants/color-themes';
import { useAppStore } from '@/store/app-store';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ORB_PX = SPLASH_LAYOUT.orbSize;
const GLOW_PX = SPLASH_LAYOUT.glowSize;
/** The outer edge of the ring, in pixels on screen. */
const RING_EDGE_PX = (ORB_RING.radius + ORB_RING.stroke / 2) * (ORB_PX / ORB_VIEWBOX_SIZE);
/** Pulse is drawn at its base size, where one unit is one pixel, then enlarged so its orb fills the ring. */
const MASCOT_SCALE = RING_EDGE_PX / MASCOT_ORB.radius;
/** How far Pulse's orb sits from the centre of its box, to put it exactly on the logo's orb. */
const MASCOT_SHIFT = {
  x: (MASCOT_VIEWBOX.width / 2 - (MASCOT_ORB.cx - MASCOT_VIEWBOX.minX)) * MASCOT_SCALE,
  y: (MASCOT_VIEWBOX.height / 2 - (MASCOT_ORB.cy - MASCOT_VIEWBOX.minY)) * MASCOT_SCALE,
};

interface SplashAnimationProps {
  onFinish: () => void;
  /** True when the mascot is on: the orb then becomes Pulse, who waves. Read when that moment comes. */
  greet?: boolean;
}

export function SplashAnimation({ onFinish, greet = false }: SplashAnimationProps) {
  const reduceMotion = useSafeReducedMotion();
  // The Junix logo stays; the glow and the ripple around it take the theme (sheet 042)
  const colorChoice = useAppStore(state => state.colorChoice);
  const [launchGlow, launchRipple] = useMemo(() => {
    const halos = haloColorsOf(colorChoice);
    return [halos[0].dark, halos[1].dark] as const;
  }, [colorChoice]);
  const onFinishRef = useRef(onFinish);
  const greetRef = useRef(greet);
  const finishedRef = useRef(false);

  const glow = useSharedValue(0);
  const ring = useSharedValue(0);
  const liquid = useSharedValue(0);
  const beat = useSharedValue(0);
  const heartbeat = useSharedValue(1);
  const ripple = useSharedValue(0);
  const name = useSharedValue(0);
  const greeting = useSharedValue(0);
  const exit = useSharedValue(0);
  const progress = useMemo(() => ({ ring, liquid, beat }), [ring, liquid, beat]);

  useEffect(() => {
    onFinishRef.current = onFinish;
    greetRef.current = greet;
  }, [onFinish, greet]);

  // Called once only, whether by the end of the animation, a tap or the safety net
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  }, []);

  // The Android back button does nothing during the animation
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  // The launch sound, at 60 %; a sound that cannot play never blocks the launch
  useEffect(() => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      player = createAudioPlayer(require('../../../assets/sounds/junix-pulse-launch-sound.wav'));
      player.volume = 0.6;
      player.play();
    } catch {
      // Silent
    }
    return () => {
      try {
        player?.pause();
        player?.remove();
      } catch {
        // Silent
      }
    };
  }, []);

  // The timeline
  useEffect(() => {
    const T = SPLASH_TIMINGS;
    const E = SPLASH_EASINGS;
    const timers: ReturnType<typeof setTimeout>[] = [setTimeout(finish, T.safetyTimeoutMs)];
    const fadeOut = (delay: number, duration: number) => {
      exit.value = withDelay(
        delay,
        withTiming(1, { duration, easing: E.easeIn }, (done) => {
          if (done) runOnJS(finish)();
        })
      );
    };

    if (reduceMotion) {
      glow.value = 1;
      ring.value = 1;
      liquid.value = 1;
      beat.value = 1;
      name.value = 1;
      fadeOut(T.reducedMotionHoldMs, T.reducedMotionExitMs);
    } else {
      glow.value = withTiming(1, { duration: T.glowDurationMs, easing: E.easeOut });
      ring.value = withDelay(T.ringDelayMs, withTiming(1, { duration: T.ringDurationMs, easing: E.ringDraw }));
      liquid.value = withDelay(T.liquidDelayMs, withTiming(1, { duration: T.liquidDurationMs, easing: E.liquid }));
      beat.value = withDelay(T.beatDelayMs, withTiming(1, { duration: T.beatDurationMs, easing: E.easeInOut }));
      const [first, ...others] = SPLASH_HEARTBEAT.map((step) =>
        withTiming(step.scale, { duration: step.ms, easing: E.easeInOut })
      );
      heartbeat.value = withDelay(T.heartbeatDelayMs, withSequence(first, ...others));
      ripple.value = withDelay(T.rippleDelayMs, withTiming(1, { duration: T.rippleDurationMs, easing: E.easeOut }));
      name.value = withDelay(T.nameDelayMs, withTiming(1, { duration: T.nameDurationMs, easing: E.enterAndRise }));
      // The mascot setting is read now: the database may only have opened during the animation
      timers.push(
        setTimeout(() => {
          if (greetRef.current) {
            greeting.value = withTiming(1, { duration: T.greetDurationMs, easing: E.easeInOut });
          }
        }, T.greetDelayMs)
      );
      fadeOut(T.exitDelayMs, T.exitDurationMs);
    }

    return () => {
      for (const timer of timers) clearTimeout(timer);
      for (const value of [glow, ring, liquid, beat, heartbeat, ripple, name, greeting, exit]) cancelAnimation(value);
    };
  }, [reduceMotion, finish, glow, ring, liquid, beat, heartbeat, ripple, name, greeting, exit]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const sceneStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.04 * exit.value }] }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: 1 - greeting.value,
    transform: [{ scale: heartbeat.value * (1 - 0.08 * greeting.value) }],
  }));
  const mascotStyle = useAnimatedStyle(() => ({
    opacity: greeting.value,
    transform: [
      { translateX: MASCOT_SHIFT.x },
      { translateY: MASCOT_SHIFT.y },
      { scale: MASCOT_SCALE * (0.92 + 0.08 * greeting.value) },
    ],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: name.value,
    transform: [{ translateY: SPLASH_LAYOUT.nameRise * (1 - name.value) }],
  }));
  const glowProps = useAnimatedProps(() => ({ opacity: glow.value * (1 - greeting.value * 0.4) }));
  const rippleProps = useAnimatedProps(() => ({
    r: RING_EDGE_PX + SPLASH_LAYOUT.rippleSpread * ripple.value,
    opacity: ripple.value > 0 ? 0.6 * (1 - ripple.value) : 0,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} testID="launch-animation">
      <StatusBar style="light" />
      <Pressable style={styles.pressable} onPress={finish} accessibilityRole="button" accessibilityLabel="Junix Pulse">
        <Animated.View style={[styles.scene, sceneStyle]}>
          <View style={styles.orbBox}>
            <Svg
              width={GLOW_PX}
              height={GLOW_PX}
              viewBox={`${-GLOW_PX / 2} ${-GLOW_PX / 2} ${GLOW_PX} ${GLOW_PX}`}
              style={styles.glow}
              pointerEvents="none"
            >
              <Defs>
                <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={launchGlow} stopOpacity={0.45} />
                  <Stop offset="1" stopColor={launchGlow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <AnimatedCircle r={GLOW_PX / 2} fill="url(#launchGlow)" animatedProps={glowProps} />
              <AnimatedCircle fill="none" stroke={launchRipple} strokeWidth={3} animatedProps={rippleProps} />
            </Svg>
            <Animated.View style={orbStyle}>
              <OrbMark size={ORB_PX} variant="dark" progress={progress} />
            </Animated.View>
            {greet ? (
              <Animated.View pointerEvents="none" style={[styles.mascot, mascotStyle]}>
                <PulseMascot mood="happy" pose="greet" size={MASCOT_BASE_SIZE} />
              </Animated.View>
            ) : null}
          </View>
          <Animated.View style={[styles.name, nameStyle]}>
            <Text style={styles.junix} allowFontScaling={false}>
              JUNIX
            </Text>
            <Text style={styles.pulse} allowFontScaling={false}>
              PULSE
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_COLORS.background,
    zIndex: 99999,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    alignItems: 'center',
  },
  orbBox: {
    width: ORB_PX,
    height: ORB_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    left: (ORB_PX - GLOW_PX) / 2,
    top: (ORB_PX - GLOW_PX) / 2,
  },
  mascot: {
    position: 'absolute',
    left: (ORB_PX - MASCOT_VIEWBOX.width) / 2,
    top: (ORB_PX - MASCOT_VIEWBOX.height) / 2,
    width: MASCOT_VIEWBOX.width,
    height: MASCOT_VIEWBOX.height,
  },
  name: {
    marginTop: SPLASH_LAYOUT.nameGap,
    alignItems: 'center',
  },
  // The letter spacing also adds space after the last letter: the same on the left keeps the word centred
  junix: {
    fontFamily: 'Outfit-Bold',
    fontSize: 34,
    letterSpacing: 8,
    paddingLeft: 8,
    color: SPLASH_COLORS.name,
  },
  pulse: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 9,
    paddingLeft: 9,
    marginTop: 4,
    color: SPLASH_COLORS.tagline,
  },
});

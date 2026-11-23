/**
 * PulseLogo: the Junix Pulse logo in the app, the orb A1 (see OrbMark) with a glow that breathes.
 *
 * Modes:
 *  - 'draw'  : the orb draws itself (ring, liquid, beat, 1.2 s), then rests as in 'idle'
 *  - 'idle'  : a double heartbeat every 2.4 s and a breathing glow
 *  - 'static': the finished logo, still; also when the phone asks for reduced motion
 *
 * Rule A.3: ambient animation only where the logo is shown large.
 * Rule A.1: no emoji, this drawing is the visual identity.
 */

import React, { useEffect, useId, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { OrbMark } from '@/components/ui/OrbMark';
import { ORB_RING, ORB_VIEWBOX } from '@/constants/orb-logo';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DRAW = { ringMs: 600, liquidDelayMs: 300, liquidMs: 700, beatDelayMs: 750, beatMs: 450 } as const;
const IDLE_INTERVAL = 2400;
const GLOW_MAX_OPACITY = 0.22;
const GLOW_REST_OPACITY = GLOW_MAX_OPACITY * 0.5;

interface PulseLogoProps {
  size?: number;
  mode?: 'draw' | 'idle' | 'static';
  onDrawComplete?: () => void;
}

export function PulseLogo({ size = 80, mode = 'static', onDrawComplete }: PulseLogoProps) {
  const { isDark } = useTheme();
  const reduceMotion = useSafeReducedMotion();
  const glowId = `glow${useId().replace(/[^A-Za-z0-9]/g, '')}`;
  const onDrawCompleteRef = useRef(onDrawComplete);

  const ring = useSharedValue(mode === 'draw' ? 0 : 1);
  const liquid = useSharedValue(mode === 'draw' ? 0 : 1);
  const beat = useSharedValue(mode === 'draw' ? 0 : 1);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(GLOW_REST_OPACITY);
  const glowScale = useSharedValue(1);
  const progress = useMemo(() => ({ ring, liquid, beat }), [ring, liquid, beat]);

  useEffect(() => {
    onDrawCompleteRef.current = onDrawComplete;
  }, [onDrawComplete]);

  useEffect(() => {
    // Double heartbeat (1 → 1.035 → 1 → 1.02 → 1) every 2.4 s, and a glow breathing in 4.5 s
    function rest() {
      scale.value = withRepeat(
        withSequence(
          withDelay(IDLE_INTERVAL * 0.1, withTiming(1.035, { duration: 150, easing: Easing.out(Easing.ease) })),
          withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) }),
          withDelay(80, withTiming(1.02, { duration: 120, easing: Easing.out(Easing.ease) })),
          withTiming(1, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withDelay(IDLE_INTERVAL * 0.6, withTiming(1, { duration: 10 }))
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(GLOW_MAX_OPACITY, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
          withTiming(GLOW_MAX_OPACITY * 0.35, { duration: 2250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 2250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }

    function drawFinished() {
      onDrawCompleteRef.current?.();
      rest();
    }

    if (reduceMotion || mode === 'static') {
      ring.value = 1;
      liquid.value = 1;
      beat.value = 1;
      scale.value = 1;
      glowOpacity.value = GLOW_REST_OPACITY;
      glowScale.value = 1;
      if (mode === 'draw') onDrawCompleteRef.current?.();
    } else if (mode === 'draw') {
      ring.value = 0;
      liquid.value = 0;
      beat.value = 0;
      ring.value = withTiming(1, { duration: DRAW.ringMs, easing: Easing.bezier(0.65, 0, 0.25, 1) });
      liquid.value = withDelay(
        DRAW.liquidDelayMs,
        withTiming(1, { duration: DRAW.liquidMs, easing: Easing.bezier(0.2, 0.9, 0.25, 1) })
      );
      beat.value = withDelay(
        DRAW.beatDelayMs,
        withTiming(1, { duration: DRAW.beatMs, easing: Easing.inOut(Easing.ease) }, (finished) => {
          if (finished) runOnJS(drawFinished)();
        })
      );
    } else {
      rest();
    }

    return () => {
      for (const value of [ring, liquid, beat, scale, glowOpacity, glowScale]) cancelAnimation(value);
    };
  }, [mode, reduceMotion, ring, liquid, beat, scale, glowOpacity, glowScale]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowProps = useAnimatedProps(() => ({
    opacity: glowOpacity.value / GLOW_MAX_OPACITY,
    r: ORB_RING.radius * glowScale.value,
  }));
  const glowColor = isDark ? '#A078FF' : '#6B46C1';

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, logoStyle]}>
      <Svg width={size} height={size} viewBox={ORB_VIEWBOX} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glowColor} stopOpacity={GLOW_MAX_OPACITY} />
            <Stop offset="1" stopColor={glowColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedCircle fill={`url(#${glowId})`} animatedProps={glowProps} />
      </Svg>
      <OrbMark
        size={size}
        variant={isDark ? 'dark' : 'light'}
        progress={progress}
        label="Junix Pulse logo"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

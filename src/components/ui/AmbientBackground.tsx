/**
 * AmbientBackground: animated halos behind the whole app, mounted once in the root layout.
 *
 * Each halo is a static Svg moved by Reanimated on the UI thread, with no React render per frame.
 * A single clock drives all of them, so pausing it and restarting it resumes without a jump.
 */

import * as Device from 'expo-device';
import { memo, useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolateColor,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import {
  AMBIENT_ENABLED,
  AMBIENT_GRADIENT_RADIUS,
  AMBIENT_GRADIENT_STOPS,
  AMBIENT_HALOS,
  AMBIENT_LOW_END_HALO_COUNT,
  AMBIENT_LOW_END_MAX_MEMORY_BYTES,
  AMBIENT_MAX_FRAME_DELTA_MS,
  AMBIENT_REVEAL_FADE_MS,
  AMBIENT_THEME_FADE_MS,
  type AmbientHaloConfig,
  type AmbientThemeMode,
} from '@/constants/ambient';
import { darkPalette, lightPalette } from '@/constants/palettes';
import { sampleAmbientPose } from '@/domain/rules/ambient-motion';
import { useTheme } from '@/hooks/use-theme';

const BOTH_MODES: readonly AmbientThemeMode[] = ['light', 'dark'];

function selectHalos(): readonly AmbientHaloConfig[] {
  if (!AMBIENT_ENABLED) return [];
  const isLowEnd =
    Device.totalMemory !== null && Device.totalMemory < AMBIENT_LOW_END_MAX_MEMORY_BYTES;
  return isLowEnd ? AMBIENT_HALOS.slice(0, AMBIENT_LOW_END_HALO_COUNT) : AMBIENT_HALOS;
}

const HaloGradient = memo(function HaloGradient({
  haloId,
  mode,
  color,
}: {
  haloId: string;
  mode: AmbientThemeMode;
  color: string;
}) {
  const gradientId = `ambient-${haloId}-${mode}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient
          id={gradientId}
          cx="50"
          cy="50"
          r={AMBIENT_GRADIENT_RADIUS}
          gradientUnits="userSpaceOnUse"
        >
          {AMBIENT_GRADIENT_STOPS.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={color}
              stopOpacity={stop.opacity}
            />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${gradientId})`} />
    </Svg>
  );
});

function HaloThemeLayer({
  halo,
  mode,
  darkness,
}: {
  halo: AmbientHaloConfig;
  mode: AmbientThemeMode;
  darkness: SharedValue<number>;
}) {
  const baseOpacity = halo.opacity[mode];
  const isDarkLayer = mode === 'dark';

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: baseOpacity * (isDarkLayer ? darkness.value : 1 - darkness.value),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <HaloGradient haloId={halo.id} mode={mode} color={halo.color[mode]} />
    </Animated.View>
  );
}

function AmbientHalo({
  halo,
  screenWidth,
  clock,
  darkness,
  modes,
  isStatic,
}: {
  halo: AmbientHaloConfig;
  screenWidth: number;
  clock: SharedValue<number>;
  darkness: SharedValue<number>;
  modes: readonly AmbientThemeMode[];
  isStatic: boolean;
}) {
  const size = (screenWidth * halo.sizePercent) / 100;
  const motion = halo.motion;

  const animatedStyle = useAnimatedStyle(() => {
    if (isStatic) return { transform: [] };
    const pose = sampleAmbientPose(motion, clock.value);
    return {
      transform: [
        { translateX: (pose.x * size) / 100 },
        { translateY: (pose.y * size) / 100 },
        { scale: pose.scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.halo,
        {
          left: `${halo.center.x}%`,
          top: `${halo.center.y}%`,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        animatedStyle,
      ]}
    >
      {modes.map((mode) => (
        <HaloThemeLayer key={mode} halo={halo} mode={mode} darkness={darkness} />
      ))}
    </Animated.View>
  );
}

export interface AmbientBackgroundProps {
  /** False when an opaque screen covers the background: the animation then pauses. */
  visible: boolean;
  /** False while the launch animation plays: the halos fade in once it becomes true. */
  revealed: boolean;
}

function AmbientBackgroundComponent({ visible, revealed }: AmbientBackgroundProps) {
  const { mode } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [halos] = useState(selectHalos);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  // The layer of the other theme only exists during the crossfade.
  const [modes, setModes] = useState<readonly AmbientThemeMode[]>([mode]);

  const clock = useSharedValue(0);
  const darkness = useSharedValue(mode === 'dark' ? 1 : 0);
  const haloOpacity = useSharedValue(0);

  const advanceClock = useCallback(
    (frame: { timeSincePreviousFrame: number | null }) => {
      'worklet';
      clock.value += Math.min(frame.timeSincePreviousFrame ?? 0, AMBIENT_MAX_FRAME_DELTA_MS);
    },
    [clock]
  );
  const frameCallback = useFrameCallback(advanceClock, false);

  const isRunning = halos.length > 0 && !reducedMotion && visible && revealed && isAppActive;

  useEffect(() => {
    frameCallback.setActive(isRunning);
  }, [frameCallback, isRunning]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const target = mode === 'dark' ? 1 : 0;
    if (darkness.value === target) return;

    setModes(BOTH_MODES);
    darkness.value = withTiming(target, { duration: AMBIENT_THEME_FADE_MS }, (finished) => {
      if (finished) runOnJS(setModes)([mode]);
    });
  }, [mode, darkness]);

  useEffect(() => {
    if (revealed) {
      haloOpacity.value = withTiming(1, { duration: AMBIENT_REVEAL_FADE_MS });
    }
  }, [revealed, haloOpacity]);

  const baseStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      darkness.value,
      [0, 1],
      [lightPalette.surface.base, darkPalette.surface.base]
    ),
  }));

  const halosStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
  }));

  return (
    <View
      style={styles.root}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFill, baseStyle]} />
      <Animated.View style={[StyleSheet.absoluteFill, halosStyle]}>
        {halos.map((halo) => (
          <AmbientHalo
            key={halo.id}
            halo={halo}
            screenWidth={screenWidth}
            clock={clock}
            darkness={darkness}
            modes={modes}
            isStatic={reducedMotion}
          />
        ))}
      </Animated.View>
    </View>
  );
}

export const AmbientBackground = memo(AmbientBackgroundComponent);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
  },
});

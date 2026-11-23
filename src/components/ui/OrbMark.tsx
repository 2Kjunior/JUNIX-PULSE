/**
 * OrbMark: the orb A1 drawn in the app, from the shared drawing in constants/orb-logo.
 * Without `progress` it is the finished logo. With `progress`, three values from 0 to 1 draw it:
 * the ring, then the liquid, then the beat. Used by PulseLogo and by the launch animation.
 */

import React, { useId } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import {
  ORB_BEAT_LENGTH,
  ORB_BEAT_OUTLINE_STROKE,
  ORB_BEAT_PATH,
  ORB_BEAT_STROKE,
  ORB_COLORS,
  ORB_LIQUID_HIDDEN_DROP,
  ORB_LIQUID_RADIUS,
  ORB_RING,
  ORB_RING_LENGTH,
  ORB_VARIANTS,
  ORB_VIEWBOX,
  ORB_WAVE,
  orbWavePath,
  type OrbVariant,
} from '@/constants/orb-logo';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface OrbMarkProgress {
  /** 0 to 1: the ring draws itself, clockwise from the left. */
  ring: SharedValue<number>;
  /** 0 to 1: the liquid rises while its wave sways. */
  liquid: SharedValue<number>;
  /** 0 to 1: the beat crosses the orb from left to right. */
  beat: SharedValue<number>;
}

export interface OrbMarkProps {
  size: number;
  variant?: OrbVariant;
  progress?: OrbMarkProgress;
  /** What a screen reader says; given to the drawing itself. */
  label?: string;
}

export function OrbMark({ size, variant = 'dark', progress, label }: OrbMarkProps) {
  const id = `orb${useId().replace(/[^A-Za-z0-9]/g, '')}`;
  const look = ORB_VARIANTS[variant];
  const beatDash = `${ORB_BEAT_LENGTH} ${ORB_BEAT_LENGTH}`;

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: ORB_RING_LENGTH * (1 - (progress ? progress.ring.value : 1)),
  }));
  const liquidProps = useAnimatedProps(() => {
    const done = progress ? progress.liquid.value : 1;
    return { d: orbWavePath(ORB_LIQUID_HIDDEN_DROP * (1 - done), ORB_WAVE.period * done) };
  });
  const beatProps = useAnimatedProps(() => {
    const done = progress ? progress.beat.value : 1;
    return { strokeDashoffset: ORB_BEAT_LENGTH * (1 - done), opacity: done > 0 ? 1 : 0 };
  });
  const beatOutlineProps = useAnimatedProps(() => {
    const done = progress ? progress.beat.value : 1;
    return { strokeDashoffset: ORB_BEAT_LENGTH * (1 - done), opacity: done > 0 ? 1 : 0 };
  });

  return (
    <Svg width={size} height={size} viewBox={ORB_VIEWBOX} accessibilityLabel={label}>
      <Defs>
        {/* The ring is turned half a circle so it starts on the left: the gradient is turned back to match */}
        <LinearGradient id={`${id}ring`} x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ORB_COLORS.ringFrom} />
          <Stop offset="1" stopColor={ORB_COLORS.ringTo} />
        </LinearGradient>
        <LinearGradient id={`${id}liquid`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={ORB_COLORS.liquidFrom} />
          <Stop offset="1" stopColor={ORB_COLORS.liquidTo} />
        </LinearGradient>
        <ClipPath id={`${id}clip`}>
          <Circle r={ORB_LIQUID_RADIUS} />
        </ClipPath>
      </Defs>

      <AnimatedCircle
        r={ORB_RING.radius}
        fill="none"
        stroke={`url(#${id}ring)`}
        strokeWidth={ORB_RING.stroke}
        strokeDasharray={`${ORB_RING_LENGTH} ${ORB_RING_LENGTH}`}
        transform="rotate(180)"
        animatedProps={ringProps}
      />

      <G clipPath={`url(#${id}clip)`}>
        <AnimatedPath
          d={orbWavePath()}
          fill={`url(#${id}liquid)`}
          opacity={look.liquidOpacity}
          animatedProps={liquidProps}
        />
      </G>

      {look.beatOutline ? (
        <AnimatedPath
          d={ORB_BEAT_PATH}
          fill="none"
          stroke={look.beatOutline}
          strokeWidth={ORB_BEAT_OUTLINE_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={beatDash}
          animatedProps={beatOutlineProps}
        />
      ) : null}
      <AnimatedPath
        d={ORB_BEAT_PATH}
        fill="none"
        stroke={look.beat}
        strokeWidth={ORB_BEAT_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={beatDash}
        animatedProps={beatProps}
      />
    </Svg>
  );
}

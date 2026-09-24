/**
 * PulseLogo — Logo SVG animé de Junix Pulse.
 *
 * Le tracé "pulse-P" est composé de deux paths :
 *  - La lettre P stylisée avec une ligne de pouls intégrée
 *  - Longueur totale approximée à 280 unités pour l'animation stroke-dashoffset
 *
 * Modes :
 *  - 'draw'  : trace le SVG de 0 → fin (920ms), puis passe en mode idle
 *  - 'idle'  : boucle de repos toutes les 2.4s (double battement cardiaque)
 *  - 'static': état final statique (prefers-reduced-motion ou icône app)
 *
 * Règle A.3 : animation ambiante uniquement sur cet écran (splash/onboarding).
 * Règle A.1 : aucun emoji — cet élément EST l'identité visuelle.
 */

import React, { useEffect } from 'react';
import { StyleSheet, AccessibilityInfo } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Constantes d'animation (spécification R-01) ─────────────────────────────
const TOTAL_LENGTH = 280;
const DRAW_DURATION = 920;
const SETTLE_DURATION = 360;
const IDLE_INTERVAL = 2400;
const HALO_MAX_OPACITY = 0.22;
const HALO_MAX_SCALE = 1.18;

interface PulseLogoProps {
  size?: number;
  mode?: 'draw' | 'idle' | 'static';
  onDrawComplete?: () => void;
}

export function PulseLogo({ size = 80, mode = 'static', onDrawComplete }: PulseLogoProps) {
  // Valeurs d'animation Reanimated
  const dashOffset = useSharedValue(TOTAL_LENGTH);
  const logoScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(1);

  useEffect(() => {
    // Respecter prefers-reduced-motion
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion || mode === 'static') {
        // État final statique immédiat
        dashOffset.value = 0;
        haloOpacity.value = HALO_MAX_OPACITY * 0.5;
        return;
      }

      if (mode === 'draw') {
        // 1. Halo synchronisé pendant le tracé
        haloOpacity.value = withTiming(HALO_MAX_OPACITY, { duration: DRAW_DURATION });
        haloScale.value = withTiming(HALO_MAX_SCALE, { duration: DRAW_DURATION });

        // 2. Tracé SVG : dashoffset 280 → 0
        dashOffset.value = withTiming(
          0,
          {
            duration: DRAW_DURATION,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
          },
          (finished) => {
            if (!finished) return;

            // 3. Settle : scale 1.02 → 1
            logoScale.value = withTiming(1.02, { duration: 60 }, (finishedSettle) => {
              if (finishedSettle) {
                logoScale.value = withTiming(1, { duration: SETTLE_DURATION }, (finishedFinal) => {
                  if (finishedFinal) {
                    runOnJS(handleDrawFinished)();
                  }
                });
              }
            });

            // 4. Halo : retour à opacité de repos
            haloOpacity.value = withTiming(HALO_MAX_OPACITY * 0.5, {
              duration: SETTLE_DURATION,
            });
          }
        );
      }

      if (mode === 'idle') {
        dashOffset.value = 0;
        haloOpacity.value = HALO_MAX_OPACITY * 0.5;
        startIdleLoop();
      }
    });
  }, [mode]);

  function handleDrawFinished() {
    if (onDrawComplete) {
      onDrawComplete();
    }
    startIdleLoop();
  }

  function startIdleLoop() {
    // Double battement : scale 1 → 1.035 → 1 → 1.02 → 1 toutes les 2.4s
    logoScale.value = withRepeat(
      withSequence(
        withDelay(
          IDLE_INTERVAL * 0.1,
          withTiming(1.035, { duration: 150, easing: Easing.out(Easing.ease) })
        ),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withDelay(
          80,
          withTiming(1.02, { duration: 120, easing: Easing.out(Easing.ease) })
        ),
        withTiming(1, { duration: 180, easing: Easing.inOut(Easing.ease) }),
        withDelay(IDLE_INTERVAL * 0.6, withTiming(1, { duration: 10 }))
      ),
      -1,
      false
    );

    // Halo pulsant lent (pulseGlow ~4.5s)
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(HALO_MAX_OPACITY, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
        withTiming(HALO_MAX_OPACITY * 0.35, { duration: 2250, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2250, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  const animatedHaloProps = useAnimatedProps(() => ({
    opacity: haloOpacity.value,
    r: (size * 0.42) * haloScale.value,
  }));

  const viewBox = `0 0 100 100`;
  const center = 50;

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size },
        { transform: [{ scale: logoScale }] },
      ]}
    >
      <Svg width={size} height={size} viewBox={viewBox} accessibilityLabel="Junix Pulse logo">
        <Defs>
          <LinearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#D0BCFF" />
            <Stop offset="0.5" stopColor="#A078FF" />
            <Stop offset="1" stopColor="#4CD7F6" />
          </LinearGradient>
        </Defs>

        {/* Halo respirant derrière le logo */}
        <AnimatedCircle
          cx={center}
          cy={center}
          fill="#A078FF"
          animatedProps={animatedHaloProps}
        />

        {/*
          Tracé "pulse-P" :
          - Départ haut-gauche de la boucle du P
          - Descente verticale gauche
          - Ligne de pouls intégrée au milieu (montée-descente rapide)
          - Retour pour former la boucle du P

          Ce path est le seul vrai SVG de l'identité visuelle.
          strokeDasharray = strokeDashoffset = 280 pour l'animation de tracé.
        */}
        <AnimatedPath
          d={[
            // Tige verticale gauche du P
            'M 30 78',
            'L 30 22',
            // Boucle du haut du P (demi-cercle droit)
            'C 30 22 30 16 36 16',
            'L 54 16',
            'C 66 16 66 28 66 34',
            'C 66 40 60 48 54 48',
            'L 30 48',
            // Ligne de pouls (signature cardiaque)
            'M 30 62',
            'L 40 62',
            'L 45 54',
            'L 52 72',
            'L 58 56',
            'L 62 62',
            'L 72 62',
          ].join(' ')}
          stroke="url(#pulseGrad)"
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={TOTAL_LENGTH}
          animatedProps={animatedPathProps}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

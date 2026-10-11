/**
 * AnimatedBackgroundGlow — Fond d'écran animé haute performance de Junix Pulse.
 *
 * Implémentation GPU-first ultra-fluide (60/120 FPS) :
 * 1. Animation d'opacité et d'échelle douce (respiration biophysique "Pulse")
 * 2. Zéro déplacement de boîte complexe : exécuté 100% sur le thread UI
 * 3. Mémoïsation stricte pour éviter tout recalcul lors de la navigation
 * 4. Respect complet de useReducedMotion
 */

import { memo, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

import { Surface } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function AnimatedBackgroundGlowComponent() {
  const reducedMotion = useReducedMotion();

  // Valeurs partagées Reanimated exécutées sur le thread natif
  const glowOpacity1 = useSharedValue(0.40);
  const glowScale1 = useSharedValue(1.0);

  const glowOpacity2 = useSharedValue(0.35);
  const glowScale2 = useSharedValue(1.0);

  useEffect(() => {
    if (reducedMotion) return;

    // Respiration douce du halo 1 (Violet) : cycle de 6.5s
    glowOpacity1.value = withRepeat(
      withTiming(0.85, { duration: 6500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowScale1.value = withRepeat(
      withTiming(1.12, { duration: 6500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Respiration déphasée du halo 2 (Cyan) : cycle de 8.5s
    glowOpacity2.value = withRepeat(
      withTiming(0.75, { duration: 8500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowScale2.value = withRepeat(
      withTiming(1.15, { duration: 8500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reducedMotion]);

  const animatedStyle1 = useAnimatedStyle(() => ({
    opacity: glowOpacity1.value,
    transform: [{ scale: glowScale1.value }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    opacity: glowOpacity2.value,
    transform: [{ scale: glowScale2.value }],
  }));

  return (
    <View style={styles.root} pointerEvents="none">
      {/* 1. Fond sombre de base */}
      <View style={styles.baseCanvas} />

      {/* 2. Halo 1 (Electric Violet en haut à gauche) */}
      <Animated.View
        style={[
          styles.glowOrb,
          styles.glowOrb1,
          reducedMotion ? styles.reducedOrb1 : animatedStyle1,
        ]}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.22)', 'rgba(139, 92, 246, 0.0)']}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 3. Halo 2 (Digital Cyan en haut à droite) */}
      <Animated.View
        style={[
          styles.glowOrb,
          styles.glowOrb2,
          reducedMotion ? styles.reducedOrb2 : animatedStyle2,
        ]}
      >
        <LinearGradient
          colors={['rgba(6, 182, 212, 0.18)', 'rgba(6, 182, 212, 0.0)']}
          start={{ x: 0.5, y: 0.2 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export const AnimatedBackgroundGlow = memo(AnimatedBackgroundGlowComponent);

const ORB_SIZE_1 = Math.round(SCREEN_WIDTH * 0.95);
const ORB_SIZE_2 = Math.round(SCREEN_WIDTH * 0.85);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  baseCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Surface.base, // #141317 / Midnight Base
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  glowOrb1: {
    top: -SCREEN_HEIGHT * 0.08,
    left: -SCREEN_WIDTH * 0.25,
    width: ORB_SIZE_1,
    height: ORB_SIZE_1,
  },
  glowOrb2: {
    top: SCREEN_HEIGHT * 0.12,
    right: -SCREEN_WIDTH * 0.30,
    width: ORB_SIZE_2,
    height: ORB_SIZE_2,
  },
  reducedOrb1: {
    opacity: 0.5,
  },
  reducedOrb2: {
    opacity: 0.4,
  },
});

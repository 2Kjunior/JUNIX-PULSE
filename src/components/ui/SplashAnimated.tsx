/**
 * SplashAnimated — Écran de lancement animé Junix Pulse (R-01).
 *
 * S'affiche à CHAQUE lancement de l'application (pas uniquement la première fois),
 * pendant l'initialisation de la base SQLite et le chargement des polices.
 *
 * Spécification R-01 :
 * - Fond Midnight uni (#141317)
 * - Logo PulseLogo centré, mode 'draw' puis 'idle'
 * - Texte "JUNIX PULSE" (Outfit Bold) + "Préparation de votre rythme" (Inter)
 * - Aucun bouton, aucun autre élément visuel
 * - Transition automatique quand dbReady devient true
 *
 * Corrections appliquées (vs source Stitch) :
 * - "Sanctum Calibrating" → "JUNIX PULSE"
 * - "Restoring offline state" → "Préparation de votre rythme"
 * - Bouton "Preview Ready State" supprimé
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { PulseLogo } from '@/components/ui/PulseLogo';
import { Surface, OnSurface } from '@/constants/theme';

interface SplashAnimatedProps {
  /** Quand true, le splash fait un fondu sortant */
  isReady: boolean;
}

export function SplashAnimated({ isReady }: SplashAnimatedProps) {
  const [logoMode, setLogoMode] = useState<'draw' | 'idle'>('draw');
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Dès que l'app est prête, on fait un fondu sortant (~300ms)
  React.useEffect(() => {
    if (isReady) {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isReady]);

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={isReady ? 'none' : 'auto'}>
      {/* Logo animé centré */}
      <View style={styles.logoWrapper}>
        <PulseLogo
          size={100}
          mode={logoMode}
          onDrawComplete={() => setLogoMode('idle')}
        />
      </View>

      {/* Texte d'identité — en bas du centre */}
      <View style={styles.textBlock}>
        <Text style={styles.appName}>JUNIX PULSE</Text>
        <Text style={styles.status}>Préparation de votre rythme</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: OnSurface.variant,
    letterSpacing: 3,
  },
  status: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: OnSurface.disabled,
    letterSpacing: 0.3,
  },
});

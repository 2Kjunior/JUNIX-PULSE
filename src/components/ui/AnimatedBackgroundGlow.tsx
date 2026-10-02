/**
 * AnimatedBackgroundGlow — fond d'écran animé de Junix Pulse.
 *
 * Une lueur diagonale (violet → cyan, très faible opacité) dérive lentement
 * du coin haut-gauche vers le coin bas-droit puis revient, en boucle douce
 * (~18s, easing sinusoïdal). Monté une seule fois à la racine de l'app,
 * derrière tous les écrans.
 *
 * Performance : une seule couche animée, transform uniquement (translateX/Y
 * sur le thread UI via Reanimated) — aucun recalcul de dégradé à chaque
 * frame, donc coût proche de zéro même sur les listes de 50+ éléments.
 *
 * Accessibilité : respecte useReducedMotion — la dérive est désactivée et
 * remplacée par une teinte fixe pour les personnes sensibles au mouvement.
 * Opacité globale très faible (≤ 8%) : n'affecte jamais le contraste du
 * texte au-dessus (les écrans restent responsables de leur propre lisibilité).
 */
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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

const LOOP_DURATION_MS = 18000;

export function AnimatedBackgroundGlow() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: LOOP_DURATION_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reducedMotion]);

  // Le voile est surdimensionné (1.6x) pour que la dérive ne révèle jamais
  // de bord vide, même sur les écrans larges ou en rotation.
  const glowSize = Math.max(width, height) * 1.6;

  const animatedStyle = useAnimatedStyle(() => {
    const travel = glowSize * 0.22; // amplitude de la dérive
    return {
      transform: [
        { translateX: -glowSize * 0.3 + progress.value * travel },
        { translateY: -glowSize * 0.35 + progress.value * travel },
      ],
    };
  });

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.base} />
      <Animated.View
        style={[{ width: glowSize, height: glowSize }, animatedStyle]}
      >
        <LinearGradient
          colors={[
            'rgba(168, 85, 247, 0.07)', // violet, haut-gauche
            'rgba(123, 208, 255, 0.05)', // cyan, milieu
            'rgba(20, 19, 23, 0)', // s'éteint vers le fond
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  base: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Surface.base,
  },
});

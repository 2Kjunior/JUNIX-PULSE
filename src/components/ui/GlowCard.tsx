/**
 * GlowCard — carte unique de Junix Pulse.
 *
 * Anatomie (de bas en haut) :
 * 1) Bordure en dégradé (padding 1px, plus forte côté coin supérieur droit)
 * 2) Fond uni opaque (sombre: #14141E, clair: #FFFFFF)
 * 3) Dégradé de profondeur (sombre: ardoise, clair: #FFFFFF -> #FBF8FF)
 * 4) Lueur de coin (LinearGradient absolu, pointerEvents="none")
 * 5) Reflet supérieur (1px blanc, uniquement en sombre)
 * 6) Contenu (children)
 * 7) Pied optionnel (footer), séparé par un filet
 *
 * La couleur ("tone") suit toujours le SENS (priorité, statut), jamais la
 * décoration. "neutral" n'a aucune lueur : c'est la carte ordinaire par défaut.
 *
 * Accessibilité : la lueur est un renfort visuel, jamais l'unique indicateur
 * (règle BR-025). Contraste texte ≥ 4,5:1 vérifié pour les deux modes.
 */
import { memo, useEffect, type ReactNode } from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

import { Glow, GlowCardTokens, type GlowTone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hexToRgba } from '@/utils/color';

export type GlowCardSize = 'list' | 'hero';
export type GlowCardIntensity = 'soft' | 'default';

/** Configuration de latence et d'entrée progressive (Fade In Up + Stagger) */
export const GLOW_CARD_ANIMATION = {
  duration: 380, // Durée perceptible et fluide (380ms)
  staggerStep: 50, // Pas de cascade par carte (50ms)
  maxDelay: 300, // Plafond maximal de cascade (300ms)
  translateYStart: 16, // Déplacement subtil vers le haut (16px)
} as const;

export interface GlowCardProps {
  tone?: GlowTone;
  size?: GlowCardSize;
  intensity?: GlowCardIntensity;
  onPress?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  /** Index de la carte dans une liste pour orchestrer la cascade (stagger) */
  index?: number;
  /** Délai personnalisé explicite en ms (optionnel) */
  delay?: number;
  /** Désactive l'animation d'entrée si nécessaire */
  disableEntranceAnimation?: boolean;
}

// Teintes Glow en mode clair (Section 10 du Master Prompt)
export const GlowLight: Record<GlowTone, string> = {
  neutral: 'transparent',
  info: '#0284C7',
  primary: '#7C3AED',
  attention: '#D97706',
  urgent: '#DC2626',
  success: '#16A34A',
} as const;

function GlowCardInner({
  tone = 'neutral',
  size = 'list',
  intensity = 'default',
  onPress,
  children,
  footer,
  style,
  testID,
  accessibilityLabel,
  index,
  delay,
  disableEntranceAnimation = false,
}: GlowCardProps) {
  const { isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const isReduced = !!reducedMotion || !!disableEntranceAnimation;

  const opacity = useSharedValue(isReduced ? 1 : 0);
  const translateY = useSharedValue(isReduced ? 0 : GLOW_CARD_ANIMATION.translateYStart);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (isReduced) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    const calculatedDelay =
      delay !== undefined
        ? delay
        : Math.min(GLOW_CARD_ANIMATION.maxDelay, (index ?? 0) * GLOW_CARD_ANIMATION.staggerStep);

    opacity.value = withDelay(
      calculatedDelay,
      withTiming(1, {
        duration: GLOW_CARD_ANIMATION.duration,
        easing: Easing.out(Easing.cubic),
      })
    );

    translateY.value = withDelay(
      calculatedDelay,
      withTiming(0, {
        duration: GLOW_CARD_ANIMATION.duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [isReduced, delay, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: pressScale.value },
    ],
  }));

  const accentHex = isDark ? Glow[tone] : GlowLight[tone];
  const hasGlow = tone !== 'neutral';
  const radius = size === 'hero' ? GlowCardTokens.radiusHero : GlowCardTokens.radiusList;

  // Opacités de coin selon le mode
  const glowOpacity = isDark
    ? GlowCardTokens.cornerGlowOpacity[intensity]
    : (intensity === 'soft' ? 0.10 : 0.16);
  const glowMidOpacity = isDark
    ? GlowCardTokens.cornerGlowMidOpacity[intensity]
    : (intensity === 'soft' ? 0.04 : 0.06);

  // Couleurs de bordure en dégradé
  const borderColors: readonly [string, string, ...string[]] = isDark
    ? (hasGlow
        ? [
            hexToRgba(accentHex, GlowCardTokens.borderOpacityAccentStrong),
            hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityAccentMid),
            hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityAccentSoft),
          ]
        : [
            hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityNeutral),
            hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityNeutral),
          ])
    : (hasGlow
        ? [
            hexToRgba(accentHex, 0.40),
            'rgba(76, 52, 120, 0.10)',
            'rgba(76, 52, 120, 0.06)',
          ]
        : [
            'rgba(76, 52, 120, 0.10)',
            'rgba(76, 52, 120, 0.10)',
          ]);

  // Halo extérieur statique : attention/urgent
  const showHalo = tone === 'attention' || tone === 'urgent';
  const haloStyle: ViewStyle | null = showHalo
    ? ({
        boxShadow: isDark
          ? `0 0 16px 0 ${hexToRgba(accentHex, GlowCardTokens.haloOpacity)}`
          : `0 4px 16px 0 ${hexToRgba(accentHex, 0.22)}`,
        borderRadius: radius,
      })
    : null;

  // Dégradé de profondeur
  const depthColors: readonly [string, string] = isDark
    ? ['rgba(27, 32, 48, 0.72)', 'rgba(20, 24, 36, 0.92)']
    : ['#FFFFFF', '#FBF8FF'];

  // Fond uni inner
  const innerBg = isDark ? GlowCardTokens.background : '#FFFFFF';

  // Séparateur de pied
  const separatorColor = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(76, 52, 120, 0.08)';

  // Ombre extérieure thématique
  const shadowStyle: ViewStyle = isDark
    ? (Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
        default: {
          boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.40)',
        },
      }) as ViewStyle)
    : (Platform.select({
        ios: {
          shadowColor: '#3C2864',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.10,
          shadowRadius: 12,
        },
        android: {
          elevation: 2,
        },
        default: {
          boxShadow: '0 4px 16px -2px rgba(60, 40, 100, 0.10)',
        },
      }) as ViewStyle);

  const content = (
    <View style={[styles.outerWrapper, shadowStyle, { borderRadius: radius }, haloStyle]}>
      <LinearGradient
        colors={borderColors}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradientBorder, { borderRadius: radius }]}
      >
        <View style={[styles.inner, { backgroundColor: innerBg, borderRadius: radius - 0.5 }]}>
          {/* Fond dégradé pour la profondeur */}
          <LinearGradient
            colors={depthColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius - 0.5 }]}
            pointerEvents="none"
          />

          {hasGlow && (
            <LinearGradient
              pointerEvents="none"
              colors={[
                hexToRgba(accentHex, glowOpacity),
                hexToRgba(accentHex, glowMidOpacity),
                hexToRgba(accentHex, 0),
              ]}
              locations={[0, 0.45, 1]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.35, y: 0.75 }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius - 0.5 }]}
            />
          )}

          {/* Liseré spéculaire zénithal (sombre uniquement) */}
          {isDark && (
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.32)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topHighlight}
              pointerEvents="none"
            />
          )}

          <View style={styles.content}>{children}</View>

          {footer ? (
            <View style={styles.footer}>
              <View style={[styles.footerSeparator, { backgroundColor: separatorColor }]} />
              {footer}
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );

  if (!onPress) {
    return (
      <Animated.View style={[style, animatedStyle]} testID={testID} accessibilityLabel={accessibilityLabel}>
        {content}
      </Animated.View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (reducedMotion) return;
        pressScale.value = withTiming(0.98, { duration: 100 });
      }}
      onPressOut={() => {
        if (reducedMotion) return;
        pressScale.value = withTiming(1, { duration: 150 });
      }}
      style={style}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Animated.View style={reducedMotion ? undefined : animatedStyle}>{content}</Animated.View>
    </Pressable>
  );
}

export const GlowCard = memo(GlowCardInner);

const styles = StyleSheet.create({
  outerWrapper: {
    minHeight: 44, // zone tactile >= 44dp
  },
  gradientBorder: {
    padding: 1,
    overflow: 'hidden',
  },
  inner: {
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  content: {
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  footer: {
    paddingHorizontal: 15,
    paddingBottom: 12,
  },
  footerSeparator: {
    height: 1,
    marginBottom: 10,
  },
});

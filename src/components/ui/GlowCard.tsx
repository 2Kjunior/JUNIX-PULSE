/**
 * GlowCard — carte unique de Junix Pulse, remplace toutes les anciennes cartes
 * "fond sombre + barre colorée à gauche" (borderLeftWidth/borderLeftColor).
 *
 * Anatomie (de bas en haut) :
 * 1) Bordure en dégradé (padding 1px, plus forte côté coin supérieur droit)
 * 2) Fond uni opaque (GlowCardTokens.background)
 * 3) Lueur de coin (LinearGradient absolu, pointerEvents="none")
 * 4) Reflet supérieur (1px blanc 8%)
 * 5) Contenu (children)
 * 6) Pied optionnel (footer), séparé par un filet 1px blanc 6%
 *
 * La couleur ("tone") suit toujours le SENS (priorité, statut), jamais la
 * décoration — voir les règles d'usage par écran dans la documentation du
 * projet. "neutral" n'a aucune lueur : c'est la carte ordinaire par défaut.
 *
 * Accessibilité : la lueur est un renfort visuel, jamais l'unique indicateur
 * — chaque carte colorée doit porter, en plus, un chip/icône avec un libellé
 * explicite (ex. "Haute", "Relance conseillée"), géré par l'écran appelant
 * via children/footer. Contraste texte ≥ 4,5:1 vérifié pour les 5 teintes.
 */
import { memo, type ReactNode } from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

import { Glow, GlowCardTokens, type GlowTone } from '@/constants/theme';

export type GlowCardSize = 'list' | 'hero';
export type GlowCardIntensity = 'soft' | 'default';

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
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex === 'transparent') return 'rgba(255, 255, 255, 0)';
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
}: GlowCardProps) {
  const reducedMotion = useReducedMotion();
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const accentHex = Glow[tone];
  const hasGlow = tone !== 'neutral';
  const radius = size === 'hero' ? GlowCardTokens.radiusHero : GlowCardTokens.radiusList;
  const glowOpacity = GlowCardTokens.cornerGlowOpacity[intensity];
  const glowMidOpacity = GlowCardTokens.cornerGlowMidOpacity[intensity];

  const borderColors = hasGlow
    ? ([
        hexToRgba(accentHex, GlowCardTokens.borderOpacityAccentStrong),
        hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityAccentMid),
        hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityAccentSoft),
      ] as const)
    : ([
        hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityNeutral),
        hexToRgba('#FFFFFF', GlowCardTokens.borderOpacityNeutral),
      ] as const);

  // Halo extérieur statique : uniquement attention/urgent, demandé par le spec.
  // boxShadow est cross-platform (iOS + Android) depuis RN 0.76 / New Architecture
  // (déjà actif sur ce projet) — confirmé sur la doc React Native officielle.
  const showHalo = tone === 'attention' || tone === 'urgent';
  const haloStyle = showHalo
    ? ({ boxShadow: `0 0 16px 0 ${hexToRgba(accentHex, GlowCardTokens.haloOpacity)}` } as ViewStyle)
    : null;

  const content = (
    <View style={[styles.outerWrapper, haloStyle]}>
      <LinearGradient
        colors={borderColors}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradientBorder, { borderRadius: radius }]}
      >
        <View style={[styles.inner, { borderRadius: radius - 0.5 }]}>
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

          <View style={styles.topHighlight} />

          <View style={styles.content}>{children}</View>

          {footer ? (
            <View style={styles.footer}>
              <View style={styles.footerSeparator} />
              {footer}
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );

  if (!onPress) {
    return (
      <View style={style} testID={testID} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
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
    ...Platform.select({
      android: { overflow: 'hidden' },
    }),
  },
  inner: {
    backgroundColor: GlowCardTokens.background,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
});

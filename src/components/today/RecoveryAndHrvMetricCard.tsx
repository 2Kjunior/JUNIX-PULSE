/**
 * RecoveryAndHrvMetricCard — Carte de télémétrie et récupération Glassmorphism.
 * Entièrement thématisée pour les modes sombre (Midnight Glow) et clair (crème chaleureuse).
 */

import { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
  Platform,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import {
  Radius,
  Spacing,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export interface RecoveryAndHrvMetricCardProps {
  score?: number;
  scoreLabel?: string;
  statusLabel?: string;
  title?: string;
  subtitle?: string;
  metricLabel?: string;
  metricValue?: string | number;
  metricUnit?: string;
  hrvValue?: number;
  hrvUnit?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const GAUGE_SIZE = 56;
const STROKE_WIDTH = 4;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function RecoveryAndHrvMetricCardInner({
  score = 100,
  scoreLabel = 'RYTHME',
  statusLabel = 'Optimal',
  title = 'Rythme Quotidien',
  subtitle = 'Aucun rappel urgent en attente',
  metricLabel = 'FOCUS',
  metricValue,
  metricUnit = '',
  hrvValue,
  hrvUnit,
  onPress,
  style,
  testID = 'recovery-metric-card',
}: RecoveryAndHrvMetricCardProps) {
  const { palette, isDark } = useTheme();
  const styles = useThemedStyles(makeRecoveryCardStyles);

  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = CIRCUMFERENCE * (1 - clampedScore / 100);
  const displayValue = metricValue ?? hrvValue ?? `${clampedScore}%`;
  const displayUnit = metricUnit || hrvUnit || '';

  const backgroundGradientColors = isDark
    ? ['rgba(35, 42, 62, 0.65)', 'rgba(16, 20, 30, 0.82)']
    : ['rgba(251, 247, 242, 0.95)', 'rgba(242, 237, 232, 0.98)'];

  const specularColors = isDark
    ? ['transparent', 'rgba(255, 255, 255, 0.45)', 'transparent']
    : ['transparent', 'rgba(255, 255, 255, 0.60)', 'transparent'];

  const cardContent = (
    <View style={styles.cardContainer}>
      {/* 1. Fond dégradé pour la profondeur */}
      <LinearGradient
        colors={backgroundGradientColors as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.gradientFill]}
      />

      {/* 2. Lueur d'ambiance émeraude */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* 3. Liseré spéculaire zénithal */}
      <LinearGradient
        colors={specularColors as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.specularTopHighlight}
        pointerEvents="none"
      />

      {/* 4. Corps de la carte */}
      <View style={styles.innerRow}>
        {/* Jauge circulaire SVG */}
        <View style={styles.gaugeContainer}>
          <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
            <G rotation="-90" origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}>
              {/* Piste d'arrière-plan */}
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={RADIUS}
                stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Arc de progression actif */}
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={RADIUS}
                stroke={palette.success.default}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </G>
          </Svg>

          {/* Valeur numérique au centre */}
          <View style={styles.gaugeCenterText}>
            <Text style={styles.scoreText}>{clampedScore}</Text>
            <Text style={styles.scoreLabelText}>{scoreLabel}</Text>
          </View>
        </View>

        {/* Textes et statut au centre */}
        <View style={styles.textColumn}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* Colonne droite : Métrique de Focus / Accomplissement */}
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>{metricLabel}</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricNumber}>{displayValue}</Text>
            {displayUnit ? (
              <Text style={styles.metricUnit}>{displayUnit}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View style={[styles.outerWrapper, style]} testID={testID}>
        {cardContent}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outerWrapper,
        pressed && styles.pressedState,
        style,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}, score ${score}, ${statusLabel}, ${metricLabel} ${displayValue} ${displayUnit}`}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {cardContent}
    </Pressable>
  );
}

export const RecoveryAndHrvMetricCard = memo(RecoveryAndHrvMetricCardInner);

function makeRecoveryCardStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    outerWrapper: {
      borderRadius: Radius.lg,
    },
    cardContainer: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.glass.card.borderColor,
      overflow: 'hidden',
      position: 'relative',
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: theme.shadow.mdOpacity,
          shadowRadius: 16,
        },
        android: {
          elevation: 4,
        },
        default: {
          boxShadow: isDark
            ? '0 8px 24px -4px rgba(0, 0, 0, 0.45)'
            : '0 8px 20px -4px rgba(107, 70, 193, 0.10)',
        },
      }),
    },
    gradientFill: {
      borderRadius: Radius.lg,
    },
    ambientGlow: {
      position: 'absolute',
      top: -24,
      right: -24,
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.08)',
    },
    specularTopHighlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      zIndex: 2,
    },
    innerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      gap: Spacing.md,
      zIndex: 1,
    },
    gaugeContainer: {
      width: GAUGE_SIZE,
      height: GAUGE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    gaugeCenterText: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreText: {
      color: theme.onSurface.primary,
      fontSize: 16,
      fontWeight: '700',
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      lineHeight: 18,
    },
    scoreLabelText: {
      color: theme.success.default,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 0.8,
      fontFamily: FontFamily?.bold,
      marginTop: -1,
    },
    textColumn: {
      flex: 1,
      justifyContent: 'center',
      gap: 3,
    },
    titleBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    titleText: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    statusBadge: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(5, 150, 105, 0.12)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(5, 150, 105, 0.25)',
      borderRadius: Radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
    },
    statusBadgeText: {
      color: theme.success.default,
      fontSize: 10,
      fontWeight: '600',
      fontFamily: FontFamily?.semiBold,
    },
    subtitleText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    metricColumn: {
      paddingLeft: Spacing.md,
      borderLeftWidth: 1,
      borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.10)' : theme.outline.variant,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    metricLabel: {
      fontSize: 11,
      color: theme.onSurface.variant,
      fontFamily: FontFamily?.medium,
    },
    metricValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
    },
    metricNumber: {
      color: theme.onSurface.primary,
      fontSize: 16,
      fontWeight: '700',
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    },
    metricUnit: {
      fontSize: 10,
      color: theme.onSurface.variant,
      fontFamily: FontFamily?.regular,
    },
    pressedState: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
  });
}

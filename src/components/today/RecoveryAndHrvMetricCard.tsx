/**
 * RecoveryAndHrvMetricCard — Carte de télémétrie et récupération 3D Glassmorphism.
 * Référence EX-02 du Master Design Stitch.
 *
 * Traitement visuel 3D Glass :
 * 1. Fond ardoise translucide dégradé avec profondeur optique
 * 2. Liseré spéculaire zénithal (accroche de lumière supérieure)
 * 3. Jauge SVG circulaire de score avec lueur d'accent
 * 4. Métriques VFC avec hiérarchie claire
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
  OnSurface,
  Typography,
  FontFamily,
  TitleFontFamily,
  Success,
} from '@/constants/theme';

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
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = CIRCUMFERENCE * (1 - clampedScore / 100);
  const displayValue = metricValue ?? hrvValue ?? `${clampedScore}%`;
  const displayUnit = metricUnit || hrvUnit || '';

  const cardContent = (
    <View style={styles.cardContainer}>
      {/* 1. Fond ardoise dégradé pour la profondeur de verre */}
      <LinearGradient
        colors={['rgba(35, 42, 62, 0.65)', 'rgba(16, 20, 30, 0.82)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.gradientFill]}
      />

      {/* 2. Lueur d'ambiance émeraude dans le coin supérieur droit */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* 3. Liseré spéculaire zénithal (accroche de lumière sur l'arête supérieure) */}
      <LinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.45)', 'transparent']}
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
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Arc de progression actif */}
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={RADIUS}
                stroke={Success.default}
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

const styles = StyleSheet.create({
  outerWrapper: {
    minHeight: 44,
  },
  cardContainer: {
    borderRadius: Radius.lg, // 16px (standardisé avec le reste des cartes de contenu)
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.45)',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // Vert émeraude subtil
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    lineHeight: 18,
  },
  scoreLabelText: {
    color: Success.default,
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
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  statusBadgeText: {
    color: Success.default,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: FontFamily?.semiBold,
  },
  subtitleText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  metricColumn: {
    paddingLeft: Spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: OnSurface.variant,
    fontFamily: FontFamily?.medium,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  metricNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
  },
  metricUnit: {
    fontSize: 10,
    color: OnSurface.variant,
    fontFamily: FontFamily?.regular,
  },
  pressedState: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});

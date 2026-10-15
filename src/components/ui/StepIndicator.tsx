/**
 * StepIndicator — Indicateur de progression d'onboarding.
 * Barres horizontales (style R-02) : terminé / actif / à venir.
 * Réutilisé sur tous les écrans d'onboarding, jamais dans l'app principale.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useThemedStyles } from '@/hooks/use-themed-styles';

interface StepIndicatorProps {
  total: number;
  current: number; // 1-indexed
  showLabel?: boolean;
}

export function StepIndicator({ total, current, showLabel = true }: StepIndicatorProps) {
  const styles = useThemedStyles(makeStepIndicatorStyles);

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label} accessibilityLabel={`Étape ${current} sur ${total}`}>
          ÉTAPE {current} SUR {total}
        </Text>
      )}
      <View style={styles.bars} accessibilityRole="progressbar">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                isDone && styles.barDone,
                isActive && styles.barActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const makeStepIndicatorStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      marginBottom: Spacing.xl,
    },
    label: {
      ...Typography.labelSmall,
      color: theme.onSurface.disabled,
      letterSpacing: 1.2,
      marginBottom: Spacing.sm,
    },
    bars: {
      flexDirection: 'row',
      gap: 6,
    },
    bar: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.outline.variant,
    },
    barDone: {
      backgroundColor: theme.primary.default,
      opacity: 0.5,
    },
    barActive: {
      backgroundColor: theme.primary.default,
      opacity: 1,
    },
  });


/**
 * StepIndicator — Indicateur de progression d'onboarding.
 * Barres horizontales (style R-02) : terminé / actif / à venir.
 * Réutilisé sur tous les écrans d'onboarding, jamais dans l'app principale.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Primary, OnSurface, Outline, Spacing, Typography } from '@/constants/theme';

interface StepIndicatorProps {
  total: number;
  current: number; // 1-indexed
  showLabel?: boolean;
}

export function StepIndicator({ total, current, showLabel = true }: StepIndicatorProps) {
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

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
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
    backgroundColor: Outline.variant,
  },
  barDone: {
    backgroundColor: Primary.default,
    opacity: 0.5,
  },
  barActive: {
    backgroundColor: Primary.default,
    opacity: 1,
  },
});

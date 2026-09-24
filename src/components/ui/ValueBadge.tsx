/**
 * ValueBadge — Badge pill de proposition de valeur (onboarding R-02).
 * Icône vectorielle + titre + sous-titre court.
 * Jamais d'emoji — règle A.1.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Surface, Primary, OnSurface, Outline, Spacing, Radius, Typography } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ValueBadgeProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  accentColor?: string;
}

export function ValueBadge({
  icon,
  title,
  subtitle,
  accentColor = Primary.default,
}: ValueBadgeProps) {
  return (
    <View style={styles.badge}>
      <View style={[styles.iconContainer, { borderColor: accentColor + '30' }]}>
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flex: 1,
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 96,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(208, 188, 255, 0.08)',
    marginBottom: 2,
  },
  title: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
    textAlign: 'center',
    lineHeight: 14,
  },
});

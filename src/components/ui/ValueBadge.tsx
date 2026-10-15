/**
 * ValueBadge — Badge pill de proposition de valeur (onboarding R-02).
 * Icône vectorielle + titre + sous-titre court.
 * Jamais d'emoji — règle A.1.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

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
  accentColor,
}: ValueBadgeProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeValueBadgeStyles);
  const effectiveAccent = accentColor ?? palette.primary.default;

  return (
    <View style={styles.badge}>
      <View style={[styles.iconContainer, { borderColor: effectiveAccent + '30' }]}>
        <Ionicons name={icon} size={20} color={effectiveAccent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const makeValueBadgeStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    badge: {
      flex: 1,
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.outline.variant,
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
      backgroundColor: theme.primary.container + '33',
      marginBottom: 2,
    },
    title: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
      textAlign: 'center',
    },
    subtitle: {
      ...Typography.labelSmall,
      color: theme.onSurface.disabled,
      textAlign: 'center',
      lineHeight: 14,
    },
  });


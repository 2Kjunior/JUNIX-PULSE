/**
 * Composant Button — Design system Junix Pulse.
 * Variants : primary, secondary, ghost, destructive.
 * Taille des zones tactiles respecte les guidelines d'accessibilité (min 44pt).
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Surface, Primary, Error, OnSurface, Outline, Radius, Spacing, Typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        isDisabled && styles.disabled,
        style,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Surface.base : Primary.default}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,  // Accessibilité : zone tactile minimale
  },

  // ─── Sizes ─────────────────────────────────────────────────────────────────
  size_sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  size_lg: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },

  // ─── Variants ──────────────────────────────────────────────────────────────
  variant_primary: {
    backgroundColor: Primary.default,
  },
  variant_secondary: {
    backgroundColor: Surface.high,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_destructive: {
    backgroundColor: Error.container,
    borderWidth: 1,
    borderColor: Error.default,
  },

  disabled: {
    opacity: 0.4,
  },

  // ─── Labels ────────────────────────────────────────────────────────────────
  label: {
    ...Typography.labelLarge,
    letterSpacing: 0.1,
  },
  label_primary: {
    color: Primary.on,
  },
  label_secondary: {
    color: OnSurface.primary,
  },
  label_ghost: {
    color: Primary.default,
  },
  label_destructive: {
    color: Error.default,
  },

  labelSize_sm: { fontSize: 12 },
  labelSize_md: { fontSize: 14 },
  labelSize_lg: { fontSize: 16 },

  // ─── Icônes ────────────────────────────────────────────────────────────────
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: Spacing.xs,
  },
  iconRight: {
    marginLeft: Spacing.xs,
  },
});

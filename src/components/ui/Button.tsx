/**
 * Button — Design system Junix Pulse.
 * Variant primary : dégradé linéaire violet→cyan (règle : 1 seul dégradé par écran).
 * Autres variants : secondary, ghost, destructive (surfaces plates, sans dégradé).
 * Zones tactiles min 44pt (accessibilité).
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Surface,
  Primary,
  Error,
  OnSurface,
  Outline,
  Radius,
  Spacing,
  Typography,
  Gradient,
} from '@/constants/theme';

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

  const content = loading ? (
    <ActivityIndicator
      size="small"
      color={variant === 'primary' ? Surface.base : Primary.default}
    />
  ) : (
    <View style={styles.content}>
      {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
      <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
        {label}
      </Text>
      {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          styles[`size_${size}`],
          isDisabled && styles.disabled,
          style,
          pressed && !isDisabled && styles.pressed,
        ]}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled }}
      >
        <LinearGradient
          colors={Gradient.primary}
          start={Gradient.primaryStart}
          end={Gradient.primaryEnd}
          style={[styles.gradient, styles[`size_${size}`]]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        isDisabled && styles.disabled,
        style,
        pressed && !isDisabled && styles.pressed,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Accessibilité : zone tactile minimale
    overflow: 'hidden',
  },

  pressed: {
    transform: [{ scale: 0.97 }],
  },

  // ─── Gradient wrapper (primary seulement) ──────────────────────────────────
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    width: '100%',
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

  // ─── Variants (non-primary) ─────────────────────────────────────────────────
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
    color: '#0D0B12', // texte sombre sur dégradé clair
    fontWeight: '600',
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

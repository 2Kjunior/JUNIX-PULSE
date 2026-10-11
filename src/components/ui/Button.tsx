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
  Platform,
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
      color="#FFFFFF"
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
          styles.primaryBase,
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
          colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46, // Accessibilité : zone tactile minimale
    overflow: 'hidden',
  },

  primaryBase: {
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 6px 24px -2px rgba(139, 92, 246, 0.40)',
      },
    }),
  },

  pressed: {
    transform: [{ scale: 0.97 }],
  },

  // ─── Gradient wrapper (primary seulement) ──────────────────────────────────
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    width: '100%',
  },

  // ─── Sizes ─────────────────────────────────────────────────────────────────
  size_sm: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.xs + 2,
    minHeight: 38,
  },
  size_md: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    minHeight: 48,
  },
  size_lg: {
    paddingHorizontal: Spacing.xl + 8,
    paddingVertical: Spacing.md + 2,
    minHeight: 54,
  },

  // ─── Variants (non-primary) ─────────────────────────────────────────────────
  variant_secondary: {
    backgroundColor: 'rgba(27, 32, 48, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radius.full,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
    borderRadius: Radius.full,
  },
  variant_destructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: Radius.full,
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
    color: '#FFFFFF', // Texte blanc éclatant conforme à l'image 2
    fontWeight: '700',
  },
  label_secondary: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  label_ghost: {
    color: Primary.default,
    fontWeight: '600',
  },
  label_destructive: {
    color: Error.default,
    fontWeight: '600',
  },

  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 17 },

  // ─── Icônes ────────────────────────────────────────────────────────────────
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: Spacing.xs + 2,
  },
  iconRight: {
    marginLeft: Spacing.xs + 2,
  },
});

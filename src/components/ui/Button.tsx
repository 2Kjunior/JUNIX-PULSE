/**
 * Button — Design system Junix Pulse.
 * Variant primary : dégradé linéaire violet→cyan (règle : 1 seul dégradé par écran).
 * Autres variants : secondary, ghost, destructive (surfaces plates, sans dégradé).
 * Zones tactiles min 44pt (accessibilité).
 *
 * Migration P5 : Entièrement thématisé via useThemedStyles(makeButtonStyles)
 * - variant_secondary utilise theme.surface.container et theme.onSurface.primary
 * - variant_primary utilise le gradient thématique (palette.gradient.primary)
 * - variant_ghost et destructive utilisent les tokens d'accent dynamiques
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
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
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
  const { palette } = useTheme();
  const styles = useThemedStyles(makeButtonStyles);
  const isDisabled = disabled || loading;

  const indicatorColor = variant === 'primary' ? '#FFFFFF' : palette.onSurface.primary;

  const content = loading ? (
    <ActivityIndicator
      size="small"
      color={indicatorColor}
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
          colors={palette.gradient.primary as unknown as readonly [string, string, ...string[]]}
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

export function makeButtonStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    base: {
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46, // Accessibilité : zone tactile minimale
      overflow: 'hidden',
    },

    primaryBase: {
      borderWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.60)',
      borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.40)',
      borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(107, 70, 193, 0.40)',
      borderRightColor: isDark ? 'rgba(0, 0, 0, 0.20)' : 'rgba(107, 70, 193, 0.30)',
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.38 : 0.25,
          shadowRadius: 14,
        },
        android: {
          elevation: 6,
        },
        default: {
          boxShadow: isDark
            ? '0 6px 24px -2px rgba(139, 92, 246, 0.40)'
            : '0 6px 20px -2px rgba(107, 70, 193, 0.25)',
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
      backgroundColor: isDark ? 'rgba(27, 32, 48, 0.85)' : theme.surface.container,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.outline.variant,
      borderRadius: Radius.full,
    },
    variant_ghost: {
      backgroundColor: 'transparent',
      borderRadius: Radius.full,
    },
    variant_destructive: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.10)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.45)' : 'rgba(220, 38, 38, 0.30)',
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
      color: '#FFFFFF', // Texte blanc éclatant conforme au CTA dégradé
      fontWeight: '700',
    },
    label_secondary: {
      color: theme.onSurface.primary, // Dynamique : lisible en sombre et en clair
      fontWeight: '600',
    },
    label_ghost: {
      color: theme.primary.default,
      fontWeight: '600',
    },
    label_destructive: {
      color: theme.error.default,
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
}

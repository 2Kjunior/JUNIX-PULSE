/**
 * Composants de feedback — États vides, chargement, erreur.
 * BR-024 : les écrans doivent couvrir leurs états vides et erreurs.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '../ui/Button';

// ─── État vide ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function EmptyState({
  icon,
  iconName,
  title,
  description,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStatesStyles);

  return (
    <View style={[styles.centered, style]} testID={testID}>
      <View style={styles.emptyIconContainer}>
        {iconName ? (
          <Ionicons name={iconName} size={36} color={palette.onSurface.disabled} />
        ) : icon && icon !== '✦' ? (
          <Text style={styles.emptyIcon} accessibilityElementsHidden>
            {icon}
          </Text>
        ) : (
          <Ionicons name="sparkles-outline" size={36} color={palette.onSurface.disabled} />
        )}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && (
        <Text style={styles.emptyDescription}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.emptyAction}>
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="secondary"
            size="sm"
          />
        </View>
      )}
    </View>
  );
}

// ─── État de chargement ───────────────────────────────────────────────────────

interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
  testID?: string;
}

export function LoadingState({ message, style, testID }: LoadingStateProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStatesStyles);

  return (
    <View style={[styles.centered, style]} testID={testID}>
      <ActivityIndicator size="large" color={palette.primary.default} />
      {message && <Text style={styles.loadingMessage}>{message}</Text>}
    </View>
  );
}

// ─── État d'erreur ────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message,
  retryLabel = 'Réessayer',
  onRetry,
  style,
  testID,
}: ErrorStateProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStatesStyles);

  return (
    <View style={[styles.centered, style]} testID={testID}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={28} color={palette.error.default} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry && (
        <View style={styles.emptyAction}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" size="sm" />
        </View>
      )}
    </View>
  );
}

// ─── Squelette de chargement (inline, pour les listes) ───────────────────────

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const styles = useThemedStyles(makeStatesStyles);

  return (
    <View
      style={[
        styles.skeleton,
        { width: width as number, height, borderRadius },
        style,
      ]}
      accessibilityElementsHidden
    />
  );
}

const makeStatesStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },

    // Vide
    emptyIconContainer: {
      marginBottom: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: Spacing.md,
      color: theme.onSurface.variant,
      opacity: 0.5,
    },
    emptyTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    emptyDescription: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyAction: {
      marginTop: Spacing.lg,
    },

    // Chargement
    loadingMessage: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      marginTop: Spacing.md,
      textAlign: 'center',
    },

    // Erreur
    errorIconContainer: {
      width: 56,
      height: 56,
      borderRadius: Radius.full,
      backgroundColor: theme.error.container,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    errorIcon: {
      fontSize: 24,
      color: theme.error.default,
    },
    errorTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      textAlign: 'center',
      marginBottom: Spacing.xs,
    },
    errorMessage: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Skeleton
    skeleton: {
      backgroundColor: theme.surface.high,
    },
  });


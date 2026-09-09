/**
 * Composants de feedback — États vides, chargement, erreur.
 * BR-024 : les écrans doivent couvrir leurs états vides et erreurs.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Surface, OnSurface, Primary, Error, Spacing, Typography, Radius } from '@/constants/theme';
import { Button } from '../ui/Button';

// ─── État vide ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function EmptyState({
  icon = '✦',
  title,
  description,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  return (
    <View style={[styles.centered, style]} testID={testID}>
      <Text style={styles.emptyIcon} accessibilityElementsHidden>
        {icon}
      </Text>
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
  return (
    <View style={[styles.centered, style]} testID={testID}>
      <ActivityIndicator size="large" color={Primary.default} />
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
  return (
    <View style={[styles.centered, style]} testID={testID}>
      <View style={styles.errorIconContainer}>
        <Text style={styles.errorIcon}>⚠</Text>
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },

  // Vide
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
    color: OnSurface.variant,
    opacity: 0.5,
  },
  emptyTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: Spacing.lg,
  },

  // Chargement
  loadingMessage: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Erreur
  errorIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Error.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errorIcon: {
    fontSize: 24,
    color: Error.default,
  },
  errorTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Skeleton
  skeleton: {
    backgroundColor: Surface.high,
  },
});

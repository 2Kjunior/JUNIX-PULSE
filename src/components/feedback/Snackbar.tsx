/**
 * Snackbar — Notification contextuelle avec action optionnelle (undo).
 * Utilisé pour les suppressions réversibles (30 secondes selon contrat).
 * BR : suppression logique avec possibilité d'annulation pendant ~30 secondes.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { Surface, OnSurface, Primary, Radius, Spacing, Typography } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Snackbar() {
  const { snackbar, hideSnackbar } = useAppStore();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (snackbar?.visible) {
      // Apparition
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dismiss();
      }, snackbar.durationMs);
    } else {
      dismiss();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [snackbar]);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => hideSnackbar());
  }

  if (!snackbar) return null;

  const bottomOffset = insets.bottom + 80; // Au-dessus de la tab bar

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={snackbar.message}
    >
      <Text style={styles.message} numberOfLines={2}>
        {snackbar.message}
      </Text>
      {snackbar.actionLabel && snackbar.onAction && (
        <TouchableOpacity
          onPress={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            snackbar.onAction?.();
            hideSnackbar();
          }}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={snackbar.actionLabel}
        >
          <Text style={styles.actionLabel}>{snackbar.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Surface.highest,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
    zIndex: 1000,
    // Ombre légère sur iOS
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  message: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    flex: 1,
  },
  action: {
    marginLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  actionLabel: {
    ...Typography.labelLarge,
    color: Primary.default,
  },
});

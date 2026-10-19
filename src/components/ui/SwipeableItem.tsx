/**
 * SwipeableItem — Composant d'interaction gestuelle pour les cartes de liste.
 * Permet le glissement latéral :
 * - Swipe vers la gauche : action de suppression douce réversible
 * - Swipe vers la droite : action de complétion rapide
 *
 * Conforme à WCAG 2.2 AA (boutons accessibles avec rôle et label explicite).
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography, FontFamily } from '@/constants/theme';

export interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onComplete?: () => void;
  deleteLabel?: string;
  completeLabel?: string;
  enabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SwipeableItem({
  children,
  onDelete,
  onComplete,
  deleteLabel = 'Supprimer',
  completeLabel = 'Terminer',
  enabled = true,
  containerStyle,
}: SwipeableItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const { theme } = useTheme();

  if (!enabled || (!onDelete && !onComplete)) {
    return <View style={containerStyle}>{children}</View>;
  }

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!onDelete) return null;

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 0.7, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.error.default }]}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
        >
          <Animated.View style={[styles.actionContent, { transform: [{ scale }], opacity }]}>
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            <Text style={styles.actionText}>{deleteLabel}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!onComplete) return null;

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 0.7, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.leftActionContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.success.default }]}
          onPress={() => {
            swipeableRef.current?.close();
            onComplete();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={completeLabel}
        >
          <Animated.View style={[styles.actionContent, { transform: [{ scale }], opacity }]}>
            <Ionicons name="checkmark-outline" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>{completeLabel}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      overshootLeft={false}
      renderRightActions={onDelete ? renderRightActions : undefined}
      renderLeftActions={onComplete ? renderLeftActions : undefined}
      containerStyle={containerStyle}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightActionContainer: {
    width: 86,
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  leftActionContainer: {
    width: 86,
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: Spacing.sm,
    marginRight: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    ...Typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FontFamily?.bold,
    fontSize: 11,
  },
});

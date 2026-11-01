/**
 * Bouton Flottant 3D Glassmorphism (GlassFloatingActionButton / GlassFAB)
 *
 * Fonctionnalités clés :
 * 1. Animation de rétractation temporelle synchronisée avec la Tab Bar :
 *    - Utilise `useFocusEffect` d'Expo Router pour se redéclencher à CHAQUE passage
 *      sur l'onglet de la bottom bar (Tâches, Calendrier, Contacts, Sanctuaire, etc.).
 *    - Reste affiché en version étendue [ +  Nouvelle tâche ] pendant 10 secondes (10 000 ms).
 *    - Après 10 secondes, se rétracte avec une animation 3D fluide pour devenir
 *      un bouton circulaire parfait 52x52 [ + ].
 * 2. Effet 3D tactile (Touch scale & spring) :
 *    - Compression volumétrique au toucher (scale 0.90) puis rebond élastique (spring).
 *    - Liseré supérieur biseauté 3D (reflet blanc 35%, halo d'élévation Electric Violet).
 * 3. Verre violet vif, commun aux boutons principaux (VividGlassFill).
 */

import React, { useRef, useCallback } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { VividGlassFill } from '@/components/ui/VividGlassFill';
import {
  Typography,
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';

export interface GlassFloatingActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  bottomOffset?: number;
  collapseDelayMs?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function GlassFloatingActionButton({
  label,
  onPress,
  icon = 'add',
  iconSize = 22,
  bottomOffset = TAB_BAR_TOTAL_HEIGHT + 16,
  collapseDelayMs = 10000, // 10 secondes avant réduction
  accessibilityLabel,
  style,
}: GlassFloatingActionButtonProps) {
  const styles = useThemedStyles(makeGlassFabStyles);
  const reduceMotion = useSafeReducedMotion();

  // Valeur d'expansion Reanimated : 1 = étendu (largeur ~176px), 0 = compact (cercle 52x52)
  const expandAnim = useSharedValue(reduceMotion ? 0 : 1);
  // Valeur d'échelle 3D (touch press)
  const scaleAnim = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Déclenché à chaque fois que l'écran/onglet devient actif
  useFocusEffect(
    useCallback(() => {
      // 1. Annuler tout timer précédent
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (reduceMotion) {
        expandAnim.value = 0;
        return;
      }

      // 2. Déplier immédiatement dans l'état étendu complet
      expandAnim.value = 1;

      // 3. Programmer la réduction sur le thread UI après collapseDelayMs
      timerRef.current = setTimeout(() => {
        expandAnim.value = withTiming(0, {
          duration: 380,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
      }, collapseDelayMs);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, [collapseDelayMs, expandAnim, reduceMotion])
  );

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.92, { damping: 14, stiffness: 220 });
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1.0, { damping: 14, stiffness: 220 });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const animatedWrapperStyle = useAnimatedStyle(() => ({
    width: interpolate(expandAnim.value, [0, 1], [52, 176]),
  }));

  const animatedLabelWrapperStyle = useAnimatedStyle(() => ({
    width: interpolate(expandAnim.value, [0, 1], [0, 116]),
    opacity: interpolate(expandAnim.value, [0, 0.35, 1], [0, 0, 1]),
    marginLeft: interpolate(expandAnim.value, [0, 1], [0, 6]),
    transform: [{ scale: interpolate(expandAnim.value, [0, 1], [0.85, 1]) }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset },
        animatedContainerStyle,
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
      >
        <Animated.View style={[styles.touchableWrapper, animatedWrapperStyle]}>
          <VividGlassFill />
          <Animated.View style={styles.gradient}>
            <Animated.View style={styles.contentRow}>
              {/* Icône toujours nette et centrée lorsque rétracté */}
              <Ionicons name={icon} size={iconSize} color="#FFFFFF" />

              {/* Texte rétractable avec masquage overflow strict */}
              <Animated.View
                style={[
                  styles.labelContainer,
                  animatedLabelWrapperStyle,
                ]}
              >
                <Text
                  style={styles.label}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {label}
                </Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function makeGlassFabStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    container: {
      position: 'absolute',
      right: 20,
      zIndex: 999,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.45 : 0.25,
          shadowRadius: 14,
        },
        android: {
          elevation: 6,
        },
        default: {
          boxShadow: isDark
            ? '0 8px 24px -2px rgba(124, 58, 237, 0.45)'
            : '0 8px 20px -2px rgba(107, 70, 193, 0.25)',
        },
      }),
    },
    touchableWrapper: {
      height: 52,
      borderRadius: 26,
      overflow: 'hidden',
      borderWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.80)',
      borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.50)',
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(107, 70, 193, 0.35)',
      borderRightColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(107, 70, 193, 0.25)',
    },
    gradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      paddingHorizontal: 8,
    },
    labelContainer: {
      overflow: 'hidden',
      justifyContent: 'center',
    },
    label: {
      ...Typography.labelLarge,
      color: '#FFFFFF',
      fontWeight: '700',
      letterSpacing: -0.2,
    },
  });
}

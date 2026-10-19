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
 * 3. Colorimétrie Midnight Glassmorphism :
 *    - Duo Electric Violet / Royal Indigo (#8B5CF6 / #6D28D9) sans la nuance 3 couleurs.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  Radius,
  Typography,
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

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
  const { palette } = useTheme();
  const styles = useThemedStyles(makeGlassFabStyles);

  // Valeur d'expansion : 1 = étendu (largeur ~168px), 0 = compact (cercle 52x52)
  const expandAnim = useRef(new Animated.Value(1)).current;
  // Valeur d'échelle 3D (touch press)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Déclenché à chaque fois que l'écran/onglet devient actif
  useFocusEffect(
    useCallback(() => {
      // 1. Annuler tout timer précédent
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 2. Déplier immédiatement dans l'état étendu complet
      expandAnim.setValue(1);
      setIsExpanded(true);

      // 3. Programmer la réduction après 10 secondes (10000ms)
      timerRef.current = setTimeout(() => {
        Animated.timing(expandAnim, {
          toValue: 0,
          duration: 420,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }).start(() => {
          setIsExpanded(false);
        });
      }, collapseDelayMs);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, [collapseDelayMs, expandAnim])
  );

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.90,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  // Interpolation de la largeur totale du bouton (52px = cercle parfait, 168px = capsule étendue)
  const animatedWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [52, 168],
  });

  // Interpolation de l'opacité du texte (s'estompe rapidement au début de la rétractation)
  const labelOpacity = expandAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });

  // Interpolation de la largeur du conteneur texte
  const labelWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 98],
  });

  // Espacement entre l'icône et le texte
  const labelMarginLeft = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ scale: scaleAnim }],
        },
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
        <Animated.View
          style={[
            styles.touchableWrapper,
            { width: animatedWidth },
          ]}
        >
          <LinearGradient
            colors={palette.gradient.primary as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Animated.View style={styles.contentRow}>
              {/* Icône toujours nette et centrée lorsque rétracté */}
              <Ionicons name={icon} size={iconSize} color="#FFFFFF" />

              {/* Texte rétractable avec masquage overflow strict */}
              <Animated.View
                style={{
                  width: labelWidth,
                  opacity: labelOpacity,
                  marginLeft: labelMarginLeft,
                  overflow: 'hidden',
                  justifyContent: 'center',
                }}
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
          </LinearGradient>
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
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.38)' : 'rgba(255, 255, 255, 0.60)',
      borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.40)',
      borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(107, 70, 193, 0.40)',
      borderRightColor: isDark ? 'rgba(0, 0, 0, 0.20)' : 'rgba(107, 70, 193, 0.30)',
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
    label: {
      ...Typography.labelLarge,
      color: '#FFFFFF',
      fontWeight: '700',
      letterSpacing: -0.2,
    },
  });
}

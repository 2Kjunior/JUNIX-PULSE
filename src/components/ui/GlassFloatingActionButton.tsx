/**
 * Bouton Flottant 3D Glassmorphism (GlassFloatingActionButton / GlassFAB)
 *
 * Fonctionnalités clés :
 * 1. Animation de rétractation temporelle :
 *    - S'affiche initialement en version étendue [ +  Nouvelle tâche ]
 *    - Après quelques secondes (collapseDelayMs, défaut 2.8s), se rétracte
 *      automatiquement avec une transition fluide en bouton 3D circulaire [ + ].
 * 2. Effet 3D tactile (Touch scale & spring) :
 *    - Compression volumétrique au toucher (scale 0.92) puis rebond élastique (spring).
 *    - Éclairage biseauté 3D (liseré supérieur lumineux blanc 30%, halo violet diffus).
 * 3. Colorimétrie Midnight Glassmorphism :
 *    - Élimine la nuance criarde de 3 couleurs au profit d'un duo Electric Violet / Indigo profond.
 */

import React, { useEffect, useRef, useState } from 'react';
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
import {
  Radius,
  Typography,
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';

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
  collapseDelayMs = 2800,
  accessibilityLabel,
  style,
}: GlassFloatingActionButtonProps) {
  // Valeur d'expansion : 1 = étendu (texte visible), 0 = compact (cercle 3D)
  const expandAnim = useRef(new Animated.Value(1)).current;
  // Valeur d'échelle 3D (touch press)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Déclenchement automatique de la réduction après collapseDelayMs
    const timer = setTimeout(() => {
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 380,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start(() => {
        setIsExpanded(false);
      });
    }, collapseDelayMs);

    return () => clearTimeout(timer);
  }, [collapseDelayMs, expandAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 6,
      tension: 100,
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

  // Interpolations de largeur et d'opacité
  const labelOpacity = expandAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  const labelWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 110], // largeur maximale allouée au texte
  });

  const paddingHorizontal = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 20],
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
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        style={styles.touchable}
      >
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Liseré de réflexion supérieure (effet verre 3D) */}
          <Animated.View
            style={[
              styles.innerContent,
              { paddingHorizontal },
            ]}
          >
            <Ionicons name={icon} size={iconSize} color="#FFFFFF" />

            {/* Texte rétractable */}
            <Animated.View
              style={{
                width: labelWidth,
                opacity: labelOpacity,
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
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
    // Ombre 3D et halo volumétrique
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 8px 24px -2px rgba(139, 92, 246, 0.45)',
      },
    }),
  },
  touchable: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.40)', // Reflet lumineux 3D en haut
    borderLeftColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomColor: 'rgba(0, 0, 0, 0.35)',    // Ombrage de fond 3D
    borderRightColor: 'rgba(0, 0, 0, 0.20)',
  },
  gradient: {
    height: 52,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    gap: 8,
  },
  label: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.2,
    marginLeft: 2,
  },
});

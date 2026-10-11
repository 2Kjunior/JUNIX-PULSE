/**
 * PillTopBar — Barre de sélection / filtrage supérieure unifiée.
 * Conforme au design Stitch et à la maquette de référence :
 * - Capsule sombre vitrée (dark glassmorphism)
 * - Onglet actif : capsule améthyste translucide avec liseré violet néon (#A881F3),
 *   label blanc net et badge pill actif
 * - Onglet inactif : icône et label atténués, badge discret
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Radius,
  Spacing,
  Typography,
  FontFamily,
  Primary,
  OnSurface,
} from '@/constants/theme';

export interface PillTabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface PillTopBarProps<T extends string = string> {
  tabs: PillTabItem<T>[];
  activeTab: T;
  onTabChange: (key: T) => void;
  style?: ViewStyle;
}

export function PillTopBar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  style,
}: PillTopBarProps<T>) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label}${tab.count !== undefined ? `, ${tab.count}` : ''}`}
            >
              {tab.icon && (
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#E9DDFF' : 'rgba(255, 255, 255, 0.65)'}
                />
              )}
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 24, 36, 0.82)',
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.40)',
      },
    }),
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    borderColor: 'rgba(168, 129, 243, 0.65)',
  },
  label: {
    ...Typography.labelMedium,
    color: 'rgba(255, 255, 255, 0.70)',
    fontFamily: FontFamily?.medium,
    fontSize: 13,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FontFamily?.bold,
  },
  badge: {
    backgroundColor: 'rgba(11, 13, 20, 0.65)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    borderColor: 'rgba(168, 129, 243, 0.80)',
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
  },
  badgeText: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: FontFamily?.medium,
  },
  badgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FontFamily?.bold,
  },
});

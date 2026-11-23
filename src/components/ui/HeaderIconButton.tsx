/**
 * The buttons at the top of the main screens (sheet 017): one shape everywhere, a round glass
 * button of 44 px. SettingsButton is the same gear, at the same place, on every tab.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export function HeaderIconButton({
  icon,
  label,
  onPress,
  color,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={{
        width: 44,
        height: 44,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.glass.control.backgroundColor,
        borderWidth: 1,
        borderColor: palette.glass.control.borderColor,
      }}
    >
      <Ionicons name={icon} size={20} color={color ?? palette.onSurface.variant} />
    </TouchableOpacity>
  );
}

/** The way to the settings, the same on every tab (study 001, 15.2). */
export function SettingsButton() {
  const t = useT();
  return (
    <HeaderIconButton icon="settings-outline" label={t('common.settings')} onPress={() => router.push('/settings')} testID="settings-button" />
  );
}

/**
 * The initials of a person in a round badge, as on the People tab, in any size.
 */

import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function personInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .map(word => word[0] ?? '')
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function PersonAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.surface.high,
          borderColor: palette.outline.variant,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ color: palette.onSurface.primary, fontSize: Math.round(size * 0.4), fontWeight: '700' }}>
        {personInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

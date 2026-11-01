/**
 * Action button in tinted glass: complete, snooze, edit, delete...
 * The icon, the tint and the rim carry the color of the action. The label stays in the text
 * color, so it is readable whatever the action and the mode.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Radius, Typography } from '@/constants/theme';
import { useReduceTransparency } from '@/hooks/use-reduce-transparency';
import { useTheme } from '@/hooks/use-theme';

export interface GlassActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Color of the action, from the palette. */
  color: string;
  onPress: () => void;
  /** `stacked`: icon above the label, `inline`: side by side. */
  layout?: 'stacked' | 'inline';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function GlassActionButton({
  icon,
  label,
  color,
  onPress,
  layout = 'inline',
  accessibilityLabel,
  style,
}: GlassActionButtonProps) {
  const { palette, isDark } = useTheme();
  const reduceTransparency = useReduceTransparency();
  const stacked = layout === 'stacked';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        stacked ? styles.stacked : styles.inline,
        {
          backgroundColor: reduceTransparency ? palette.surface.high : palette.glass.control.backgroundColor,
          borderColor: color + '66',
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color + '29' }]} pointerEvents="none" />
      {!reduceTransparency && (
        <>
          <LinearGradient
            colors={[isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 0.8 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.95)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.specular}
            pointerEvents="none"
          />
        </>
      )}
      <Ionicons name={icon} size={stacked ? 22 : 18} color={color} />
      <Text
        style={[styles.label, { color: palette.onSurface.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stacked: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 2,
  },
  inline: {
    flexDirection: 'row',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 6,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  label: {
    ...Typography.labelSmall,
    fontWeight: '700',
    flexShrink: 1,
  },
});

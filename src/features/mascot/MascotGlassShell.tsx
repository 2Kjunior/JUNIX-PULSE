/**
 * Glass surface of the mascot's bubble.
 * iOS 26 and later: the native liquid glass (GlassView). Everywhere else, and when the user
 * asks to reduce transparency: a translucent surface with a hairline border and a soft shadow,
 * taken from the theme tokens so it follows light and dark mode.
 */

import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

function nativeGlassSupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(enabled => {
        if (mounted) setReduced(Boolean(enabled));
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', enabled => {
      if (mounted) setReduced(Boolean(enabled));
    });
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}

interface MascotGlassShellProps {
  children: React.ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Opaque surface instead of glass. */
  solid?: boolean;
}

/**
 * Background and border of the fallback surface, from the theme tokens.
 * `solid` gives an opaque surface, for a bubble that has to stay readable over other content.
 */
export function useMascotGlassColors(solid = false): { backgroundColor: string; borderColor: string } {
  const { palette } = useTheme();
  const reduceTransparency = useReduceTransparency();
  return reduceTransparency || solid
    ? { backgroundColor: palette.surface.high, borderColor: palette.outline.default }
    : { backgroundColor: palette.glass.card.backgroundColor, borderColor: palette.glass.card.borderColor };
}

export function MascotGlassShell({ children, radius = 18, style, solid = false }: MascotGlassShellProps) {
  const { palette, mode } = useTheme();
  const reduceTransparency = useReduceTransparency();
  const colors = useMascotGlassColors(solid);
  const native = !reduceTransparency && !solid && nativeGlassSupported();

  const shape = { borderRadius: radius, overflow: 'hidden' as const };

  if (native) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme={mode} style={[shape, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        shape,
        styles.fallback,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          shadowColor: palette.shadow.color,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
});

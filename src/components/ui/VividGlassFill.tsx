/**
 * Fill of the main call-to-action buttons: saturated violet glass, with a sheen and a specular
 * line. To place first inside a button that clips its corners. It stays dense enough for white
 * text, and turns into the plain theme gradient when the user reduces transparency.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useReduceTransparency } from '@/hooks/use-reduce-transparency';
import { useTheme } from '@/hooks/use-theme';

export function VividGlassFill() {
  const { palette } = useTheme();
  const reduceTransparency = useReduceTransparency();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={(reduceTransparency ? palette.gradient.primary : palette.gradient.glassPrimary) as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {!reduceTransparency && (
        <>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.26)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.55 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.specular}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});

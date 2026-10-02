/**
 * AnimatedPressable — enrobage de Pressable avec un retour tactile animé
 * (scale 0.96 + légère baisse d'opacité), pour donner du "poids" aux
 * boutons et CTA principaux de l'app.
 *
 * Respecte useReducedMotion (aucune animation si activé — le style pressed
 * natif de Pressable prend le relais).
 */
import { type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle, type GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

interface AnimatedPressableProps {
  onPress?: (event: GestureResponderEvent) => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  scaleTo?: number;
}

export function AnimatedPressable({
  onPress,
  children,
  style,
  disabled,
  testID,
  accessibilityLabel,
  accessibilityRole = 'button',
  hitSlop,
  scaleTo = 0.96,
}: AnimatedPressableProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      hitSlop={hitSlop}
      onPressIn={() => {
        if (reducedMotion) return;
        scale.value = withTiming(scaleTo, { duration: 90 });
        opacity.value = withTiming(0.85, { duration: 90 });
      }}
      onPressOut={() => {
        if (reducedMotion) return;
        scale.value = withTiming(1, { duration: 140 });
        opacity.value = withTiming(1, { duration: 140 });
      }}
    >
      <Animated.View style={[style, reducedMotion ? undefined : animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

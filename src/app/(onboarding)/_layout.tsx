/**
 * Layout de l'onboarding.
 * Stack simple sans header — l'onboarding a son propre design de navigation.
 *
 * Transitions harmonisées (Lot 11) :
 * - slide_from_right pour avancer entre les étapes
 * - gestureEnabled pour le swipe back natif iOS
 * - customTransitionOnGesture pour une transition cohérente au geste de retour
 */
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.surface.base },
        animation: 'slide_from_right',
        gestureEnabled: true,
        animationDuration: 280,
      }}
    >
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="discover" />
      <Stack.Screen name="personalize" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}


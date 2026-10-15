/**
 * Layout de l'onboarding.
 * Stack simple sans header — l'onboarding a son propre design de navigation.
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
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="personalize" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}


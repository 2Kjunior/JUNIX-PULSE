/**
 * Layout de l'onboarding.
 * Stack simple sans header — l'onboarding a son propre design de navigation.
 */
import { Stack } from 'expo-router';
import { Surface } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Surface.base },
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

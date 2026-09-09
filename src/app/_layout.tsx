/**
 * Root layout de Junix Pulse.
 *
 * Responsabilités :
 * 1. Initialiser la base SQLite avec les migrations
 * 2. Charger les fonts Inter via @expo-google-fonts/inter
 * 3. Vérifier si l'onboarding est terminé
 * 4. Rediriger vers onboarding ou app principale selon l'état
 * 5. Afficher le SplashScreen pendant l'initialisation
 *
 * CAS A (premier lancement) : onboarding_completed = 0 → route (onboarding)
 * CAS B (retour utilisateur) : onboarding_completed = 1 → route (tabs)
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { getDatabase } from '@/database/sqlite';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { Snackbar } from '@/components/feedback/Snackbar';
import { Surface, OnSurface } from '@/constants/theme';

// Garder le splash screen visible pendant l'initialisation
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const {
    dbReady,
    dbError,
    onboardingComplete,
    setDbReady,
    setDbError,
    setOnboardingComplete,
    setUserTimezone,
  } = useAppStore();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    // Attendre que les fonts soient prêtes avant d'initialiser la DB
    if (!fontsLoaded && !fontError) return;

    async function initialize() {
      try {
        // Initialiser SQLite et appliquer les migrations
        await getDatabase();

        // Lire les paramètres utilisateur
        const settings = await SettingsRepository.get();
        setOnboardingComplete(settings.onboardingCompleted);
        setUserTimezone(settings.timezone);
        setDbReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erreur base de données';
        setDbError(message);
      } finally {
        // Masquer le splash screen dans tous les cas
        await SplashScreen.hideAsync();
      }
    }

    initialize();
  }, [fontsLoaded, fontError]);

  // Pendant l'initialisation : écran vide (splash screen visible)
  if (!dbReady && !dbError) {
    return null;
  }

  // Erreur critique de base de données
  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Impossible de démarrer</Text>
        <Text style={styles.errorMessage}>{dbError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Onboarding — affiché uniquement au premier lancement */}
          <Stack.Screen
            name="(onboarding)"
            options={{ animation: 'fade' }}
            redirect={onboardingComplete}
          />
          {/* Application principale — redirigée si onboarding non terminé */}
          <Stack.Screen
            name="(tabs)"
            options={{ animation: 'fade' }}
            redirect={!onboardingComplete}
          />
          {/* Routes de détail */}
          <Stack.Screen name="reminders/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="reminders/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="tasks/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="tasks/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="people/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="people/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="events/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="events/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="habits/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="habits/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="goals/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="goals/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings/index" options={{ presentation: 'card' }} />
        </Stack>
        {/* Snackbar global (au-dessus de tout le contenu) */}
        <Snackbar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Surface.base,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: OnSurface.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
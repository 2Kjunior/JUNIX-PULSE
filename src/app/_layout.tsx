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

import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    useFonts,
} from "@expo-google-fonts/inter";
import { Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Snackbar } from "@/components/feedback/Snackbar";
import { AnimatedBackgroundGlow } from "@/components/ui/AnimatedBackgroundGlow";
import { SplashAnimated } from "@/components/ui/SplashAnimated";
import { OnSurface, Surface } from "@/constants/theme";
import { getDatabase } from "@/database/sqlite";
import { SettingsRepository } from "@/repositories/settings-repository";
import { NotificationService } from "@/services/notification-service";
import { useAppStore } from "@/store/app-store";

// Masquer les avertissements connus non-bloquants dans l'UI mobile (LogBox)
LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "DateTimePicker: `onChange` is deprecated",
]);

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
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
  });

  const appReady = fontsLoaded || !!fontError;

  useEffect(() => {
    // Masquer le splash natif dès que les fonts sont prêtes,
    // puis afficher SplashAnimated à la place pendant l'init DB
    if (!appReady) return;

    // Masquer immédiatement le splash natif Expo
    SplashScreen.hideAsync();

    async function initialize() {
      try {
        // 1. Initialiser SQLite et appliquer les migrations
        await getDatabase();

        // 2. Lire les paramètres utilisateur
        const settings = await SettingsRepository.get();
        setOnboardingComplete(settings.onboardingCompleted);
        setUserTimezone(settings.timezone);

        // 3. Initialiser les notifications (handler + canal Android)
        //    Appelé ici pour garantir que le bridge natif est prêt
        await NotificationService.initialize();

        setDbReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erreur base de données";
        setDbError(message);
      }
    }

    initialize();
  }, [appReady]);

  // Fonts pas encore prêtes : laisser le splash natif visible
  if (!appReady) {
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
      <AnimatedBackgroundGlow />
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          {/* Onboarding — affiché uniquement au premier lancement */}
          <Stack.Screen
            name="(onboarding)"
            options={{ animation: "fade" }}
            redirect={onboardingComplete}
          />
          {/* Application principale — redirigée si onboarding non terminé */}
          <Stack.Screen
            name="(tabs)"
            options={{ animation: "fade" }}
            redirect={!onboardingComplete}
          />
          {/* Routes de détail — Rappels */}
          <Stack.Screen
            name="reminders/index"
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="reminders/[id]"
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="reminders/new"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="reminders/edit/[id]"
            options={{ presentation: "modal" }}
          />
          {/* Tâches */}
          <Stack.Screen name="tasks/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="tasks/new" options={{ presentation: "modal" }} />
          {/* Personnes */}
          <Stack.Screen name="people/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="people/new" options={{ presentation: "modal" }} />
          {/* Événements */}
          <Stack.Screen name="events/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="events/new" options={{ presentation: "modal" }} />
          {/* Habitudes */}
          <Stack.Screen
            name="habits/index"
            options={{ presentation: "card" }}
          />
          <Stack.Screen name="habits/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="habits/new" options={{ presentation: "modal" }} />
          {/* Objectifs */}
          <Stack.Screen name="goals/index" options={{ presentation: "card" }} />
          <Stack.Screen name="goals/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="goals/new" options={{ presentation: "modal" }} />
          {/* Paramètres */}
          <Stack.Screen
            name="settings/index"
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="settings/schedule"
            options={{ presentation: "card" }}
          />
          {/* Modules transversaux (Vague 9) */}
          <Stack.Screen name="capture" options={{ presentation: "modal" }} />
          <Stack.Screen name="sanctum" options={{ presentation: "card" }} />
          <Stack.Screen name="search" options={{ presentation: "card" }} />
        </Stack>
        {/* Snackbar global (au-dessus de tout le contenu) */}
        <Snackbar />
        {/* Splash animé (par-dessus l'app, fondu sortant quand prêt) */}
        <SplashAnimated isReady={dbReady} />
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
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Surface.base,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: OnSurface.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: OnSurface.variant,
    textAlign: "center",
    lineHeight: 20,
  },
});

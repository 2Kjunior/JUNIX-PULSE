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
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { Alert, Appearance, AppState, LogBox, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Snackbar } from "@/components/feedback/Snackbar";
import { AnimatedBackgroundGlow } from "@/components/ui/AnimatedBackgroundGlow";
import type { ThemePalette } from "@/constants/palettes";
import { getDatabase } from "@/database/sqlite";
import { SplashAnimation } from "@/features/launch/SplashAnimation";
import { useTheme } from "@/hooks/use-theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { SettingsRepository } from "@/repositories/settings-repository";
import { NotificationService } from "@/services/notification-service";
import { NotificationSoundService } from "@/services/sound/NotificationSoundService";
import { SessionManager } from "@/services/session/SessionManager";
import { useAppStore } from "@/store/app-store";
import { reconcileOverdueRecurringReminders } from "@/use-cases/reminder-use-cases";

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
    themeMode,
    setThemeMode,
  } = useAppStore();

  const { isDark, mode, surface } = useTheme();
  const styles = useThemedStyles(makeRootLayoutStyles);
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
  });

  const appReady = fontsLoaded || !!fontError;
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    // Option A : Masquer le splash natif une fois que les polices ET la base sont prêtes (DEF-06)
    if (!appReady) return;

    async function initialize() {
      try {
        // 1. Initialiser SQLite et appliquer les migrations
        await getDatabase();

        // 2. Lire les paramètres utilisateur
        const settings = await SettingsRepository.get();
        setOnboardingComplete(settings.onboardingCompleted);
        setUserTimezone(settings.timezone);
        setThemeMode(settings.appearanceMode);

        // 3. Initialiser les notifications (handler + canal Android)
        //    Isolé pour ne jamais bloquer le démarrage si expo-notifications est limité dans Expo Go
        try {
          await NotificationService.initialize();
        } catch {
          // Ignoré silencieusement en environnement Expo Go sans push
        }

        // 4. Réconcilier les rappels récurrents en retard (DEF-03)
        try {
          await reconcileOverdueRecurringReminders();
        } catch {
          // Tolérance aux erreurs de réconciliation
        }

        // 5. Vérifier si l'animation de démarrage doit être jouée ou ignorée (reprise de session < 15 min)
        const needsSplash = await SessionManager.shouldPlayLaunchSplash();
        if (!needsSplash) {
          setSplashFinished(true);
        }

        setDbReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erreur base de données";
        setDbError(message);
      } finally {
        // Révéler le Splash animé Junix Pulse dès que les polices & runtime sont prêts
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    initialize();
  }, [appReady]);

  // Synchroniser le thème avec les composants natifs et l'arrière-plan système
  useEffect(() => {
    Appearance.setColorScheme(themeMode === "system" ? "unspecified" : mode);
    SystemUI.setBackgroundColorAsync(surface.base).catch(() => {});
  }, [themeMode, mode, surface.base]);

  // Suivi du cycle de vie de l'application (AppState active/background) pour la session et l'inactivité
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        SessionManager.recordActive();
      } else if (nextAppState === "background") {
        SessionManager.recordBackground();
      }
    });
    return () => sub.remove();
  }, []);



  // Redirection onboarding vs application principale
  useEffect(() => {
    if (!splashFinished || !appReady || (!dbReady && !dbError)) return;

    const inOnboarding = segments[0] === "(onboarding)";

    if (!onboardingComplete && !inOnboarding) {
      router.replace("/(onboarding)");
    } else if (onboardingComplete && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [splashFinished, appReady, dbReady, dbError, onboardingComplete, segments]);

  // Écouteurs de notifications pour navigation directe & snooze
  useEffect(() => {
    // 1. Clic sur une notification système (Background / Verrouillage)
    const cleanupResponse = NotificationService.addResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.reminderId && typeof data.reminderId === "string") {
        router.push(`/reminders/${data.reminderId}`);
      }
    });

    // 2. Notification reçue alors que l'application est ouverte (Foreground)
    const cleanupForeground = NotificationService.addForegroundListener((notification) => {
      const data = notification.request.content.data;
      const title = notification.request.content.title ?? "Rappel Junix Pulse";
      const body = notification.request.content.body ?? "";
      const reminderId = data?.reminderId as string | undefined;

      // Jouer le son Junix Pulse en foreground (le système ne joue pas de son car shouldPlaySound: false)
      NotificationSoundService.play(!splashFinished);

      if (reminderId) {
        Alert.alert(
          `🔔 ${title}`,
          body || "Votre rappel est arrivé à échéance.",
          [
            { text: "Plus tard", style: "cancel" },
            {
              text: "Ouvrir & Snooze",
              onPress: () => router.push(`/reminders/${reminderId}`),
            },
          ]
        );
      }
    });

    return () => {
      cleanupResponse();
      cleanupForeground();
    };
  }, []);

  // Fonts pas encore prêtes ou DB en cours d'initialisation : laisser le splash natif visible
  if (!appReady || (!dbReady && !dbError)) {
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
        <StatusBar style={!splashFinished ? "dark" : (isDark ? "light" : "dark")} />
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
          />
          {/* Application principale — redirigée si onboarding non terminé */}
          <Stack.Screen
            name="(tabs)"
            options={{ animation: "fade" }}
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
          {/* Modules transversaux (Vague 9) */}
          <Stack.Screen name="capture" options={{ presentation: "modal" }} />
          <Stack.Screen name="sanctum" options={{ presentation: "card" }} />
          <Stack.Screen name="search" options={{ presentation: "card" }} />
        </Stack>
        {/* Snackbar global (au-dessus de tout le contenu) */}
        <Snackbar />
        {/* Animation de démarrage Junix Pulse (4 secondes, jouée en parallèle de l'initialisation) */}
        {!splashFinished && (
          <SplashAnimation onFinish={() => setSplashFinished(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const makeRootLayoutStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      backgroundColor: theme.surface.base,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.onSurface.primary,
      marginBottom: 12,
      textAlign: "center",
    },
    errorMessage: {
      fontSize: 14,
      color: theme.onSurface.variant,
      textAlign: "center",
      lineHeight: 20,
    },
  });

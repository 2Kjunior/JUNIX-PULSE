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
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, useSegments, type Href } from "expo-router";
import type { NotificationResponse } from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { Alert, Appearance, AppState, LogBox, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Snackbar } from "@/components/feedback/Snackbar";
import { t as tNow } from "@/i18n";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import type { ThemePalette } from "@/constants/palettes";
import { getDatabase } from "@/database/sqlite";
import { SplashAnimation } from "@/features/launch/SplashAnimation";
import { MascotCompanion } from "@/features/mascot/MascotCompanion";
import { useTheme } from "@/hooks/use-theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { SettingsRepository } from "@/repositories/settings-repository";
import { detectDeviceTimezone } from "@/services/device-timezone";
import { applyLanguage } from "@/services/language-service";
import { announceReminderArrived } from "@/services/mascot/mascot-announcers";
import { syncDailyRecapNotifications } from "@/services/daily-recap-service";
import { notificationRoute } from "@/domain/rules/reminder-notification-rules";
import { NotificationService } from "@/services/notification-service";
import { onReminderSyncProblem, syncReminderNotifications } from "@/services/reminder-notification-service";
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

// Navigators paint their theme background over AmbientBackground unless it is transparent.
const TRANSPARENT_LIGHT_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "transparent" },
};
const TRANSPARENT_DARK_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: "transparent" },
};

function openNotification(response: NotificationResponse) {
  const route = notificationRoute(response.notification.request.content.data);
  if (route) router.push(route as Href);
}

export default function RootLayout() {
  const {
    dbReady,
    dbError,
    onboardingComplete,
    showSnackbar,
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
  // Le splash animé n'est monté qu'après la décision (jamais de clignotement à la reprise de session)
  const [splashPlaying, setSplashPlaying] = useState(false);

  useEffect(() => {
    // Option A : Masquer le splash natif une fois que les polices ET la base sont prêtes (DEF-06)
    if (!appReady) return;

    async function initialize() {
      try {
        // 0. Décider AVANT d'afficher quoi que ce soit si l'animation doit être jouée
        //    (premier lancement ou inactivité > 15 min) ou ignorée (reprise de session)
        const needsSplash = await SessionManager.shouldPlayLaunchSplash();
        if (needsSplash) {
          setSplashPlaying(true);
          // Masquer le splash natif (blanc) : l'animation prend le relais, l'init continue en parallèle
          await SplashScreen.hideAsync().catch(() => {});
        } else {
          setSplashFinished(true);
        }

        // 1. Initialiser SQLite et appliquer les migrations
        await getDatabase();

        // 2. Lire les paramètres utilisateur
        const settings = await SettingsRepository.get();
        setOnboardingComplete(settings.onboardingCompleted);
        // La langue choisie, ou celle du téléphone sur « auto »
        applyLanguage(settings.language);
        // Le fuseau de l'utilisateur est celui du téléphone : il suit ses déplacements
        const deviceTimezone = detectDeviceTimezone();
        setUserTimezone(deviceTimezone);
        if (deviceTimezone !== settings.timezone) {
          await SettingsRepository.update({ timezone: deviceTimezone, updatedAt: new Date().toISOString() }).catch(() => {});
        }
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

        setDbReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : tNow("startup.dbError");
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
    // Protégé : setColorScheme n'existe pas sur toutes les plateformes (ex. web)
    if (typeof Appearance?.setColorScheme === "function") {
      Appearance.setColorScheme(themeMode === "system" ? "unspecified" : mode);
    }
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

  // Récaps et rappels : au lancement, et dès la fin de l'onboarding
  useEffect(() => {
    if (!dbReady || !onboardingComplete) return;
    void syncDailyRecapNotifications();
    void syncReminderNotifications();
  }, [dbReady, onboardingComplete]);

  // Au retour dans l'application, les récurrences déjà passées repartent de la bonne date
  useEffect(() => {
    if (!dbReady || !onboardingComplete) return;
    const sub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active") return;
      reconcileOverdueRecurringReminders()
        .catch(() => 0)
        .then(() => syncReminderNotifications());
    });
    return () => sub.remove();
  }, [dbReady, onboardingComplete]);

  // Un rappel qui ne pourra pas sonner doit se voir
  useEffect(
    () =>
      onReminderSyncProblem((report) => {
        showSnackbar(
          report.permissionDenied
            ? tNow("layout.notifBlocked")
            : tNow("layout.remindersFailed")
        );
      }),
    [showSnackbar]
  );

  // Notification touchée alors que l'application était fermée : à ouvrir une fois la navigation prête
  useEffect(() => {
    if (!dbReady || !splashFinished || !onboardingComplete) return;
    const response = NotificationService.consumeLastResponse();
    if (response) openNotification(response);
  }, [dbReady, splashFinished, onboardingComplete]);

  // Écouteurs de notifications pour navigation directe & snooze
  useEffect(() => {
    // 1. Clic sur une notification système (Background / Verrouillage)
    const cleanupResponse = NotificationService.addResponseListener((response) => {
      NotificationService.consumeLastResponse();
      openNotification(response);
    });

    // 2. Notification reçue alors que l'application est ouverte (Foreground)
    const cleanupForeground = NotificationService.addForegroundListener((notification) => {
      const data = notification.request.content.data;
      // Le récap apparaît aussi dans la bulle de l'accueil : pas de son en plus de la bannière
      if (data?.type === "DAILY_RECAP") return;
      const title = notification.request.content.title ?? tNow("reminderNotif.default");
      const body = notification.request.content.body ?? "";
      const reminderId = data?.reminderId as string | undefined;

      // Jouer le son Junix Pulse en foreground (le système ne joue pas de son car shouldPlaySound: false)
      NotificationSoundService.play(!splashFinished);

      if (reminderId) {
        void announceReminderArrived(reminderId);
        Alert.alert(
          `🔔 ${title}`,
          body || tNow("layout.reminderDue"),
          [
            { text: tNow("layout.later"), style: "cancel" },
            {
              text: tNow("layout.openSnooze"),
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

  // Animation de démarrage Junix Pulse (4 secondes, jouée en parallèle de l'initialisation).
  // Toujours au même emplacement (2e enfant) pour ne pas être remontée quand la base devient prête.
  const splashOverlay =
    splashPlaying && !splashFinished ? (
      <SplashAnimation onFinish={() => setSplashFinished(true)} />
    ) : null;

  // Fonts pas encore prêtes ou DB en cours d'initialisation : splash natif ou animation seuls
  if (!appReady || (!dbReady && !dbError)) {
    return (
      <>
        {null}
        {splashOverlay}
      </>
    );
  }

  // Erreur critique de base de données
  if (dbError) {
    return (
      <>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Impossible de démarrer</Text>
          <Text style={styles.errorMessage}>{dbError}</Text>
        </View>
        {splashOverlay}
      </>
    );
  }

  return (
    <>
      <GestureHandlerRootView style={styles.root}>
        <AmbientBackground visible={segments[0] === "(tabs)"} revealed={splashFinished} />
        <SafeAreaProvider>
          <StatusBar style={!splashFinished ? "dark" : (isDark ? "light" : "dark")} />
          <ThemeProvider value={isDark ? TRANSPARENT_DARK_THEME : TRANSPARENT_LIGHT_THEME}>
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
          </ThemeProvider>
          {/* Snackbar global (au-dessus de tout le contenu) */}
          <Snackbar />
          {/* Compagne Pulse : une seule instance, qui suit l'utilisateur d'un écran à l'autre, au-dessus du Snackbar */}
          <MascotCompanion />
        </SafeAreaProvider>
      </GestureHandlerRootView>
      {splashOverlay}
    </>
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

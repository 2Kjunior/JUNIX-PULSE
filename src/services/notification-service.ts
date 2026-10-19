/**
 * Service de notifications push locales pour Junix Pulse.
 * Encapsule l'interaction avec expo-notifications.
 *
 * Compatible Expo Go (SDK 53+) et Development Builds (EAS).
 * Les notifications LOCALES fonctionnent dans Expo Go depuis le SDK 53.
 * Seules les notifications PUSH (serveur distant) nécessitent un Development Build.
 */

import { logger } from "@/utils/logger";
import { Platform } from "react-native";

type NotificationsType = typeof import("expo-notifications");

let Notifications: NotificationsType | null = null;

try {
  // Les notifications locales fonctionnent dans Expo Go depuis SDK 53.
  // Seul le push distant est bloqué — mais Junix Pulse n'utilise pas de push.
  Notifications = require("expo-notifications");
} catch {
  logger.warn("[NotificationService] expo-notifications non disponible — notifications désactivées");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleReminderParams {
  id: string; // ID du rappel Junix Pulse (utilisé comme identifier)
  title: string;
  body?: string;
  scheduledAt: Date;
  data?: Record<string, unknown>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const NotificationService = {
  /**
   * Indique si expo-notifications est actif dans l'environnement courant.
   */
  isAvailable(): boolean {
    return Notifications !== null;
  },

  /**
   * Initialise le handler de notifications et le canal Android.
   */
  async initialize(): Promise<void> {
    if (!Notifications) return;

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("reminders", {
          name: "Rappels",
          description: "Notifications pour vos rappels Junix Pulse",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#D0BCFF",
          enableVibrate: true,
          showBadge: false,
        });
      }
    } catch {
      logger.error(
        "[NotificationService] Initialisation des notifications ignorée",
      );
    }
  },

  /**
   * Planifie une notification locale pour un rappel.
   * Retourne l'identifiant de notification ou null si la date est passée (DEF-09).
   */
  async scheduleReminder(params: ScheduleReminderParams): Promise<string | null> {
    if (!Notifications) {
      return `mock-notif-${params.id}-${Date.now()}`;
    }

    try {
      // S'assurer que les permissions sont accordées sur Android / iOS
      await this.requestPermissions();

      const triggerDate = params.scheduledAt;
      const now = new Date();
      if (triggerDate <= now) {
        logger.warn(
          `[NotificationService] triggerDate (${triggerDate.toISOString()}) <= now (${now.toISOString()}) — notification ignorée (DEF-09)`
        );
        return null;
      }

      return await Notifications.scheduleNotificationAsync({
        identifier: `reminder-${params.id}`,
        content: {
          title: params.title,
          body: params.body ?? "Rappel Junix Pulse",
          data: {
            reminderId: params.id,
            type: "REMINDER",
            ...params.data,
          },
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: Platform.OS === "android" ? "reminders" : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleReminder");
      return `fallback-notif-${params.id}`;
    }
  },

  /**
   * Déclenche une notification locale de test (immédiate ou dans quelques secondes).
   */
  async sendTestNotification(options?: {
    title?: string;
    body?: string;
    delaySeconds?: number;
  }): Promise<{ success: boolean; id?: string; message?: string }> {
    if (!Notifications) {
      return {
        success: false,
        message: "expo-notifications n'est pas disponible dans cet environnement.",
      };
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: "Permissions refusées. Activez les notifications dans les réglages système.",
        };
      }

      const delaySeconds = options?.delaySeconds ?? 2;
      const effectiveDate = new Date(Date.now() + Math.max(1, delaySeconds) * 1000);
      const title = options?.title ?? "⚡ Test Junix Pulse";
      const body =
        options?.body ??
        "Votre système de notifications est opérationnel ! 🔔";

      const id = await Notifications.scheduleNotificationAsync({
        identifier: `test-${Date.now()}`,
        content: {
          title,
          body,
          sound: "default",
          data: {
            type: "TEST_NOTIFICATION",
            sentAt: new Date().toISOString(),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: effectiveDate,
          channelId: Platform.OS === "android" ? "reminders" : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });

      return {
        success: true,
        id,
        message: `Notification programmée dans ${delaySeconds} seconde(s).`,
      };
    } catch (err) {
      logger.error("[NotificationService] Erreur lors de sendTestNotification", err);
      return {
        success: false,
        message: err instanceof Error ? err.message : "Erreur inconnue lors du test",
      };
    }
  },

  /**
   * Annule une notification planifiée.
   */
  async cancelReminder(notificationId: string): Promise<void> {
    if (
      !Notifications ||
      notificationId.startsWith("mock-") ||
      notificationId.startsWith("fallback-")
    )
      return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
      logger.error("[NotificationService] Erreur cancelReminder");
    }
  },

  /**
   * Annule toutes les notifications planifiées.
   */
  async cancelAll(): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      logger.error("[NotificationService] Erreur cancelAll");
    }
  },

  /**
   * Retourne toutes les notifications planifiées.
   */
  async getAllScheduled(): Promise<
    import("expo-notifications").NotificationRequest[]
  > {
    if (!Notifications) return [];
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch {
      return [];
    }
  },

  /**
   * Vérifie l'état des permissions.
   */
  async checkPermissions(): Promise<boolean> {
    if (!Notifications) return true;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } catch {
      return true;
    }
  },

  /**
   * Demande les permissions utilisateur.
   */
  async requestPermissions(): Promise<boolean> {
    if (!Notifications) return true;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch {
      return true;
    }
  },

  /**
   * Écouteur foreground.
   */
  addForegroundListener(
    handler: (notification: import("expo-notifications").Notification) => void,
  ): () => void {
    if (!Notifications) return () => {};
    try {
      const sub = Notifications.addNotificationReceivedListener(handler);
      return () => sub.remove();
    } catch {
      return () => {};
    }
  },

  /**
   * Écouteur de tap sur notification.
   */
  addResponseListener(
    handler: (
      response: import("expo-notifications").NotificationResponse,
    ) => void,
  ): () => void {
    if (!Notifications) return () => {};
    try {
      const sub =
        Notifications.addNotificationResponseReceivedListener(handler);
      return () => sub.remove();
    } catch {
      return () => {};
    }
  },
};

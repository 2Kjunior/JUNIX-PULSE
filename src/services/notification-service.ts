/**
 * Service de notifications push locales pour Junix Pulse.
 * Encapsule l'interaction avec expo-notifications.
 *
 * Compatible Expo Go (SDK 53+) et Development Builds (EAS).
 * Les notifications LOCALES fonctionnent dans Expo Go depuis le SDK 53.
 * Seules les notifications PUSH (serveur distant) nécessitent un Development Build.
 */

import type { DailyRecapKind, DailyRecapNotification } from "@/domain/rules/daily-recap-rules";
import { t } from "@/i18n";
import { logger } from "@/utils/logger";
import {
  REMINDER_ACTION_COMPLETE,
  REMINDER_ACTION_SNOOZE,
  REMINDER_CATEGORY_ID,
} from "@/domain/rules/reminder-notification-rules";
import { Platform } from "react-native";
import { NotificationSoundService } from "@/services/sound/NotificationSoundService";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_SOUND_WAV_FILENAME } from "@/services/sound/notification-sound-constants";

type NotificationsType = typeof import("expo-notifications");

let Notifications: NotificationsType | null = null;

try {
  // Les notifications locales fonctionnent dans Expo Go depuis SDK 53.
  // Seul le push distant est bloqué — mais Junix Pulse n'utilise pas de push.
  Notifications = require("expo-notifications");
} catch {
  logger.warn("[NotificationService] expo-notifications non disponible — notifications désactivées");
}

// Canal distinct des rappels : importance normale, désactivable séparément dans Android
const DAILY_RECAP_CHANNEL_ID = "junix-pulse-daily-recap";
const NOTIFICATION_SILENT_CHANNEL_ID = "junix-pulse-reminders-silent-v1";
const DAILY_RECAP_KINDS: readonly DailyRecapKind[] = ["MORNING_SUMMARY", "EVENING_REVIEW"];

const dailyRecapIdentifier = (kind: DailyRecapKind) => `daily-recap-${kind}`;
const FOCUS_END_IDENTIFIER = "focus-end";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleReminderParams {
  id: string; // ID du rappel Junix Pulse
  /** Le son des notifications est coupé dans les réglages : canal silencieux. */
  silent?: boolean;
  /** Identifiant de la notification : un rappel récurrent en planifie plusieurs. */
  identifier?: string;
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
          // Sound is handled in-app by NotificationSoundService when foreground.
          // This prevents double-play (system + in-app) when the app is open.
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      if (Platform.OS === "android") {
        // Legacy channel — kept intact, no sound change (Android forbids it).
        await Notifications.setNotificationChannelAsync("reminders", {
          name: t('notifChannel.legacyName'),
          description: t('notifChannel.legacyDesc'),
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#D0BCFF",
          enableVibrate: true,
          showBadge: false,
        });

        // New channel with the custom Junix Pulse sound.
        // A channel's sound is immutable after first creation — always a new ID.
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
          name: t('notifChannel.name'),
          description: t('notifChannel.desc'),
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#8B3DF0",
          enableVibrate: true,
          showBadge: false,
          sound: NOTIFICATION_SOUND_WAV_FILENAME,
        });

        // The sound of a channel cannot change after it is created: switching the sound off moves
        // the reminders to this second channel instead
        await Notifications.setNotificationChannelAsync(NOTIFICATION_SILENT_CHANNEL_ID, {
          name: t('notifChannel.silentName'),
          description: t('notifChannel.silentDesc'),
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#8B3DF0",
          enableVibrate: true,
          showBadge: false,
          sound: null,
        });

        await Notifications.setNotificationChannelAsync(DAILY_RECAP_CHANNEL_ID, {
          name: t('notifChannel.recapName'),
          description: t('notifChannel.recapDesc'),
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: "#8B3DF0",
          showBadge: false,
        });
      }
      // The buttons open the app, which completes or snoozes the reminder: reliable even when it was closed.
      // No buttons on web, where notifications are not shown by the app
      if (Platform.OS !== "web") await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
        {
          identifier: REMINDER_ACTION_COMPLETE,
          buttonTitle: t('notifAction.complete'),
          options: { opensAppToForeground: true },
        },
        {
          identifier: REMINDER_ACTION_SNOOZE,
          buttonTitle: t('notifAction.snooze'),
          options: { opensAppToForeground: true },
        },
      ]);
    } catch {
      logger.error(
        "[NotificationService] Initialisation des notifications ignorée",
      );
    }
  },

  /**
   * Planifie une notification locale pour un rappel.
   * Retourne l'identifiant de notification, ou null si la date est passée (DEF-09) ou si la
   * planification a échoué : un échec ne doit jamais passer pour une notification programmée.
   */
  async scheduleReminder(params: ScheduleReminderParams): Promise<string | null> {
    if (!Notifications) {
      return `mock-notif-${params.id}-${Date.now()}`;
    }

    try {
      const triggerDate = params.scheduledAt;
      const now = new Date();
      if (triggerDate <= now) {
        logger.warn(
          `[NotificationService] triggerDate (${triggerDate.toISOString()}) <= now (${now.toISOString()}) — notification ignorée (DEF-09)`
        );
        return null;
      }

      return await Notifications.scheduleNotificationAsync({
        identifier: params.identifier ?? `reminder-${params.id}`,
        content: {
          title: params.title,
          body: params.body ?? t('reminderNotif.default'),
          data: {
            reminderId: params.id,
            type: "REMINDER",
            ...params.data,
          },
          // iOS uses the filename; Android uses the channel's configured sound.
          sound: params.silent ? false : NOTIFICATION_SOUND_WAV_FILENAME,
          categoryIdentifier: REMINDER_CATEGORY_ID,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId:
            Platform.OS === "android"
              ? params.silent ? NOTIFICATION_SILENT_CHANNEL_ID : NOTIFICATION_CHANNEL_ID
              : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleReminder");
      return null;
    }
  },

  /**
   * Planifie la fin d'une session de focus : elle sonne même si l'application est en arrière-plan.
   */
  async scheduleFocusEnd(endsAt: Date, body: string): Promise<void> {
    if (!Notifications) return;
    try {
      if (!(await this.requestPermissions())) return;
      await Notifications.scheduleNotificationAsync({
        identifier: FOCUS_END_IDENTIFIER,
        content: {
          title: t('notifFocus.title'),
          body,
          data: { type: "FOCUS_END" },
          sound: NOTIFICATION_SOUND_WAV_FILENAME,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: endsAt,
          channelId: Platform.OS === "android" ? NOTIFICATION_CHANNEL_ID : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleFocusEnd");
    }
  },

  /**
   * Annule la fin de session de focus planifiée.
   */
  async cancelFocusEnd(): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(FOCUS_END_IDENTIFIER);
    } catch {
      logger.error("[NotificationService] Erreur cancelFocusEnd");
    }
  },

  /**
   * État des alarmes exactes : sur Android 14 et plus, elles sont refusées par défaut.
   * `canAsk` est faux si l'application installée ne déclare pas encore la permission.
   */
  async getExactAlarmStatus(): Promise<{ granted: boolean; canAsk: boolean }> {
    if (!Notifications || Platform.OS !== "android") return { granted: true, canAsk: false };
    try {
      const { granted, canAskAgain } = await Notifications.getExactAlarmPermissionsAsync();
      return { granted, canAsk: canAskAgain };
    } catch {
      return { granted: false, canAsk: false };
    }
  },

  /**
   * Ouvre l'écran système des alarmes exactes et indique si elles sont autorisées au retour.
   */
  async requestExactAlarms(): Promise<boolean> {
    if (!Notifications || Platform.OS !== "android") return true;
    try {
      const { granted } = await Notifications.requestExactAlarmPermissionsAsync();
      return granted;
    } catch {
      return false;
    }
  },

  /**
   * Notification qui a ouvert l'application alors qu'elle était fermée, une seule fois.
   */
  consumeLastResponse(): import("expo-notifications").NotificationResponse | null {
    if (!Notifications) return null;
    try {
      const response = Notifications.getLastNotificationResponse();
      if (response) Notifications.clearLastNotificationResponse();
      return response;
    } catch {
      return null;
    }
  },

  /**
   * Planifie un récap quotidien, répété chaque jour à l'heure choisie.
   */
  async scheduleDailyRecap(recap: DailyRecapNotification): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: dailyRecapIdentifier(recap.kind),
        content: {
          title: recap.title,
          body: recap.body,
          data: { type: "DAILY_RECAP", kind: recap.kind },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: recap.hour,
          minute: 0,
          channelId: Platform.OS === "android" ? DAILY_RECAP_CHANNEL_ID : undefined,
        } as import("expo-notifications").DailyTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleDailyRecap");
    }
  },

  /**
   * Annule les récaps quotidiens planifiés.
   */
  async cancelDailyRecaps(): Promise<void> {
    if (!Notifications) return;
    for (const kind of DAILY_RECAP_KINDS) {
      try {
        await Notifications.cancelScheduledNotificationAsync(dailyRecapIdentifier(kind));
      } catch {
        logger.error("[NotificationService] Erreur cancelDailyRecaps");
      }
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
        message: t('notifTest.unavailable'),
      };
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: t('notifTest.denied'),
        };
      }

      const delaySeconds = options?.delaySeconds ?? 2;
      const effectiveDate = new Date(Date.now() + Math.max(1, delaySeconds) * 1000);
      const title = options?.title ?? t('notifTest.title');
      const body =
        options?.body ??
        t('notifTest.body');

      const id = await Notifications.scheduleNotificationAsync({
        identifier: `test-${Date.now()}`,
        content: {
          title,
          body,
          sound: NOTIFICATION_SOUND_WAV_FILENAME,
          data: {
            type: "TEST_NOTIFICATION",
            sentAt: new Date().toISOString(),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: effectiveDate,
          channelId: Platform.OS === "android" ? NOTIFICATION_CHANNEL_ID : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });

      return {
        success: true,
        id,
        message: t('notifTest.scheduled', { seconds: delaySeconds }),
      };
    } catch (err) {
      logger.error("[NotificationService] Erreur lors de sendTestNotification", err);
      return {
        success: false,
        message: err instanceof Error ? err.message : t('notifTest.unknown'),
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
  /**
   * Retire une notification affichée, une fois son action traitée.
   */
  async dismiss(identifier: string): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.dismissNotificationAsync(identifier);
    } catch {
      logger.warn("[NotificationService] Notification non retirée");
    }
  },

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

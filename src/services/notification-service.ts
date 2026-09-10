/**
 * Service de notifications push locales pour Junix Pulse.
 * Encapsule l'interaction avec expo-notifications.
 *
 * Compatible Expo Go (SDK 53/54/55/56/57) et Development Builds (EAS).
 * En Expo Go sur Android, les APIs natifs d'expo-notifications sont désactivées par Expo SDK 53+.
 * Le service bascule automatiquement en mode simulation transparente sans crasher l'application.
 */

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

type NotificationsType = typeof import('expo-notifications');

let Notifications: NotificationsType | null = null;

try {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (!isExpoGo) {
    Notifications = require('expo-notifications');
  } else {
    console.log('[NotificationService] Exécution dans Expo Go : notifications locales en mode simulation (Dev Build requis pour les notifications Android).');
  }
} catch (e) {
  console.log('[NotificationService] expo-notifications non disponible:', e);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleReminderParams {
  id: string;           // ID du rappel Junix Pulse (utilisé comme identifier)
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

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Rappels',
          description: 'Notifications pour vos rappels Junix Pulse',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D0BCFF',
          enableVibrate: true,
          showBadge: false,
        });
      }
    } catch (err) {
      console.log('[NotificationService] Initialisation des notifications ignorée:', err);
    }
  },

  /**
   * Planifie une notification locale pour un rappel.
   */
  async scheduleReminder(params: ScheduleReminderParams): Promise<string> {
    if (!Notifications) {
      return `mock-notif-${params.id}-${Date.now()}`;
    }

    try {
      const triggerDate = params.scheduledAt;
      const now = new Date();
      const effectiveDate = triggerDate <= now ? new Date(now.getTime() + 10_000) : triggerDate;

      return await Notifications.scheduleNotificationAsync({
        identifier: `reminder-${params.id}`,
        content: {
          title: params.title,
          body: params.body ?? 'Rappel Junix Pulse',
          data: {
            reminderId: params.id,
            type: 'REMINDER',
            ...params.data,
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: effectiveDate,
          channelId: Platform.OS === 'android' ? 'reminders' : undefined,
        } as import('expo-notifications').DateTriggerInput,
      });
    } catch (err) {
      console.log('[NotificationService] Erreur lors de scheduleReminder:', err);
      return `fallback-notif-${params.id}`;
    }
  },

  /**
   * Annule une notification planifiée.
   */
  async cancelReminder(notificationId: string): Promise<void> {
    if (!Notifications || notificationId.startsWith('mock-') || notificationId.startsWith('fallback-')) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.log('[NotificationService] Erreur cancelReminder:', err);
    }
  },

  /**
   * Annule toutes les notifications planifiées.
   */
  async cancelAll(): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.log('[NotificationService] Erreur cancelAll:', err);
    }
  },

  /**
   * Retourne toutes les notifications planifiées.
   */
  async getAllScheduled(): Promise<import('expo-notifications').NotificationRequest[]> {
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
      return status === 'granted';
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
      return status === 'granted';
    } catch {
      return true;
    }
  },

  /**
   * Écouteur foreground.
   */
  addForegroundListener(
    handler: (notification: import('expo-notifications').Notification) => void
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
    handler: (response: import('expo-notifications').NotificationResponse) => void
  ): () => void {
    if (!Notifications) return () => {};
    try {
      const sub = Notifications.addNotificationResponseReceivedListener(handler);
      return () => sub.remove();
    } catch {
      return () => {};
    }
  },
};

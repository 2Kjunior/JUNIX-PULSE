/**
 * Service de notifications push locales pour Junix Pulse.
 * Encapsule l'interaction avec expo-notifications.
 *
 * BR-005 : la notification doit déclencher une action accessible depuis l'app.
 * BR-019 : les permissions sont demandées au bon moment, pas au démarrage.
 * BR-018 : l'état des notifications survit au redémarrage.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configuration du comportement des notifications ─────────────────────────
// Ces options définissent comment les notifications sont affichées quand l'app
// est au premier plan (foreground).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleReminderParams {
  id: string;           // ID du rappel Junix Pulse (utilisé comme identifier)
  title: string;
  body?: string;
  scheduledAt: Date;
  data?: Record<string, unknown>;
}

// ─── Notifications de rappels ─────────────────────────────────────────────────

export const NotificationService = {
  /**
   * Configure le canal de notification Android (requis pour Android 8+).
   * À appeler au démarrage de l'app, une seule fois.
   */
  async setupAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Rappels',
      description: 'Notifications pour vos rappels Junix Pulse',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D0BCFF',
      enableVibrate: true,
      showBadge: false,
    });
  },

  /**
   * Planifie une notification locale pour un rappel.
   * Retourne l'identifiant système de la notification (pour pouvoir l'annuler).
   *
   * Si la date est dans le passé (< 10 secondes), la notification est décalée
   * de 5 secondes pour éviter un échec silencieux.
   */
  async scheduleReminder(params: ScheduleReminderParams): Promise<string> {
    const triggerDate = params.scheduledAt;
    const now = new Date();

    // Sécurité : la date ne doit pas être dans le passé
    const effectiveDate =
      triggerDate <= now
        ? new Date(now.getTime() + 10_000)
        : triggerDate;

    const notificationId = await Notifications.scheduleNotificationAsync({
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
      } as Notifications.DateTriggerInput,
    });

    return notificationId;
  },

  /**
   * Annule une notification planifiée par son identifiant système.
   * Utilisé lors de la suppression ou modification d'un rappel.
   */
  async cancelReminder(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Annule toutes les notifications planifiées (utile pour reset app).
   */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Retourne toutes les notifications planifiées (debug / audit).
   */
  async getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },

  /**
   * Vérifie l'état des permissions.
   */
  async checkPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Enregistre un listener pour les notifications reçues en foreground.
   * Retourne une fonction de cleanup à appeler dans useEffect.
   */
  addForegroundListener(
    handler: (notification: Notifications.Notification) => void
  ): () => void {
    const sub = Notifications.addNotificationReceivedListener(handler);
    return () => sub.remove();
  },

  /**
   * Enregistre un listener pour les interactions sur notification (tap).
   * Utilisé pour naviguer vers le rappel concerné.
   * Retourne une fonction de cleanup.
   */
  addResponseListener(
    handler: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const sub = Notifications.addNotificationResponseReceivedListener(handler);
    return () => sub.remove();
  },
};

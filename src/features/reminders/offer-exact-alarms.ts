/**
 * A reminder to confirm rings again every few minutes: without exact alarms, Android may hold
 * these close rings back and bundle them while the phone sleeps. Turning the option on offers
 * to allow them, once, when they are not allowed yet.
 */

import { GlassAlert } from '@/components/feedback/GlassAlert';
import { t } from '@/i18n';
import { NotificationService } from '@/services/notification-service';
import { syncReminderNotifications } from '@/services/reminder-notification-service';

export async function offerExactAlarmsForConfirmation(): Promise<void> {
  await offerExactAlarms(t('confirmReminder.exactTitle'), t('confirmReminder.exactBody'));
}

/**
 * An Alarm rings at the minute or not at all (sheet 031): choosing it offers exact alarms, once,
 * when they are not allowed yet. Nothing is asked when they are, or when Android cannot ask.
 */
export async function offerExactAlarmsForAlarmLevel(): Promise<void> {
  await offerExactAlarms(t('alertLevel.exactTitle'), t('alertLevel.exactBody'));
}

async function offerExactAlarms(title: string, body: string): Promise<void> {
  const { granted, canAsk } = await NotificationService.getExactAlarmStatus();
  if (granted || !canAsk) return;
  GlassAlert.alert(title, body, [
    { text: t('permissions.exactAlarms.later'), style: 'cancel' },
    {
      text: t('permissions.exactAlarms.allow'),
      onPress: async () => {
        // The reminders already planned move to exact alarms too
        if (await NotificationService.requestExactAlarms()) await syncReminderNotifications({ force: true });
      },
    },
  ]);
}

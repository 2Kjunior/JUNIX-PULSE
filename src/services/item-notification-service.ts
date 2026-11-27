/**
 * Keeps the notifications of the tasks and moments held by the phone in line with the database
 * (sheet 011), as reminder-notification-service does for the reminders: it compares both sides
 * and only touches what differs, so it is safe to call after any change.
 */

import { ITEM_IDENTIFIER_PREFIX, planItemNotifications, type PlannedItemNotification } from '@/domain/rules/item-notification-rules';
import { deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { EventRepository } from '@/repositories/event-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';

let queue: Promise<unknown> = Promise.resolve();

async function sync(force: boolean): Promise<void> {
  try {
    const settings = await SettingsRepository.get();
    const allPlanned = settings.notificationsEnabled
      ? planItemNotifications({
          tasks: await TaskRepository.findAllActive(),
          events: await EventRepository.findAll(),
          now: new Date(),
          language: useAppStore.getState().language,
          quietHours: quietHoursOf(settings),
          alertDefaults: settings.alertLevels,
        })
      : [];

    // The sound of each notification: its level, the tone of its moment, the settings (sheet 031)
    const soundOf = (item: { level: PlannedItemNotification['level']; tone?: PlannedItemNotification['tone'] }) =>
      soundFor({ level: item.level, tone: item.tone, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });

    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    // A sound of the phone for the alarms (sheet 037); the sound of Junix stays its safety net
    const deviceUri = deviceSoundFor({ level: 'alarm', prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled })?.uri ?? '';
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'item',
      split.alarms.map(item =>
        item.itemType === 'TASK'
          ? alarmOf(item, soundOf(item), `/tasks/${item.itemId}`, language, 'task', deviceUri)
          : alarmOf(item, soundOf(item), `/events/${item.itemId}`, language, 'moment', deviceUri)
      )
    );
    const planned = handed ? split.notifications : allPlanned;

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(ITEM_IDENTIFIER_PREFIX)
    );
    const plannedById = new Map(planned.map(item => [item.identifier, item]));
    const upToDate = new Set<string>();

    for (const request of held) {
      const item = plannedById.get(request.identifier);
      if (
        !force &&
        item &&
        item.title === request.content.title &&
        item.body === request.content.body &&
        levelOf(request.content.data?.level) === item.level &&
        // A sound changed in the settings moves it to the channel of its new sound (sheet 031)
        request.content.data?.sound === soundOf(item) &&
        // Haute moves it to the insisting channel, and back (sheet 032)
        Boolean(request.content.data?.insists) === Boolean(item.insists)
      ) {
        upToDate.add(request.identifier);
      } else {
        await NotificationService.cancelReminder(request.identifier);
      }
    }

    const missing = planned.filter(item => !upToDate.has(item.identifier));
    // Never asks for the permission here: the reminders ask for it after an action of the user
    if (missing.length === 0 || !(await NotificationService.checkPermissions())) return;

    for (const item of missing) {
      await NotificationService.scheduleItem({
        identifier: item.identifier,
        itemType: item.itemType,
        itemId: item.itemId,
        title: item.title,
        body: item.body,
        scheduledAt: item.scheduledAt,
        level: item.level,
        soundOn: settings.notificationSoundEnabled,
        sound: soundOf(item),
        insists: item.insists,
      });
    }
  } catch {
    logger.error('[ItemNotificationService] Erreur lors de la synchronisation');
  }
}

/** Runs one sync at a time, so that two quick changes end on the latest data. */
export function syncItemNotifications(options: { force?: boolean } = {}): Promise<void> {
  const run = queue.then(() => sync(options.force ?? false));
  queue = run;
  return run;
}

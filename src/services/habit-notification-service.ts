/**
 * Keeps the notifications of the habits that ring in line with the database (sheet 019), like the
 * reminders and the items: it compares both sides and only touches what differs.
 */

import { HABIT_IDENTIFIER_PREFIX, planHabitNotifications, type HabitToPlan } from '@/domain/rules/habit-notification-rules';
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { HabitRepository } from '@/repositories/habit-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';

let queue: Promise<unknown> = Promise.resolve();

async function sync(force: boolean): Promise<void> {
  try {
    const settings = await SettingsRepository.get();
    const toPlan: HabitToPlan[] = [];
    if (settings.notificationsEnabled) {
      for (const habit of await HabitRepository.findAllActive()) {
        if (!habit.reminderTime) continue;
        const completions = await HabitRepository.getCompletions(habit.id);
        toPlan.push({ habit, completedDates: completions.map(completion => completion.completedDate) });
      }
    }
    const allPlanned = planHabitNotifications({
      habits: toPlan,
      now: new Date(),
      language: useAppStore.getState().language,
      quietHours: quietHoursOf(settings),
      alertDefaults: settings.alertLevels,
    });

    // The sound of each notification, from its level and the settings (sheet 031)
    const soundOf = (level: (typeof allPlanned)[number]['level']) =>
      soundFor({ level, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });

    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    // A sound of the phone for the alarms (sheet 037); the sound of Junix stays its safety net
    const deviceUri = deviceSoundFor({ level: 'alarm', prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled })?.uri ?? '';
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'habit',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/habits/${item.habitId}`, language, 'habit', deviceUri))
    );
    const planned = handed ? split.notifications : allPlanned;

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(HABIT_IDENTIFIER_PREFIX)
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
        request.content.data?.sound === soundOf(item.level)
      ) {
        upToDate.add(request.identifier);
      } else {
        await NotificationService.cancelReminder(request.identifier);
      }
    }

    const missing = planned.filter(item => !upToDate.has(item.identifier));
    if (missing.length === 0 || !(await NotificationService.checkPermissions())) return;
    for (const item of missing) {
      await NotificationService.scheduleHabit({ ...item, soundOn: settings.notificationSoundEnabled, sound: soundOf(item.level) });
    }
  } catch {
    logger.error('[HabitNotificationService] Erreur lors de la synchronisation');
  }
}

/** Runs one sync at a time, so that two quick changes end on the latest data. */
export function syncHabitNotifications(options: { force?: boolean } = {}): Promise<void> {
  const run = queue.then(() => sync(options.force ?? false));
  queue = run;
  return run;
}

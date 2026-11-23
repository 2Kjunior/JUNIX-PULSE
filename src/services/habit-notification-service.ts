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
    const planned = planHabitNotifications({
      habits: toPlan,
      now: new Date(),
      language: useAppStore.getState().language,
      quietHours: quietHoursOf(settings),
    });

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
        levelOf(request.content.data?.level) === item.level
      ) {
        upToDate.add(request.identifier);
      } else {
        await NotificationService.cancelReminder(request.identifier);
      }
    }

    const missing = planned.filter(item => !upToDate.has(item.identifier));
    if (missing.length === 0 || !(await NotificationService.checkPermissions())) return;
    for (const item of missing) {
      await NotificationService.scheduleHabit({ ...item, soundOn: settings.notificationSoundEnabled });
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

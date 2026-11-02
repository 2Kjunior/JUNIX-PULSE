/**
 * Keeps the scheduled daily recap notifications in line with the user's settings.
 * Called at launch and after each change of a setting they depend on. It never asks for the
 * permission: without it, nothing is scheduled until the next sync.
 */

import { plannedDailyRecaps } from '@/domain/rules/daily-recap-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';

let queue: Promise<void> = Promise.resolve();

async function sync(): Promise<void> {
  try {
    const planned = plannedDailyRecaps(await SettingsRepository.get(), useAppStore.getState().language);
    await NotificationService.cancelDailyRecaps();
    if (planned.length === 0 || !(await NotificationService.checkPermissions())) return;
    for (const recap of planned) {
      await NotificationService.scheduleDailyRecap(recap);
    }
  } catch {
    logger.error('[DailyRecapService] Erreur lors de la synchronisation');
  }
}

/** Runs one sync at a time, so that two quick changes end on the latest settings. */
export function syncDailyRecapNotifications(): Promise<void> {
  queue = queue.then(sync);
  return queue;
}

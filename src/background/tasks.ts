/**
 * Background tasks, defined when the bundle loads: when Android starts the app only to run one,
 * no screen is mounted, so they must exist before any of them is (see index.ts).
 *
 * - The buttons of the reminder notifications, tapped while the app is not in front.
 * - The weekly automatic backup.
 */

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { AUTO_BACKUP_TASK } from '@/domain/rules/auto-backup-rules';
import { REMINDER_ACTION_TASK } from '@/domain/rules/reminder-notification-rules';
import { runAutoBackup } from '@/services/auto-backup-service';
import { handleBackgroundResponse } from '@/services/notification-action-service';
import { logger } from '@/utils/logger';

function define(name: string, run: (data: unknown) => Promise<unknown>): void {
  try {
    if (TaskManager.isTaskDefined(name)) return;
    TaskManager.defineTask(name, async ({ data, error }) => {
      if (error) {
        logger.warn(`[BackgroundTasks] ${name} reçue avec une erreur`, error);
        return;
      }
      return run(data);
    });
  } catch (error) {
    // An app built without the task manager: the features that need it stay off
    logger.warn(`[BackgroundTasks] ${name} non définie`, error);
  }
}

define(REMINDER_ACTION_TASK, handleBackgroundResponse);

// The weekly backup, when the system lets it run (about twice a day at most)
define(AUTO_BACKUP_TASK, async () => {
  const result = await runAutoBackup({ background: true });
  return result === 'failed' ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success;
});

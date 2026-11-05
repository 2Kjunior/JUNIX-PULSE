/**
 * Keeps the notifications held by the phone in line with the reminders in the database.
 * It compares both sides, so it is safe to call after any change and only touches what differs.
 */

import { RecurrenceRule } from '@/domain/entities';
import {
  planReminderNotifications,
  REMINDER_CATEGORY_ID,
  REMINDER_IDENTIFIER_PREFIX,
  ReminderToPlan,
} from '@/domain/rules/reminder-notification-rules';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';

export interface ReminderSyncOptions {
  /** After a user action: may ask for the permission, and reports problems to the user. */
  interactive?: boolean;
  /** Schedules everything again, for instance once exact alarms are allowed. */
  force?: boolean;
}

export interface ReminderSyncReport {
  scheduled: number;
  failed: number;
  permissionDenied: boolean;
}

type ReportListener = (report: ReminderSyncReport) => void;

const listeners = new Set<ReportListener>();
let queue: Promise<unknown> = Promise.resolve();

/** Problems met during an interactive sync, for the screen that can show them. */
export function onReminderSyncProblem(listener: ReportListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadReminders(): Promise<ReminderToPlan[]> {
  const reminders = await ReminderRepository.findAll();
  const rules = new Map<string, RecurrenceRule | null>();
  const items: ReminderToPlan[] = [];
  for (const reminder of reminders) {
    const ruleId = reminder.recurrenceRuleId;
    if (ruleId && !rules.has(ruleId)) rules.set(ruleId, await ReminderRepository.findRecurrenceRule(ruleId));
    items.push({ reminder, rule: ruleId ? (rules.get(ruleId) ?? null) : null });
  }
  return items;
}

async function sync({ interactive = false, force = false }: ReminderSyncOptions): Promise<ReminderSyncReport> {
  const report: ReminderSyncReport = { scheduled: 0, failed: 0, permissionDenied: false };
  try {
    const settings = await SettingsRepository.get();
    const planned = settings.notificationsEnabled
      ? planReminderNotifications(await loadReminders(), new Date(), useAppStore.getState().language)
      : [];

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(REMINDER_IDENTIFIER_PREFIX)
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
        // Notifications planned before the buttons existed are planned again with them
        request.content.categoryIdentifier === REMINDER_CATEGORY_ID
      ) {
        upToDate.add(request.identifier);
      } else {
        await NotificationService.cancelReminder(request.identifier);
      }
    }

    const missing = planned.filter(item => !upToDate.has(item.identifier));
    if (missing.length === 0) return report;

    const allowed = interactive
      ? await NotificationService.requestPermissions()
      : await NotificationService.checkPermissions();
    if (!allowed) {
      report.permissionDenied = true;
      return report;
    }

    for (const item of missing) {
      const scheduled = await NotificationService.scheduleReminder({
        id: item.reminderId,
        identifier: item.identifier,
        title: item.title,
        body: item.body,
        scheduledAt: item.scheduledAt,
        silent: !settings.notificationSoundEnabled,
      });
      if (scheduled) report.scheduled += 1;
      else report.failed += 1;
    }
    return report;
  } catch {
    logger.error('[ReminderNotificationService] Erreur lors de la synchronisation');
    return { ...report, failed: report.failed + 1 };
  }
}

/** Runs one sync at a time, so that two quick changes end on the latest data. */
export function syncReminderNotifications(options: ReminderSyncOptions = {}): Promise<ReminderSyncReport> {
  const run = queue.then(() => sync(options));
  queue = run;
  return run.then(report => {
    if (options.interactive && (report.failed > 0 || report.permissionDenied)) {
      listeners.forEach(listener => listener(report));
    }
    return report;
  });
}

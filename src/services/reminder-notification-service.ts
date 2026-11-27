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
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { NotificationService } from '@/services/notification-service';
import { syncItemNotifications } from '@/services/item-notification-service';
import { syncHabitNotifications } from '@/services/habit-notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn, phoneSoundOf, syncPhoneChannels } from '@/services/alarm-bridge';

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
    // The sound of each notification, from its level and the settings (sheet 031)
    const soundOf = (level: NotificationLevel) =>
      soundFor({ level, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });
    const allPlanned = settings.notificationsEnabled
      ? planReminderNotifications(
          await loadReminders(),
          new Date(),
          useAppStore.getState().language,
          quietHoursOf(settings),
          settings.alertLevels
        )
      : [];
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    // A sound of the phone for the alarms (sheet 037); the sound of Junix stays its safety net
    const deviceUri = deviceSoundFor({ level: 'alarm', prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled })?.uri ?? '';
    // The musics of the phone of the ordinary notifications, their channels first (sheet 039)
    syncPhoneChannels(settings.soundPrefs, language);
    const phoneOf = (item: { level: NotificationLevel; insists?: boolean }) =>
      phoneSoundOf(item.level, deviceSoundFor({ level: item.level, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled }), item.insists);
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'reminder',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/reminders/${item.reminderId}`, language, 'reminder', deviceUri, item.reminderId))
    );
    const planned = handed ? split.notifications : allPlanned;

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
        // A reminder whose level changed (night, urgency) moves to the channel of its new level
        levelOf(request.content.data?.level) === item.level &&
        // A sound changed in the settings moves it to the channel of its new sound (sheet 031)
        request.content.data?.sound === (phoneOf(item)?.key ?? soundOf(item.level)) &&
        // Haute moves it to the insisting channel, and back (sheet 032)
        Boolean(request.content.data?.insists) === Boolean(item.insists) &&
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
        level: item.level,
        sound: soundOf(item.level),
        insists: item.insists,
        phone: phoneOf(item),
        color: item.color,
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
  // The tasks and moments follow the same changes (settings, language, permission, launch)
  void syncItemNotifications({ force: options.force });
  void syncHabitNotifications({ force: options.force });
  return run.then(report => {
    if (options.interactive && (report.failed > 0 || report.permissionDenied)) {
      listeners.forEach(listener => listener(report));
    }
    return report;
  });
}

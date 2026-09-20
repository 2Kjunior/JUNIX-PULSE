/**
 * Use cases (actions métier) pour les rappels.
 * Ces fonctions orchestrent les repositories + le service de notifications.
 * Elles constituent la couche "application" entre UI et domaine.
 *
 * Principe : aucun composant UI n'appelle les repositories directement.
 * Toutes les opérations passent par ces use cases.
 */

import { randomUUID } from 'expo-crypto';
import { ReminderRepository } from '../repositories/reminder-repository';
import { NotificationService } from '../services/notification-service';
import { getNextOccurrence, computeSnoozeUntil, computeSnoozeTomorrowSameTime, UNDO_DELETE_TIMEOUT_MS } from '../domain/rules/reminder-rules';
import { Reminder, RecurrenceRule } from '../domain/entities';

// ─── Création ────────────────────────────────────────────────────────────────

export interface CreateReminderInput {
  title: string;
  notes?: string;
  scheduledAt: Date;
  timezone: string;
  priority?: Reminder['priority'];
  actionType?: Reminder['actionType'];
  personId?: string;
  recurrenceRule?: Omit<RecurrenceRule, 'id'>;
  checklistItems?: { title: string; position: number }[];
  notificationsEnabled: boolean;
}

export async function createReminder(input: CreateReminderInput): Promise<string> {
  const now = new Date().toISOString();
  const reminderId = randomUUID();

  // 1. Créer la règle de récurrence si fournie
  let recurrenceRuleId: string | undefined;
  if (input.recurrenceRule) {
    const ruleId = randomUUID();
    await ReminderRepository.createRecurrenceRule({
      id: ruleId,
      ...input.recurrenceRule,
    });
    recurrenceRuleId = ruleId;
  }

  // 2. Créer le rappel en base
  await ReminderRepository.create({
    id: reminderId,
    title: input.title,
    notes: input.notes,
    scheduledAt: input.scheduledAt.toISOString(),
    timezone: input.timezone,
    priority: input.priority ?? 'NORMAL',
    actionType: input.actionType ?? 'NONE',
    personId: input.personId,
    recurrenceRuleId,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Créer les éléments de checklist si fournis
  if (input.checklistItems?.length) {
    for (const item of input.checklistItems) {
      await ReminderRepository.createChecklistItem({
        id: randomUUID(),
        reminderId,
        title: item.title,
        position: item.position,
      });
    }
  }

  // 4. Planifier la notification si activée
  if (input.notificationsEnabled) {
    try {
      const notifId = await NotificationService.scheduleReminder({
        id: reminderId,
        title: input.title,
        body: input.notes,
        scheduledAt: input.scheduledAt,
      });
      await ReminderRepository.update({
        id: reminderId,
        notificationId: notifId,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // La notification a échoué mais le rappel est sauvé en base
      // L'utilisateur peut toujours voir le rappel dans l'app
    }
  }

  return reminderId;
}

// ─── Mise à jour ──────────────────────────────────────────────────────────────

export interface UpdateReminderInput {
  id: string;
  title?: string;
  notes?: string;
  scheduledAt?: Date;
  priority?: Reminder['priority'];
  actionType?: Reminder['actionType'];
  personId?: string;
  notificationsEnabled: boolean;
  currentNotificationId?: string;
}

export async function updateReminder(input: UpdateReminderInput): Promise<void> {
  const now = new Date().toISOString();

  // Annuler l'ancienne notification si elle existe
  if (input.currentNotificationId) {
    try {
      await NotificationService.cancelReminder(input.currentNotificationId);
    } catch { /* ignore */ }
  }

  // Mettre à jour en base
  await ReminderRepository.update({
    id: input.id,
    title: input.title,
    notes: input.notes,
    scheduledAt: input.scheduledAt?.toISOString(),
    priority: input.priority,
    actionType: input.actionType,
    personId: input.personId,
    notificationId: undefined, // réinitialisé
    updatedAt: now,
  });

  // Replanifier si une nouvelle date est fournie
  if (input.scheduledAt && input.notificationsEnabled && input.title) {
    try {
      const notifId = await NotificationService.scheduleReminder({
        id: input.id,
        title: input.title,
        scheduledAt: input.scheduledAt,
      });
      await ReminderRepository.update({
        id: input.id,
        notificationId: notifId,
        updatedAt: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  }
}

// ─── Complétion ───────────────────────────────────────────────────────────────

export async function completeReminder(
  reminder: Reminder,
  notificationsEnabled: boolean
): Promise<void> {
  const now = new Date().toISOString();

  // Annuler la notification si elle existe
  if (reminder.notificationId) {
    try {
      await NotificationService.cancelReminder(reminder.notificationId);
    } catch { /* ignore */ }
  }

  // 1. Marquer ce rappel comme complété
  await ReminderRepository.update({
    id: reminder.id,
    status: 'COMPLETED',
    completedAt: now,
    updatedAt: now,
  });

  // 2. Si récurrent, créer la prochaine occurrence
  if (reminder.recurrenceRuleId) {
    const rule = await ReminderRepository.findRecurrenceRule(reminder.recurrenceRuleId);
    if (rule) {
      const nextDate = getNextOccurrence(reminder.scheduledAt, rule);
      if (nextDate) {
        await createReminder({
          title: reminder.title,
          notes: reminder.notes,
          scheduledAt: new Date(nextDate),
          timezone: reminder.timezone,
          priority: reminder.priority,
          actionType: reminder.actionType,
          personId: reminder.personId,
          recurrenceRule: {
            type: rule.type,
            interval: rule.interval,
            daysOfWeek: rule.daysOfWeek,
            dayOfMonth: rule.dayOfMonth,
            weekPosition: rule.weekPosition,
            endDate: rule.endDate,
          },
          notificationsEnabled,
        });
      }
    }
  }
}

// ─── Snooze ───────────────────────────────────────────────────────────────────

/**
 * Décrit les 3 formes métier de report (BR-003).
 * - quick    : durée rapide depuis maintenant (15, 30, 60 min)
 * - tomorrow : demain à la même heure que le rappel d'origine
 * - custom   : date/heure choisie librement par l'utilisateur
 */
export type SnoozeInput =
  | { kind: 'quick';   minutes: number }
  | { kind: 'tomorrow' }
  | { kind: 'custom';  until: Date };

export async function snoozeReminder(
  reminder: Reminder,
  input: SnoozeInput,
  notificationsEnabled: boolean
): Promise<void> {
  // Calcule la nouvelle échéance selon la forme choisie
  let snoozedUntil: string;
  switch (input.kind) {
    case 'quick':
      snoozedUntil = computeSnoozeUntil(input.minutes);
      break;
    case 'tomorrow':
      snoozedUntil = computeSnoozeTomorrowSameTime(reminder.scheduledAt);
      break;
    case 'custom':
      snoozedUntil = input.until.toISOString();
      break;
  }

  const snoozedUntilDate = new Date(snoozedUntil);
  const now = new Date().toISOString();

  // Annuler l'ancienne notification
  if (reminder.notificationId) {
    try {
      await NotificationService.cancelReminder(reminder.notificationId);
    } catch { /* ignore */ }
  }

  await ReminderRepository.update({
    id: reminder.id,
    status: 'SNOOZED',
    snoozedUntil,
    scheduledAt: snoozedUntil,
    updatedAt: now,
  });

  // Replanifier avec la nouvelle heure
  if (notificationsEnabled) {
    try {
      const notifId = await NotificationService.scheduleReminder({
        id: reminder.id,
        title: reminder.title,
        body: `Rappel reporté — ${reminder.notes ?? ''}`,
        scheduledAt: snoozedUntilDate,
      });
      await ReminderRepository.update({
        id: reminder.id,
        notificationId: notifId,
        updatedAt: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  }
}

// ─── Suppression (avec undo) ──────────────────────────────────────────────────

export interface DeleteReminderResult {
  undo: () => Promise<void>;
}

export async function deleteReminder(
  reminder: Reminder,
  onUndoExpired?: () => void
): Promise<DeleteReminderResult> {
  const now = new Date().toISOString();

  // Annuler la notification
  if (reminder.notificationId) {
    try {
      await NotificationService.cancelReminder(reminder.notificationId);
    } catch { /* ignore */ }
  }

  // Suppression logique immédiate
  await ReminderRepository.softDelete(reminder.id, now);

  // Retourner la fonction d'annulation
  const timer = setTimeout(() => {
    onUndoExpired?.();
  }, UNDO_DELETE_TIMEOUT_MS);

  return {
    undo: async () => {
      clearTimeout(timer);
      await ReminderRepository.undoDelete(reminder.id, new Date().toISOString());
      // Si notifications activées, replanifier
      // (simplifié : l'utilisateur devra ré-ouvrir le rappel pour replanifier)
    },
  };
}

/**
 * Use cases (actions métier) pour les rappels.
 * Ces fonctions orchestrent les repositories ; les notifications suivent via une synchronisation.
 * Elles constituent la couche "application" entre UI et domaine.
 *
 * Principe : aucun composant UI n'appelle les repositories directement.
 * Toutes les opérations passent par ces use cases.
 */

import { randomUUID } from 'expo-crypto';
import { TagRepository } from '../repositories/tag-repository';
import { ReminderRepository } from '../repositories/reminder-repository';
import { syncReminderNotifications } from '../services/reminder-notification-service';
import { NotificationService } from '../services/notification-service';
import { getNextOccurrence, computeSnoozeUntil, computeSnoozeTomorrowSameTime, UNDO_DELETE_TIMEOUT_MS } from '../domain/rules/reminder-rules';
import { Reminder, RecurrenceRule } from '../domain/entities';
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
import { interactionTypeForAction } from '../domain/rules/person-link-rules';
import { recordLinkedInteraction } from './person-use-cases';

// ─── Création ────────────────────────────────────────────────────────────────

export interface CreateReminderInput {
  title: string;
  notes?: string;
  scheduledAt: Date;
  timezone: string;
  priority?: Reminder['priority'];
  actionType?: Reminder['actionType'];
  personId?: string;
  /** All the people of the reminder, the main one first; personId alone means just that one. */
  personIds?: string[];
  /** Its coloured tags. */
  tagIds?: string[];
  /** Rings again every few minutes until completed or snoozed. */
  requiresConfirmation?: boolean;
  recurrenceRule?: Omit<RecurrenceRule, 'id'>;
  checklistItems?: { title: string; position: number }[];
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
    personId: input.personIds?.[0] ?? input.personId,
    requiresConfirmation: input.requiresConfirmation,
    recurrenceRuleId,
    createdAt: now,
    updatedAt: now,
  });

  // Every person of the reminder, the main one first
  const people = input.personIds ?? (input.personId ? [input.personId] : []);
  if (people.length > 0) await ReminderRepository.setPersons(reminderId, people);
  if (input.tagIds?.length) await TagRepository.setFor('reminder', reminderId, input.tagIds);

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

  // 4. Planifier les notifications. En cas d'échec, le rappel reste sauvé en base.
  await syncReminderNotifications({ interactive: true });

  emitMascotEvent({ type: 'ITEM_CREATED' });
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
  /** null takes the person off the reminder. */
  personId?: string | null;
  /** All its people, the main one first: replaces the ones it had. */
  personIds?: string[];
  /** Its coloured tags: replaces the ones it had. */
  tagIds?: string[];
  requiresConfirmation?: boolean;
}

export async function updateReminder(input: UpdateReminderInput): Promise<void> {
  const now = new Date().toISOString();
  if (input.personIds !== undefined) await ReminderRepository.setPersons(input.id, input.personIds);
  if (input.tagIds !== undefined) await TagRepository.setFor('reminder', input.id, input.tagIds);

  // Mettre à jour en base
  await ReminderRepository.update({
    id: input.id,
    title: input.title,
    notes: input.notes,
    scheduledAt: input.scheduledAt?.toISOString(),
    priority: input.priority,
    actionType: input.actionType,
    personId: input.personId,
    updatedAt: now,
  });

  await syncReminderNotifications({ interactive: true });
}

// ─── Complétion ───────────────────────────────────────────────────────────────

export async function completeReminder(reminder: Reminder): Promise<void> {
  const now = new Date().toISOString();

  // 1. Marquer ce rappel comme complété
  await ReminderRepository.update({
    id: reminder.id,
    status: 'COMPLETED',
    completedAt: now,
    updatedAt: now,
  });

  // 2. Si récurrent, créer la prochaine occurrence (strictement future par rapport à maintenant)
  if (reminder.recurrenceRuleId) {
    const rule = await ReminderRepository.findRecurrenceRule(reminder.recurrenceRuleId);
    if (rule) {
      const nextDate = getNextOccurrence(reminder.scheduledAt, rule, new Date());
      if (nextDate) {
        await createReminder({
          title: reminder.title,
          notes: reminder.notes,
          scheduledAt: new Date(nextDate),
          timezone: reminder.timezone,
          priority: reminder.priority,
          actionType: reminder.actionType,
          personIds: await ReminderRepository.findPersonIds(reminder.id),
          tagIds: await TagRepository.findIdsFor('reminder', reminder.id),
          requiresConfirmation: reminder.requiresConfirmation,
          recurrenceRule: {
            type: rule.type,
            interval: rule.interval,
            daysOfWeek: rule.daysOfWeek,
            dayOfMonth: rule.dayOfMonth,
            weekPosition: rule.weekPosition,
            endDate: rule.endDate,
          },
        });
      }
    }
  }

  await syncReminderNotifications();
  // The reminder and its repeats leave the notification shade
  void NotificationService.dismissForReminder(reminder.id);

  // Calling, writing to or meeting the people of the reminder is an exchange with each of them
  const exchange = interactionTypeForAction(reminder.actionType);
  if (exchange) {
    for (const personId of await ReminderRepository.findPersonIds(reminder.id)) {
      await recordLinkedInteraction({ personId, type: exchange, reminderId: reminder.id });
    }
  }

  emitMascotEvent({ type: 'REMINDER_COMPLETED', priority: reminder.priority });
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
  input: SnoozeInput
): Promise<void> {
  // Calcule la nouvelle échéance selon la forme choisie
  let snoozedUntil: string;
  switch (input.kind) {
    case 'quick':
      snoozedUntil = computeSnoozeUntil(input.minutes);
      break;
    case 'tomorrow':
      snoozedUntil = computeSnoozeTomorrowSameTime(reminder.scheduledAt, new Date());
      break;
    case 'custom':
      snoozedUntil = input.until.toISOString();
      break;
  }

  const now = new Date().toISOString();

  await ReminderRepository.update({
    id: reminder.id,
    status: 'SNOOZED',
    snoozedUntil,
    scheduledAt: snoozedUntil,
    updatedAt: now,
  });

  await syncReminderNotifications({ interactive: true });
  void NotificationService.dismissForReminder(reminder.id);

  emitMascotEvent({ type: 'REMINDER_SNOOZED' });
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

  // Suppression logique immédiate
  await ReminderRepository.softDelete(reminder.id, now);
  await syncReminderNotifications();
  emitMascotEvent({ type: 'ITEM_DELETED' });

  // Retourner la fonction d'annulation
  const timer = setTimeout(() => {
    onUndoExpired?.();
  }, UNDO_DELETE_TIMEOUT_MS);

  return {
    undo: async () => {
      clearTimeout(timer);
      await ReminderRepository.undoDelete(reminder.id, new Date().toISOString());
      await syncReminderNotifications();
    },
  };
}

// ─── Réconciliation au démarrage (DEF-03 / I-11) ─────────────────────────────

/**
 * Avance tous les rappels récurrents en retard vers leur prochaine occurrence future.
 * Appelée une seule fois au démarrage de l'app, après l'initialisation de la base.
 *
 * Algorithme :
 * 1. Chercher les rappels UPCOMING/SNOOZED avec une recurrenceRuleId dont scheduledAt < now
 * 2. Pour chacun, calculer la prochaine occurrence strictement future via getNextOccurrence
 * 3a. Si une occurrence existe → mettre à jour scheduledAt + status = UPCOMING
 * 3b. Si la règle est expirée (null) → marquer COMPLETED
 *
 * Retourne le nombre de rappels réconciliés (utile pour les logs / tests).
 */
export async function reconcileOverdueRecurringReminders(): Promise<number> {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Trouver tous les rappels récurrents en retard
  const overdueReminders = await ReminderRepository.findOverdueRecurring(nowIso);

  let reconciled = 0;

  for (const reminder of overdueReminders) {
    if (!reminder.recurrenceRuleId) continue;

    const rule = await ReminderRepository.findRecurrenceRule(reminder.recurrenceRuleId);
    if (!rule) continue;

    // 2. Calculer la prochaine occurrence strictement future
    const nextDate = getNextOccurrence(reminder.scheduledAt, rule, now);

    if (nextDate) {
      // 3a. Avancer le rappel à la prochaine occurrence future
      await ReminderRepository.update({
        id: reminder.id,
        scheduledAt: nextDate,
        status: 'UPCOMING',
        snoozedUntil: undefined,
        updatedAt: nowIso,
      });
    } else {
      // 3b. Règle expirée → marquer comme complété
      await ReminderRepository.update({
        id: reminder.id,
        status: 'COMPLETED',
        completedAt: nowIso,
        updatedAt: nowIso,
      });
    }

    reconciled++;
  }

  return reconciled;
}

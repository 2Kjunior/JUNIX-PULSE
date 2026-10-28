/**
 * Repository pour les rappels.
 * Encapsule tous les accès SQLite liés aux rappels.
 * Règle : aucun composant UI ne doit importer ce module directement.
 */

import type { SQLiteBindValue } from 'expo-sqlite';
import { getDatabase } from '../database/sqlite';
import { Reminder, ReminderChecklistItem, RecurrenceRule } from '../domain/entities';

// ─── Types de paramètres ──────────────────────────────────────────────────────

export interface CreateReminderParams {
  id: string;
  title: string;
  notes?: string;
  scheduledAt: string;
  timezone: string;
  priority: Reminder['priority'];
  actionType: Reminder['actionType'];
  personId?: string;
  recurrenceRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateReminderParams {
  id: string;
  title?: string;
  notes?: string | null;
  scheduledAt?: string;
  priority?: Reminder['priority'];
  status?: Reminder['status'];
  actionType?: Reminder['actionType'];
  personId?: string | null;
  notificationId?: string | null;
  snoozedUntil?: string | null;
  updatedAt: string;
  completedAt?: string | null;
  deletedAt?: string | null;
}

// ─── Conversion row → entité ──────────────────────────────────────────────────

function rowToReminder(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as string,
    title: row.title as string,
    notes: (row.notes as string | null) ?? undefined,
    scheduledAt: row.scheduled_at as string,
    timezone: (row.timezone as string) || 'UTC',
    priority: row.priority as Reminder['priority'],
    status: row.status as Reminder['status'],
    actionType: row.action_type as Reminder['actionType'],
    personId: (row.person_id as string | null) ?? undefined,
    recurrenceRuleId: (row.recurrence_rule_id as string | null) ?? undefined,
    notificationId: (row.notification_id as string | null) ?? undefined,
    snoozedUntil: (row.snoozed_until as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? undefined,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function rowToChecklistItem(row: Record<string, unknown>): ReminderChecklistItem {
  return {
    id: row.id as string,
    reminderId: row.reminder_id as string,
    title: row.title as string,
    isCompleted: (row.is_completed as number) === 1,
    position: row.position as number,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const ReminderRepository = {
  /**
   * Crée un nouveau rappel.
   */
  async create(params: CreateReminderParams): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO reminders (
        id, title, notes, scheduled_at, timezone, priority, status, action_type,
        person_id, recurrence_rule_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'UPCOMING', ?, ?, ?, ?, ?)`,
      params.id,
      params.title,
      params.notes ?? null,
      params.scheduledAt,
      params.timezone,
      params.priority,
      params.actionType,
      params.personId ?? null,
      params.recurrenceRuleId ?? null,
      params.createdAt,
      params.updatedAt
    );
  },

  /**
   * Met à jour les champs modifiés d'un rappel.
   */
  async update(params: UpdateReminderParams): Promise<void> {
    const setClauses: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (params.title !== undefined) {
      setClauses.push('title = ?');
      values.push(params.title);
    }
    if (params.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(params.notes);
    }
    if (params.scheduledAt !== undefined) {
      setClauses.push('scheduled_at = ?');
      values.push(params.scheduledAt);
    }
    if (params.priority !== undefined) {
      setClauses.push('priority = ?');
      values.push(params.priority);
    }
    if (params.status !== undefined) {
      setClauses.push('status = ?');
      values.push(params.status);
    }
    if (params.actionType !== undefined) {
      setClauses.push('action_type = ?');
      values.push(params.actionType);
    }
    if (params.personId !== undefined) {
      setClauses.push('person_id = ?');
      values.push(params.personId);
    }
    if (params.notificationId !== undefined) {
      setClauses.push('notification_id = ?');
      values.push(params.notificationId);
    }
    if (params.snoozedUntil !== undefined) {
      setClauses.push('snoozed_until = ?');
      values.push(params.snoozedUntil);
    }
    if (params.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(params.completedAt);
    }
    if (params.deletedAt !== undefined) {
      setClauses.push('deleted_at = ?');
      values.push(params.deletedAt);
    }

    setClauses.push('updated_at = ?');
    values.push(params.updatedAt);

    values.push(params.id);

    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET ${setClauses.join(', ')} WHERE id = ?`,
      ...values
    );
  },

  /**
   * Suppression logique d'un rappel (soft delete).
   * BR-008/DELETE : le rappel reste en base avec deleted_at renseigné.
   */
  async softDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET status = 'DELETED', deleted_at = ?, updated_at = ? WHERE id = ?`,
      now, now, id
    );
  },

  /**
   * Annule une suppression logique (undo, avant expiration des 30 secondes).
   */
  async undoDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET status = 'UPCOMING', deleted_at = NULL, updated_at = ? WHERE id = ?`,
      now, id
    );
  },

  /**
   * Récupère un rappel par son ID (sans les supprimés).
   */
  async findById(id: string): Promise<Reminder | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM reminders WHERE id = ? AND deleted_at IS NULL',
      id
    );
    return row ? rowToReminder(row) : null;
  },

  /**
   * Récupère tous les rappels actifs (non supprimés), triés par date.
   */
  async findAll(): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders WHERE deleted_at IS NULL ORDER BY scheduled_at ASC`
    );
    return rows.map(rowToReminder);
  },

  /**
   * Rappels du jour : prévus pour la date donnée (comparaison en date locale).
   */
  async findForDate(dateIso: string): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE deleted_at IS NULL
         AND status NOT IN ('COMPLETED', 'DELETED')
         AND (DATE(scheduled_at, 'localtime') = ? OR DATE(scheduled_at) = ?)
       ORDER BY scheduled_at ASC`,
      dateIso, dateIso
    );
    return rows.map(rowToReminder);
  },

  /**
   * Rappels dans un état donné (ex: tous les UPCOMING pour le scheduler).
   */
  async findByStatus(status: Reminder['status']): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders WHERE status = ? AND deleted_at IS NULL ORDER BY scheduled_at ASC`,
      status
    );
    return rows.map(rowToReminder);
  },

  /**
   * Rappels manqués (TRIGGERED mais sans action de l'utilisateur).
   * Utilisé pour générer les suggestions de replanification.
   */
  async findMissed(): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders WHERE status = 'MISSED' AND deleted_at IS NULL ORDER BY scheduled_at DESC`
    );
    return rows.map(rowToReminder);
  },

  /**
   * Rappels récurrents actifs dont scheduledAt est dans le passé (DEF-03).
   * Utilisé par la réconciliation au démarrage pour avancer les occurrences en retard.
   */
  async findOverdueRecurring(nowIso: string): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE deleted_at IS NULL
         AND status IN ('UPCOMING', 'SNOOZED')
         AND recurrence_rule_id IS NOT NULL
         AND scheduled_at < ?
       ORDER BY scheduled_at ASC`,
      nowIso
    );
    return rows.map(rowToReminder);
  },

  // ─── Checklist ─────────────────────────────────────────────────────────────

  async createChecklistItem(item: Omit<ReminderChecklistItem, 'isCompleted'>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO reminder_checklist_items (id, reminder_id, title, is_completed, position)
       VALUES (?, ?, ?, 0, ?)`,
      item.id, item.reminderId, item.title, item.position
    );
  },

  async updateChecklistItem(id: string, isCompleted: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminder_checklist_items SET is_completed = ? WHERE id = ?`,
      isCompleted ? 1 : 0, id
    );
  },

  async deleteChecklistItem(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM reminder_checklist_items WHERE id = ?`, id
    );
  },

  async findChecklistItems(reminderId: string): Promise<ReminderChecklistItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminder_checklist_items WHERE reminder_id = ? ORDER BY position ASC`,
      reminderId
    );
    return rows.map(rowToChecklistItem);
  },

  // ─── Règle de récurrence ───────────────────────────────────────────────────

  async createRecurrenceRule(rule: RecurrenceRule): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO recurrence_rules (id, type, interval_val, days_of_week, day_of_month, week_position, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      rule.id,
      rule.type,
      rule.interval,
      rule.daysOfWeek ? JSON.stringify(rule.daysOfWeek) : null,
      rule.dayOfMonth ?? null,
      rule.weekPosition ?? null,
      rule.endDate ?? null
    );
  },

  async findRecurrenceRule(id: string): Promise<RecurrenceRule | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM recurrence_rules WHERE id = ?`, id
    );
    if (!row) return null;
    return {
      id: row.id as string,
      type: row.type as RecurrenceRule['type'],
      interval: row.interval_val as number,
      daysOfWeek: (() => {
        if (!row.days_of_week || typeof row.days_of_week !== 'string') return undefined;
        try {
          return JSON.parse(row.days_of_week);
        } catch {
          return undefined;
        }
      })(),
      dayOfMonth: (row.day_of_month as number | null) ?? undefined,
      weekPosition: (row.week_position as RecurrenceRule['weekPosition'] | null) ?? undefined,
      endDate: (row.end_date as string | null) ?? undefined,
    };
  },
};

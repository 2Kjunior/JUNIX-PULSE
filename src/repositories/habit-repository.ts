/**
 * Repository pour la gestion des habitudes, des complétions et des pauses.
 */

import { getDatabase } from '../database/sqlite';
import { Habit, HabitCompletion, HabitPause } from '../domain/entities';

function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    frequency: row.frequency as Habit['frequency'],
    targetDaysPerWeek: (row.target_days_per_week as number | null) ?? undefined,
    status: row.status as Habit['status'],
    color: (row.color as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function rowToCompletion(row: Record<string, unknown>): HabitCompletion {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    completedDate: row.completed_date as string,
    createdAt: row.created_at as string,
  };
}

function rowToPause(row: Record<string, unknown>): HabitPause {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    startDate: row.start_date as string,
    endDate: (row.end_date as string | null) ?? undefined,
    reason: (row.reason as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export const HabitRepository = {
  async create(habit: Habit): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO habits (id, title, description, frequency, target_days_per_week, status, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      habit.id,
      habit.title,
      habit.description ?? null,
      habit.frequency,
      habit.targetDaysPerWeek ?? null,
      habit.status,
      habit.color ?? null,
      habit.createdAt,
      habit.updatedAt
    );
  },

  async update(params: Partial<Habit> & { id: string; updatedAt: string }): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (params.title !== undefined) { fields.push('title = ?'); values.push(params.title); }
    if (params.description !== undefined) { fields.push('description = ?'); values.push(params.description ?? null); }
    if (params.frequency !== undefined) { fields.push('frequency = ?'); values.push(params.frequency); }
    if (params.targetDaysPerWeek !== undefined) { fields.push('target_days_per_week = ?'); values.push(params.targetDaysPerWeek ?? null); }
    if (params.status !== undefined) { fields.push('status = ?'); values.push(params.status); }
    if (params.color !== undefined) { fields.push('color = ?'); values.push(params.color ?? null); }

    fields.push('updated_at = ?');
    values.push(params.updatedAt);
    values.push(params.id);

    await db.runAsync(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`, ...values);
  },

  async delete(id: string, deletedAt: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?', deletedAt, deletedAt, id);
  },

  async undoDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE habits SET deleted_at = NULL, updated_at = ? WHERE id = ?', now, id);
  },

  async findById(id: string): Promise<Habit | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM habits WHERE id = ? AND deleted_at IS NULL',
      id
    );
    return row ? rowToHabit(row) : null;
  },

  async findAllActive(): Promise<Habit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM habits WHERE deleted_at IS NULL AND status != 'ARCHIVED' ORDER BY created_at DESC`
    );
    return rows.map(rowToHabit);
  },

  async findAll(): Promise<Habit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM habits WHERE deleted_at IS NULL ORDER BY status ASC, created_at DESC`
    );
    return rows.map(rowToHabit);
  },

  // ── Complétions ─────────────────────────────────────────────────────────────

  async getCompletions(habitId: string): Promise<HabitCompletion[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM habit_completions WHERE habit_id = ? ORDER BY completed_date ASC',
      habitId
    );
    return rows.map(rowToCompletion);
  },

  async addCompletion(completion: HabitCompletion): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO habit_completions (id, habit_id, completed_date, created_at)
       VALUES (?, ?, ?, ?)`,
      completion.id,
      completion.habitId,
      completion.completedDate,
      completion.createdAt
    );
  },

  async removeCompletion(habitId: string, completedDate: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM habit_completions WHERE habit_id = ? AND completed_date = ?',
      habitId,
      completedDate
    );
  },

  async isCompletedOn(habitId: string, completedDate: string): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?',
      habitId,
      completedDate
    );
    return !!row;
  },

  // ── Pauses ──────────────────────────────────────────────────────────────────

  async getPauses(habitId: string): Promise<HabitPause[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM habit_pauses WHERE habit_id = ? ORDER BY start_date ASC',
      habitId
    );
    return rows.map(rowToPause);
  },

  async addPause(pause: HabitPause): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO habit_pauses (id, habit_id, start_date, end_date, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      pause.id,
      pause.habitId,
      pause.startDate,
      pause.endDate ?? null,
      pause.reason ?? null,
      pause.createdAt
    );
  },

  async endPause(pauseId: string, endDate: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE habit_pauses SET end_date = ? WHERE id = ?', endDate, pauseId);
  },

  async deletePause(pauseId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM habit_pauses WHERE id = ?', pauseId);
  },
};

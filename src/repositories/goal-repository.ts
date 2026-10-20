/**
 * Repository pour la gestion des objectifs et de leurs associations aux tâches.
 */

import { getDatabase } from '../database/sqlite';
import { Goal, Task } from '../domain/entities';

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    status: row.status as Goal['status'],
    deadline: (row.deadline as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    status: row.status as Task['status'],
    scheduledDate: (row.scheduled_date as string | null) ?? undefined,
    estimatedMinutes: (row.estimated_minutes as number | null) ?? undefined,
    priority: row.priority as Task['priority'],
    goalId: (row.goal_id as string | null) ?? undefined,
    personId: (row.person_id as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? undefined,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

export const GoalRepository = {
  create: async (goal: Goal): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO goals (id, title, description, status, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      goal.id,
      goal.title,
      goal.description ?? null,
      goal.status,
      goal.deadline ?? null,
      goal.createdAt,
      goal.updatedAt
    );
  },

  update: async (params: Partial<Goal> & { id: string; updatedAt: string }): Promise<void> => {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (params.title !== undefined) { fields.push('title = ?'); values.push(params.title); }
    if (params.description !== undefined) { fields.push('description = ?'); values.push(params.description ?? null); }
    if (params.status !== undefined) { fields.push('status = ?'); values.push(params.status); }
    if (params.deadline !== undefined) { fields.push('deadline = ?'); values.push(params.deadline ?? null); }

    fields.push('updated_at = ?');
    values.push(params.updatedAt);
    values.push(params.id);

    await db.runAsync(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`, ...values);
  },

  async delete(id: string, deletedAt: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE goals SET deleted_at = ?, updated_at = ? WHERE id = ?', deletedAt, deletedAt, id);
  },

  async undoDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE goals SET deleted_at = NULL, updated_at = ? WHERE id = ?', now, id);
  },

  async findById(id: string): Promise<Goal | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM goals WHERE id = ? AND deleted_at IS NULL',
      id
    );
    return row ? rowToGoal(row) : null;
  },

  async findAll(): Promise<Goal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM goals WHERE deleted_at IS NULL ORDER BY status ASC, created_at DESC'
    );
    return rows.map(rowToGoal);
  },

  // ── Association Tâches ↔ Objectifs ──────────────────────────────────────────

  async linkTask(goalId: string, taskId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO goal_tasks (goal_id, task_id, added_at) VALUES (?, ?, ?)`,
      goalId,
      taskId,
      new Date().toISOString()
    );
  },

  async unlinkTask(goalId: string, taskId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM goal_tasks WHERE goal_id = ? AND task_id = ?',
      goalId,
      taskId
    );
  },

  async getAssociatedTasks(goalId: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT t.* FROM tasks t
       INNER JOIN goal_tasks gt ON gt.task_id = t.id
       WHERE gt.goal_id = ? AND t.deleted_at IS NULL
       ORDER BY t.created_at DESC`,
      goalId
    );
    return rows.map(rowToTask);
  },
};

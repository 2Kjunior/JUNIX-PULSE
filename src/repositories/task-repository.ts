/**
 * Repository pour les tâches et sous-tâches.
 */

import { getDatabase } from '../database/sqlite';
import { Task, Subtask } from '../domain/entities';

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
    tags: row.tags ? JSON.parse(row.tags as string) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? undefined,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    title: row.title as string,
    isCompleted: (row.is_completed as number) === 1,
    position: row.position as number,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? undefined,
  };
}

export const TaskRepository = {
  async create(task: Omit<Task, 'deletedAt'>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO tasks (id, title, description, status, scheduled_date, estimated_minutes,
        priority, goal_id, person_id, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id, task.title, task.description ?? null, task.status,
      task.scheduledDate ?? null, task.estimatedMinutes ?? null, task.priority,
      task.goalId ?? null, task.personId ?? null,
      task.tags ? JSON.stringify(task.tags) : null,
      task.createdAt, task.updatedAt
    );
  },

  async update(params: Partial<Task> & { id: string; updatedAt: string }): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        scheduled_date = COALESCE(?, scheduled_date),
        estimated_minutes = COALESCE(?, estimated_minutes),
        priority = COALESCE(?, priority),
        goal_id = COALESCE(?, goal_id),
        person_id = COALESCE(?, person_id),
        completed_at = COALESCE(?, completed_at),
        updated_at = ?
       WHERE id = ?`,
      params.title ?? null, params.description ?? null, params.status ?? null,
      params.scheduledDate ?? null, params.estimatedMinutes ?? null, params.priority ?? null,
      params.goalId ?? null, params.personId ?? null, params.completedAt ?? null,
      params.updatedAt, params.id
    );
  },

  async softDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      now, now, id
    );
  },

  async undoDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
      now, id
    );
  },

  async findById(id: string): Promise<Task | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL', id
    );
    return row ? rowToTask(row) : null;
  },

  /** Inbox : tâches sans date, non supprimées */
  async findInbox(): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM tasks
       WHERE deleted_at IS NULL AND status = 'INBOX'
       ORDER BY created_at DESC`
    );
    return rows.map(rowToTask);
  },

  /** Tâches planifiées pour une date donnée (YYYY-MM-DD) */
  async findForDate(date: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM tasks
       WHERE deleted_at IS NULL AND scheduled_date = ? AND status != 'COMPLETED'
       ORDER BY priority DESC, created_at ASC`,
      date
    );
    return rows.map(rowToTask);
  },

  /** Tâches non terminées dont la date planifiée est dans le passé (pour end-of-day) */
  async findOverdue(beforeDate: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM tasks
       WHERE deleted_at IS NULL
         AND scheduled_date < ?
         AND status NOT IN ('COMPLETED', 'POSTPONED')
       ORDER BY scheduled_date ASC`,
      beforeDate
    );
    return rows.map(rowToTask);
  },

  async findAll(): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
    return rows.map(rowToTask);
  },

  async findAllActive(): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE deleted_at IS NULL AND status != 'COMPLETED' ORDER BY created_at DESC`
    );
    return rows.map(rowToTask);
  },

  // ─── Sous-tâches ───────────────────────────────────────────────────────────

  async createSubtask(subtask: Subtask): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO subtasks (id, task_id, title, is_completed, position, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
      subtask.id, subtask.taskId, subtask.title, subtask.position, subtask.createdAt
    );
  },

  async updateSubtask(id: string, isCompleted: boolean, completedAt?: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE subtasks SET is_completed = ?, completed_at = ? WHERE id = ?`,
      isCompleted ? 1 : 0, completedAt ?? null, id
    );
  },

  async deleteSubtask(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM subtasks WHERE id = ?`, id);
  },

  async findSubtasks(taskId: string): Promise<Subtask[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC`, taskId
    );
    return rows.map(rowToSubtask);
  },
};

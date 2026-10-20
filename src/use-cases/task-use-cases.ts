/**
 * Use cases (actions métier) pour les tâches et sous-tâches.
 * Orchestre la persistance SQLite (TaskRepository) et les règles de gestion des tâches.
 */

import { randomUUID } from 'expo-crypto';
import { TaskRepository } from '../repositories/task-repository';
import { Subtask, TaskStatus, ReminderPriority } from '../domain/entities';
import { resolveTaskReopenStatus } from '../domain/rules/task-rules';

// ─── Interfaces d'entrée ──────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  scheduledDate?: string;      // YYYY-MM-DD
  estimatedMinutes?: number;   // 15, 30, 60...
  priority?: ReminderPriority;
  goalId?: string;
  personId?: string;
  tags?: string[];
  subtasks?: string[];         // Titres des sous-tâches initiales
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  scheduledDate?: string;
  estimatedMinutes?: number;
  priority?: ReminderPriority;
  goalId?: string;
  personId?: string;
  tags?: string[];
}

// ─── Actions Métier Tâches ───────────────────────────────────────────────────

export const TaskUseCases = {
  /**
   * Crée une nouvelle tâche avec ses sous-tâches optionnelles.
   */
  async createTask(input: CreateTaskInput): Promise<string> {
    const taskId = randomUUID();
    const now = new Date().toISOString();

    // Si une date est planifiée, le statut par défaut devient SCHEDULED au lieu d'INBOX
    const initialStatus: TaskStatus =
      input.status ?? resolveTaskReopenStatus(input.scheduledDate);

    await TaskRepository.create({
      id: taskId,
      title: input.title.trim(),
      description: input.description?.trim(),
      status: initialStatus,
      scheduledDate: input.scheduledDate,
      estimatedMinutes: input.estimatedMinutes,
      priority: input.priority ?? 'NORMAL',
      goalId: input.goalId,
      personId: input.personId,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    });

    // Création des sous-tâches initiales
    if (input.subtasks && input.subtasks.length > 0) {
      for (let i = 0; i < input.subtasks.length; i++) {
        const title = input.subtasks[i].trim();
        if (title) {
          await TaskRepository.createSubtask({
            id: randomUUID(),
            taskId,
            title,
            isCompleted: false,
            position: i,
            createdAt: now,
          });
        }
      }
    }

    return taskId;
  },

  /**
   * Met à jour les champs d'une tâche existante.
   */
  async updateTask(input: UpdateTaskInput): Promise<void> {
    const now = new Date().toISOString();
    await TaskRepository.update({
      ...input,
      updatedAt: now,
    });
  },

  /**
   * Bascule l'état de complétion d'une tâche (COMPLETED <-> INBOX/SCHEDULED).
   * Retourne le nouveau statut.
   */
  async toggleComplete(id: string): Promise<TaskStatus> {
    const task = await TaskRepository.findById(id);
    if (!task) throw new Error('Tâche introuvable');

    const now = new Date().toISOString();
    const isNowCompleted = task.status !== 'COMPLETED';

    let newStatus: TaskStatus;
    if (isNowCompleted) {
      newStatus = 'COMPLETED';
    } else {
      newStatus = resolveTaskReopenStatus(task.scheduledDate);
    }

    await TaskRepository.update({
      id,
      status: newStatus,
      completedAt: isNowCompleted ? now : undefined,
      updatedAt: now,
    });

    return newStatus;
  },

  /**
   * Marque une tâche comme supprimée (soft delete) avec fonction d'annulation réversible.
   */
  async deleteTask(id: string): Promise<{ undo: () => Promise<void> }> {
    const now = new Date().toISOString();
    await TaskRepository.softDelete(id, now);
    return {
      undo: async () => {
        const undoNow = new Date().toISOString();
        await TaskRepository.undoDelete(id, undoNow);
      },
    };
  },

  /**
   * Restaure une tâche précédemment supprimée (Undo).
   */
  async undoDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await TaskRepository.undoDelete(id, now);
  },

  // ─── Actions Sous-tâches ────────────────────────────────────────────────────

  /**
   * Ajoute une sous-tâche à une tâche.
   */
  async addSubtask(taskId: string, title: string): Promise<Subtask> {
    const now = new Date().toISOString();
    const existing = await TaskRepository.findSubtasks(taskId);
    const subtask: Subtask = {
      id: randomUUID(),
      taskId,
      title: title.trim(),
      isCompleted: false,
      position: existing.length,
      createdAt: now,
    };

    await TaskRepository.createSubtask(subtask);
    return subtask;
  },

  /**
   * Coche ou décoche une sous-tâche.
   */
  async toggleSubtask(id: string, isCompleted: boolean): Promise<void> {
    const completedAt = isCompleted ? new Date().toISOString() : undefined;
    await TaskRepository.updateSubtask(id, isCompleted, completedAt);
  },

  /**
   * Supprime une sous-tâche.
   */
  async deleteSubtask(id: string): Promise<void> {
    await TaskRepository.deleteSubtask(id);
  },
};

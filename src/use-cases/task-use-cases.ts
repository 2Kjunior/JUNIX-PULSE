/**
 * Use cases (actions métier) pour les tâches et sous-tâches.
 * Orchestre la persistance SQLite (TaskRepository) et les règles de gestion des tâches.
 */

import { randomUUID } from 'expo-crypto';
import { format } from 'date-fns';
import { TagRepository } from '../repositories/tag-repository';
import { TaskRepository } from '../repositories/task-repository';
import { Subtask, Task, TaskStatus, ReminderPriority } from '../domain/entities';
import { resolveTaskReopenStatus } from '../domain/rules/task-rules';
import { t } from '../i18n';
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';

// ─── Interfaces d'entrée ──────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  scheduledDate?: string;      // YYYY-MM-DD
  dueDate?: string;            // YYYY-MM-DD, à rendre au plus tard ce jour-là
  estimatedMinutes?: number;   // 15, 30, 60...
  priority?: ReminderPriority;
  goalId?: string;
  personId?: string;
  /** All the people of the task, the main one first. */
  personIds?: string[];
  /** Its coloured tags. */
  tagIds?: string[];
  tags?: string[];
  subtasks?: string[];         // Titres des sous-tâches initiales
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  scheduledDate?: string;
  /** null takes the deadline off the task. */
  dueDate?: string | null;
  estimatedMinutes?: number;
  priority?: ReminderPriority;
  goalId?: string;
  /** null takes the person off the task. */
  personId?: string | null;
  /** All its people, the main one first: replaces the ones it had. */
  personIds?: string[];
  /** Its coloured tags: replaces the ones it had. */
  tagIds?: string[];
  tags?: string[];
}

/**
 * Tells the mascot a task has just been completed: the cleared day when it was the last of
 * today's tasks, otherwise the task itself with its priority and subtasks.
 * The mascot is decoration, so any failure here is ignored.
 */
async function announceTaskCompleted(task: Task): Promise<void> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (task.scheduledDate === today) {
      // findForDate leaves out the completed tasks, so it could never show a cleared day
      const todayTasks = await TaskRepository.findAllForDate(today);
      if (todayTasks.length > 0 && todayTasks.every(item => item.status === 'COMPLETED')) {
        emitMascotEvent({ type: 'DAY_CLEARED' });
        return;
      }
    }
    const subtasks = await TaskRepository.findSubtasks(task.id);
    emitMascotEvent({ type: 'TASK_COMPLETED', priority: task.priority, subtaskCount: subtasks.length });
  } catch {
    // Ignored on purpose
  }
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
      dueDate: input.dueDate,
      estimatedMinutes: input.estimatedMinutes,
      priority: input.priority ?? 'NORMAL',
      goalId: input.goalId,
      personId: input.personIds?.[0] ?? input.personId,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    });

    // Every person of the task, the main one first
    const people = input.personIds ?? (input.personId ? [input.personId] : []);
    if (people.length > 0) await TaskRepository.setPersons(taskId, people);
    if (input.tagIds?.length) await TagRepository.setFor('task', taskId, input.tagIds);

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

    emitMascotEvent({ type: 'ITEM_CREATED' });
    return taskId;
  },

  /**
   * Met à jour les champs d'une tâche existante.
   */
  async updateTask(input: UpdateTaskInput): Promise<void> {
    const now = new Date().toISOString();
    const { personIds, tagIds, ...columns } = input;
    await TaskRepository.update({
      ...columns,
      updatedAt: now,
    });
    if (personIds !== undefined) await TaskRepository.setPersons(input.id, personIds);
    if (tagIds !== undefined) await TagRepository.setFor('task', input.id, tagIds);
  },

  /**
   * Bascule l'état de complétion d'une tâche (COMPLETED <-> INBOX/SCHEDULED).
   * Retourne le nouveau statut.
   */
  async toggleComplete(id: string): Promise<TaskStatus> {
    const task = await TaskRepository.findById(id);
    if (!task) throw new Error(t('taskDetail.notFound'));

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

    if (isNowCompleted) await announceTaskCompleted(task);
    return newStatus;
  },

  /**
   * Replanifie des tâches à une autre date (YYYY-MM-DD), par exemple demain.
   */
  async rescheduleTasks(ids: readonly string[], date: string): Promise<void> {
    const now = new Date().toISOString();
    for (const id of ids) {
      await TaskRepository.update({ id, scheduledDate: date, status: 'SCHEDULED', updatedAt: now });
    }
  },

  /**
   * Marque une tâche comme supprimée (soft delete) avec fonction d'annulation réversible.
   */
  async deleteTask(id: string): Promise<{ undo: () => Promise<void> }> {
    const now = new Date().toISOString();
    await TaskRepository.softDelete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
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
    if (isCompleted) emitMascotEvent({ type: 'SUBTASK_COMPLETED' });
  },

  /**
   * Supprime une sous-tâche.
   */
  async deleteSubtask(id: string): Promise<void> {
    await TaskRepository.deleteSubtask(id);
  },
};

/**
 * Règles métier pures pour les tâches et sous-tâches.
 * BR-005 : Une tâche sans date planifiée est une tâche Inbox.
 * Fonctions déterministes et testables indépendamment de l'UI et de SQLite.
 */

import { format } from 'date-fns';
import { Task, Subtask, TaskStatus } from '../entities';

/**
 * Détermine le statut cible lors de la réouverture d'une tâche terminée.
 * Si une date d'échéance est présente, la tâche redevient 'SCHEDULED'.
 * Sinon, elle retourne dans l'Inbox ('INBOX').
 */
export function resolveTaskReopenStatus(scheduledDate?: string | null): TaskStatus {
  if (scheduledDate && scheduledDate.trim().length > 0) {
    return 'SCHEDULED';
  }
  return 'INBOX';
}

/**
 * Détermine si une tâche est en retard par rapport à une date de référence (par défaut aujourd'hui).
 * Une tâche Inbox (sans date) n'est jamais en retard.
 * Une tâche terminée n'est jamais en retard.
 */
export function isTaskOverdue(
  task: Pick<Task, 'status' | 'scheduledDate'>,
  now: Date = new Date()
): boolean {
  if (task.status === 'COMPLETED') return false;
  if (!task.scheduledDate || task.scheduledDate.trim().length === 0) return false;

  const todayStr = format(now, 'yyyy-MM-dd');
  return task.scheduledDate < todayStr;
}

/**
 * Vérifie si une tâche est planifiée pour un jour donné (comparaison YYYY-MM-DD).
 */
export function isTaskScheduledForDate(
  task: Pick<Task, 'scheduledDate'>,
  targetDate: string | Date
): boolean {
  if (!task.scheduledDate) return false;
  const targetStr = typeof targetDate === 'string'
    ? targetDate.slice(0, 10)
    : format(targetDate, 'yyyy-MM-dd');

  return task.scheduledDate === targetStr;
}

/**
 * Vérifie si toutes les sous-tâches sont complétées.
 * Si la liste est vide, retourne true.
 */
export function areAllSubtasksCompleted(subtasks: Subtask[]): boolean {
  if (subtasks.length === 0) return true;
  return subtasks.every(s => s.isCompleted);
}

export interface TaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * Calcule la progression d'une tâche et de ses sous-tâches.
 * Règle métier :
 * - S'il y a des sous-tâches, le pourcentage correspond au ratio de sous-tâches complétées.
 * - S'il n'y a aucune sous-tâche (total = 0) :
 *   - Si la tâche est COMPLETED -> 100%
 *   - Sinon -> 0%
 */
export function calculateTaskProgress(
  task: Pick<Task, 'status'>,
  subtasks: Subtask[] = []
): TaskProgress {
  const total = subtasks.length;
  const completed = subtasks.filter(s => s.isCompleted).length;

  if (total === 0) {
    return {
      completed: 0,
      total: 0,
      percentage: task.status === 'COMPLETED' ? 100 : 0,
    };
  }

  const percentage = Math.round((completed / total) * 100);
  return {
    completed,
    total,
    percentage,
  };
}

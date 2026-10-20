/**
 * Règles métier pures pour les objectifs.
 * BR-012 : un objectif calcule sa progression à partir des tâches associées.
 */

import { Task, Goal } from '../entities';

/**
 * Calcule le pourcentage de progression d'un objectif (0–100).
 * Si aucune tâche n'est associée, retourne null (état "aucune tâche associée").
 * Ne jamais afficher 0% comme si l'objectif était en échec sans tâches.
 */
export function calculateGoalProgress(
  associatedTasks: Task[]
): number | null {
  if (associatedTasks.length === 0) return null;

  const completedCount = associatedTasks.filter(
    t => t.status === 'COMPLETED'
  ).length;

  return Math.round((completedCount / associatedTasks.length) * 100);
}

/**
 * Détermine si un objectif est échu (deadline dépassée, pas terminé).
 */
export function isGoalOverdue(goal: Goal, now: Date = new Date()): boolean {
  if (!goal.deadline || goal.status === 'COMPLETED') return false;
  return new Date(goal.deadline) < now;
}

/**
 * Détermine les jours restants avant la deadline.
 * Retourne null si pas de deadline.
 */
export function daysUntilDeadline(goal: Goal, now: Date = new Date()): number | null {
  if (!goal.deadline) return null;
  const deadline = new Date(goal.deadline);
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

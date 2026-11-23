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
/** The times a habit asks for in a week: 7 every day, or the number chosen (sheet 018). */
export function weeklyTarget(habit: { frequency: string; targetDaysPerWeek?: number }): number {
  return habit.frequency === 'DAILY' ? 7 : Math.max(1, habit.targetDaysPerWeek ?? 1);
}

/** The times a habit was done this week, Monday included. */
export function doneThisWeek(completions: readonly { completedDate: string }[], now: Date = new Date()): number {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const from = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return new Set(completions.map(c => c.completedDate).filter(day => day >= from && day <= today)).size;
}

/**
 * The progress of a goal with its tasks and its habits (sheet 018): each task done counts 1, each
 * habit counts the share of its week it reached (at most 1). Null when nothing is linked.
 */
export function calculateGoalProgressWithHabits(associatedTasks: readonly Task[], habitShares: readonly number[]): number | null {
  const parts = associatedTasks.length + habitShares.length;
  if (parts === 0) return null;
  const done =
    associatedTasks.filter(task => task.status === 'COMPLETED').length +
    habitShares.reduce((sum, share) => sum + Math.min(1, Math.max(0, share)), 0);
  return Math.round((done / parts) * 100);
}

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

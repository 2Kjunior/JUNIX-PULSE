/**
 * Use cases pour la gestion des objectifs.
 * Orchestre les règles de progression (goal-rules.ts) et la persistance (goal-repository.ts).
 */

import { GoalRepository } from '../repositories/goal-repository';
import { Goal, Task, GoalStatus } from '../domain/entities';
import {
  calculateGoalProgress,
  isGoalOverdue,
  daysUntilDeadline,
} from '../domain/rules/goal-rules';

export interface GoalDetails {
  goal: Goal;
  associatedTasks: Task[];
  progress: number | null;
  isOverdue: boolean;
  daysLeft: number | null;
}

export interface CreateGoalParams {
  title: string;
  description?: string;
  deadline?: string;
}

export interface UpdateGoalParams {
  id: string;
  title?: string;
  description?: string;
  status?: GoalStatus;
  deadline?: string;
}

export const GoalUseCases = {
  async createGoal(params: CreateGoalParams): Promise<Goal> {
    const now = new Date().toISOString();
    const goal: Goal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: params.title.trim(),
      description: params.description?.trim() || undefined,
      status: 'ACTIVE',
      deadline: params.deadline || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await GoalRepository.create(goal);
    return goal;
  },

  async updateGoal(params: UpdateGoalParams): Promise<Goal | null> {
    const now = new Date().toISOString();
    await GoalRepository.update({
      ...params,
      updatedAt: now,
    });
    return GoalRepository.findById(params.id);
  },

  async deleteGoal(id: string): Promise<{ undo: () => Promise<void> }> {
    const now = new Date().toISOString();
    await GoalRepository.delete(id, now);
    return {
      undo: async () => {
        const undoNow = new Date().toISOString();
        await GoalRepository.undoDelete(id, undoNow);
      },
    };
  },

  async linkTask(goalId: string, taskId: string): Promise<void> {
    await GoalRepository.linkTask(goalId, taskId);
    await GoalUseCases.refreshGoalStatus(goalId);
  },

  async unlinkTask(goalId: string, taskId: string): Promise<void> {
    await GoalRepository.unlinkTask(goalId, taskId);
    await GoalUseCases.refreshGoalStatus(goalId);
  },

  async refreshGoalStatus(goalId: string): Promise<void> {
    const details = await GoalUseCases.getGoalWithDetails(goalId);
    if (!details) return;

    // Si toutes les tâches sont complétées (>0 tâches), passer en COMPLETED
    if (
      details.associatedTasks.length > 0 &&
      details.progress === 100 &&
      details.goal.status === 'ACTIVE'
    ) {
      await GoalRepository.update({
        id: goalId,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString(),
      });
    }
  },

  async getGoalWithDetails(goalId: string): Promise<GoalDetails | null> {
    const goal = await GoalRepository.findById(goalId);
    if (!goal) return null;

    const associatedTasks = await GoalRepository.getAssociatedTasks(goalId);
    const progress = calculateGoalProgress(associatedTasks);
    const overdue = isGoalOverdue(goal);
    const daysLeft = daysUntilDeadline(goal);

    return {
      goal,
      associatedTasks,
      progress,
      isOverdue: overdue,
      daysLeft,
    };
  },

  async getAllGoalsWithDetails(): Promise<GoalDetails[]> {
    const goals = await GoalRepository.findAll();
    const detailsList: GoalDetails[] = [];

    for (const goal of goals) {
      const associatedTasks = await GoalRepository.getAssociatedTasks(goal.id);
      const progress = calculateGoalProgress(associatedTasks);
      const overdue = isGoalOverdue(goal);
      const daysLeft = daysUntilDeadline(goal);

      detailsList.push({
        goal,
        associatedTasks,
        progress,
        isOverdue: overdue,
        daysLeft,
      });
    }

    return detailsList;
  },
};

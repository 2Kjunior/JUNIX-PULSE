/**
 * Use cases pour la gestion des objectifs.
 * Orchestre les règles de progression (goal-rules.ts) et la persistance (goal-repository.ts).
 */

import { GoalRepository } from '../repositories/goal-repository';
import { HabitRepository } from '../repositories/habit-repository';
import { Goal, Habit, Task, GoalStatus } from '../domain/entities';
import {
  calculateGoalProgress,
  calculateGoalProgressWithHabits,
  doneThisWeek,
  weeklyTarget,
  isGoalOverdue,
  daysUntilDeadline,
} from '../domain/rules/goal-rules';
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';

export interface GoalHabitLink {
  habit: Habit;
  doneThisWeek: number;
  target: number;
  /** From 0 to 1: how much of its week the habit reached. */
  share: number;
}

/** The habits of a goal, with how this week went for each. */
async function habitLinksOf(goalId: string, now: Date = new Date()): Promise<GoalHabitLink[]> {
  const links: GoalHabitLink[] = [];
  for (const habitId of await GoalRepository.getAssociatedHabitIds(goalId)) {
    const habit = await HabitRepository.findById(habitId);
    if (!habit || habit.deletedAt) continue;
    const done = doneThisWeek(await HabitRepository.getCompletions(habit.id), now);
    const target = weeklyTarget(habit);
    links.push({ habit, doneThisWeek: done, target, share: Math.min(1, done / target) });
  }
  return links;
}

export interface GoalDetails {
  goal: Goal;
  associatedTasks: Task[];
  /** The habits linked to it (sheet 018), with this week's share. */
  associatedHabits: GoalHabitLink[];
  /** Tasks and habits together: what the bar shows. */
  progress: number | null;
  /** The tasks alone: only they complete the goal by themselves. */
  taskProgress: number | null;
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
    emitMascotEvent({ type: 'ITEM_CREATED' });
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
    emitMascotEvent({ type: 'ITEM_DELETED' });
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

  async linkHabit(goalId: string, habitId: string): Promise<void> {
    await GoalRepository.linkHabit(goalId, habitId);
  },

  async unlinkHabit(goalId: string, habitId: string): Promise<void> {
    await GoalRepository.unlinkHabit(goalId, habitId);
  },

  async refreshGoalStatus(goalId: string): Promise<void> {
    const details = await GoalUseCases.getGoalWithDetails(goalId);
    if (!details) return;

    // Si toutes les tâches sont complétées (>0 tâches), passer en COMPLETED
    if (
      details.associatedTasks.length > 0 &&
      details.taskProgress === 100 &&
      details.goal.status === 'ACTIVE'
    ) {
      await GoalRepository.update({
        id: goalId,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString(),
      });
      emitMascotEvent({ type: 'GOAL_COMPLETED' });
      return;
    }

    // A task reopened: the goal is not reached any more (its status only ever changes here)
    if (details.goal.status === 'COMPLETED' && details.taskProgress !== null && details.taskProgress < 100) {
      await GoalRepository.update({ id: goalId, status: 'ACTIVE', updatedAt: new Date().toISOString() });
    }
  },

  /** A task was done, reopened or removed: each goal it belongs to follows. */
  async refreshGoalsOfTask(taskId: string): Promise<void> {
    for (const goalId of await GoalRepository.findGoalIdsForTask(taskId)) {
      await GoalUseCases.refreshGoalStatus(goalId);
    }
  },

  async getGoalWithDetails(goalId: string): Promise<GoalDetails | null> {
    const goal = await GoalRepository.findById(goalId);
    if (!goal) return null;

    const associatedTasks = await GoalRepository.getAssociatedTasks(goalId);
    const associatedHabits = await habitLinksOf(goalId);
    const progress = calculateGoalProgressWithHabits(associatedTasks, associatedHabits.map(link => link.share));
    const overdue = isGoalOverdue(goal);
    const daysLeft = daysUntilDeadline(goal);

    return {
      goal,
      associatedTasks,
      associatedHabits,
      progress,
      taskProgress: calculateGoalProgress(associatedTasks),
      isOverdue: overdue,
      daysLeft,
    };
  },

  async getAllGoalsWithDetails(): Promise<GoalDetails[]> {
    const goals = await GoalRepository.findAll();
    const detailsList: GoalDetails[] = [];

    for (const goal of goals) {
      const associatedTasks = await GoalRepository.getAssociatedTasks(goal.id);
      const associatedHabits = await habitLinksOf(goal.id);
      const progress = calculateGoalProgressWithHabits(associatedTasks, associatedHabits.map(link => link.share));
      const overdue = isGoalOverdue(goal);
      const daysLeft = daysUntilDeadline(goal);

      detailsList.push({
        goal,
        associatedTasks,
        associatedHabits,
        progress,
        taskProgress: calculateGoalProgress(associatedTasks),
        isOverdue: overdue,
        daysLeft,
      });
    }

    return detailsList;
  },
};

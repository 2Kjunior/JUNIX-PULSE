/**
 * Use cases pour la gestion des habitudes.
 * Orchestre les règles métier (habit-rules.ts) et la persistance (habit-repository.ts).
 */

import { format } from 'date-fns';
import { HabitRepository } from '../repositories/habit-repository';
import { Habit, HabitCompletion, HabitPause, HabitFrequency, HabitStatus } from '../domain/entities';
import {
  calculateCurrentStreak,
  calculateBestStreak,
  isCompletedToday,
} from '../domain/rules/habit-rules';

export interface HabitStats {
  habit: Habit;
  completions: HabitCompletion[];
  pauses: HabitPause[];
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
}

export interface CreateHabitParams {
  title: string;
  description?: string;
  frequency: HabitFrequency;
  targetDaysPerWeek?: number;
  color?: string;
}

export interface UpdateHabitParams {
  id: string;
  title?: string;
  description?: string;
  frequency?: HabitFrequency;
  targetDaysPerWeek?: number;
  status?: HabitStatus;
  color?: string;
}

export const HabitUseCases = {
  async createHabit(params: CreateHabitParams): Promise<Habit> {
    const now = new Date().toISOString();
    const habit: Habit = {
      id: `habit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: params.title.trim(),
      description: params.description?.trim() || undefined,
      frequency: params.frequency,
      targetDaysPerWeek: params.targetDaysPerWeek,
      status: 'ACTIVE',
      color: params.color,
      createdAt: now,
      updatedAt: now,
    };

    await HabitRepository.create(habit);
    return habit;
  },

  async updateHabit(params: UpdateHabitParams): Promise<Habit | null> {
    const now = new Date().toISOString();
    await HabitRepository.update({
      ...params,
      updatedAt: now,
    });
    return HabitRepository.findById(params.id);
  },

  async deleteHabit(id: string): Promise<{ undo: () => Promise<void> }> {
    const now = new Date().toISOString();
    await HabitRepository.delete(id, now);
    return {
      undo: async () => {
        const undoNow = new Date().toISOString();
        await HabitRepository.undoDelete(id, undoNow);
      },
    };
  },

  async toggleHabitCompletion(habitId: string, dateStr?: string): Promise<boolean> {
    const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');
    const isCompleted = await HabitRepository.isCompletedOn(habitId, targetDate);

    if (isCompleted) {
      await HabitRepository.removeCompletion(habitId, targetDate);
      return false; // Désormais non complétée
    } else {
      const completion: HabitCompletion = {
        id: `hcomp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        habitId,
        completedDate: targetDate,
        createdAt: new Date().toISOString(),
      };
      await HabitRepository.addCompletion(completion);
      return true; // Désormais complétée
    }
  },

  async pauseHabit(habitId: string, startDate: string, endDate?: string, reason?: string): Promise<HabitPause> {
    const now = new Date().toISOString();
    const pause: HabitPause = {
      id: `hpause_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      habitId,
      startDate,
      endDate,
      reason,
      createdAt: now,
    };

    await HabitRepository.addPause(pause);
    await HabitRepository.update({ id: habitId, status: 'PAUSED', updatedAt: now });
    return pause;
  },

  async resumeHabit(habitId: string): Promise<void> {
    const now = new Date().toISOString();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const pauses = await HabitRepository.getPauses(habitId);
    
    // Fermer les pauses en cours
    const activePause = pauses.find(p => !p.endDate);
    if (activePause) {
      await HabitRepository.endPause(activePause.id, todayStr);
    }

    await HabitRepository.update({ id: habitId, status: 'ACTIVE', updatedAt: now });
  },

  async getHabitWithStats(habitId: string): Promise<HabitStats | null> {
    const habit = await HabitRepository.findById(habitId);
    if (!habit) return null;

    const [completions, pauses] = await Promise.all([
      HabitRepository.getCompletions(habitId),
      HabitRepository.getPauses(habitId),
    ]);

    const currentStreak = calculateCurrentStreak(completions, pauses);
    const bestStreak = calculateBestStreak(completions, pauses, habit.createdAt);
    const completedToday = isCompletedToday(completions);

    return {
      habit,
      completions,
      pauses,
      currentStreak,
      bestStreak,
      completedToday,
    };
  },

  async getAllHabitsWithStats(): Promise<HabitStats[]> {
    const habits = await HabitRepository.findAll();
    const statsList: HabitStats[] = [];

    for (const habit of habits) {
      const [completions, pauses] = await Promise.all([
        HabitRepository.getCompletions(habit.id),
        HabitRepository.getPauses(habit.id),
      ]);

      const currentStreak = calculateCurrentStreak(completions, pauses);
      const bestStreak = calculateBestStreak(completions, pauses, habit.createdAt);
      const completedToday = isCompletedToday(completions);

      statsList.push({
        habit,
        completions,
        pauses,
        currentStreak,
        bestStreak,
        completedToday,
      });
    }

    return statsList;
  },
};

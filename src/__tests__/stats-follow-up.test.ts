/**
 * The figures the user follows must move with what they do: the minutes of Focus kept for the
 * day, a weekly habit that keeps its streak through its days of rest, and a goal reached with
 * its last task (and active again if one is reopened).
 */

import { calculateBestStreak, calculateCurrentStreak, type HabitRhythm } from '@/domain/rules/habit-rules';
import type { HabitCompletion, HabitPause } from '@/domain/entities';
import { GoalRepository } from '@/repositories/goal-repository';
import { addFocusMinutes, getTodayFocusMinutes } from '@/services/focus-stats-service';
import { GoalUseCases } from '@/use-cases/goal-use-cases';
import { emitMascotEvent } from '@/services/mascot/mascot-event-bus';

const mockStore = new Map<string, string>();
jest.mock('@/repositories/mascot-state-repository', () => ({
  MascotStateRepository: {
    get: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
  },
}));
jest.mock('@/repositories/goal-repository', () => ({
  GoalRepository: {
    findById: jest.fn(),
    getAssociatedTasks: jest.fn(),
    update: jest.fn(async () => {}),
    findGoalIdsForTask: jest.fn(async () => ['g1']),
  },
}));
jest.mock('@/services/mascot/mascot-event-bus', () => ({ emitMascotEvent: jest.fn() }));

describe('minutes of Focus', () => {
  beforeEach(() => mockStore.clear());

  it('add up over the day and are kept', async () => {
    const morning = new Date(2026, 10, 8, 9, 0);
    expect(await getTodayFocusMinutes(morning)).toBe(0);
    await addFocusMinutes(25, morning);
    expect(await addFocusMinutes(15, new Date(2026, 10, 8, 14, 0))).toBe(40);
    expect(await getTodayFocusMinutes(new Date(2026, 10, 8, 20, 0))).toBe(40);
  });

  it('start again at zero the next day', async () => {
    await addFocusMinutes(25, new Date(2026, 10, 8, 9, 0));
    expect(await getTodayFocusMinutes(new Date(2026, 10, 9, 8, 0))).toBe(0);
    expect(await addFocusMinutes(10, new Date(2026, 10, 9, 8, 0))).toBe(10);
  });
});

describe('streak of a habit "3 times a week"', () => {
  const rhythm: HabitRhythm = { frequency: 'WEEKLY', targetDaysPerWeek: 3, createdAt: '2026-10-19T08:00:00.000Z' };
  const done = (...dates: string[]): HabitCompletion[] =>
    dates.map(completedDate => ({ id: completedDate, habitId: 'h', completedDate, createdAt: completedDate }));
  // Weeks start on Monday: 19 October, 26 October, 2 November; today is Monday 9 November
  const now = new Date(2026, 10, 9, 18, 0);
  beforeAll(() => jest.useFakeTimers().setSystemTime(now));
  afterAll(() => jest.useRealTimers());

  it('keeps its streak through the days of rest while each week reaches 3', () => {
    const completions = done(
      '2026-10-26', '2026-10-28', '2026-10-30', // week of 26 October: 3
      '2026-11-02', '2026-11-04', '2026-11-06', // week of 2 November: 3
      '2026-11-09' // this week, so far: 1
    );
    expect(calculateCurrentStreak(completions, [], now, rhythm)).toBe(7);
    // As a daily habit the same days would have broken it at once
    expect(calculateCurrentStreak(completions, [], now)).toBe(1);
  });

  it('breaks when a past week missed its target, never for the week in progress', () => {
    const completions = done('2026-10-26', '2026-10-28', '2026-10-30', '2026-11-03', '2026-11-09');
    expect(calculateCurrentStreak(completions, [], now, rhythm)).toBe(1);
    // Nothing yet this Monday: the streak of the weeks before still stands
    expect(calculateCurrentStreak(done('2026-11-02', '2026-11-04', '2026-11-06'), [], now, rhythm)).toBe(3);
  });

  it('never fails a week with a pause', () => {
    const pause: HabitPause = { id: 'p', habitId: 'h', startDate: '2026-11-03', endDate: '2026-11-05', createdAt: '' };
    const completions = done('2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02', '2026-11-09');
    expect(calculateCurrentStreak(completions, [pause], now, rhythm)).toBe(5);
  });

  it('keeps the best streak of weeks reached', () => {
    const completions = done(
      '2026-10-19', '2026-10-20', '2026-10-21', // reached
      '2026-10-26', '2026-10-27', '2026-10-28', // reached
      '2026-11-02', // missed
      '2026-11-09'
    );
    expect(calculateBestStreak(completions, [], rhythm.createdAt, rhythm)).toBe(6);
  });
});

describe('a goal follows its tasks', () => {
  const goal = { id: 'g1', title: 'Permis', status: 'ACTIVE', createdAt: '', updatedAt: '' };

  beforeEach(() => jest.clearAllMocks());

  it('is reached with its last task, and Pulse celebrates', async () => {
    jest.mocked(GoalRepository.findById).mockResolvedValue(goal as never);
    jest.mocked(GoalRepository.getAssociatedTasks).mockResolvedValue([{ status: 'COMPLETED' }, { status: 'COMPLETED' }] as never);
    await GoalUseCases.refreshGoalsOfTask('t1');
    expect(GoalRepository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1', status: 'COMPLETED' }));
    expect(emitMascotEvent).toHaveBeenCalledWith({ type: 'GOAL_COMPLETED' });
  });

  it('is active again when one of its tasks is reopened', async () => {
    jest.mocked(GoalRepository.findById).mockResolvedValue({ ...goal, status: 'COMPLETED' } as never);
    jest.mocked(GoalRepository.getAssociatedTasks).mockResolvedValue([{ status: 'COMPLETED' }, { status: 'SCHEDULED' }] as never);
    await GoalUseCases.refreshGoalsOfTask('t1');
    expect(GoalRepository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1', status: 'ACTIVE' }));
    expect(emitMascotEvent).not.toHaveBeenCalled();
  });
});

import type { Task } from '../../entities';
import { calculateGoalProgress, calculateGoalProgressWithHabits, doneThisWeek, weeklyTarget } from '../goal-rules';

const task = (status: Task['status']) => ({ status }) as Task;
/** Wednesday 25 November 2026. */
const now = new Date(2026, 10, 25, 15, 0);

describe('a goal with its habits', () => {
  it('counts each task done as 1 and each habit as the share of its week', () => {
    // 1 of 2 tasks, and a habit 3 times a week done twice: (1 + 2/3) / 3
    expect(calculateGoalProgressWithHabits([task('COMPLETED'), task('SCHEDULED')], [2 / 3])).toBe(56);
    expect(calculateGoalProgressWithHabits([], [1, 0.5])).toBe(75);
    expect(calculateGoalProgressWithHabits([], [])).toBeNull();
  });

  it('never counts a habit for more than its week', () => {
    expect(calculateGoalProgressWithHabits([], [1.8])).toBe(100);
  });

  it('keeps the tasks alone for the automatic completion', () => {
    expect(calculateGoalProgress([task('COMPLETED')])).toBe(100);
  });

  it('asks 7 times a week for a daily habit, else the number chosen', () => {
    expect(weeklyTarget({ frequency: 'DAILY' })).toBe(7);
    expect(weeklyTarget({ frequency: 'WEEKLY', targetDaysPerWeek: 3 })).toBe(3);
    expect(weeklyTarget({ frequency: 'WEEKLY' })).toBe(1);
  });

  it('counts the days done since Monday, each once', () => {
    const completions = ['2026-11-22', '2026-11-23', '2026-11-25', '2026-11-25'].map(completedDate => ({ completedDate }));
    expect(doneThisWeek(completions, now)).toBe(2);
  });
});

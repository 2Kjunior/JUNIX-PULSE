/**
 * Tests unitaires pour les regles metier des objectifs.
 * Couvre : calculateGoalProgress, isGoalOverdue, daysUntilDeadline.
 */

import {
  calculateGoalProgress,
  isGoalOverdue,
  daysUntilDeadline,
} from '../goal-rules';
import { Task, Goal } from '../../entities';

// --- Helpers -----------------------------------------------------------------

function makeTask(status: Task['status']): Task {
  return {
    id: `t-${Math.random()}`,
    title: 'Tache test',
    status,
    priority: 'NORMAL',
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Objectif test',
    status: 'ACTIVE',
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    ...overrides,
  };
}

// --- calculateGoalProgress (BR-012) ------------------------------------------

describe('calculateGoalProgress (BR-012)', () => {
  it('retourne null sans taches associees', () => {
    expect(calculateGoalProgress([])).toBeNull();
  });

  it("retourne 0 si aucune tache n'est COMPLETED", () => {
    const tasks = [makeTask('INBOX'), makeTask('SCHEDULED')];
    expect(calculateGoalProgress(tasks)).toBe(0);
  });

  it('retourne 50 si 1 sur 2 est COMPLETED', () => {
    const tasks = [makeTask('COMPLETED'), makeTask('IN_PROGRESS')];
    expect(calculateGoalProgress(tasks)).toBe(50);
  });

  it('retourne 100 si toutes les taches sont COMPLETED', () => {
    const tasks = [makeTask('COMPLETED'), makeTask('COMPLETED')];
    expect(calculateGoalProgress(tasks)).toBe(100);
  });

  it('arrondit correctement (1/3 = 33)', () => {
    const tasks = [makeTask('COMPLETED'), makeTask('INBOX'), makeTask('INBOX')];
    expect(calculateGoalProgress(tasks)).toBe(33);
  });
});

// --- isGoalOverdue -----------------------------------------------------------

describe('isGoalOverdue', () => {
  it('retourne false sans deadline', () => {
    const goal = makeGoal();
    expect(isGoalOverdue(goal)).toBe(false);
  });

  it("retourne false si l'objectif est COMPLETED", () => {
    const goal = makeGoal({ status: 'COMPLETED', deadline: '2020-01-01' });
    expect(isGoalOverdue(goal)).toBe(false);
  });

  it('retourne true si la deadline est passee et status ACTIVE', () => {
    const goal = makeGoal({ deadline: '2025-06-01' });
    const now = new Date('2025-06-15');
    expect(isGoalOverdue(goal, now)).toBe(true);
  });

  it('retourne false si la deadline est dans le futur', () => {
    const goal = makeGoal({ deadline: '2025-07-01' });
    const now = new Date('2025-06-15');
    expect(isGoalOverdue(goal, now)).toBe(false);
  });
});

// --- daysUntilDeadline -------------------------------------------------------

describe('daysUntilDeadline', () => {
  it('retourne null sans deadline', () => {
    const goal = makeGoal();
    expect(daysUntilDeadline(goal)).toBeNull();
  });

  it('retourne le nombre de jours restants', () => {
    const goal = makeGoal({ deadline: '2025-06-20T00:00:00.000Z' });
    const now = new Date('2025-06-15T00:00:00.000Z');
    expect(daysUntilDeadline(goal, now)).toBe(5);
  });

  it('retourne un nombre negatif si la deadline est passee', () => {
    const goal = makeGoal({ deadline: '2025-06-10T00:00:00.000Z' });
    const now = new Date('2025-06-15T00:00:00.000Z');
    expect(daysUntilDeadline(goal, now)).toBe(-5);
  });
});

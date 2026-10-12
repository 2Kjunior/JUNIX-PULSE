/**
 * Tests unitaires des règles métier pures pour les tâches (task-rules).
 */

import {
  resolveTaskReopenStatus,
  isTaskOverdue,
  isTaskScheduledForDate,
  areAllSubtasksCompleted,
  calculateTaskProgress,
} from '../task-rules';
import { Subtask } from '../../entities';

describe('task-rules', () => {
  describe('resolveTaskReopenStatus', () => {
    it('retourne SCHEDULED quand une date planifiée est présente', () => {
      expect(resolveTaskReopenStatus('2026-10-15')).toBe('SCHEDULED');
    });

    it('retourne INBOX quand aucune date planifiée n\'est présente (undefined)', () => {
      expect(resolveTaskReopenStatus(undefined)).toBe('INBOX');
    });

    it('retourne INBOX quand la date est null ou une chaîne vide', () => {
      expect(resolveTaskReopenStatus(null)).toBe('INBOX');
      expect(resolveTaskReopenStatus('')).toBe('INBOX');
      expect(resolveTaskReopenStatus('   ')).toBe('INBOX');
    });
  });

  describe('isTaskOverdue', () => {
    const referenceDate = new Date('2026-10-12T12:00:00Z');

    it('retourne true si la date planifiée est passée et la tâche non terminée', () => {
      const task = { status: 'SCHEDULED' as const, scheduledDate: '2026-10-11' };
      expect(isTaskOverdue(task, referenceDate)).toBe(true);
    });

    it('retourne false si la date planifiée est aujourd\'hui', () => {
      const task = { status: 'SCHEDULED' as const, scheduledDate: '2026-10-12' };
      expect(isTaskOverdue(task, referenceDate)).toBe(false);
    });

    it('retourne false si la date planifiée est future', () => {
      const task = { status: 'SCHEDULED' as const, scheduledDate: '2026-10-13' };
      expect(isTaskOverdue(task, referenceDate)).toBe(false);
    });

    it('retourne false si la date est passée mais la tâche est COMPLETED', () => {
      const task = { status: 'COMPLETED' as const, scheduledDate: '2026-10-01' };
      expect(isTaskOverdue(task, referenceDate)).toBe(false);
    });

    it('retourne false pour une tâche Inbox sans date planifiée', () => {
      const task = { status: 'INBOX' as const, scheduledDate: undefined };
      expect(isTaskOverdue(task, referenceDate)).toBe(false);
    });
  });

  describe('isTaskScheduledForDate', () => {
    it('retourne true si la date correspond (chaîne YYYY-MM-DD)', () => {
      const task = { scheduledDate: '2026-10-12' };
      expect(isTaskScheduledForDate(task, '2026-10-12')).toBe(true);
    });

    it('retourne true si la date correspond (objet Date)', () => {
      const task = { scheduledDate: '2026-10-12' };
      expect(isTaskScheduledForDate(task, new Date('2026-10-12T08:00:00Z'))).toBe(true);
    });

    it('retourne false si la date ne correspond pas', () => {
      const task = { scheduledDate: '2026-10-12' };
      expect(isTaskScheduledForDate(task, '2026-10-13')).toBe(false);
    });

    it('retourne false si la tâche n\'a pas de scheduledDate', () => {
      const task = { scheduledDate: undefined };
      expect(isTaskScheduledForDate(task, '2026-10-12')).toBe(false);
    });
  });

  describe('areAllSubtasksCompleted', () => {
    it('retourne true si la liste de sous-tâches est vide', () => {
      expect(areAllSubtasksCompleted([])).toBe(true);
    });

    it('retourne true si toutes les sous-tâches sont complétées', () => {
      const subtasks: Subtask[] = [
        { id: '1', taskId: 't1', title: 'A', isCompleted: true, position: 0, createdAt: '' },
        { id: '2', taskId: 't1', title: 'B', isCompleted: true, position: 1, createdAt: '' },
      ];
      expect(areAllSubtasksCompleted(subtasks)).toBe(true);
    });

    it('retourne false si au moins une sous-tâche n\'est pas complétée', () => {
      const subtasks: Subtask[] = [
        { id: '1', taskId: 't1', title: 'A', isCompleted: true, position: 0, createdAt: '' },
        { id: '2', taskId: 't1', title: 'B', isCompleted: false, position: 1, createdAt: '' },
      ];
      expect(areAllSubtasksCompleted(subtasks)).toBe(false);
    });
  });

  describe('calculateTaskProgress', () => {
    it('sans sous-tâches : retourne 100% si la tâche est COMPLETED', () => {
      const progress = calculateTaskProgress({ status: 'COMPLETED' }, []);
      expect(progress).toEqual({
        completed: 0,
        total: 0,
        percentage: 100,
      });
    });

    it('sans sous-tâches : retourne 0% si la tâche n\'est pas COMPLETED', () => {
      const progress = calculateTaskProgress({ status: 'INBOX' }, []);
      expect(progress).toEqual({
        completed: 0,
        total: 0,
        percentage: 0,
      });

      const progressScheduled = calculateTaskProgress({ status: 'SCHEDULED' }, []);
      expect(progressScheduled.percentage).toBe(0);
    });

    it('avec sous-tâches : calcule le ratio correct de complétion', () => {
      const subtasks: Subtask[] = [
        { id: '1', taskId: 't1', title: 'A', isCompleted: true, position: 0, createdAt: '' },
        { id: '2', taskId: 't1', title: 'B', isCompleted: false, position: 1, createdAt: '' },
        { id: '3', taskId: 't1', title: 'C', isCompleted: true, position: 2, createdAt: '' },
        { id: '4', taskId: 't1', title: 'D', isCompleted: false, position: 3, createdAt: '' },
      ];

      const progress = calculateTaskProgress({ status: 'IN_PROGRESS' }, subtasks);
      expect(progress).toEqual({
        completed: 2,
        total: 4,
        percentage: 50,
      });
    });

    it('avec sous-tâches toutes terminées : retourne 100%', () => {
      const subtasks: Subtask[] = [
        { id: '1', taskId: 't1', title: 'A', isCompleted: true, position: 0, createdAt: '' },
        { id: '2', taskId: 't1', title: 'B', isCompleted: true, position: 1, createdAt: '' },
      ];
      const progress = calculateTaskProgress({ status: 'IN_PROGRESS' }, subtasks);
      expect(progress.percentage).toBe(100);
    });
  });
});

import { ReminderRepository } from '../repositories/reminder-repository';
import { TaskRepository } from '../repositories/task-repository';
import { PersonRepository } from '../repositories/person-repository';
import { EventRepository } from '../repositories/event-repository';
import { SettingsRepository } from '../repositories/settings-repository';
import { getDatabase } from '../database/sqlite';

jest.mock('../database/sqlite', () => {
  let executedQueries: { query: string; params: unknown[] }[] = [];
  return {
    getDatabase: jest.fn(async () => ({
      runAsync: jest.fn(async (query: string, ...params: unknown[]) => {
        executedQueries.push({ query, params });
      }),
      getFirstAsync: jest.fn(async () => null),
      getAllAsync: jest.fn(async () => []),
      __getExecutedQueries: () => executedQueries,
      __clearExecutedQueries: () => {
        executedQueries = [];
      },
    })),
  };
});

describe('Vague 2 — Élimination du pattern COALESCE (V-05) dans tous les repositories', () => {
  let db: any;

  beforeEach(async () => {
    db = await getDatabase();
    db.__clearExecutedQueries();
  });

  describe('ReminderRepository.update', () => {
    it('permet de réinitialiser explicitement notes et personId à NULL', async () => {
      await ReminderRepository.update({
        id: 'rem-1',
        title: 'Rappel Modifié',
        notes: null,
        personId: null,
        updatedAt: '2026-10-25T10:00:00.000Z',
      });

      const queries = db.__getExecutedQueries();
      expect(queries).toHaveLength(1);
      const { query, params } = queries[0];

      // Vérifier l'absence totale de COALESCE
      expect(query).not.toContain('COALESCE');
      // Vérifier les clauses SET dynamiques
      expect(query).toContain('title = ?');
      expect(query).toContain('notes = ?');
      expect(query).toContain('person_id = ?');
      expect(query).toContain('updated_at = ?');
      expect(query).toContain('WHERE id = ?');

      // Vérifier que null est bien transmis
      expect(params).toEqual([
        'Rappel Modifié',
        null,
        null,
        '2026-10-25T10:00:00.000Z',
        'rem-1',
      ]);
    });

    it('n’inclut pas les champs undefined dans la requête', async () => {
      await ReminderRepository.update({
        id: 'rem-2',
        status: 'COMPLETED',
        updatedAt: '2026-10-25T10:00:00.000Z',
      });

      const queries = db.__getExecutedQueries();
      const { query, params } = queries[0];

      expect(query).not.toContain('notes = ?');
      expect(query).not.toContain('scheduled_at = ?');
      expect(query).toContain('status = ?');
      expect(query).toContain('updated_at = ?');
      expect(params).toEqual(['COMPLETED', '2026-10-25T10:00:00.000Z', 'rem-2']);
    });
  });

  describe('TaskRepository.update', () => {
    it('permet de vider la description et de délier une tâche de son objectif', async () => {
      await TaskRepository.update({
        id: 'task-1',
        description: null,
        goalId: null,
        scheduledDate: null,
        updatedAt: '2026-10-25T10:00:00.000Z',
      });

      const queries = db.__getExecutedQueries();
      const { query, params } = queries[0];

      expect(query).not.toContain('COALESCE');
      expect(query).toContain('description = ?');
      expect(query).toContain('goal_id = ?');
      expect(query).toContain('scheduled_date = ?');
      expect(params).toEqual([null, null, null, '2026-10-25T10:00:00.000Z', 'task-1']);
    });
  });

  describe('PersonRepository.update', () => {
    it('permet de supprimer un email et des notes de contact', async () => {
      await PersonRepository.update({
        id: 'person-1',
        email: null,
        notes: null,
        phone: '0600000000',
        updatedAt: '2026-10-25T10:00:00.000Z',
      });

      const queries = db.__getExecutedQueries();
      const { query, params } = queries[0];

      expect(query).not.toContain('COALESCE');
      expect(query).toContain('email = ?');
      expect(query).toContain('notes = ?');
      expect(query).toContain('phone = ?');
      expect(params).toEqual([
        '0600000000',
        null,
        null,
        '2026-10-25T10:00:00.000Z',
        'person-1',
      ]);
    });
  });

  describe('EventRepository.update', () => {
    it('permet d’effacer le lieu et les notes d’un événement', async () => {
      await EventRepository.update({
        id: 'event-1',
        location: null,
        notes: null,
        updatedAt: '2026-10-25T10:00:00.000Z',
      });

      const queries = db.__getExecutedQueries();
      const { query, params } = queries[0];

      expect(query).not.toContain('COALESCE');
      expect(query).toContain('location = ?');
      expect(query).toContain('notes = ?');
      expect(params).toEqual([null, null, '2026-10-25T10:00:00.000Z', 'event-1']);
    });
  });

  describe('SettingsRepository.update', () => {
    it('met à jour dynamiquement sans COALESCE', async () => {
      await SettingsRepository.update({
        displayName: 'Nouveau Nom',
        appearanceMode: 'light',
        updatedAt: '2026-10-25T10:00:00.000Z',
      });

      const queries = db.__getExecutedQueries();
      const { query, params } = queries[0];

      expect(query).not.toContain('COALESCE');
      expect(query).toContain('display_name = ?');
      expect(query).toContain('appearance_mode = ?');
      expect(query).toContain('appearance_dark = ?');
      expect(params).toEqual(['Nouveau Nom', 'light', 0, '2026-10-25T10:00:00.000Z']);
    });
  });
});

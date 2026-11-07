/**
 * Several people per reminder and per task, as for the events: the migration keeps the people
 * already linked, the main person stays first (the one the Call button calls), the same person
 * never appears twice, and a reminder or a task is found from any of its people.
 */

import { MIGRATIONS } from '@/database/migrations';
import { getDatabase } from '@/database/sqlite';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';

jest.mock('@/database/sqlite', () => ({ getDatabase: jest.fn() }));

const db = {
  runAsync: jest.fn(async () => ({ changes: 1 })),
  getAllAsync: jest.fn(async (): Promise<unknown[]> => []),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getDatabase as jest.Mock).mockResolvedValue(db);
});

describe('migration 31', () => {
  const sql = MIGRATIONS.find(m => m.version === 31)?.sql ?? '';

  it('creates the two link tables, removed with their reminder, task or person', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS reminder_persons');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS task_persons');
    expect(sql.match(/ON DELETE CASCADE/g)).toHaveLength(4);
  });

  it('keeps every person already linked', () => {
    expect(sql).toContain('SELECT id, person_id FROM reminders WHERE person_id IS NOT NULL');
    expect(sql).toContain('SELECT id, person_id FROM tasks WHERE person_id IS NOT NULL');
  });
});

describe.each([
  ['reminder', ReminderRepository, 'reminder_persons', 'reminder_id', 'reminders'],
  ['task', TaskRepository, 'task_persons', 'task_id', 'tasks'],
] as const)('people of a %s', (_name, repository, table, column, mainTable) => {
  it('lists the main person first, each person once', async () => {
    db.getAllAsync.mockResolvedValueOnce([{ person_id: 'paul' }, { person_id: 'paul' }, { person_id: 'lea' }]);
    expect(await repository.findPersonIds('x1')).toEqual(['paul', 'lea']);
  });

  it('replaces its people and makes the first one the main person', async () => {
    await repository.setPersons('x1', ['lea', 'paul', 'lea']);
    expect(db.runAsync.mock.calls).toEqual([
      [`DELETE FROM ${table} WHERE ${column} = ?`, 'x1'],
      [`INSERT OR IGNORE INTO ${table} (${column}, person_id) VALUES (?, ?)`, 'x1', 'lea'],
      [`INSERT OR IGNORE INTO ${table} (${column}, person_id) VALUES (?, ?)`, 'x1', 'paul'],
      [`UPDATE ${mainTable} SET person_id = ? WHERE id = ?`, 'lea', 'x1'],
    ]);
  });

  it('takes every person off when the list is empty', async () => {
    await repository.setPersons('x1', []);
    expect(db.runAsync).toHaveBeenLastCalledWith(`UPDATE ${mainTable} SET person_id = ? WHERE id = ?`, null, 'x1');
  });

  it('is found from any of its people, not only the main one', async () => {
    await repository.findByPerson('lea');
    const [query, ...params] = db.getAllAsync.mock.calls[0] as unknown as [string, ...string[]];
    expect(query).toContain(`SELECT ${column} FROM ${table} WHERE person_id = ?`);
    expect(params).toEqual(['lea', 'lea']);
  });
});

import type { Reminder, Task } from '../../entities';
import {
  entryFromReminder,
  entryFromTask,
  filterFromParam,
  MAX_DONE_SHOWN,
  todoCounts,
  todoSections,
} from '../todo-list-rules';

/** Monday 23 November 2026, 10:00. */
const now = new Date(2026, 10, 23, 10, 0);

const task = (over: Partial<Task>): Task =>
  ({ id: 't', title: 'Tâche', status: 'SCHEDULED', priority: 'NORMAL', createdAt: '', updatedAt: '', ...over }) as Task;
const reminder = (over: Partial<Reminder>): Reminder =>
  ({ id: 'r', title: 'Rappel', status: 'UPCOMING', priority: 'NORMAL', scheduledAt: '', createdAt: '', updatedAt: '', ...over }) as Reminder;
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).toISOString();

const entries = [
  entryFromTask(task({ id: 't-late', scheduledDate: '2026-11-20' })),
  entryFromTask(task({ id: 't-today', scheduledDate: '2026-11-23' })),
  entryFromTask(task({ id: 't-due', dueDate: '2026-11-24' })),
  entryFromTask(task({ id: 't-none' })),
  entryFromTask(task({ id: 't-done', status: 'COMPLETED', completedAt: '2026-11-22T10:00:00Z' })),
  entryFromReminder(reminder({ id: 'r-missed', scheduledAt: at(23, 8) })),
  entryFromReminder(reminder({ id: 'r-today', scheduledAt: at(23, 18) })),
  entryFromReminder(reminder({ id: 'r-later', scheduledAt: at(30, 9) })),
];

const shape = (sections: ReturnType<typeof todoSections>) =>
  sections.map(section => [section.id, section.entries.map(entry => entry.id)]);

describe('the single To do list', () => {
  it('sorts reminders and tasks together by moment', () => {
    expect(shape(todoSections(entries, 'all', now))).toEqual([
      ['overdue', ['t-late', 'r-missed']],
      ['today', ['t-today', 'r-today']],
      ['tomorrow', ['t-due']],
      ['later', ['r-later']],
      ['noDate', ['t-none']],
      ['done', ['t-done']],
    ]);
  });

  it('filters what rings and what does not', () => {
    expect(shape(todoSections(entries, 'alert', now))).toEqual([
      ['overdue', ['r-missed']],
      ['today', ['r-today']],
      ['later', ['r-later']],
    ]);
    expect(todoSections(entries, 'noAlert', now).flatMap(section => section.entries).every(entry => entry.kind === 'task')).toBe(true);
  });

  it('puts the most urgent first at the same time, and filters by tag', () => {
    const same = [
      entryFromTask(task({ id: 'normal', scheduledDate: '2026-11-23' })),
      entryFromTask(task({ id: 'urgent', scheduledDate: '2026-11-23', priority: 'URGENT' }), ['tag-a']),
    ];
    expect(shape(todoSections(same, 'all', now))).toEqual([['today', ['urgent', 'normal']]]);
    expect(shape(todoSections(same, 'all', now, 'tag-a'))).toEqual([['today', ['urgent']]]);
  });

  it('counts the open things of each filter', () => {
    expect(todoCounts(entries)).toEqual({ all: 7, alert: 3, noAlert: 4 });
  });

  it(`keeps the last ${MAX_DONE_SHOWN} things done in sight`, () => {
    const done = Array.from({ length: 20 }, (_, n) =>
      entryFromTask(task({ id: `d${n}`, status: 'COMPLETED', completedAt: `2026-11-${String(n + 1).padStart(2, '0')}T10:00:00Z` }))
    );
    const [section] = todoSections(done, 'all', now);
    expect(section.entries).toHaveLength(MAX_DONE_SHOWN);
    expect(section.entries[0].id).toBe('d19');
  });

  it('reads the filter asked by a link', () => {
    expect(filterFromParam('alert')).toBe('alert');
    expect(filterFromParam(['noAlert'])).toBe('noAlert');
    expect(filterFromParam('reminders')).toBe('all');
    expect(filterFromParam(undefined)).toBe('all');
  });
});

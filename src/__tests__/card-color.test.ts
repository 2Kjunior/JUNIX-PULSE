import { SWATCHES, swatchOf } from '../constants/color-themes';
import { visibleMoreFields } from '../constants/item-forms';
import { itemColorOf, itemFamilyColor } from '../constants/item-kinds';
import { darkPalette, lightPalette } from '../constants/palettes';
import { MIGRATIONS } from '../database/migrations';
import type { Event, Reminder, Task } from '../domain/entities';
import { planItemNotifications } from '../domain/rules/item-notification-rules';
import { planReminderNotifications } from '../domain/rules/reminder-notification-rules';
import { entryFromReminder, entryFromTask } from '../domain/rules/todo-list-rules';

describe('the colour of a card (sheet 043)', () => {
  const now = new Date(2026, 10, 20, 12, 0);
  const task = (over: Partial<Task> = {}): Task =>
    ({ id: 't1', title: 'Rendre le dossier', status: 'SCHEDULED', priority: 'NORMAL', dueDate: '2026-11-25', createdAt: '', updatedAt: '', ...over }) as Task;
  const event = (over: Partial<Event> = {}): Event => ({
    id: 'e1',
    title: 'Dîner chez Léa',
    startAt: new Date(2026, 10, 22, 19, 0).toISOString(),
    endAt: new Date(2026, 10, 22, 21, 0).toISOString(),
    timezone: 'Europe/Paris',
    type: 'BUSY',
    createdAt: '',
    updatedAt: '',
    ...over,
  });
  const reminder = (over: Partial<Reminder> = {}): Reminder =>
    ({
      id: 'r1',
      title: 'Appeler Léa',
      scheduledAt: new Date(2026, 10, 21, 10, 0).toISOString(),
      timezone: 'Europe/Paris',
      priority: 'NORMAL',
      status: 'UPCOMING',
      actionType: 'NONE',
      createdAt: '',
      updatedAt: '',
      ...over,
    }) as Reminder;

  it('takes the chosen colour in the tone of the mode, or else the colour of its family', () => {
    expect(itemColorOf(lightPalette, 'coral', 'todo')).toBe(SWATCHES.coral.light.default);
    expect(itemColorOf(darkPalette, 'coral', 'moment')).toBe(SWATCHES.coral.dark.default);
    expect(itemColorOf(lightPalette, undefined, 'todo')).toBe(itemFamilyColor(lightPalette, 'todo'));
    expect(itemColorOf(darkPalette, null, 'moment')).toBe(itemFamilyColor(darkPalette, 'moment'));
  });

  it('reads a saved colour, and forgets an unknown one (the family colour then)', () => {
    expect(swatchOf('green')).toBe('green');
    expect(swatchOf('gold')).toBeUndefined();
    expect(swatchOf(null)).toBeUndefined();
  });

  it('is offered in « Plus d’options » of both forms', () => {
    expect(visibleMoreFields('todo')).toContain('color');
    expect(visibleMoreFields('todo', { alert: true })).toContain('color');
    expect(visibleMoreFields('moment')).toContain('color');
  });

  it('is added to the three tables without touching anything else (migration 45)', () => {
    const migration = MIGRATIONS.find(m => m.version === 45);
    expect(migration?.sql).toContain('ALTER TABLE reminders ADD COLUMN color TEXT');
    expect(migration?.sql).toContain('ALTER TABLE tasks ADD COLUMN color TEXT');
    expect(migration?.sql).toContain('ALTER TABLE events ADD COLUMN color TEXT');
    expect(migration?.sql).not.toMatch(/DROP|DELETE|UPDATE/);
  });

  it('follows the card into the To-do list', () => {
    expect(entryFromTask(task({ color: 'pink' })).color).toBe('pink');
    expect(entryFromReminder(reminder({ color: 'blue' })).color).toBe('blue');
    expect(entryFromTask(task()).color).toBeUndefined();
  });

  it('goes with its notifications, and changes nothing for a card without colour', () => {
    const tasks = planItemNotifications({ tasks: [task({ color: 'green' })], events: [event({ color: 'slate' })], now });
    expect(tasks.filter(item => item.itemType === 'TASK').every(item => item.color === 'green')).toBe(true);
    expect(tasks.filter(item => item.itemType === 'EVENT').every(item => item.color === 'slate')).toBe(true);
    expect(planItemNotifications({ tasks: [task()], events: [], now }).every(item => !('color' in item))).toBe(true);

    const reminders = planReminderNotifications([{ reminder: reminder({ color: 'amber' }), rule: null }], now);
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders.every(item => item.color === 'amber')).toBe(true);
    expect(planReminderNotifications([{ reminder: reminder(), rule: null }], now).every(item => !('color' in item))).toBe(true);
  });
});

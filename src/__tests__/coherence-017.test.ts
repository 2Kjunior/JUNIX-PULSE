import { KINDS_WITH_SUBTASKS } from '../constants/item-kinds';
import { translate } from '../i18n/translate';

describe('one vocabulary everywhere (study 001, 15.1)', () => {
  it('names the filter of the To do tab with the words of the home screen', () => {
    expect([translate('fr', 'todoTab.all'), translate('fr', 'todoTab.alert'), translate('fr', 'todoTab.noAlert')]).toEqual([
      'Tout',
      'Rappels',
      'Tâches',
    ]);
    expect(translate('fr', 'home.reminders')).toBe('Rappels');
  });

  it('calls the form a task without a time and a reminder with one', () => {
    expect(translate('fr', 'itemForm.todo.title')).toBe('Tâche');
    expect(translate('fr', 'itemForm.todo.titleAlert')).toBe('Rappel');
    expect(translate('en', 'itemForm.todo.titleAlert')).toBe('Reminder');
  });

  it('keeps the subtasks for the tasks only', () => {
    expect(KINDS_WITH_SUBTASKS).toEqual(['task']);
  });
});

/**
 * The home screen widget while the app lock is on: anyone can see the phone's home screen, so
 * the title and time of the next reminder are hidden; the counts and Pulse stay.
 */

import { loadTodayWidget } from '@/widget/widget-task-handler';

const mockSettings = { language: 'fr', appearanceMode: 'dark', appLockEnabled: false };
const now = new Date(2026, 10, 7, 9, 0);

jest.mock('@/repositories/settings-repository', () => ({
  SettingsRepository: { get: jest.fn(async () => mockSettings) },
}));
jest.mock('@/repositories/reminder-repository', () => ({
  ReminderRepository: {
    findAll: jest.fn(async () => [
      {
        id: 'r1',
        title: 'Appeler Dr Martin',
        scheduledAt: new Date(2026, 10, 7, 11, 30).toISOString(),
        status: 'UPCOMING',
        priority: 'NORMAL',
      },
    ]),
  },
}));
jest.mock('@/repositories/task-repository', () => ({
  TaskRepository: { findAllForDate: jest.fn(async () => [{ id: 't1', status: 'SCHEDULED' }]) },
}));
jest.mock('@/services/language-service', () => ({ deviceLanguageTags: () => ['fr-FR'] }));
jest.mock('react-native-android-widget', () => ({ requestWidgetUpdate: jest.fn() }));
jest.mock('@/widget/TodayWidget', () => ({ TodayWidget: () => null }));

describe('widget and app lock', () => {
  it('shows the next reminder when the app is not locked', async () => {
    mockSettings.appLockEnabled = false;
    const { texts } = await loadTodayWidget(now);
    expect(texts.nextTitle).toBe('Appeler Dr Martin');
    expect(texts.nextTime).toBe('11:30');
  });

  it('hides its title and time while the app lock is on, and keeps the counts', async () => {
    mockSettings.appLockEnabled = true;
    const { texts } = await loadTodayWidget(now);
    expect(texts.nextTitle).toBe('Détails masqués : Junix est verrouillé');
    expect(texts.nextTime).toBe('');
    expect(JSON.stringify(texts)).not.toContain('Martin');
    expect(texts.progress).toBe('0/1 tâches faites');
  });
});

/**
 * Two moods of Pulse that the app never showed: "Concentré" during a Focus session, and
 * "Endormi" in the first minutes after a return from three days or more away.
 */

import {
  ABSENCE_MOOD_MINUTES,
  absenceDaysForMood,
  LONG_ABSENCE_DAYS,
} from '@/domain/rules/mascot-mood-rules';
import { loadMascotDayMood } from '@/features/mascot/use-mascot-day-mood';
import { setMascotFocusState } from '@/services/mascot/mascot-runtime';
import { SessionManager } from '@/services/session/SessionManager';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@/repositories/reminder-repository', () => ({ ReminderRepository: { findAll: jest.fn(async () => []) } }));
jest.mock('@/repositories/task-repository', () => ({ TaskRepository: { findAllForDate: jest.fn(async () => []) } }));
jest.mock('@/repositories/person-repository', () => ({ PersonRepository: { findAll: jest.fn(async () => []) } }));
jest.mock('@/services/session/SessionManager', () => ({
  SessionManager: { getDaysSinceLastOpen: jest.fn(() => null), getLaunchedAt: jest.fn(() => null) },
}));

const minute = 60_000;

describe('absence counted for the mood', () => {
  const launchedAt = Date.UTC(2026, 10, 8, 9, 0);

  it('counts during the first minutes after the launch only', () => {
    expect(absenceDaysForMood(4, launchedAt, launchedAt + minute)).toBe(4);
    expect(absenceDaysForMood(4, launchedAt, launchedAt + ABSENCE_MOOD_MINUTES * minute)).toBeNull();
  });

  it('is nothing without a known absence or launch', () => {
    expect(absenceDaysForMood(null, launchedAt, launchedAt)).toBeNull();
    expect(absenceDaysForMood(4, null, launchedAt)).toBeNull();
  });
});

describe('the mood of the day', () => {
  // Daytime, so that the night does not make Pulse sleepy
  beforeAll(() => jest.useFakeTimers().setSystemTime(new Date(2026, 10, 8, 14, 0)));
  afterAll(() => jest.useRealTimers());
  afterEach(() => setMascotFocusState('idle'));

  it('is "Concentré" while a Focus session runs or is paused', async () => {
    setMascotFocusState('running');
    expect((await loadMascotDayMood()).mood).toBe('focused');
    setMascotFocusState('paused');
    expect((await loadMascotDayMood()).mood).toBe('focused');
    setMascotFocusState('idle');
    expect((await loadMascotDayMood()).mood).toBe('calm');
  });

  it('is "Endormi" just after a return from a long absence, then calm again', async () => {
    const now = Date.now();
    jest.mocked(SessionManager.getDaysSinceLastOpen).mockReturnValue(LONG_ABSENCE_DAYS);
    jest.mocked(SessionManager.getLaunchedAt).mockReturnValue(now - minute);
    expect((await loadMascotDayMood()).mood).toBe('sleepy');

    jest.mocked(SessionManager.getLaunchedAt).mockReturnValue(now - (ABSENCE_MOOD_MINUTES + 1) * minute);
    expect((await loadMascotDayMood()).mood).toBe('calm');

    jest.mocked(SessionManager.getDaysSinceLastOpen).mockReturnValue(LONG_ABSENCE_DAYS - 1);
    jest.mocked(SessionManager.getLaunchedAt).mockReturnValue(now - minute);
    expect((await loadMascotDayMood()).mood).toBe('calm');
  });
});

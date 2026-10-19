/**
 * Tests unitaires pour NotificationService.
 * Valide en particulier la correction DEF-09 :
 * - Aucune notification n'est planifiee si l'echeance est passee (pas de +10s fantome).
 * - Les echeances futures sont correctement transmises a expo-notifications.
 */

import { NotificationService } from '../services/notification-service';

// Mock d'expo-notifications
const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockCancelAllScheduledNotificationsAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: any[]) => mockCancelScheduledNotificationAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args: any[]) => mockCancelAllScheduledNotificationsAsync(...args),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  setNotificationHandler: (...args: any[]) => mockSetNotificationHandler(...args),
  setNotificationChannelAsync: (...args: any[]) => mockSetNotificationChannelAsync(...args),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
  AndroidImportance: {
    HIGH: 4,
  },
  AndroidNotificationPriority: {
    HIGH: 'high',
  },
}));

describe('NotificationService (DEF-09 & fiabilite)', () => {
  const FIXED_NOW = new Date('2025-06-15T14:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: FIXED_NOW });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockScheduleNotificationAsync.mockResolvedValue('notif-system-id-123');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('planifie une notification pour une echeance future', async () => {
    const futureDate = new Date('2025-06-15T16:00:00.000Z');

    const result = await NotificationService.scheduleReminder({
      id: 'rem-1',
      title: 'Rappel futur',
      body: 'Notes explicatives',
      scheduledAt: futureDate,
    });

    expect(result).toBe('notif-system-id-123');
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'reminder-rem-1',
        content: expect.objectContaining({
          title: 'Rappel futur',
          body: 'Notes explicatives',
        }),
        trigger: expect.objectContaining({
          date: futureDate,
        }),
      })
    );
  });

  it('DEF-09 : refuse de planifier si triggerDate <= now (ne force JAMAIS a now + 10s)', async () => {
    // Echeance passee d'1 heure
    const pastDate = new Date('2025-06-15T13:00:00.000Z');

    const result = await NotificationService.scheduleReminder({
      id: 'rem-past',
      title: 'Rappel passe',
      scheduledAt: pastDate,
    });

    // Doit retourner null et ne JAMAIS declencher l'OS
    expect(result).toBeNull();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('DEF-09 : refuse de planifier si triggerDate est exactement egal a now', async () => {
    const result = await NotificationService.scheduleReminder({
      id: 'rem-exact',
      title: 'Rappel pile a l heure',
      scheduledAt: new Date(FIXED_NOW.getTime()),
    });

    expect(result).toBeNull();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('annule une notification par identifiant reel', async () => {
    await NotificationService.cancelReminder('notif-system-id-123');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-system-id-123');
  });

  it('ignore l annulation pour les identifiants mock ou fallback', async () => {
    await NotificationService.cancelReminder('mock-notif-rem-1-123');
    await NotificationService.cancelReminder('fallback-notif-rem-2');
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('annule toutes les notifications via cancelAll', async () => {
    await NotificationService.cancelAll();
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});

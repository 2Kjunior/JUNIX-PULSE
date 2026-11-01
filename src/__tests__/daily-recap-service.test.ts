import { SettingsRepository } from '../repositories/settings-repository';
import { syncDailyRecapNotifications } from '../services/daily-recap-service';
import { NotificationService } from '../services/notification-service';

jest.mock('../repositories/settings-repository', () => ({
  SettingsRepository: { get: jest.fn() },
}));

jest.mock('../services/notification-service', () => ({
  NotificationService: {
    cancelDailyRecaps: jest.fn().mockResolvedValue(undefined),
    checkPermissions: jest.fn(),
    scheduleDailyRecap: jest.fn().mockResolvedValue(undefined),
  },
}));

const baseSettings = {
  onboardingCompleted: true,
  notificationsEnabled: true,
  mascotPresence: 'full',
  mascotBriefings: true,
  mascotAddress: 'vous',
  morningBriefingHour: 8,
  endOfDayHour: 20,
};

describe('syncDailyRecapNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SettingsRepository.get as jest.Mock).mockResolvedValue(baseSettings);
    (NotificationService.checkPermissions as jest.Mock).mockResolvedValue(true);
  });

  it('replaces the scheduled recaps with the current settings', async () => {
    await syncDailyRecapNotifications();

    expect(NotificationService.cancelDailyRecaps).toHaveBeenCalledTimes(1);
    expect(NotificationService.scheduleDailyRecap).toHaveBeenCalledTimes(2);
    expect(NotificationService.scheduleDailyRecap).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'MORNING_SUMMARY', hour: 8 })
    );
    expect(NotificationService.scheduleDailyRecap).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'EVENING_REVIEW', hour: 20 })
    );
  });

  it('only cancels when the recaps are switched off', async () => {
    (SettingsRepository.get as jest.Mock).mockResolvedValue({ ...baseSettings, mascotBriefings: false });

    await syncDailyRecapNotifications();

    expect(NotificationService.cancelDailyRecaps).toHaveBeenCalledTimes(1);
    expect(NotificationService.scheduleDailyRecap).not.toHaveBeenCalled();
  });

  it('schedules nothing without the permission', async () => {
    (NotificationService.checkPermissions as jest.Mock).mockResolvedValue(false);

    await syncDailyRecapNotifications();

    expect(NotificationService.scheduleDailyRecap).not.toHaveBeenCalled();
  });

  it('survives a failure, and the next sync still runs', async () => {
    (SettingsRepository.get as jest.Mock).mockRejectedValueOnce(new Error('db'));

    await expect(syncDailyRecapNotifications()).resolves.toBeUndefined();
    await syncDailyRecapNotifications();

    expect(NotificationService.scheduleDailyRecap).toHaveBeenCalledTimes(2);
  });
});

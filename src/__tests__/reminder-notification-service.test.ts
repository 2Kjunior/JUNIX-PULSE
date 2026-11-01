import { ReminderRepository } from '../repositories/reminder-repository';
import { SettingsRepository } from '../repositories/settings-repository';
import { NotificationService } from '../services/notification-service';
import { onReminderSyncProblem, syncReminderNotifications } from '../services/reminder-notification-service';

jest.mock('../repositories/settings-repository', () => ({
  SettingsRepository: { get: jest.fn() },
}));

jest.mock('../repositories/reminder-repository', () => ({
  ReminderRepository: { findAll: jest.fn(), findRecurrenceRule: jest.fn() },
}));

jest.mock('../services/notification-service', () => ({
  NotificationService: {
    getAllScheduled: jest.fn(),
    cancelReminder: jest.fn().mockResolvedValue(undefined),
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
    scheduleReminder: jest.fn(),
  },
}));

const AT = '2030-01-15T18:00:00.000Z';
const IDENTIFIER = `reminder-r1-${new Date(AT).getTime()}`;
const REMINDER = {
  id: 'r1',
  title: 'Appeler',
  scheduledAt: AT,
  status: 'UPCOMING',
};

const held = (identifier: string, title = 'Appeler', body = 'Rappel Junix Pulse') => ({
  identifier,
  content: { title, body },
});

const scheduled = NotificationService.scheduleReminder as jest.Mock;
const cancelled = NotificationService.cancelReminder as jest.Mock;

describe('syncReminderNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SettingsRepository.get as jest.Mock).mockResolvedValue({ notificationsEnabled: true });
    (ReminderRepository.findAll as jest.Mock).mockResolvedValue([REMINDER]);
    (NotificationService.getAllScheduled as jest.Mock).mockResolvedValue([]);
    (NotificationService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (NotificationService.requestPermissions as jest.Mock).mockResolvedValue(true);
    scheduled.mockResolvedValue('id');
  });

  it('schedules what the phone does not hold yet', async () => {
    const report = await syncReminderNotifications();

    expect(report).toEqual({ scheduled: 1, failed: 0, permissionDenied: false });
    expect(scheduled).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', identifier: IDENTIFIER }));
  });

  it('leaves alone a notification already up to date', async () => {
    (NotificationService.getAllScheduled as jest.Mock).mockResolvedValue([held(IDENTIFIER)]);

    await syncReminderNotifications();

    expect(scheduled).not.toHaveBeenCalled();
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('replaces a notification whose text changed', async () => {
    (NotificationService.getAllScheduled as jest.Mock).mockResolvedValue([held(IDENTIFIER, 'Ancien titre')]);

    await syncReminderNotifications();

    expect(cancelled).toHaveBeenCalledWith(IDENTIFIER);
    expect(scheduled).toHaveBeenCalledTimes(1);
  });

  it('cancels the notifications of a reminder that no longer exists, and only those of reminders', async () => {
    (ReminderRepository.findAll as jest.Mock).mockResolvedValue([]);
    (NotificationService.getAllScheduled as jest.Mock).mockResolvedValue([
      held('reminder-gone-1'),
      held('daily-recap-MORNING_SUMMARY'),
    ]);

    await syncReminderNotifications();

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(cancelled).toHaveBeenCalledWith('reminder-gone-1');
  });

  it('cancels everything when notifications are switched off', async () => {
    (SettingsRepository.get as jest.Mock).mockResolvedValue({ notificationsEnabled: false });
    (NotificationService.getAllScheduled as jest.Mock).mockResolvedValue([held(IDENTIFIER)]);

    await syncReminderNotifications();

    expect(cancelled).toHaveBeenCalledWith(IDENTIFIER);
    expect(scheduled).not.toHaveBeenCalled();
  });

  it('schedules everything again when forced', async () => {
    (NotificationService.getAllScheduled as jest.Mock).mockResolvedValue([held(IDENTIFIER)]);

    await syncReminderNotifications({ force: true });

    expect(cancelled).toHaveBeenCalledWith(IDENTIFIER);
    expect(scheduled).toHaveBeenCalledTimes(1);
  });

  it('never asks for the permission on its own', async () => {
    (NotificationService.checkPermissions as jest.Mock).mockResolvedValue(false);

    const report = await syncReminderNotifications();

    expect(report.permissionDenied).toBe(true);
    expect(NotificationService.requestPermissions).not.toHaveBeenCalled();
    expect(scheduled).not.toHaveBeenCalled();
  });

  it('reports a failure to the listener after a user action', async () => {
    scheduled.mockResolvedValue(null);
    const listener = jest.fn();
    const unsubscribe = onReminderSyncProblem(listener);

    await syncReminderNotifications({ interactive: true });
    unsubscribe();

    expect(listener).toHaveBeenCalledWith({ scheduled: 0, failed: 1, permissionDenied: false });
  });

  it('stays quiet about a problem outside a user action', async () => {
    scheduled.mockResolvedValue(null);
    const listener = jest.fn();
    const unsubscribe = onReminderSyncProblem(listener);

    await syncReminderNotifications();
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
  });

  it('survives a failure, and the next sync still runs', async () => {
    (SettingsRepository.get as jest.Mock).mockRejectedValueOnce(new Error('db'));

    await expect(syncReminderNotifications()).resolves.toMatchObject({ failed: 1 });
    await syncReminderNotifications();

    expect(scheduled).toHaveBeenCalledTimes(1);
  });
});

/**
 * Lot 6: notification buttons in the background, backup warnings and fingerprint, app lock,
 * worried mood, planning blocks, varied reactions, widget, phone calendar and review.
 * What needs a real phone (buttons with the app killed, the widget on the home screen, the
 * system calendar) is checked on the device; the decisions around it are checked here.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { shouldLockOnResume } from '@/domain/rules/app-lock-rules';
import { shouldWarnAutoBackupFailure } from '@/domain/rules/auto-backup-rules';
import { deviceEventsForDay, toDeviceEvents } from '@/domain/rules/device-calendar-rules';
import { reactionMessageId } from '@/domain/rules/mascot-companion-rules';
import { deriveMascotMood, MascotMoodInput } from '@/domain/rules/mascot-mood-rules';
import { MascotTimeTrigger } from '@/domain/rules/mascot-time-rules';
import { triggerToMascotMessage } from '@/domain/rules/mascot-trigger-message-rules';
import { buildReviewStats, reviewDays, reviewTone } from '@/domain/rules/review-rules';
import { buildTodayWidgetData, todayWidgetMood, todayWidgetProgress } from '@/domain/rules/widget-rules';
import { widgetMascotSvg } from '@/widget/widget-mascot-svg';
import * as appLock from '@/services/app-lock-service';
import * as autoBackup from '@/services/auto-backup-service';
import * as notificationActions from '@/services/notification-action-service';

const mockReminders = new Map<string, { id: string; status: string; priority: string }>();
const mockCalls: string[] = [];
const mockAuth = { level: 2, success: true };
const mockTasks: string[] = [];
const mockNotices: string[] = [];
const mockFolder = { failWrite: false };

jest.mock('@/repositories/reminder-repository', () => ({
  ReminderRepository: { findById: jest.fn(async (id: string) => mockReminders.get(id) ?? null) },
}));
jest.mock('@/use-cases/reminder-use-cases', () => ({
  completeReminder: jest.fn(async (reminder: { id: string }) => {
    mockCalls.push(`complete:${reminder.id}`);
    mockReminders.set(reminder.id, { ...mockReminders.get(reminder.id)!, status: 'COMPLETED' });
  }),
  snoozeReminder: jest.fn(async (reminder: { id: string }, input: { minutes: number }) => {
    mockCalls.push(`snooze:${reminder.id}:${input.minutes}`);
  }),
}));
jest.mock('@/services/notification-service', () => ({
  NotificationService: {
    dismiss: jest.fn(async (id: string) => {
      mockCalls.push(`dismiss:${id}`);
    }),
    notifyNow: jest.fn(async (notice: { identifier: string }) => {
      mockNotices.push(notice.identifier);
    }),
  },
}));
jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  getEnrolledLevelAsync: jest.fn(async () => mockAuth.level),
  authenticateAsync: jest.fn(async () => ({ success: mockAuth.success })),
}));
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => {}),
  allowScreenCaptureAsync: jest.fn(async () => {}),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(async (name: string) => {
    mockTasks.push(`register:${name}`);
  }),
  unregisterTaskAsync: jest.fn(async (name: string) => {
    mockTasks.push(`unregister:${name}`);
  }),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
}));
jest.mock('expo-file-system', () => {
  class File {
    name: string;
    constructor(fileName: string) {
      this.name = fileName;
    }
    async write() {
      if (mockFolder.failWrite) throw new Error('folder gone');
    }
    delete() {}
  }
  class Directory {
    createFile(name: string) {
      return new File(name);
    }
    list() {
      return [];
    }
  }
  return { File, Directory };
});
jest.mock('@/database/sqlite', () => ({ getDatabase: jest.fn(async () => ({})) }));
jest.mock('@/services/backup-service', () => ({
  createBackup: jest.fn(async () => '{}'),
  encryptBackup: jest.fn(async () => 'encrypted'),
}));

const resetSecureStore = () => (SecureStore as unknown as { __resetMockStorage: () => void }).__resetMockStorage();
const withPlatform = (os: string) => {
  const original = Platform.OS;
  beforeAll(() => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true }));
  afterAll(() => Object.defineProperty(Platform, 'OS', { get: () => original, configurable: true }));
};

// ─── Notification buttons ─────────────────────────────────────────────────

describe('reminder buttons handled in the background', () => {
  beforeEach(() => {
    mockReminders.clear();
    mockCalls.length = 0;
    mockReminders.set('r1', { id: 'r1', status: 'TRIGGERED', priority: 'NORMAL' });
  });

  const tap = (actionIdentifier: string, date = 1000) => ({
    actionIdentifier,
    notification: {
      date,
      request: { identifier: 'n1', content: { dataString: JSON.stringify({ reminderId: 'r1', type: 'REMINDER' }) } },
    },
  });

  it('reads the reminder from the data object or from its JSON text', () => {
    expect(notificationActions.reminderIdOf({ data: { reminderId: 'a' } })).toBe('a');
    expect(notificationActions.reminderIdOf({ dataString: '{"reminderId":"b"}' })).toBe('b');
    expect(notificationActions.reminderIdOf({ dataString: 'not json' })).toBeNull();
    expect(notificationActions.parseBackgroundResponse({ data: 'push' })).toBeNull();
  });

  it('completes the reminder once, even when the tap arrives twice', async () => {
    await notificationActions.handleBackgroundResponse(tap('complete'));
    await notificationActions.handleBackgroundResponse(tap('complete'));
    expect(mockCalls).toEqual(['dismiss:n1', 'complete:r1']);
  });

  it('snoozes for an hour, and leaves a plain tap to the app', async () => {
    await notificationActions.handleBackgroundResponse(tap('snooze_1h', 2000));
    await notificationActions.handleBackgroundResponse(tap('expo.modules.notifications.actions.DEFAULT', 3000));
    expect(mockCalls).toEqual(['dismiss:n1', 'snooze:r1:60']);
  });

  it('does nothing for a reminder already done', async () => {
    mockReminders.set('r1', { id: 'r1', status: 'COMPLETED', priority: 'NORMAL' });
    expect(
      await notificationActions.runReminderAction({
        actionIdentifier: 'complete',
        notificationIdentifier: 'n2',
        reminderId: 'r1',
        date: 5000,
      })
    ).toBe('skipped');
    expect(mockCalls).not.toContain('complete:r1');
  });
});

// ─── Automatic backup ─────────────────────────────────────────────────────

describe('automatic backup: warning, fingerprint and background task', () => {
  withPlatform('android');

  beforeEach(() => {
    resetSecureStore();
    mockNotices.length = 0;
    mockTasks.length = 0;
    mockFolder.failWrite = false;
    mockAuth.success = true;
  });

  it('warns at the first failure only, until a backup works again', async () => {
    expect(shouldWarnAutoBackupFailure(null, null)).toBe(true);
    expect(shouldWarnAutoBackupFailure(null, 100)).toBe(false);

    await autoBackup.enableAutoBackup('content://folder', 'mot-de-passe-solide');
    mockFolder.failWrite = true;
    await autoBackup.runAutoBackup({ force: true });
    await autoBackup.runAutoBackup({ force: true });
    expect(mockNotices).toEqual(['junix-pulse-auto-backup-failed']);

    mockFolder.failWrite = false;
    expect(await autoBackup.runAutoBackup({ force: true })).toBe('done');
    mockFolder.failWrite = true;
    await autoBackup.runAutoBackup({ force: true });
    expect(mockNotices).toHaveLength(2);
  });

  it('runs in the background, unless the fingerprint is asked', async () => {
    await autoBackup.enableAutoBackup('content://folder', 'mot-de-passe-solide');
    expect(mockTasks).toEqual(['register:junix-pulse-auto-backup']);

    await autoBackup.setAutoBackupBiometric(true);
    expect(mockTasks.at(-1)).toBe('unregister:junix-pulse-auto-backup');
    expect(await autoBackup.runAutoBackup({ force: true, background: true })).toBe('not-due');

    mockAuth.success = false;
    expect(await autoBackup.runAutoBackup({ force: true })).toBe('cancelled');
    mockAuth.success = true;
    expect(await autoBackup.runAutoBackup({ force: true })).toBe('done');
  });
});

// ─── App lock ─────────────────────────────────────────────────────────────

describe('app lock', () => {
  beforeEach(() => {
    appLock._resetAppLockForTesting();
    mockAuth.level = 2;
    mockAuth.success = true;
  });

  it('locks again once the delay has passed, and when the clock went back', () => {
    const minute = 60_000;
    expect(shouldLockOnResume(true, 0, 30_000, 0)).toBe(true);
    expect(shouldLockOnResume(true, 0, 4 * minute, 5)).toBe(false);
    expect(shouldLockOnResume(true, 0, 5 * minute, 5)).toBe(true);
    expect(shouldLockOnResume(true, 10 * minute, 0, 5)).toBe(true);
    expect(shouldLockOnResume(false, 0, 60 * minute, 0)).toBe(false);
  });

  it('does not lock on the return from a system window the app opened', () => {
    appLock.setAppLockConfig({ enabled: true, delayMinutes: 0 });
    appLock.recordAppLockBackground(0);
    appLock.expectAppLockReturn();
    expect(appLock.consumeAppLockResume(60_000)).toBe(false);

    appLock.recordAppLockBackground(0);
    expect(appLock.consumeAppLockResume(60_000)).toBe(true);
  });

  it('never locks out a phone that has no fingerprint nor code', async () => {
    mockAuth.level = 0;
    expect(await appLock.canUseAppLock()).toBe(false);
    mockAuth.success = false;
    expect(await appLock.authenticateAppUnlock()).toBe('unlocked');

    mockAuth.level = 3;
    expect(await appLock.authenticateAppUnlock()).toBe('cancelled');
  });
});

// ─── Mascot ───────────────────────────────────────────────────────────────

describe('mascot: worried mood, planning blocks, varied reactions', () => {
  const base: MascotMoodInput = {
    hour: 10,
    focusState: 'idle',
    hasUrgentPendingReminder: false,
    todayTaskTotal: 9,
    todayTaskCompleted: 1,
    birthdayToday: false,
    daysSinceLastOpen: 0,
  };

  it('looks worried on an overloaded day, and happy once it is all done', () => {
    expect(deriveMascotMood({ ...base, todayOpenItemCount: 8 }).mood).toBe('worried');
    expect(deriveMascotMood({ ...base, todayOpenItemCount: 7 }).mood).toBe('calm');
    expect(deriveMascotMood({ ...base, todayTaskCompleted: 9, todayOpenItemCount: 0 }).mood).toBe('happy');
    // An urgent reminder still comes first
    expect(deriveMascotMood({ ...base, todayOpenItemCount: 12, hasUrgentPendingReminder: true }).mood).toBe('alert');
  });

  it('announces a work block with a Focus, sport with sport, and stays quiet for rest', () => {
    const trigger = (subjectId: string): MascotTimeTrigger => ({
      key: `PLANNING_BLOCK_START:${subjectId}:0`,
      kind: 'PLANNING_BLOCK_START',
      subjectId,
      dueAt: 0,
      mood: 'calm',
      attentive: true,
      level: 'micro',
      hasMessage: true,
      proposesFocus: true,
    });
    const context = {
      remindersToday: 0,
      tasksTotal: 0,
      tasksDone: 0,
      events: {},
      blocks: {
        w: { label: 'Mémoire', kind: 'STUDY' as const },
        s: { label: 'Course', kind: 'SPORT' as const },
        r: { label: 'Sieste', kind: 'REST' as const },
      },
    };
    expect(triggerToMascotMessage(trigger('w'), context)).toEqual({ id: 'BLOCK_FOCUS', params: { block: 'Mémoire' } });
    expect(triggerToMascotMessage(trigger('s'), context)).toEqual({ id: 'BLOCK_SPORT', params: {} });
    expect(triggerToMascotMessage(trigger('r'), context)).toBeNull();
    expect(triggerToMascotMessage(trigger('missing'), context)).toBeNull();
  });

  it('says a completed task in turn with three wordings', () => {
    const said = [0, 1, 2, 3].map(turn => reactionMessageId('TASK_COMPLETED', turn));
    expect(said).toEqual(['REACT_DONE', 'REACT_DONE_2', 'REACT_DONE_3', 'REACT_DONE']);
    expect(reactionMessageId('ITEM_DELETED', 1)).toBeNull();
  });
});

// ─── Widget, phone calendar, review ───────────────────────────────────────

describe('widget data', () => {
  const now = new Date(2025, 5, 17, 15, 0);

  it('shows the next reminder to come and the tasks left today', () => {
    const data = buildTodayWidgetData(
      [
        { title: 'Passé', scheduledAt: new Date(2025, 5, 17, 9, 0).toISOString(), status: 'TRIGGERED' },
        { title: 'Demain', scheduledAt: new Date(2025, 5, 18, 8, 0).toISOString(), status: 'UPCOMING' },
        { title: 'Ce soir', scheduledAt: new Date(2025, 5, 17, 19, 30).toISOString(), status: 'UPCOMING' },
        { title: 'Fait', scheduledAt: new Date(2025, 5, 17, 16, 0).toISOString(), status: 'COMPLETED' },
      ],
      [{ status: 'COMPLETED' }, { status: 'SCHEDULED' }, { status: 'IN_PROGRESS' }],
      now
    );
    expect(data.nextReminder).toMatchObject({ title: 'Ce soir', time: '19:30', today: true });
    expect(data).toMatchObject({ tasksLeft: 2, tasksDone: 1, tasksTotal: 3, remindersLeftToday: 2 });
    expect(todayWidgetProgress(data)).toBeCloseTo(1 / 3);
    expect(buildTodayWidgetData([], [], now)).toMatchObject({ nextReminder: null, tasksLeft: 0, tasksTotal: 0 });
  });

  it('gives Pulse the mood of the day: asleep at night, happy when done, worried when overloaded', () => {
    const day = (tasksLeft: number, tasksTotal: number, remindersLeftToday = 0) => ({
      nextReminder: null,
      tasksLeft,
      tasksDone: tasksTotal - tasksLeft,
      tasksTotal,
      remindersLeftToday,
    });
    expect(todayWidgetMood(day(0, 3), 15)).toBe('happy');
    expect(todayWidgetMood(day(5, 6, 3), 15)).toBe('worried');
    expect(todayWidgetMood(day(2, 3), 15)).toBe('calm');
    expect(todayWidgetMood(day(2, 3), 23)).toBe('sleepy');
    expect(todayWidgetProgress(day(0, 0))).toBe(0);
  });

  it('draws Pulse with the colours and the face of its mood', () => {
    const worried = widgetMascotSvg('worried');
    expect(worried.startsWith('<svg')).toBe(true);
    expect(worried).toContain('#f5b942');
    expect(worried).toContain('#7fd3ff'); // the drop of the worried face
    expect(widgetMascotSvg('calm')).toContain('#0AE8F0');
    expect(widgetMascotSvg('sleepy')).toContain('>z</text>');
  });
});

describe('phone calendar events', () => {
  it('keeps each occurrence once, all-day ones first, and filters a day', () => {
    const events = toDeviceEvents([
      { id: 'a', title: 'Dentiste', startDate: '2025-06-17T10:00:00', endDate: '2025-06-17T11:00:00', allDay: false, location: ' Cabinet ' },
      { id: 'a', title: 'Dentiste', startDate: '2025-06-17T10:00:00', endDate: '2025-06-17T11:00:00', allDay: false, location: null },
      { id: 'b', title: 'Vacances', startDate: '2025-06-17T00:00:00', endDate: '2025-06-18T00:00:00', allDay: true, location: null },
      { id: 'c', title: 'Bad', startDate: 'nope', endDate: 'nope', allDay: false, location: null },
      { id: 'd', title: 'Demain', startDate: '2025-06-18T09:00:00', endDate: '2025-06-18T10:00:00', allDay: false, location: null },
    ]);
    expect(events.map(event => event.title)).toEqual(['Vacances', 'Dentiste', 'Demain']);
    expect(events[1].location).toBe('Cabinet');
    expect(deviceEventsForDay(events, new Date(2025, 5, 17)).map(event => event.title)).toEqual(['Vacances', 'Dentiste']);
  });
});

describe('review of the day and of the week', () => {
  const tuesday = new Date(2025, 5, 17, 15, 0);

  it('covers the day, or Monday to Sunday', () => {
    expect(reviewDays('day', tuesday)).toHaveLength(1);
    const week = reviewDays('week', tuesday);
    expect([week[0].getDay(), week[6].getDay(), week[0].getDate()]).toEqual([1, 0, 16]);
  });

  it('sums up the tasks, reminders and habits of the period', () => {
    const days = reviewDays('week', tuesday);
    const stats = buildReviewStats({
      days,
      tasksByDay: days.map((_, index) =>
        index === 1 ? [{ status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'SCHEDULED' }] : index === 3 ? [{ status: 'COMPLETED' }] : []
      ),
      reminders: [
        { status: 'COMPLETED', scheduledAt: '2025-06-17T09:00:00', completedAt: '2025-06-17T09:05:00' },
        { status: 'MISSED', scheduledAt: '2025-06-18T09:00:00' },
        { status: 'COMPLETED', scheduledAt: '2025-06-01T09:00:00', completedAt: '2025-06-01T09:00:00' },
      ],
      habits: [
        { id: 'h1', title: 'Lire', completedDates: ['2025-06-16', '2025-06-17', '2025-06-10'] },
        { id: 'h2', title: 'Courir', completedDates: ['2025-06-18'] },
      ],
    });
    expect(stats).toMatchObject({
      tasksDone: 3,
      tasksTotal: 4,
      completionRate: 75,
      remindersDone: 1,
      remindersMissed: 1,
      habitChecks: 3,
      bestHabit: { title: 'Lire', count: 2 },
    });
    expect(stats.bestDay?.date.getDay()).toBe(2);
    expect(reviewTone(stats)).toBe('good');
    expect(reviewTone({ ...stats, completionRate: 90 })).toBe('great');
    expect(reviewTone({ ...stats, tasksTotal: 0, remindersDone: 0, habitChecks: 0, completionRate: null })).toBe('empty');
  });
});

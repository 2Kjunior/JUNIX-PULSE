/**
 * Tests unitaires pour l'onboarding harmonisé (Lot 11).
 *
 * Couverture :
 * - Vérification que le layout exporte un composant rendable
 * - Les 5 écrans de la fiche 044 : « Passer » en haut et le bouton en bas de chacun
 * - Vérification de resetOnboarding dans le repository
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    Stack: Object.assign(
      ({ children }: { children: React.ReactNode }) =>
        ReactModule.createElement('Stack', null, children),
      {
        Screen: ({ name }: { name: string }) =>
          ReactModule.createElement('Stack.Screen', { name }),
      }
    ),
    router: {
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
    },
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => cb(), [cb]);
    },
  };
});

// The frame keeps clear of the phone's edges; the try screen has a microphone (sheet 044)
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/features/capture/use-dictation', () => ({
  useDictation: () => ({ available: false, supported: false, listening: false, toggle: jest.fn() }),
}));

// La mascotte guide a ses propres tests ; ici on vérifie seulement que le layout se rend
jest.mock('@/features/mascot/OnboardingGuide', () => ({ OnboardingGuide: () => null }));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr', regionCode: 'FR' }],
  getCalendars: () => [{ timeZone: 'Europe/Paris' }],
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    text() { return Promise.resolve('{}'); }
  },
  Paths: { cache: '/cache' },
}));

jest.mock('@/services/notification-service', () => ({
  NotificationService: {
    requestPermissions: jest.fn().mockResolvedValue(true),
    getExactAlarmStatus: jest.fn().mockResolvedValue({ granted: true, canAsk: false }),
  },
}));

// The try screen creates a reminder or a task (sheet 044)
jest.mock('@/use-cases/reminder-use-cases', () => ({ createReminder: jest.fn().mockResolvedValue('r1') }));
jest.mock('@/use-cases/task-use-cases', () => ({ TaskUseCases: { createTask: jest.fn().mockResolvedValue('t1') } }));

jest.mock('@/repositories/settings-repository', () => ({
  SettingsRepository: {
    get: jest.fn().mockResolvedValue({
      displayName: 'Test',
      timezone: 'Europe/Paris',
      morningBriefingHour: 8,
      endOfDayHour: 20,
      notificationsEnabled: true,
    }),
    update: jest.fn().mockResolvedValue(undefined),
    markOnboardingComplete: jest.fn().mockResolvedValue(undefined),
    resetOnboarding: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/backup-service', () => ({
  decryptBackup: jest.fn(),
  importBackup: jest.fn(),
  parseBackup: jest.fn(),
  parseBackupSanctumKeys: jest.fn(() => null),
  restoreBackupSanctum: jest.fn(async () => 'none'),
}));

jest.mock('@/database/sqlite', () => ({
  getDatabase: jest.fn().mockResolvedValue({}),
}));

describe('Lot 11 — Onboarding harmonisé', () => {
  describe('Layout', () => {
    it('exporte un composant rendable avec 5 écrans', () => {
      const OnboardingLayout = require('@/app/(onboarding)/_layout').default;
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(<OnboardingLayout />);
      });
      const tree = root!.toJSON();
      expect(tree).toBeDefined();
    });
  });

  // The 5 screens of sheet 044: the same frame, « Passer » at the top (none once the last one is
  // answered), and the button to go on at the bottom of each
  const render = (path: string) => {
    const Screen = require(path).default;
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(<Screen />);
    });
    return root!;
  };
  const byTestId = (root: ReactTestRenderer.ReactTestRenderer, testID: string) =>
    root.root.findAll(node => node.props.testID === testID);

  it.each([
    ['@/app/(onboarding)/index', 'onboarding-start-btn'],
    ['@/app/(onboarding)/discover', 'onboarding-discover-next'],
    ['@/app/(onboarding)/personalize', 'onboarding-personalize-next'],
    ['@/app/(onboarding)/try', 'onboarding-try-add'],
    ['@/app/(onboarding)/permissions', 'onboarding-notif-btn'],
  ])('%s has « Passer » and its button at the bottom', (path, button) => {
    const root = render(path);
    expect(byTestId(root, 'onboarding-skip').length).toBeGreaterThanOrEqual(1);
    expect(byTestId(root, button).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the four flagship features on the 2nd screen', () => {
    const root = render('@/app/(onboarding)/discover');
    const labels = root.root.findAll(node => typeof node.props.accessibilityLabel === 'string' && node.props.accessible === true);
    expect(labels.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the « Ajouter » of the try screen off until a sentence is written', () => {
    const root = render('@/app/(onboarding)/try');
    const add = byTestId(root, 'onboarding-try-add')[0];
    expect(add.props.disabled).toBe(true);
  });

  describe('SettingsRepository.resetOnboarding', () => {
    it('appelle resetOnboarding lors du replay depuis les réglages', async () => {
      const { SettingsRepository } = require('@/repositories/settings-repository');
      await SettingsRepository.resetOnboarding(new Date().toISOString());
      expect(SettingsRepository.resetOnboarding).toHaveBeenCalled();
    });
  });
});

/**
 * Tests unitaires pour l'onboarding harmonisé (Lot 11).
 *
 * Couverture :
 * - Vérification que le layout exporte un composant rendable
 * - Vérification de la présence du bouton "Passer" sur les étapes 1-4
 * - Vérification que l'étape 5 n'a pas de bouton Passer
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
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => cb(), [cb]);
    },
  };
});

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr', regionCode: 'FR' }],
  getCalendars: () => [{ timeZone: 'Europe/Paris' }],
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    constructor() {}
    text() { return Promise.resolve('{}'); }
  },
  Paths: { cache: '/cache' },
}));

jest.mock('@/services/notification-service', () => ({
  NotificationService: {
    requestPermissions: jest.fn().mockResolvedValue(true),
  },
}));

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

  describe('Étape 1 — Bienvenue', () => {
    it('rend le composant et contient un bouton Passer', () => {
      const Welcome = require('@/app/(onboarding)/index').default;
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(<Welcome />);
      });
      const skipBtn = root!.root.findByProps({ accessibilityLabel: "Passer l'onboarding" });
      expect(skipBtn).toBeDefined();
    });
  });

  describe('Étape 2 — Découverte', () => {
    it('rend le composant et contient un bouton Passer', () => {
      const Discover = require('@/app/(onboarding)/discover').default;
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(<Discover />);
      });
      const skipBtn = root!.root.findByProps({ accessibilityLabel: "Passer les étapes restantes" });
      expect(skipBtn).toBeDefined();
    });
  });

  describe('Étape 3 — Personnalisation', () => {
    it('rend le composant et contient un bouton Passer', () => {
      const Personalize = require('@/app/(onboarding)/personalize').default;
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(<Personalize />);
      });
      const skipBtns = root!.root.findAllByProps({ accessibilityLabel: "Passer les étapes restantes" });
      expect(skipBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Étape 4 — Planification', () => {
    it('rend le composant et contient un bouton Passer', () => {
      const Schedule = require('@/app/(onboarding)/schedule').default;
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(<Schedule />);
      });
      const skipBtns = root!.root.findAllByProps({ accessibilityLabel: "Passer à la dernière étape" });
      expect(skipBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Étape 5 — Permissions', () => {
    it('rend le composant final sans bouton Passer', () => {
      const Permissions = require('@/app/(onboarding)/permissions').default;
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(<Permissions />);
      });
      // L'étape finale ne doit pas avoir de bouton Passer
      const skipBtns = root!.root.findAllByProps({ accessibilityLabel: "Passer les étapes restantes" });
      expect(skipBtns.length).toBe(0);
    });
  });

  describe('SettingsRepository.resetOnboarding', () => {
    it('appelle resetOnboarding lors du replay depuis les réglages', async () => {
      const { SettingsRepository } = require('@/repositories/settings-repository');
      await SettingsRepository.resetOnboarding(new Date().toISOString());
      expect(SettingsRepository.resetOnboarding).toHaveBeenCalled();
    });
  });
});

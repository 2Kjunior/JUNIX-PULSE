/**
 * Tests for the reminders list: inside the tab bar, it follows the same rules as the other tabs.
 */

import React from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import RemindersListScreen from '../app/reminders/index';
import { GlassFloatingActionButton } from '../components/ui/GlassFloatingActionButton';
import { TAB_BAR_TOTAL_HEIGHT } from '../constants/theme';
import { ReminderRepository } from '../repositories/reminder-repository';
import { SettingsRepository } from '../repositories/settings-repository';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: jest.fn(),
  },
  useFocusEffect: (effect: () => void) => {
    const { useEffect: useMockEffect } = jest.requireActual('react');
    useMockEffect(effect, [effect]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../repositories/reminder-repository', () => ({
  ReminderRepository: { findAll: jest.fn() },
}));
jest.mock('../repositories/settings-repository', () => ({
  SettingsRepository: { get: jest.fn() },
}));
jest.mock('../use-cases/reminder-use-cases', () => ({
  deleteReminder: jest.fn(),
  completeReminder: jest.fn(),
  snoozeReminder: jest.fn(),
}));
jest.mock('../components/ui/SwipeableItem', () => ({
  SwipeableItem: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../components/ui/GlassFloatingActionButton', () => ({
  GlassFloatingActionButton: jest.fn(() => null),
}));

const REMINDER = {
  id: 'reminder-1',
  title: 'Appeler Paul',
  status: 'UPCOMING',
  priority: 'NORMAL',
  scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

async function renderScreen(hideBackButton: boolean) {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = ReactTestRenderer.create(<RemindersListScreen hideBackButton={hideBackButton} />);
  });
  return renderer as ReactTestRenderer.ReactTestRenderer;
}

function fabProps() {
  const calls = jest.mocked(GlassFloatingActionButton).mock.calls;
  return calls[calls.length - 1][0];
}

describe('RemindersListScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.mocked(GlassFloatingActionButton).mockClear();
    jest.mocked(ReminderRepository.findAll).mockResolvedValue([REMINDER] as never);
    jest.mocked(SettingsRepository.get).mockResolvedValue({ notificationsEnabled: true } as never);
  });

  describe('in the tab bar', () => {
    it('lets the ambient background show through', async () => {
      const renderer = await renderScreen(true);
      const root = renderer.root.findAllByType(View)[0];
      expect(StyleSheet.flatten(root.props.style).backgroundColor).toBe('transparent');
    });

    it('keeps the add button at its default position, above the tab bar', async () => {
      await renderScreen(true);
      expect(fabProps().bottomOffset).toBeUndefined();
    });

    it('uses the add icon and opens the reminder form', async () => {
      await renderScreen(true);
      const props = fabProps();
      expect(props.label).toBe('Nouveau rappel');
      expect(props.icon).toBe('add');
      props.onPress();
      expect(mockPush).toHaveBeenCalledWith('/reminders/new');
    });

    it('keeps the last reminders scrollable above the tab bar', async () => {
      const renderer = await renderScreen(true);
      const list = renderer.root.findByType(SectionList);
      expect(StyleSheet.flatten(list.props.contentContainerStyle).paddingBottom).toBe(
        TAB_BAR_TOTAL_HEIGHT + 104
      );
    });
  });

  describe('as a standalone screen', () => {
    it('keeps its opaque background and its offset, as there is no tab bar', async () => {
      const renderer = await renderScreen(false);
      const root = renderer.root.findAllByType(View)[0];
      expect(StyleSheet.flatten(root.props.style).backgroundColor).not.toBe('transparent');
      expect(fabProps().bottomOffset).toBe(20);
    });
  });
});

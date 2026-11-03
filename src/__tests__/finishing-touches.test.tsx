import * as Haptics from 'expo-haptics';
import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { SwipeableItem } from '../components/ui/SwipeableItem';
import { GlowCard } from '../components/ui/GlowCard';
import { WeeklyTimetableGrid } from '../components/schedule/WeeklyTimetableGrid';
import { hapticForEvent } from '../domain/rules/haptic-rules';
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
import { startActionHaptics } from '../services/haptic-service';
import { useAppStore } from '../store/app-store';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('action vibrations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks finished actions, and stays quiet without a gesture', () => {
    expect(hapticForEvent('REMINDER_COMPLETED')).toBe('success');
    expect(hapticForEvent('ITEM_DELETED')).toBe('warning');
    expect(hapticForEvent('REMINDER_SNOOZED')).toBe('light');
    expect(hapticForEvent('REMINDER_ARRIVED')).toBeNull();
  });

  it('answers announced events until it is stopped', () => {
    const stop = startActionHaptics();

    emitMascotEvent({ type: 'REMINDER_COMPLETED', priority: 'NORMAL' });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');

    emitMascotEvent({ type: 'ITEM_CREATED' });
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');

    stop();
    emitMascotEvent({ type: 'ITEM_DELETED' });
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });
});

describe('swipe actions for screen readers', () => {
  it('exposes the actions on the card, and runs them', () => {
    const onDelete = jest.fn();
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <SwipeableItem
          rightActions={[{ key: 'delete', icon: 'trash-outline', label: 'Supprimer', color: '#DC2626', onPress: onDelete }]}
        >
          <GlowCard onPress={jest.fn()} accessibilityLabel="Rappel">
            <Text>Rappel</Text>
          </GlowCard>
        </SwipeableItem>
      );
    });

    const card = root!.root.findByProps({ accessibilityRole: 'button', accessibilityLabel: 'Rappel' });
    expect(card.props.accessibilityActions).toEqual([{ name: 'delete', label: 'Supprimer' }]);

    act(() => card.props.onAccessibilityAction({ nativeEvent: { actionName: 'delete' } }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('adds nothing to a card outside a swipeable row', () => {
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <GlowCard onPress={jest.fn()} accessibilityLabel="Seule">
          <Text>Seule</Text>
        </GlowCard>
      );
    });

    const card = root!.root.findByProps({ accessibilityRole: 'button', accessibilityLabel: 'Seule' });
    expect(card.props.accessibilityActions).toBeUndefined();
  });
});

describe('timetable grid', () => {
  it.each(['light', 'dark'] as const)('renders in %s mode', mode => {
    act(() => useAppStore.setState({ themeMode: mode }));
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <WeeklyTimetableGrid blocks={[]} onAddBlock={jest.fn()} onDeleteBlock={jest.fn()} />
      );
    });
    expect(root!.toJSON()).toBeTruthy();
  });
});

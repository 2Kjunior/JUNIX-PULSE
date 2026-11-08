/**
 * A birthday makes Pulse celebrate until the user gets in touch with the person: an exchange
 * recorded today ends the party. Back from a call, a message or a mail, one question records
 * that exchange; nothing is recorded without the user's answer.
 */

import React from 'react';
import { AppState, Linking } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import { birthdaysToWish, buildMascotMoodInput, contactedToday } from '@/domain/rules/mascot-day-rules';
import { deriveMascotMood } from '@/domain/rules/mascot-mood-rules';
import { useContactFollowUp } from '@/features/people/use-contact-follow-up';

jest.mock('@/components/feedback/GlassAlert', () => ({ GlassAlert: { alert: jest.fn() } }));

const now = new Date(2026, 10, 8, 15, 0);
const camille = { id: 'camille', displayName: 'Camille', birthDate: '2001-11-08', lastInteractionAt: null as string | null };

const moodWith = (persons: (typeof camille)[]) =>
  deriveMascotMood(
    buildMascotMoodInput({ now, focusState: 'idle', reminders: [], todayTasks: [], persons, daysSinceLastOpen: null })
  ).mood;

describe('birthday party', () => {
  it('celebrates while the birthday has not been wished', () => {
    expect(birthdaysToWish([camille], now)).toEqual([camille]);
    expect(moodWith([camille])).toBe('party');
  });

  it('stops once there was an exchange with the person today', () => {
    const wished = { ...camille, lastInteractionAt: new Date(2026, 10, 8, 10, 30).toISOString() };
    expect(contactedToday(wished.lastInteractionAt, now)).toBe(true);
    expect(birthdaysToWish([wished], now)).toEqual([]);
    expect(moodWith([wished])).toBe('calm');
  });

  it('still celebrates when the last exchange was before today', () => {
    const yesterday = { ...camille, lastInteractionAt: new Date(2026, 10, 7, 21, 0).toISOString() };
    expect(moodWith([yesterday])).toBe('party');
  });

  it('keeps celebrating for another person not wished yet', () => {
    const wished = { ...camille, lastInteractionAt: new Date(2026, 10, 8, 9, 0).toISOString() };
    const leo = { ...camille, id: 'leo', displayName: 'Léo' };
    expect(birthdaysToWish([wished, leo], now).map(person => person.id)).toEqual(['leo']);
  });
});

describe('back from a call', () => {
  let appStateListener: (state: string) => void = () => {};
  const onReached = jest.fn();
  let contact!: ReturnType<typeof useContactFollowUp>;

  function Probe() {
    contact = useContactFollowUp('Camille', onReached);
    return null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, listener: (state: string) => void) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    }) as never);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    act(() => {
      ReactTestRenderer.create(<Probe />);
    });
  });

  it('asks once the user comes back, and records the exchange on "Oui, noter"', () => {
    act(() => contact('CALL', 'tel:+33600000000'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+33600000000');
    appStateListener('background');
    appStateListener('active');

    expect(GlassAlert.alert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = jest.mocked(GlassAlert.alert).mock.calls[0];
    expect(title).toBe('Vous avez pu joindre Camille ?');
    expect(onReached).not.toHaveBeenCalled();
    buttons?.[1].onPress?.();
    expect(onReached).toHaveBeenCalledWith('CALL');

    // Asked once only: a later return asks nothing
    appStateListener('background');
    appStateListener('active');
    expect(GlassAlert.alert).toHaveBeenCalledTimes(1);
  });

  it('asks nothing when the other app never opened', () => {
    act(() => contact('SMS', 'sms:+33600000000'));
    appStateListener('active');
    expect(GlassAlert.alert).not.toHaveBeenCalled();
  });
});

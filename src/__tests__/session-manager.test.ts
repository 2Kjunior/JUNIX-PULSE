/**
 * Tests du cycle de vie de l'animation de lancement (SessionManager et splash-rules).
 * Les tests T1 à T10 de la demande sont couverts ici par leur logique ; leur comportement réel
 * (processus Android, applications récentes) reste à vérifier sur un téléphone.
 */

import * as SecureStore from 'expo-secure-store';

import { shouldReplaySplashOnResume, SPLASH_REPLAY_AFTER_MS } from '@/domain/rules/splash-rules';
import { SessionManager } from '@/services/session/SessionManager';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const T0 = Date.UTC(2026, 10, 4, 10, 0, 0);
const minutes = (count: number) => count * 60 * 1000;

describe('SessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SessionManager._resetForTesting();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it('T1/T7/T9: plays the animation once for each new process, whatever the last activity', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(String(Date.now() - minutes(2)));

    expect(await SessionManager.shouldPlayLaunchSplash()).toBe(true);
    expect(await SessionManager.shouldPlayLaunchSplash()).toBe(false);
  });

  it.each([
    ['T2', minutes(2), false],
    ['T3', minutes(10), false],
    ['T4', minutes(15) - 1000, false],
    ['T5', minutes(15), true],
    ['T6', minutes(20), true],
  ])('%s: back after the given time in the background', async (_test, away, expected) => {
    await SessionManager.recordBackground(T0);

    expect(SessionManager.consumeResumeSplash(T0 + away)).toBe(expected);
  });

  it('T10: counts from the first move to the background, and triggers only once', async () => {
    await SessionManager.recordBackground(T0);
    await SessionManager.recordBackground(T0 + minutes(10));

    expect(SessionManager.consumeResumeSplash(T0 + minutes(16))).toBe(true);
    expect(SessionManager.consumeResumeSplash(T0 + minutes(16))).toBe(false);
  });

  it('T10: never triggers on a return without a stay in the background', () => {
    expect(SessionManager.consumeResumeSplash(T0)).toBe(false);
  });

  it('keeps working when the secure store fails', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

    expect(await SessionManager.shouldPlayLaunchSplash()).toBe(true);
    await SessionManager.recordBackground(T0);
    expect(SessionManager.consumeResumeSplash(T0 + minutes(20))).toBe(true);
  });
});

describe('shouldReplaySplashOnResume', () => {
  it('treats a clock set back as a long absence', () => {
    expect(shouldReplaySplashOnResume(T0, T0 - minutes(1))).toBe(true);
  });

  it('uses 15 minutes', () => {
    expect(SPLASH_REPLAY_AFTER_MS).toBe(minutes(15));
  });
});

/**
 * Tests unitaires pour SessionManager.
 *
 * Couvre :
 * 1. Premier démarrage (cold start) -> joue le splash (true)
 * 2. Second appel dans le même processus JS -> ne joue pas (false)
 * 3. Reprise après inactivité < 15 minutes -> ne joue pas (false)
 * 4. Reprise après inactivité >= 15 minutes -> joue le splash (true)
 * 5. Résilience en cas d'erreur de stockage persistant
 */

import * as SecureStore from 'expo-secure-store';
import { SessionManager, SESSION_INACTIVITY_TIMEOUT_MS } from '@/services/session/SessionManager';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe('SessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SessionManager._resetForTesting();
  });

  it('joue le splash au premier lancement si aucun stockage', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const shouldPlay = await SessionManager.shouldPlayLaunchSplash();
    expect(shouldPlay).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it('ne joue pas le splash si déjà joué dans le même processus', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    // Premier appel
    await SessionManager.shouldPlayLaunchSplash();

    // Deuxième appel immédiat
    const shouldPlaySecond = await SessionManager.shouldPlayLaunchSplash();
    expect(shouldPlaySecond).toBe(false);
  });

  it('ne joue pas le splash si la dernière activité date de moins de 15 minutes', async () => {
    const recentTime = Date.now() - 5 * 60 * 1000; // Il y a 5 minutes
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(String(recentTime));

    const shouldPlay = await SessionManager.shouldPlayLaunchSplash();
    expect(shouldPlay).toBe(false);
  });

  it('joue le splash si l inactivité dépasse 15 minutes', async () => {
    const oldTime = Date.now() - (SESSION_INACTIVITY_TIMEOUT_MS + 1000); // 15 min + 1s
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(String(oldTime));

    const shouldPlay = await SessionManager.shouldPlayLaunchSplash();
    expect(shouldPlay).toBe(true);
  });

  it('gère silencieusement les erreurs de SecureStore sans crash', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const shouldPlay = await SessionManager.shouldPlayLaunchSplash();
    // Par défaut, doit jouer sans faire crasher l'app
    expect(shouldPlay).toBe(true);
  });

  it('enregistre l horodatage lors de recordBackground et recordActive', async () => {
    await SessionManager.recordActive();
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);

    await SessionManager.recordBackground();
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });
});


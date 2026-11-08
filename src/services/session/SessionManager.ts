/**
 * SessionManager — Cycle de vie de l'application et animation de lancement.
 *
 * Règles :
 * 1. Nouveau processus (premier lancement, application fermée depuis les récentes ou arrêtée par
 *    Android) : l'animation se joue. La navigation repart alors de zéro, l'animation reste cohérente.
 * 2. Retour d'arrière-plan avant 15 minutes : aucune animation, l'écran en cours est conservé.
 * 3. Retour d'arrière-plan après 15 minutes ou plus : l'animation se rejoue par-dessus l'écran en
 *    cours, sans rien démonter.
 * Le délai part du passage en arrière-plan (« background »), jamais de l'état « inactive » (volet de
 * notifications, sélecteur d'applications).
 */

import * as SecureStore from 'expo-secure-store';

import { shouldReplaySplashOnResume, SPLASH_REPLAY_AFTER_MS } from '@/domain/rules/splash-rules';

/** Durée d'absence en arrière-plan à partir de laquelle l'animation se rejoue (15 minutes). */
export const SESSION_INACTIVITY_TIMEOUT_MS = SPLASH_REPLAY_AFTER_MS;

const STORAGE_KEY_LAST_ACTIVE = 'junix_pulse_last_active_at';

let hasPlayedSplashInProcess = false;
// When this process started: the mascot wakes up with the user for a few minutes after it
let launchedAt: number | null = null;
let backgroundAt: number | null = null;

// Dernière activité connue AU DÉMARRAGE du process, lue avant que recordActive() ne l'écrase.
// Sert à savoir depuis combien de jours l'utilisateur n'avait pas ouvert l'application.
let previousLastActiveAt: number | null = null;
let previousLastActiveLoaded = false;

async function loadPreviousLastActive(): Promise<void> {
  if (previousLastActiveLoaded) return;
  previousLastActiveLoaded = true;
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY_LAST_ACTIVE);
    const value = stored ? parseInt(stored, 10) : NaN;
    previousLastActiveAt = Number.isNaN(value) ? null : value;
  } catch {
    previousLastActiveAt = null;
  }
}

async function persistActivity(at: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY_LAST_ACTIVE, String(at));
  } catch {
    // Silencieux si SecureStore indisponible : seul le décompte en jours en dépend
  }
}

export const SessionManager = {
  /**
   * Au démarrage d'un processus : l'animation se joue, une seule fois par processus.
   */
  async shouldPlayLaunchSplash(): Promise<boolean> {
    // À lire avant tout : recordActive() écrase la valeur persistée
    await loadPreviousLastActive();
    if (hasPlayedSplashInProcess) return false;
    hasPlayedSplashInProcess = true;
    launchedAt = Date.now();
    await this.recordActive();
    return true;
  },

  /**
   * Nombre de jours entiers écoulés entre la dernière activité d'avant ce lancement et maintenant.
   * Retourne null à la toute première ouverture ou si la valeur n'est pas disponible.
   */
  getDaysSinceLastOpen(now: number = Date.now()): number | null {
    if (previousLastActiveAt === null) return null;
    return Math.max(0, Math.floor((now - previousLastActiveAt) / (24 * 60 * 60 * 1000)));
  },

  /** When this launch happened, or null before the first one. */
  getLaunchedAt(): number | null {
    return launchedAt;
  },

  /**
   * Enregistre l'horodatage actuel comme dernier moment actif.
   */
  async recordActive(now: number = Date.now()): Promise<void> {
    await persistActivity(now);
  },

  /**
   * L'application passe en arrière-plan : le délai de 15 minutes part de maintenant.
   * Un second passage sans retour au premier plan ne le repousse pas.
   */
  async recordBackground(now: number = Date.now()): Promise<void> {
    if (backgroundAt === null) backgroundAt = now;
    await persistActivity(now);
  },

  /**
   * Retour au premier plan : indique si l'animation doit se rejouer, puis remet le délai à zéro.
   * Un retour sans passage préalable en arrière-plan ne déclenche jamais rien.
   */
  consumeResumeSplash(now: number = Date.now()): boolean {
    const replay = shouldReplaySplashOnResume(backgroundAt, now);
    backgroundAt = null;
    void persistActivity(now);
    return replay;
  },

  /**
   * Réinitialise les états de session (tests unitaires uniquement).
   */
  _resetForTesting(): void {
    hasPlayedSplashInProcess = false;
    launchedAt = null;
    backgroundAt = null;
    previousLastActiveAt = null;
    previousLastActiveLoaded = false;
  },
};

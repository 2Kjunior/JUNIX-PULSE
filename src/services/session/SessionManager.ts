/**
 * SessionManager — Gestion du cycle de vie et de l'inactivité de session Junix Pulse.
 *
 * Responsabilités :
 * 1. Mémoriser l'heure de dernière activité de l'utilisateur (mémoire vive + SecureStore).
 * 2. Déterminer si un démarrage nécessite le Splash complet (4 secondes) ou un accès direct.
 *    - Cold start (> 15 min d'inactivité ou première ouverture) : Splash complet.
 *    - Reprise de session (< 15 min d'inactivité) : Démarrage instantané sans splash ni son.
 * 3. Enregistrer les transitions d'état de l'application (AppState : active / background).
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

/** Durée maximale d'inactivité avant de considérer qu'il s'agit d'une nouvelle session (15 minutes) */
export const SESSION_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

const STORAGE_KEY_LAST_ACTIVE = 'junix_pulse_last_active_at';

// Cache mémoire vive (survit pendant toute la durée où le runtime JS est en vie)
let memoryLastActiveAt: number | null = null;
let hasPlayedSplashInProcess = false;

export const SessionManager = {
  /**
   * Indique si l'animation de splash (4s avec son) doit être jouée.
   * Retourne true pour un premier démarrage à froid ou après > 15 minutes d'inactivité.
   * Retourne false si l'utilisateur a utilisé l'application récemment (< 15 min).
   */
  async shouldPlayLaunchSplash(): Promise<boolean> {
    // Si le splash a déjà été joué dans ce process JS en cours, ne jamais le rejouer
    if (hasPlayedSplashInProcess) {
      return false;
    }

    try {
      const now = Date.now();

      // 1. Vérifier le cache mémoire
      if (memoryLastActiveAt !== null) {
        const elapsed = now - memoryLastActiveAt;
        if (elapsed < SESSION_INACTIVITY_TIMEOUT_MS) {
          logger.info(`[SessionManager] Reprise mémoire (${Math.round(elapsed / 1000)}s) — Splash ignoré`);
          hasPlayedSplashInProcess = true;
          return false;
        }
      }

      // 2. Vérifier le stockage persistant (au cas où l'OS a tué le process en arrière-plan)
      const stored = await SecureStore.getItemAsync(STORAGE_KEY_LAST_ACTIVE);
      if (stored) {
        const lastActiveTime = parseInt(stored, 10);
        if (!isNaN(lastActiveTime)) {
          const elapsed = now - lastActiveTime;
          if (elapsed < SESSION_INACTIVITY_TIMEOUT_MS) {
            logger.info(`[SessionManager] Reprise session persistée (${Math.round(elapsed / 1000)}s) — Splash ignoré`);
            memoryLastActiveAt = now;
            hasPlayedSplashInProcess = true;
            return false;
          }
        }
      }

      // Première ouverture ou inactivité dépassée
      hasPlayedSplashInProcess = true;
      await this.recordActive();
      return true;
    } catch {
      // Tolérance : en cas d'erreur de lecture, jouer le splash par défaut
      hasPlayedSplashInProcess = true;
      return true;
    }
  },

  /**
   * Enregistre l'horodatage actuel comme étant le dernier moment actif.
   */
  async recordActive(): Promise<void> {
    const now = Date.now();
    memoryLastActiveAt = now;
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_LAST_ACTIVE, String(now));
    } catch {
      // Silencieux si SecureStore indisponible
    }
  },

  /**
   * Enregistre le moment où l'application passe en arrière-plan.
   */
  async recordBackground(): Promise<void> {
    await this.recordActive();
  },

  /**
   * Réinitialise les états de session (utilisé principalement pour les tests unitaires).
   */
  _resetForTesting(): void {
    memoryLastActiveAt = null;
    hasPlayedSplashInProcess = false;
  },
};


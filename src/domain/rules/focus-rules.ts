/**
 * Règles métier pures pour le Focus Timer / Minuteur Pomodoro.
 * 
 * Invariants :
 * - Deux modes exclusifs de sélection : 'preset' (raccourcis types) et 'custom' (ajustement libre).
 * - L'ajustement libre bascule automatiquement le mode en 'custom'.
 * - La sélection d'un preset bascule automatiquement le mode en 'preset'.
 * - Fonctions pures déterministes, testables indépendamment de React et SQLite.
 */

export type FocusSelectionMode = 'preset' | 'custom';
export type FocusState = 'idle' | 'running' | 'paused' | 'completed';

export const FOCUS_PRESETS = [5, 15, 25, 50] as const;
export type FocusPreset = (typeof FOCUS_PRESETS)[number];

export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 120;
export const DEFAULT_FOCUS_MINUTES = 25;

export interface FocusSession {
  taskId?: string;
  taskTitle?: string;
  durationMinutes: number;
  selectionMode: FocusSelectionMode;
  remainingSeconds: number;
  state: FocusState;
  completedAt?: string;
}

/**
 * Initialise une session de focus dans un état prêt (idle).
 */
export function createFocusSession(params?: {
  durationMinutes?: number;
  selectionMode?: FocusSelectionMode;
  taskId?: string;
  taskTitle?: string;
}): FocusSession {
  const duration = Math.min(
    MAX_FOCUS_MINUTES,
    Math.max(MIN_FOCUS_MINUTES, params?.durationMinutes ?? DEFAULT_FOCUS_MINUTES)
  );
  const selectionMode = params?.selectionMode ?? 'preset';

  return {
    taskId: params?.taskId,
    taskTitle: params?.taskTitle,
    durationMinutes: duration,
    selectionMode,
    remainingSeconds: duration * 60,
    state: 'idle',
  };
}

/**
 * Applique un preset de durée et bascule de manière exclusive en mode 'preset'.
 */
export function applyPreset(session: FocusSession, presetMinutes: FocusPreset): FocusSession {
  return {
    ...session,
    durationMinutes: presetMinutes,
    selectionMode: 'preset',
    remainingSeconds: presetMinutes * 60,
    state: 'idle',
    completedAt: undefined,
  };
}

/**
 * Ajuste librement la durée par un delta (ex: +1, -1, +5, -5 min).
 * Bascule de manière exclusive en mode 'custom'.
 */
export function applyCustomAdjustment(
  session: FocusSession,
  deltaMinutes: number,
  minMinutes: number = MIN_FOCUS_MINUTES,
  maxMinutes: number = MAX_FOCUS_MINUTES
): FocusSession {
  const nextDuration = Math.min(
    maxMinutes,
    Math.max(minMinutes, session.durationMinutes + deltaMinutes)
  );

  return {
    ...session,
    durationMinutes: nextDuration,
    selectionMode: 'custom',
    remainingSeconds: nextDuration * 60,
    state: 'idle',
    completedAt: undefined,
  };
}

/**
 * Démarre ou reprend la session de focus.
 */
export function startFocusSession(session: FocusSession): FocusSession {
  if (session.state === 'running') return session;

  // Si la session était déjà complétée, on la redémarre depuis le début
  if (session.state === 'completed' || session.remainingSeconds <= 0) {
    return {
      ...session,
      state: 'running',
      remainingSeconds: session.durationMinutes * 60,
      completedAt: undefined,
    };
  }

  return {
    ...session,
    state: 'running',
  };
}

/**
 * Met en pause la session de focus si elle est en cours.
 */
export function pauseFocusSession(session: FocusSession): FocusSession {
  if (session.state !== 'running') return session;

  return {
    ...session,
    state: 'paused',
  };
}

/**
 * Réinitialise la session à sa durée initiale et à l'état idle.
 */
export function resetFocusSession(session: FocusSession): FocusSession {
  return {
    ...session,
    state: 'idle',
    remainingSeconds: session.durationMinutes * 60,
    completedAt: undefined,
  };
}

/**
 * Fait avancer le décompte d'une seconde (tick d'horloge).
 * Si le temps restant atteint 0, passe l'état à 'completed'.
 */
export function tickFocusSession(session: FocusSession, now: Date = new Date()): FocusSession {
  if (session.state !== 'running') return session;

  if (session.remainingSeconds <= 1) {
    return {
      ...session,
      remainingSeconds: 0,
      state: 'completed',
      completedAt: now.toISOString(),
    };
  }

  return {
    ...session,
    remainingSeconds: session.remainingSeconds - 1,
  };
}

/**
 * Formate les secondes restantes au format MM:SS.
 */
export function formatRemainingTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;

  const formattedMins = mins.toString().padStart(2, '0');
  const formattedSecs = secs.toString().padStart(2, '0');

  return `${formattedMins}:${formattedSecs}`;
}

/**
 * Calcule la progression accomplie de la session (entre 0 et 1).
 * 0 = début de session, 1 = session entièrement complétée.
 */
export function calculateFocusProgress(remainingSeconds: number, totalDurationMinutes: number): number {
  const totalSeconds = totalDurationMinutes * 60;
  if (totalSeconds <= 0) return 1;

  const elapsedSeconds = totalSeconds - Math.max(0, remainingSeconds);
  const progress = elapsedSeconds / totalSeconds;

  return Math.min(1, Math.max(0, progress));
}

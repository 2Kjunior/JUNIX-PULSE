/**
 * Store Zustand pour l'état UI global de Junix Pulse.
 * Principe : le store contient l'état d'interface (loading, selections, snackbar).
 * Les données métier viennent des repositories via des hooks locaux.
 */

import { create } from 'zustand';
import { AppearanceMode } from '@/domain/entities';

// ─── Snackbar (undo de suppression, confirmations) ────────────────────────────

export interface SnackbarState {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

// ─── État global de l'application ────────────────────────────────────────────

interface AppStore {
  // Initialisation de la base de données
  dbReady: boolean;
  dbError: string | null;
  setDbReady: (ready: boolean) => void;
  setDbError: (error: string | null) => void;

  // Onboarding
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;

  // Thème & Apparence
  themeMode: AppearanceMode;
  setThemeMode: (mode: AppearanceMode) => void;

  // Snackbar global
  snackbar: SnackbarState | null;
  showSnackbar: (message: string, options?: {
    actionLabel?: string;
    onAction?: () => void;
    durationMs?: number;
  }) => void;
  hideSnackbar: () => void;

  // Timezone de l'utilisateur
  userTimezone: string;
  setUserTimezone: (tz: string) => void;

  // Temps de focus du jour (en minutes)
  todayFocusMinutes: number;
  addFocusMinutes: (minutes: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // DB
  dbReady: false,
  dbError: null,
  setDbReady: (ready) => set({ dbReady: ready }),
  setDbError: (error) => set({ dbError: error }),

  // Onboarding
  onboardingComplete: false,
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),

  // Thème & Apparence (valeur par défaut : sombre)
  themeMode: 'dark',
  setThemeMode: (mode) => set({ themeMode: mode }),

  // Snackbar
  snackbar: null,
  showSnackbar: (message, options = {}) => set({
    snackbar: {
      visible: true,
      message,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      durationMs: options.durationMs ?? 4000,
    },
  }),
  hideSnackbar: () => set({ snackbar: null }),

  // Timezone
  userTimezone: 'UTC',
  setUserTimezone: (tz) => set({ userTimezone: tz }),

  // Focus
  todayFocusMinutes: 0,
  addFocusMinutes: (minutes) => set((s) => ({ todayFocusMinutes: s.todayFocusMinutes + minutes })),
}));


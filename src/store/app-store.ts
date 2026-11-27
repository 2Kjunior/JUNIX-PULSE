/**
 * Store Zustand pour l'état UI global de Junix Pulse.
 * Principe : le store contient l'état d'interface (loading, selections, snackbar).
 * Les données métier viennent des repositories via des hooks locaux.
 */

import { create } from 'zustand';
import { AppearanceMode } from '@/domain/entities';
import { DEFAULT_COLOR_CHOICE, type ColorChoice } from '@/constants/color-themes';
import type { AppLanguage, LanguageSetting } from '@/domain/rules/language-rules';

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
  /** Glass turned off in the settings: cards and bars on a plain background. */
  reduceTransparency: boolean;
  setReduceTransparency: (reduce: boolean) => void;
  /** The coloured halos behind the pages (sheet 041). */
  ambientBackground: boolean;
  setAmbientBackground: (on: boolean) => void;
  /** The colour theme and the colours changed by hand (sheet 042). */
  colorChoice: ColorChoice;
  setColorChoice: (choice: ColorChoice) => void;

  // Langue : le choix de la personne, et la langue qui en résulte (celle du téléphone sur « auto »)
  languageSetting: LanguageSetting;
  language: AppLanguage;
  setLanguage: (setting: LanguageSetting, resolved: AppLanguage) => void;

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
  reduceTransparency: false,
  setReduceTransparency: (reduce) => set({ reduceTransparency: reduce }),
  ambientBackground: true,
  setAmbientBackground: (on) => set({ ambientBackground: on }),
  colorChoice: DEFAULT_COLOR_CHOICE,
  setColorChoice: (choice) => set({ colorChoice: choice }),

  // Langue
  languageSetting: 'auto',
  language: 'fr',
  setLanguage: (setting, resolved) => set({ languageSetting: setting, language: resolved }),

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
}));


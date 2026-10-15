/**
 * Hook d'accès au thème actif pour Junix Pulse.
 * Connecte le mode choisi par l'utilisateur (Zustand), le scheme système (useColorScheme),
 * et la palette correspondante (ThemePalette).
 */

import { useMemo } from 'react';
import { darkPalette, lightPalette, ThemePalette } from '@/constants/palettes';
import { AppearanceMode } from '@/domain/entities';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/app-store';
import { resolveScheme } from '@/utils/color';

export interface UseThemeResult {
  /** Palette sémantique active complète */
  theme: ThemePalette;
  /** Alias vers theme */
  palette: ThemePalette;
  /** Scheme résolu effectif ('light' | 'dark') */
  mode: 'light' | 'dark';
  /** Indique si le mode sombre est actif */
  isDark: boolean;
  /** Réglage utilisateur courant ('system' | 'light' | 'dark') */
  themeMode: AppearanceMode;
  /** Méthode pour changer le mode */
  setThemeMode: (mode: AppearanceMode) => void;

  // ── Raccourcis directs vers les sections clés de la palette ──
  surface: ThemePalette['surface'];
  onSurface: ThemePalette['onSurface'];
  outline: ThemePalette['outline'];
  primary: ThemePalette['primary'];
  tertiary: ThemePalette['tertiary'];
  error: ThemePalette['error'];
  success: ThemePalette['success'];
  priority: ThemePalette['priority'];
  gradient: ThemePalette['gradient'];
  glowCard: ThemePalette['glowCard'];
  glass: ThemePalette['glass'];
  shadow: ThemePalette['shadow'];
  backgroundGlow: ThemePalette['backgroundGlow'];
}

export function useTheme(): UseThemeResult {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const systemScheme = useColorScheme();

  const mode = useMemo(
    () => resolveScheme(themeMode, systemScheme),
    [themeMode, systemScheme]
  );

  const theme = mode === 'light' ? lightPalette : darkPalette;

  return useMemo(
    () => ({
      theme,
      palette: theme,
      mode,
      isDark: mode === 'dark',
      themeMode,
      setThemeMode,
      surface: theme.surface,
      onSurface: theme.onSurface,
      outline: theme.outline,
      primary: theme.primary,
      tertiary: theme.tertiary,
      error: theme.error,
      success: theme.success,
      priority: theme.priority,
      gradient: theme.gradient,
      glowCard: theme.glowCard,
      glass: theme.glass,
      shadow: theme.shadow,
      backgroundGlow: theme.backgroundGlow,
    }),
    [theme, mode, themeMode, setThemeMode]
  );
}

export { useThemedStyles } from './use-themed-styles';


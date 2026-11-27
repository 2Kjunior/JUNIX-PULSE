/**
 * Hook d'accès au thème actif pour Junix Pulse.
 * Connecte le mode choisi par l'utilisateur (Zustand), le scheme système (useColorScheme),
 * et la palette correspondante (ThemePalette).
 */

import { useMemo } from 'react';
import { isDefaultColorChoice, resolveThemeColors } from '@/constants/color-themes';
import { colorize, darkPalette, lightPalette, neutralOf, ThemePalette } from '@/constants/palettes';
import { AppearanceMode } from '@/domain/entities';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/app-store';
import { resolveScheme } from '@/utils/color';


/** Neutre in the colours of Junix (sheet 041). */
const NEUTRAL_PALETTE = neutralOf(lightPalette);

export interface UseThemeResult {
  /** Palette sémantique active complète */
  theme: ThemePalette;
  /** Alias vers theme */
  palette: ThemePalette;
  /** Scheme résolu effectif ('light' | 'dark') */
  mode: 'light' | 'dark';
  /** Indique si le mode sombre est actif */
  isDark: boolean;
  /** Neutre: plain, without glow, glass nor ambient background (sheet 041) */
  isNeutral: boolean;
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
}

export function useTheme(): UseThemeResult {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const systemScheme = useColorScheme();

  const mode = useMemo(
    () => resolveScheme(themeMode, systemScheme),
    [themeMode, systemScheme]
  );

  const colorChoice = useAppStore((s) => s.colorChoice);

  // The palette in the colours of the theme (sheet 042); Neutre is the light one made plain (sheet 041)
  const theme = useMemo(() => {
    // Junix: the palettes as they are, the same objects as before
    if (isDefaultColorChoice(colorChoice)) {
      return themeMode === 'neutral' ? NEUTRAL_PALETTE : mode === 'light' ? lightPalette : darkPalette;
    }
    const colors = resolveThemeColors(colorChoice);
    if (themeMode === 'neutral') return neutralOf(colorize(lightPalette, colors));
    return colorize(mode === 'light' ? lightPalette : darkPalette, colors);
  }, [colorChoice, themeMode, mode]);

  return useMemo(
    () => ({
      theme,
      palette: theme,
      mode,
      isDark: mode === 'dark',
      isNeutral: themeMode === 'neutral',
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
    }),
    [theme, mode, themeMode, setThemeMode]
  );
}


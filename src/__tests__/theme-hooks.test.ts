/**
 * Tests unitaires pour le système de thème et les hooks globaux (Phase P3 tranche 1).
 *
 * Couverture :
 * - useAppStore.themeMode et setThemeMode.
 * - useTheme() : résolution du mode effectif (dark, light, system).
 * - useThemedStyles() : appel et mémoïsation de makeStyles(theme).
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { darkPalette, lightPalette } from '../constants/palettes';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { useAppStore } from '../store/app-store';

// Mock de useColorScheme
const mockColorScheme = jest.fn<string | null, []>();
jest.mock('../hooks/use-color-scheme', () => ({
  useColorScheme: () => mockColorScheme(),
}));

function renderHook<T>(hook: () => T) {
  const result = {} as { current: T };
  function TestComponent() {
    result.current = hook();
    return null;
  }
  let root: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    root = ReactTestRenderer.create(React.createElement(TestComponent));
  });
  return {
    result,
    rerender: () => {
      act(() => {
        root.update(React.createElement(TestComponent));
      });
    },
  };
}

describe('Phase P3 — Hooks de thème et Zustand store', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.setState({ themeMode: 'dark' });
    });
    mockColorScheme.mockReturnValue('dark');
  });

  describe('useAppStore — themeMode', () => {
    it('initialise themeMode à "dark" par défaut', () => {
      const mode = useAppStore.getState().themeMode;
      expect(mode).toBe('dark');
    });

    it('setThemeMode met à jour themeMode', () => {
      act(() => {
        useAppStore.getState().setThemeMode('light');
      });
      expect(useAppStore.getState().themeMode).toBe('light');

      act(() => {
        useAppStore.getState().setThemeMode('system');
      });
      expect(useAppStore.getState().themeMode).toBe('system');
    });
  });

  describe('useTheme()', () => {
    it('en mode "dark", retourne la darkPalette même si le système est clair', () => {
      mockColorScheme.mockReturnValue('light');
      act(() => {
        useAppStore.setState({ themeMode: 'dark' });
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.mode).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(result.current.theme).toBe(darkPalette);
      expect(result.current.surface.base).toBe(darkPalette.surface.base);
    });

    it('en mode "light", retourne la lightPalette même si le système est sombre', () => {
      mockColorScheme.mockReturnValue('dark');
      act(() => {
        useAppStore.setState({ themeMode: 'light' });
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.mode).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(result.current.theme).toBe(lightPalette);
      expect(result.current.surface.base).toBe(lightPalette.surface.base);
    });

    it('en mode "system", suit le système d\'exploitation', () => {
      act(() => {
        useAppStore.setState({ themeMode: 'system' });
      });

      mockColorScheme.mockReturnValue('light');
      const { result, rerender } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('light');
      expect(result.current.theme).toBe(lightPalette);

      mockColorScheme.mockReturnValue('dark');
      rerender();
      expect(result.current.mode).toBe('dark');
      expect(result.current.theme).toBe(darkPalette);
    });

    it('en mode "system" avec système null/unspecified, repli sur "dark"', () => {
      act(() => {
        useAppStore.setState({ themeMode: 'system' });
      });
      mockColorScheme.mockReturnValue(null);

      const { result } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(result.current.theme).toBe(darkPalette);
    });
  });

  describe('useThemedStyles()', () => {
    it('exécute makeStyles avec la palette active', () => {
      act(() => {
        useAppStore.setState({ themeMode: 'light' });
      });

      const makeStyles = jest.fn((t) => ({
        container: { backgroundColor: t.surface.base },
      }));

      const { result } = renderHook(() => useThemedStyles(makeStyles));

      expect(makeStyles).toHaveBeenCalledWith(lightPalette);
      expect(result.current.container.backgroundColor).toBe(lightPalette.surface.base);
    });

    it('recalcule les styles lorsque le thème change', () => {
      act(() => {
        useAppStore.setState({ themeMode: 'dark' });
      });

      const makeStyles = (t: typeof darkPalette) => ({
        bg: t.surface.base,
      });

      const { result, rerender } = renderHook(() => useThemedStyles(makeStyles));
      expect(result.current.bg).toBe(darkPalette.surface.base);

      act(() => {
        useAppStore.setState({ themeMode: 'light' });
      });
      rerender();
      expect(result.current.bg).toBe(lightPalette.surface.base);
    });
  });
});

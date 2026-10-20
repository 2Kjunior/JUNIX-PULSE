/**
 * Tests unitaires pour palettes.ts et color.ts.
 *
 * Couverture :
 * - Vérification structurelle : darkPalette et lightPalette ont les mêmes clés.
 * - hexToRgba : conversions basiques (#RGB, #RRGGBB, avec/sans alpha).
 * - withAlpha : alias de hexToRgba.
 * - luminance : valeurs connues (noir, blanc, gris moyen).
 * - contrastRatio : matrice texte × surfaces ≥ 4.5:1 WCAG AA.
 * - resolveAccent : identité en sombre, fallback en clair si contraste < 3:1.
 * - resolveScheme : 3 modes × 4 valeurs système.
 */

import { darkPalette, lightPalette } from '../constants/palettes';
import {
  hexToRgba,
  withAlpha,
  luminance,
  contrastRatio,
  resolveAccent,
  resolveScheme,
} from '../utils/color';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDeepKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return getDeepKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

// ─── Palettes : vérification structurelle ────────────────────────────────────

describe('palettes structure', () => {
  test('darkPalette et lightPalette ont exactement les mêmes clés', () => {
    const darkKeys = getDeepKeys(darkPalette as unknown as Record<string, unknown>).sort();
    const lightKeys = getDeepKeys(lightPalette as unknown as Record<string, unknown>).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  test('darkPalette.mode === "dark"', () => {
    expect(darkPalette.mode).toBe('dark');
  });

  test('lightPalette.mode === "light"', () => {
    expect(lightPalette.mode).toBe('light');
  });
});

// ─── hexToRgba ───────────────────────────────────────────────────────────────

describe('hexToRgba', () => {
  test('#RRGGBB sans alpha → alpha 1', () => {
    expect(hexToRgba('#D0BCFF')).toBe('rgba(208, 188, 255, 1.00)');
  });

  test('#RRGGBB avec alpha explicite', () => {
    expect(hexToRgba('#D0BCFF', 0.5)).toBe('rgba(208, 188, 255, 0.50)');
  });

  test('#RGB → expansion correcte', () => {
    expect(hexToRgba('#FFF')).toBe('rgba(255, 255, 255, 1.00)');
    expect(hexToRgba('#000')).toBe('rgba(0, 0, 0, 1.00)');
  });

  test('#RRGGBBAA → alpha calculé depuis les hex', () => {
    // 80 hex = 128 / 255 ≈ 0.50
    const result = hexToRgba('#D0BCFF80');
    expect(result).toMatch(/rgba\(208, 188, 255, 0\.5\d\)/);
  });

  test('format invalide → erreur', () => {
    expect(() => hexToRgba('#GG')).toThrow('Format hex invalide');
  });
});

// ─── withAlpha ───────────────────────────────────────────────────────────────

describe('withAlpha', () => {
  test('est un alias de hexToRgba', () => {
    expect(withAlpha('#141317', 0.3)).toBe(hexToRgba('#141317', 0.3));
  });
});

// ─── luminance ───────────────────────────────────────────────────────────────

describe('luminance', () => {
  test('noir pur → ~0', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 4);
  });

  test('blanc pur → 1', () => {
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 4);
  });

  test('gris moyen (#808080) → entre 0.2 et 0.25', () => {
    const l = luminance('#808080');
    expect(l).toBeGreaterThan(0.2);
    expect(l).toBeLessThan(0.25);
  });
});

// ─── contrastRatio ───────────────────────────────────────────────────────────

describe('contrastRatio', () => {
  test('noir vs blanc → 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  test('texte primaire clair (#1C1917) sur crème (#FBF7F2) → ≥ 14', () => {
    expect(contrastRatio('#1C1917', '#FBF7F2')).toBeGreaterThan(14);
  });

  test('texte variant clair (#57534E) sur crème (#FBF7F2) → ≥ 4.5 (WCAG AA)', () => {
    expect(contrastRatio('#57534E', '#FBF7F2')).toBeGreaterThanOrEqual(4.5);
  });

  test('violet profond (#6B46C1) sur crème (#FBF7F2) → ≥ 4.5 (WCAG AA)', () => {
    expect(contrastRatio('#6B46C1', '#FBF7F2')).toBeGreaterThanOrEqual(4.5);
  });

  test('teal (#0E7490) sur crème (#FBF7F2) → ≥ 4.5 (WCAG AA)', () => {
    expect(contrastRatio('#0E7490', '#FBF7F2')).toBeGreaterThanOrEqual(4.5);
  });

  test('texte primaire sombre (#E6E1E7) sur surface (#141317) → ≥ 10', () => {
    expect(contrastRatio('#E6E1E7', '#141317')).toBeGreaterThan(10);
  });

  test('texte blanc (#FFFFFF) sur début dégradé sombre (#7C3AED) → ≥ 4.5 (WCAG AA)', () => {
    expect(contrastRatio('#FFFFFF', darkPalette.gradient.primary[0])).toBeGreaterThanOrEqual(4.5);
  });

  test('texte disabled clair (#736D68) sur crème (#FBF7F2) → ≥ 4.5 (WCAG AA)', () => {
    expect(contrastRatio(lightPalette.onSurface.disabled, lightPalette.surface.base)).toBeGreaterThanOrEqual(4.5);
  });
});

// ─── resolveAccent ───────────────────────────────────────────────────────────

describe('resolveAccent', () => {
  test('en sombre → identité (la couleur stockée est retournée telle quelle)', () => {
    expect(resolveAccent('#D0BCFF', 'dark')).toBe('#D0BCFF');
    expect(resolveAccent('#FBBF24', 'dark')).toBe('#FBBF24');
  });

  test('en clair, couleur avec bon contraste → conservée', () => {
    // #4A3780 (sombre) a un très bon contraste sur crème
    expect(resolveAccent('#4A3780', 'light')).toBe('#4A3780');
  });

  test('en clair, couleur pastel → fallback', () => {
    // #D0BCFF (violet pastel) a un contraste < 3:1 sur crème → fallback
    const result = resolveAccent('#D0BCFF', 'light', '#FBF7F2', '#6B46C1', 3.0);
    expect(result).toBe('#6B46C1');
  });
});

// ─── resolveScheme ───────────────────────────────────────────────────────────

describe('resolveScheme', () => {
  test('light → toujours light', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('light', 'light')).toBe('light');
    expect(resolveScheme('light', null)).toBe('light');
  });

  test('dark → toujours dark', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('dark', 'dark')).toBe('dark');
    expect(resolveScheme('dark', null)).toBe('dark');
  });

  test('system → suit le système', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
  });

  test('system + null → fallback dark', () => {
    expect(resolveScheme('system', null)).toBe('dark');
  });
});

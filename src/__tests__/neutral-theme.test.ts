import { lightPalette, neutralOf } from '../constants/palettes';
import { contrastRatio, resolveScheme } from '../utils/color';

describe('the Neutre theme (sheet 041)', () => {
  const neutral = neutralOf(lightPalette);

  it('is a light theme for everything that asks light or dark', () => {
    expect(resolveScheme('neutral', 'dark')).toBe('light');
    expect(resolveScheme('neutral', null)).toBe('light');
    expect(neutral.mode).toBe('light');
  });

  it('keeps its texts readable on the page and on the cards (4.5:1 at least)', () => {
    for (const background of [neutral.surface.base, neutral.surface.container]) {
      expect(contrastRatio(neutral.onSurface.primary, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(neutral.onSurface.variant, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(neutral.onSurface.disabled, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(neutral.primary.default, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('is plain: no glow, no glass, a flat gradient', () => {
    expect(neutral.glowCard.cornerGlowEnabled).toBe(false);
    expect(neutral.glowCard.haloEnabled).toBe(false);
    expect(neutral.glass.card.backgroundColor).toBe('#FFFFFF');
    expect(neutral.gradient.primary[0]).toBe(neutral.gradient.primary[1]);
  });
});

import {
  COLOR_THEMES,
  COLOR_THEME_IDS,
  DEFAULT_COLOR_CHOICE,
  haloColorsOf,
  isDefaultColorChoice,
  parseColorChoice,
  resolveThemeColors,
  SWATCH_IDS,
  SWATCHES,
} from '../constants/color-themes';
import { AMBIENT_HALOS } from '../constants/ambient';
import { colorize, darkPalette, lightPalette, neutralOf } from '../constants/palettes';
import { contrastRatio, mixHex } from '../utils/color';
import { MOOD_VISUALS, moodVisualOf } from '../features/mascot/mascot-visuals';

describe('the colour themes (sheet 042)', () => {
  const junix = resolveThemeColors(DEFAULT_COLOR_CHOICE);

  it('gives back the palettes of before with the colours of Junix', () => {
    expect(colorize(lightPalette, junix)).toEqual(lightPalette);
    expect(colorize(darkPalette, junix)).toEqual(darkPalette);
  });

  it('gives back the halos of before with the colours of Junix', () => {
    expect(haloColorsOf(DEFAULT_COLOR_CHOICE)).toEqual(AMBIENT_HALOS.map(halo => halo.color));
  });

  it('keeps every colour readable (4.5:1) on every surface, light and dark', () => {
    const neutral = neutralOf(lightPalette);
    const lightBackgrounds = [lightPalette.surface.base, lightPalette.surface.container, '#FFFFFF', neutral.surface.base];
    const darkBackgrounds = [darkPalette.surface.base, darkPalette.surface.container, darkPalette.surface.high];
    for (const id of SWATCH_IDS) {
      const swatch = SWATCHES[id];
      for (const background of lightBackgrounds) {
        expect([id, contrastRatio(swatch.light.default, background) >= 4.5]).toEqual([id, true]);
      }
      for (const background of darkBackgrounds) {
        expect([id, contrastRatio(swatch.dark.default, background) >= 4.5]).toEqual([id, true]);
      }
      // A filled button: its text on both stops of the gradient
      for (const tone of [swatch.light, swatch.dark]) {
        for (const stop of tone.gradient) {
          const text = tone === swatch.light ? tone.on : '#FFFFFF';
          expect([id, stop, contrastRatio(text, stop) >= 4.5]).toEqual([id, stop, true]);
        }
        expect([id, contrastRatio(tone.onContainer, tone.container) >= 4.5]).toEqual([id, true]);
      }
    }
  });

  it('gives each theme three different colours', () => {
    for (const id of COLOR_THEME_IDS) {
      const theme = COLOR_THEMES[id];
      expect(new Set([theme.primary, theme.todo, theme.moment]).size).toBe(3);
    }
  });

  it('lets one colour be changed by hand, the others staying the theme ones', () => {
    expect(resolveThemeColors({ theme: 'ocean', moment: 'coral' })).toEqual({ primary: 'blue', todo: 'cyan', moment: 'coral' });
    expect(isDefaultColorChoice({ theme: 'junix' })).toBe(true);
    expect(isDefaultColorChoice({ theme: 'junix', primary: 'violet' })).toBe(true);
    expect(isDefaultColorChoice({ theme: 'junix', primary: 'pink' })).toBe(false);
  });

  it('colours the buttons, the ticks and the families, not the urgent red nor the done green', () => {
    const forest = colorize(lightPalette, resolveThemeColors({ theme: 'forest' }));
    expect(forest.primary.default).toBe(SWATCHES.green.light.default);
    expect(forest.tertiary.default).toBe(SWATCHES.cyan.light.default);
    expect(forest.family.moment).toBe(SWATCHES.amber.light.default);
    expect(forest.error).toEqual(lightPalette.error);
    expect(forest.success).toEqual(lightPalette.success);
    expect(forest.priority).toEqual(lightPalette.priority);
  });

  it('tints the dark grays of the other themes, keeping every text readable', () => {
    for (const id of COLOR_THEME_IDS) {
      const dark = colorize(darkPalette, resolveThemeColors({ theme: id }));
      for (const background of [dark.surface.base, dark.surface.container, dark.surface.high]) {
        for (const text of [dark.onSurface.primary, dark.onSurface.variant, dark.primary.default, dark.tertiary.default, dark.family.moment]) {
          expect([id, text, background, contrastRatio(text, background) >= 4.5]).toEqual([id, text, background, true]);
        }
      }
    }
    expect(colorize(darkPalette, resolveThemeColors({ theme: 'ocean' })).surface.base).not.toBe(darkPalette.surface.base);
    expect(mixHex('#141414', '#3B82F6', 0.06)).toBe('#161B22');
  });

  it('keeps Pulse as before with Junix, and recolours only its violet and cyan otherwise', () => {
    for (const mood of Object.keys(MOOD_VISUALS) as (keyof typeof MOOD_VISUALS)[]) {
      expect(moodVisualOf(mood, DEFAULT_COLOR_CHOICE)).toBe(MOOD_VISUALS[mood]);
    }
    const forest = moodVisualOf('calm', { theme: 'forest' });
    expect(forest.ring).toEqual([SWATCHES.green.halo.dark, SWATCHES.cyan.halo.dark]);
    // The colours of a mood stay: alert is orange and pink in every theme
    expect(moodVisualOf('alert', { theme: 'forest' }).ring).toEqual(MOOD_VISUALS.alert.ring);
  });

  it('reads a saved choice, and falls back to Junix on anything unknown', () => {
    expect(parseColorChoice('{"theme":"dawn","primary":"blue"}')).toEqual({ theme: 'dawn', primary: 'blue' });
    expect(parseColorChoice('{"theme":"dawn","primary":"gold"}')).toEqual({ theme: 'dawn' });
    expect(parseColorChoice('{"theme":"nope"}')).toEqual(DEFAULT_COLOR_CHOICE);
    expect(parseColorChoice('not json')).toEqual(DEFAULT_COLOR_CHOICE);
    expect(parseColorChoice(null)).toEqual(DEFAULT_COLOR_CHOICE);
  });
});

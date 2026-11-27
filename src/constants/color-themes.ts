/**
 * The colour themes (study 001, 16.11; sheet 042).
 *
 * A theme picks three of the 8 colours below: the main colour (buttons, links, ticks, the active
 * tab, the first halo), the colour of « À faire » and the colour of « Moment ». The user can then
 * change any of the three alone. « Junix » gives back exactly the colours the app had before.
 *
 * Each colour has a light version (dark enough for 4.5:1 on the cream, the white and the gray-blue)
 * and a dark version (light enough for 4.5:1 on the dark surfaces): a test checks both.
 * The red of « urgent » and the green of « done » are not here: their colour is their meaning.
 */

import type { MessageKey } from '@/i18n';

export const SWATCH_IDS = ['violet', 'blue', 'cyan', 'green', 'amber', 'coral', 'pink', 'slate'] as const;
export type SwatchId = (typeof SWATCH_IDS)[number];

export interface SwatchTone {
  /** The colour itself: texts, icons, borders, ticks. */
  readonly default: string;
  /** A pale (light) or deep (dark) fill behind its own text. */
  readonly container: string;
  /** The text on a filled button of this colour. */
  readonly on: string;
  /** The text on `container`. */
  readonly onContainer: string;
  /** Filled buttons: white text at 4.5:1 on both stops. */
  readonly gradient: readonly [string, string];
}

export interface Swatch {
  readonly id: SwatchId;
  readonly labelKey: MessageKey;
  readonly light: SwatchTone;
  readonly dark: SwatchTone;
  /** The halo of this colour behind the pages. */
  readonly halo: { readonly light: string; readonly dark: string };
  /** A softer halo, for the fourth one. */
  readonly softHalo: { readonly light: string; readonly dark: string };
  /** The glass buttons, when they differ from the dark gradient at 0.90 and 0.84 (violet: as before). */
  readonly glassPrimary?: readonly [string, string];
  /** The border of the glass controls in light, when it differs from onContainer at 0.16. */
  readonly controlBorder?: string;
}

export const SWATCHES: Readonly<Record<SwatchId, Swatch>> = {
  violet: {
    id: 'violet',
    labelKey: 'colors.violet',
    light: { default: '#6B46C1', container: '#E9DDFF', on: '#FFFFFF', onContainer: '#4A3780', gradient: ['#6B46C1', '#553C9A'] },
    dark: { default: '#D0BCFF', container: '#4A3780', on: '#381E72', onContainer: '#E9DDFF', gradient: ['#7C3AED', '#6D28D9'] },
    halo: { light: '#A78BFA', dark: '#8B3DF0' },
    softHalo: { light: '#C4B5FD', dark: '#6D28D9' },
    glassPrimary: ['rgba(124, 58, 237, 0.90)', 'rgba(79, 70, 229, 0.84)'],
    controlBorder: 'rgba(76, 52, 120, 0.16)',
  },
  blue: {
    id: 'blue',
    labelKey: 'colors.blue',
    light: { default: '#1D4ED8', container: '#DBE4FF', on: '#FFFFFF', onContainer: '#1E3A8A', gradient: ['#1D4ED8', '#1E40AF'] },
    dark: { default: '#A5BFFF', container: '#1E3A8A', on: '#0B2265', onContainer: '#DBE4FF', gradient: ['#2563EB', '#1D4ED8'] },
    halo: { light: '#93C5FD', dark: '#3B82F6' },
    softHalo: { light: '#BFDBFE', dark: '#1D4ED8' },
  },
  cyan: {
    id: 'cyan',
    labelKey: 'colors.cyan',
    light: { default: '#0E7490', container: '#C3E7FF', on: '#FFFFFF', onContainer: '#004C6D', gradient: ['#0E7490', '#155E75'] },
    dark: { default: '#7BD0FF', container: '#004C6D', on: '#003549', onContainer: '#C3E7FF', gradient: ['#0E7490', '#155E75'] },
    halo: { light: '#67E8F9', dark: '#0AE8F0' },
    softHalo: { light: '#A5F3FC', dark: '#0E7490' },
  },
  green: {
    id: 'green',
    labelKey: 'colors.green',
    light: { default: '#047857', container: '#C8F2DE', on: '#FFFFFF', onContainer: '#064E3B', gradient: ['#047857', '#065F46'] },
    dark: { default: '#6EE7B7', container: '#064E3B', on: '#022C22', onContainer: '#C8F2DE', gradient: ['#047857', '#065F46'] },
    halo: { light: '#6EE7B7', dark: '#10B981' },
    softHalo: { light: '#A7F3D0', dark: '#047857' },
  },
  amber: {
    id: 'amber',
    labelKey: 'colors.amber',
    light: { default: '#A8500A', container: '#FDE7C7', on: '#FFFFFF', onContainer: '#78350F', gradient: ['#B45309', '#92400E'] },
    dark: { default: '#F5B942', container: '#78350F', on: '#451A03', onContainer: '#FDE7C7', gradient: ['#B45309', '#92400E'] },
    halo: { light: '#FCD34D', dark: '#F59E0B' },
    softHalo: { light: '#FDE68A', dark: '#B45309' },
  },
  coral: {
    id: 'coral',
    labelKey: 'colors.coral',
    light: { default: '#B23C0A', container: '#FFDBCB', on: '#FFFFFF', onContainer: '#7C2D12', gradient: ['#C2410C', '#9A3412'] },
    dark: { default: '#FDBA9A', container: '#7C2D12', on: '#4A1A07', onContainer: '#FFDBCB', gradient: ['#C2410C', '#9A3412'] },
    halo: { light: '#FDBA74', dark: '#F97316' },
    softHalo: { light: '#FED7AA', dark: '#C2410C' },
  },
  pink: {
    id: 'pink',
    labelKey: 'colors.pink',
    light: { default: '#BE185D', container: '#FFD9E6', on: '#FFFFFF', onContainer: '#831843', gradient: ['#BE185D', '#9D174D'] },
    dark: { default: '#F9A8D4', container: '#831843', on: '#500724', onContainer: '#FFD9E6', gradient: ['#BE185D', '#9D174D'] },
    halo: { light: '#F9A8D4', dark: '#EC4899' },
    softHalo: { light: '#FBCFE8', dark: '#BE185D' },
  },
  slate: {
    id: 'slate',
    labelKey: 'colors.slate',
    light: { default: '#475569', container: '#E2E8F0', on: '#FFFFFF', onContainer: '#1E293B', gradient: ['#475569', '#334155'] },
    dark: { default: '#CBD5E1', container: '#334155', on: '#0F172A', onContainer: '#E2E8F0', gradient: ['#475569', '#334155'] },
    halo: { light: '#CBD5E1', dark: '#64748B' },
    softHalo: { light: '#E2E8F0', dark: '#475569' },
  },
};

export const COLOR_THEME_IDS = ['junix', 'ocean', 'forest', 'dawn', 'rose', 'slate'] as const;
export type ColorThemeId = (typeof COLOR_THEME_IDS)[number];

/** The three colours a theme decides. */
export interface ThemeColors {
  readonly primary: SwatchId;
  readonly todo: SwatchId;
  readonly moment: SwatchId;
}

export interface ColorTheme extends ThemeColors {
  readonly id: ColorThemeId;
  readonly labelKey: MessageKey;
  /** The third halo, between the two others. */
  readonly blendHalo: { readonly light: string; readonly dark: string };
}

export const COLOR_THEMES: Readonly<Record<ColorThemeId, ColorTheme>> = {
  junix: { id: 'junix', labelKey: 'colorTheme.junix', primary: 'violet', todo: 'cyan', moment: 'amber', blendHalo: { light: '#93A8FB', dark: '#5E7BF2' } },
  ocean: { id: 'ocean', labelKey: 'colorTheme.ocean', primary: 'blue', todo: 'cyan', moment: 'green', blendHalo: { light: '#7DD3FC', dark: '#0EA5E9' } },
  forest: { id: 'forest', labelKey: 'colorTheme.forest', primary: 'green', todo: 'cyan', moment: 'amber', blendHalo: { light: '#BEF264', dark: '#65A30D' } },
  dawn: { id: 'dawn', labelKey: 'colorTheme.dawn', primary: 'coral', todo: 'pink', moment: 'amber', blendHalo: { light: '#FDA4AF', dark: '#F43F5E' } },
  rose: { id: 'rose', labelKey: 'colorTheme.rose', primary: 'pink', todo: 'violet', moment: 'coral', blendHalo: { light: '#F0ABFC', dark: '#C026D3' } },
  slate: { id: 'slate', labelKey: 'colorTheme.slate', primary: 'slate', todo: 'cyan', moment: 'violet', blendHalo: { light: '#BAE6FD', dark: '#38BDF8' } },
};

/** What the user chose: a theme, and maybe one colour changed by hand. Saved as is. */
export interface ColorChoice {
  readonly theme: ColorThemeId;
  readonly primary?: SwatchId;
  readonly todo?: SwatchId;
  readonly moment?: SwatchId;
}

/** The colours of Junix, the default. */
export const DEFAULT_COLOR_CHOICE: ColorChoice = { theme: 'junix' };

const isSwatch = (value: unknown): value is SwatchId => SWATCH_IDS.includes(value as SwatchId);
const isTheme = (value: unknown): value is ColorThemeId => COLOR_THEME_IDS.includes(value as ColorThemeId);

/** The three colours in use: the theme's, unless one was changed by hand. */
export function resolveThemeColors(choice: ColorChoice): ThemeColors {
  const theme = COLOR_THEMES[isTheme(choice.theme) ? choice.theme : 'junix'];
  return {
    primary: isSwatch(choice.primary) ? choice.primary : theme.primary,
    todo: isSwatch(choice.todo) ? choice.todo : theme.todo,
    moment: isSwatch(choice.moment) ? choice.moment : theme.moment,
  };
}

/** True when nothing differs from the colours of Junix. */
export function isDefaultColorChoice(choice: ColorChoice): boolean {
  const colors = resolveThemeColors(choice);
  const junix = COLOR_THEMES.junix;
  return colors.primary === junix.primary && colors.todo === junix.todo && colors.moment === junix.moment;
}

/** A saved colour of a card (sheet 043): one of the 8, or undefined (the colour of its family). */
export function swatchOf(value: unknown): SwatchId | undefined {
  return isSwatch(value) ? value : undefined;
}

/** Reads a saved choice; anything unknown falls back to Junix (an old or damaged value). */
export function parseColorChoice(raw: string | null | undefined): ColorChoice {
  if (!raw) return DEFAULT_COLOR_CHOICE;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || !isTheme(value.theme)) return DEFAULT_COLOR_CHOICE;
    return {
      theme: value.theme,
      ...(isSwatch(value.primary) ? { primary: value.primary } : {}),
      ...(isSwatch(value.todo) ? { todo: value.todo } : {}),
      ...(isSwatch(value.moment) ? { moment: value.moment } : {}),
    };
  } catch {
    return DEFAULT_COLOR_CHOICE;
  }
}

/** The 4 halos behind the pages, in the order of AMBIENT_HALOS (main, À faire, blend, soft main). */
export function haloColorsOf(choice: ColorChoice): readonly { light: string; dark: string }[] {
  const colors = resolveThemeColors(choice);
  const theme = COLOR_THEMES[isTheme(choice.theme) ? choice.theme : 'junix'];
  return [
    SWATCHES[colors.primary].halo,
    SWATCHES[colors.todo].halo,
    theme.blendHalo,
    SWATCHES[colors.primary].softHalo,
  ];
}

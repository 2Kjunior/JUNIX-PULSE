/**
 * The colour of a tag in each theme. The database keeps the name of the colour ("green"), never
 * a value: the same tag is a soft green on the dark theme and a deeper green on the cream one.
 * Every value keeps at least 3:1 against the surfaces of its theme (tested).
 */

import type { ThemePalette } from '@/constants/palettes';
import type { TagColor } from '@/domain/rules/tag-rules';

export const TAG_COLOR_VALUES: Readonly<Record<'dark' | 'light', Readonly<Record<TagColor, string>>>> = {
  dark: {
    violet: '#D0BCFF',
    blue: '#A8C7FA',
    sky: '#7BD0FF',
    green: '#6DD58C',
    yellow: '#F2D16B',
    orange: '#FFB86C',
    pink: '#FFB1C8',
    grey: '#C9C5CA',
  },
  light: {
    violet: '#6B46C1',
    blue: '#2563EB',
    sky: '#0E7490',
    green: '#047857',
    yellow: '#A16207',
    orange: '#C2410C',
    pink: '#BE185D',
    grey: '#57534E',
  },
};

export function tagColorValue(palette: Pick<ThemePalette, 'mode'>, color: TagColor): string {
  return TAG_COLOR_VALUES[palette.mode === 'light' ? 'light' : 'dark'][color];
}

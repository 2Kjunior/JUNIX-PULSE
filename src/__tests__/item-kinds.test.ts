/**
 * The registry of item kinds and families: every kind in its family, every family named in
 * both languages, with a colour readable on every surface of its theme and different from the
 * other family; a kind shows with its family's look, and a bell when it rings.
 */

import { darkPalette, lightPalette } from '@/constants/palettes';
import {
  ITEM_FAMILIES,
  ITEM_FAMILY_COLORS,
  ITEM_FAMILY_DEFINITIONS,
  ITEM_KIND_DEFINITIONS,
  ITEM_KINDS,
  itemFamilyColor,
  itemKindColor,
  itemKindLook,
} from '@/constants/item-kinds';
import { translate } from '@/i18n/translate';
import { contrastRatio } from '@/utils/color';

describe('registry of item kinds', () => {
  it('describes every kind under its own name, in its family', () => {
    for (const kind of ITEM_KINDS) {
      expect(ITEM_KIND_DEFINITIONS[kind].kind).toBe(kind);
    }
    expect(ITEM_KIND_DEFINITIONS.reminder.family).toBe('todo');
    expect(ITEM_KIND_DEFINITIONS.task.family).toBe('todo');
    expect(ITEM_KIND_DEFINITIONS.event.family).toBe('moment');
  });

  it('names each family and says what it is for, in French and English', () => {
    for (const family of ITEM_FAMILIES) {
      const { labelKey, taglineKey } = ITEM_FAMILY_DEFINITIONS[family];
      for (const language of ['fr', 'en'] as const) {
        expect(translate(language, labelKey)).not.toBe(labelKey);
        expect(translate(language, taglineKey)).not.toBe(taglineKey);
      }
    }
    expect(translate('fr', ITEM_FAMILY_DEFINITIONS.todo.labelKey)).toBe('À faire');
    expect(translate('fr', ITEM_FAMILY_DEFINITIONS.moment.labelKey)).toBe('Moment');
  });

  it('knows what each kind can do', () => {
    expect(ITEM_KIND_DEFINITIONS.reminder).toMatchObject({ checkable: true, ringsByDefault: true, hasTimeRange: false });
    expect(ITEM_KIND_DEFINITIONS.task).toMatchObject({ checkable: true, ringsByDefault: false, hasTimeRange: false });
    expect(ITEM_KIND_DEFINITIONS.event).toMatchObject({ checkable: false, hasTimeRange: true });
  });

  it('shows a reminder as something to do with a bell, a task without, an event as a moment', () => {
    expect(itemKindLook('reminder')).toEqual({ icon: 'checkbox-outline', labelKey: 'itemFamily.todo', withAlert: true });
    expect(itemKindLook('task')).toEqual({ icon: 'checkbox-outline', labelKey: 'itemFamily.todo', withAlert: false });
    expect(itemKindLook('event')).toEqual({ icon: 'calendar-outline', labelKey: 'itemFamily.moment', withAlert: false });
  });

  it.each([
    ['dark', darkPalette],
    ['light', lightPalette],
  ] as const)('gives each family a colour readable on every %s surface, different from the other', (mode, palette) => {
    const colors = ITEM_FAMILIES.map(family => itemFamilyColor(palette, family));
    expect(new Set(colors).size).toBe(ITEM_FAMILIES.length);
    for (const family of ITEM_FAMILIES) {
      for (const surface of [palette.surface.base, palette.surface.container, palette.surface.high]) {
        expect(contrastRatio(ITEM_FAMILY_COLORS[mode][family], surface)).toBeGreaterThanOrEqual(3);
      }
    }
    // Reminders and tasks share the colour of their family
    expect(itemKindColor(palette, 'reminder')).toBe(itemKindColor(palette, 'task'));
  });
});

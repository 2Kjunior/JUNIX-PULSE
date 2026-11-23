/**
 * The kinds of item Junix Pulse knows (reminder, task, event), described in one place: their
 * name, the sentence that says what each one is for, their icon, their colour and what they
 * can do. Every screen reads them here, so a kind looks the same everywhere, and a new kind is
 * added here rather than in every screen.
 *
 * The user sees two families rather than three kinds (study 001, 1-B): "À faire", something
 * ticked off once done, with or without an alert (reminders and tasks), and "Moment",
 * something that takes place (events). The data keeps its three kinds; only the screens speak
 * of families.
 */

import type { Ionicons } from '@expo/vector-icons';

import type { ThemePalette } from '@/constants/palettes';
import type { MessageKey } from '@/i18n';

export const ITEM_FAMILIES = ['todo', 'moment'] as const;
export type ItemFamily = (typeof ITEM_FAMILIES)[number];

export interface ItemFamilyDefinition {
  family: ItemFamily;
  /** The same icon on every screen. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Its name, and the sentence that says what it is for. */
  labelKey: MessageKey;
  taglineKey: MessageKey;
}

export const ITEM_FAMILY_DEFINITIONS: Readonly<Record<ItemFamily, ItemFamilyDefinition>> = {
  todo: {
    family: 'todo',
    icon: 'checkbox-outline',
    labelKey: 'itemFamily.todo',
    taglineKey: 'itemFamily.todo.tagline',
  },
  moment: {
    family: 'moment',
    icon: 'calendar-outline',
    labelKey: 'itemFamily.moment',
    taglineKey: 'itemFamily.moment.tagline',
  },
};

/** The colour of each family in each theme: cyan and amber, readable on every surface. */
export const ITEM_FAMILY_COLORS: Readonly<Record<'dark' | 'light', Readonly<Record<ItemFamily, string>>>> = {
  dark: { todo: '#7BD0FF', moment: '#F5B942' },
  light: { todo: '#0E7490', moment: '#B45309' },
};

export const ITEM_KINDS = ['reminder', 'task', 'event'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export interface ItemKindDefinition {
  kind: ItemKind;
  /** The family the user sees it in. */
  family: ItemFamily;
  /** Its own name, for the places that still need it. */
  labelKey: MessageKey;
  taglineKey: MessageKey;
  /** Ticked off once done. */
  checkable: boolean;
  /** Notifies at its time with nothing to add: shown with a bell. */
  ringsByDefault: boolean;
  /** Has a start and an end. */
  hasTimeRange: boolean;
}

/**
 * The kinds that hold a list of subtasks (study 001, 15.2): the task only. A reminder differs
 * from a task by its hour alone; the lists written before stay in the data.
 */
export const KINDS_WITH_SUBTASKS: readonly ItemKind[] = ['task'];

export const ITEM_KIND_DEFINITIONS: Readonly<Record<ItemKind, ItemKindDefinition>> = {
  reminder: {
    kind: 'reminder',
    family: 'todo',
    labelKey: 'itemKind.reminder',
    taglineKey: 'itemKind.reminder.tagline',
    checkable: true,
    ringsByDefault: true,
    hasTimeRange: false,
  },
  task: {
    kind: 'task',
    family: 'todo',
    labelKey: 'itemKind.task',
    taglineKey: 'itemKind.task.tagline',
    checkable: true,
    ringsByDefault: false,
    hasTimeRange: false,
  },
  event: {
    kind: 'event',
    family: 'moment',
    labelKey: 'itemKind.event',
    taglineKey: 'itemKind.event.tagline',
    checkable: false,
    ringsByDefault: false,
    hasTimeRange: true,
  },
};

export function itemFamilyColor(palette: Pick<ThemePalette, 'mode'>, family: ItemFamily): string {
  return ITEM_FAMILY_COLORS[palette.mode === 'light' ? 'light' : 'dark'][family];
}

/** The colour of a kind is the colour of its family. */
export function itemKindColor(palette: Pick<ThemePalette, 'mode'>, kind: ItemKind): string {
  return itemFamilyColor(palette, ITEM_KIND_DEFINITIONS[kind].family);
}

/** How a kind shows on a card: the icon and the name of its family, and a bell if it rings. */
export function itemKindLook(kind: ItemKind): { icon: ItemFamilyDefinition['icon']; labelKey: MessageKey; withAlert: boolean } {
  const definition = ITEM_KIND_DEFINITIONS[kind];
  const family = ITEM_FAMILY_DEFINITIONS[definition.family];
  return { icon: family.icon, labelKey: family.labelKey, withAlert: definition.ringsByDefault };
}

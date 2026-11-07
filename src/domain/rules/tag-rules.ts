/**
 * Coloured tags, shared by tasks, reminders and events: one idea for everyone ("Maths",
 * "Projet X", "Maison", "Léa"). Pure rules: the name, the colour proposed for a new tag, what a
 * card shows and how the tasks are filtered.
 */

import { foldText } from './person-picker-rules';

/** The eight colours a tag can take, readable in the dark and in the light theme. */
export const TAG_COLORS = ['violet', 'blue', 'sky', 'green', 'yellow', 'orange', 'pink', 'grey'] as const;
export type TagColor = (typeof TAG_COLORS)[number];

/** Long enough for "Anniversaire Léa", short enough to stay on one line of a card. */
export const TAG_NAME_MAX = 24;

/** A card shows its first tag only, then "+2" for the others. */
export const TAGS_ON_CARD = 1;

export interface TagLike {
  id: string;
  name: string;
  color: TagColor;
}

export function isTagColor(value: unknown): value is TagColor {
  return typeof value === 'string' && (TAG_COLORS as readonly string[]).includes(value);
}

/** The name as kept: spaces trimmed and collapsed, cut at the maximum length. */
export function cleanTagName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, TAG_NAME_MAX).trim();
}

/** Whether another tag already has this name, without caring about case or accents. */
export function tagNameTaken(name: string, tags: readonly TagLike[], exceptId?: string): boolean {
  const folded = foldText(cleanTagName(name));
  return tags.some(tag => tag.id !== exceptId && foldText(tag.name) === folded);
}

/** The colour proposed for a new tag: the least used one, in the order of the palette. */
export function nextTagColor(tags: readonly TagLike[]): TagColor {
  const uses = new Map<TagColor, number>(TAG_COLORS.map(color => [color, 0]));
  for (const tag of tags) uses.set(tag.color, (uses.get(tag.color) ?? 0) + 1);
  return TAG_COLORS.reduce((best, color) => ((uses.get(color) ?? 0) < (uses.get(best) ?? 0) ? color : best), TAG_COLORS[0]);
}

/** Tags in the order of their name, without caring about case or accents. */
export function sortTags<T extends TagLike>(tags: readonly T[]): T[] {
  return [...tags].sort((a, b) => foldText(a.name).localeCompare(foldText(b.name)));
}

/** The tags of an item, in the order they were chosen, from their ids. */
export function tagsOf<T extends TagLike>(ids: readonly string[] | undefined, tags: readonly T[]): T[] {
  return (ids ?? []).map(id => tags.find(tag => tag.id === id)).filter((tag): tag is T => tag !== undefined);
}

/** What a card shows: its first tags, and how many more it has. */
export function cardTags<T extends TagLike>(tags: readonly T[], max = TAGS_ON_CARD): { shown: T[]; more: number } {
  return { shown: tags.slice(0, max), more: Math.max(0, tags.length - max) };
}

/** The items carrying a tag; every item when no tag is chosen. */
export function withTag<T extends { id: string }>(
  items: readonly T[],
  links: Readonly<Record<string, readonly string[]>>,
  tagId: string | null
): T[] {
  if (!tagId) return [...items];
  return items.filter(item => links[item.id]?.includes(tagId));
}

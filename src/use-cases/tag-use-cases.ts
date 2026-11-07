/**
 * Creating, changing and deleting a coloured tag. The name is cleaned and must not be taken by
 * another tag (case and accents aside); the answer says why when it cannot be kept.
 */

import { randomUUID } from 'expo-crypto';

import type { Tag } from '../domain/entities';
import { cleanTagName, tagNameTaken, type TagColor } from '../domain/rules/tag-rules';
import { TagRepository } from '../repositories/tag-repository';

export type TagSaveResult = { ok: true; tag: Tag } | { ok: false; reason: 'empty' | 'taken' };

export const TagUseCases = {
  async create(name: string, color: TagColor, existing: readonly Tag[]): Promise<TagSaveResult> {
    const clean = cleanTagName(name);
    if (!clean) return { ok: false, reason: 'empty' };
    if (tagNameTaken(clean, existing)) return { ok: false, reason: 'taken' };
    const now = new Date().toISOString();
    const tag: Tag = { id: randomUUID(), name: clean, color, createdAt: now, updatedAt: now };
    await TagRepository.create(tag);
    return { ok: true, tag };
  },

  async update(tag: Tag, name: string, color: TagColor, existing: readonly Tag[]): Promise<TagSaveResult> {
    const clean = cleanTagName(name);
    if (!clean) return { ok: false, reason: 'empty' };
    if (tagNameTaken(clean, existing, tag.id)) return { ok: false, reason: 'taken' };
    const updatedAt = new Date().toISOString();
    await TagRepository.update(tag.id, { name: clean, color, updatedAt });
    return { ok: true, tag: { ...tag, name: clean, color, updatedAt } };
  },

  /** Takes the tag off everything that carried it; the items themselves stay. */
  async delete(id: string): Promise<void> {
    await TagRepository.delete(id);
  },
};

/**
 * Tags and their links to tasks, reminders and events. One link table per kind of item, so that
 * deleting a task, a reminder, an event or a tag removes its links with it (ON DELETE CASCADE).
 */

import { getDatabase } from '../database/sqlite';
import type { Tag, TagItemType } from '../domain/entities';
import { isTagColor, sortTags } from '../domain/rules/tag-rules';

const LINKS: Record<TagItemType, { table: string; column: string }> = {
  task: { table: 'task_tags', column: 'task_id' },
  reminder: { table: 'reminder_tags', column: 'reminder_id' },
  event: { table: 'event_tags', column: 'event_id' },
};

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    color: isTagColor(row.color) ? row.color : 'violet',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const TagRepository = {
  /** Every tag, in the order of their name. */
  async findAll(): Promise<Tag[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM tags');
    return sortTags(rows.map(rowToTag));
  },

  async create(tag: Tag): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO tags (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      tag.id,
      tag.name,
      tag.color,
      tag.createdAt,
      tag.updatedAt
    );
  },

  async update(id: string, changes: { name: string; color: Tag['color']; updatedAt: string }): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?', changes.name, changes.color, changes.updatedAt, id);
  },

  /** Removes the tag from everything that carried it. */
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM tags WHERE id = ?', id);
  },

  /** The tags of one item, in the order they were chosen. */
  async findIdsFor(type: TagItemType, itemId: string): Promise<string[]> {
    const { table, column } = LINKS[type];
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ tag_id: string }>(
      `SELECT tag_id FROM ${table} WHERE ${column} = ? ORDER BY rowid ASC`,
      itemId
    );
    return rows.map(row => row.tag_id);
  },

  /** Replaces the tags of one item. */
  async setFor(type: TagItemType, itemId: string, tagIds: readonly string[]): Promise<void> {
    const { table, column } = LINKS[type];
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${table} WHERE ${column} = ?`, itemId);
    for (const tagId of new Set(tagIds)) {
      await db.runAsync(`INSERT OR IGNORE INTO ${table} (${column}, tag_id) VALUES (?, ?)`, itemId, tagId);
    }
  },

  /** The tags of every item of a kind, by item: what the lists need in one read. */
  async findLinks(type: TagItemType): Promise<Record<string, string[]>> {
    const { table, column } = LINKS[type];
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ item_id: string; tag_id: string }>(
      `SELECT ${column} AS item_id, tag_id FROM ${table} ORDER BY rowid ASC`
    );
    const links: Record<string, string[]> = {};
    for (const row of rows) (links[row.item_id] ??= []).push(row.tag_id);
    return links;
  },
};

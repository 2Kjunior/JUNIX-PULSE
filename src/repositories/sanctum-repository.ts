/**
 * Repository pour le coffre-fort Sanctum (V1).
 * Stocke la note privée sécurisée par biométrie.
 */

import { getDatabase } from '../database/sqlite';

export const SanctumRepository = {
  async getNote(): Promise<string> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ content: string }>(
      'SELECT content FROM sanctum_notes WHERE id = ?',
      'main_note'
    );
    return row?.content ?? '';
  },

  async saveNote(content: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO sanctum_notes (id, content, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
      'main_note',
      content,
      now
    );
  },
};

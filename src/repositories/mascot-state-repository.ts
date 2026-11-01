/**
 * Repository de la petite table clé-valeur de la mascotte (mascot_state).
 * Elle garde ce qui a été montré ou vu : astuces, propositions du jour, refus.
 * Reconstruite automatiquement, elle n'est pas sauvegardée.
 */

import { getDatabase } from '../database/sqlite';

export const MascotStateRepository = {
  async get(key: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM mascot_state WHERE key = ?', key);
    return row ? row.value : null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO mascot_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      value,
      new Date().toISOString()
    );
  },

  async delete(key: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM mascot_state WHERE key = ?', key);
  },

  /** Supprime toutes les clés qui commencent par ce préfixe (ex. « tip: » pour les astuces vues). */
  async deleteByPrefix(prefix: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM mascot_state WHERE substr(key, 1, ?) = ?", prefix.length, prefix);
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM mascot_state');
  },
};

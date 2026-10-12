/**
 * Repository pour le coffre-fort Sanctum (V2 — Multi-carnets).
 * CRUD complet pour les notes secrètes protégées par biométrie ou PIN.
 *
 * Règle R-12 : données locales uniquement, pas de cryptographie maison.
 * BR-022 : les changements de schéma passent par migration.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/sqlite';

export interface SanctumNote {
  id: string;
  title: string;
  content: string;
  folder: string;
  created_at: string;
  updated_at: string;
}

export const SanctumRepository = {
  /**
   * Récupère toutes les notes secrètes, triées par date de modification décroissante.
   */
  async getAllNotes(): Promise<SanctumNote[]> {
    const db = await getDatabase();
    return db.getAllAsync<SanctumNote>(
      'SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes ORDER BY updated_at DESC'
    );
  },

  /**
   * Récupère une note secrète par son identifiant.
   */
  async getNoteById(id: string): Promise<SanctumNote | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SanctumNote>(
      'SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes WHERE id = ?',
      id
    );
    return row ?? null;
  },

  /**
   * Crée ou met à jour une note secrète.
   * Si l'id existe, on met à jour titre, contenu, dossier et updated_at.
   * Sinon, on insère une nouvelle note avec un UUID et des timestamps frais.
   */
  async saveNote(note: {
    id?: string;
    title: string;
    content: string;
    folder: string;
  }): Promise<SanctumNote> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    if (note.id) {
      // Mise à jour
      await db.runAsync(
        `UPDATE sanctum_notes SET title = ?, content = ?, folder = ?, updated_at = ? WHERE id = ?`,
        note.title,
        note.content,
        note.folder,
        now,
        note.id
      );
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        folder: note.folder,
        created_at: '', // Pas rechargé ici, l'appelant possède déjà la valeur
        updated_at: now,
      };
    }

    // Création
    const id = uuidv4();
    await db.runAsync(
      `INSERT INTO sanctum_notes (id, title, content, folder, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      note.title,
      note.content,
      note.folder,
      now,
      now
    );
    return {
      id,
      title: note.title,
      content: note.content,
      folder: note.folder,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Supprime une note secrète par son identifiant.
   */
  async deleteNote(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sanctum_notes WHERE id = ?', id);
  },

  /**
   * Migration helper : récupère l'ancienne note 'main_note' si elle existe,
   * pour la convertir en carnet avec un titre par défaut.
   * Appelé une seule fois au premier déverrouillage post-migration.
   */
  async migrateLegacyNote(): Promise<void> {
    const db = await getDatabase();
    const legacy = await db.getFirstAsync<{ id: string; content: string; updated_at: string }>(
      `SELECT id, content, updated_at FROM sanctum_notes WHERE id = 'main_note'`
    );
    if (legacy && legacy.content.trim()) {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE sanctum_notes SET title = ?, created_at = ?, folder = ? WHERE id = 'main_note'`,
        'Note initiale',
        now,
        'Général'
      );
    }
  },
};

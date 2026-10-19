/**
 * Repository pour le coffre-fort Sanctum (V2 — Multi-carnets).
 * CRUD complet pour les notes secrètes protégées par biométrie ou PIN.
 *
 * Règle R-12 : données locales uniquement, pas de cryptographie maison.
 * BR-022 : les changements de schéma passent par migration.
 */

import { randomUUID } from 'expo-crypto';
import { getDatabase } from '../database/sqlite';
import { encryptSanctumNote, decryptSanctumNote } from '../services/sanctum-crypto';

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
   * Filtre la ligne interne '__pin_hash__' et déchiffre le contenu avec la clé fournie.
   */
  async getAllNotes(key?: Uint8Array): Promise<SanctumNote[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SanctumNote>(
      `SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes WHERE id != '__pin_hash__' ORDER BY updated_at DESC`
    );

    if (!key) {
      return rows;
    }

    const decryptedNotes: SanctumNote[] = [];
    for (const row of rows) {
      try {
        const plainContent = await decryptSanctumNote(row.content, key);
        decryptedNotes.push({ ...row, content: plainContent });
      } catch {
        // En cas d'erreur de déchiffrement, préserver la ligne brute
        decryptedNotes.push(row);
      }
    }
    return decryptedNotes;
  },

  /**
   * Récupère une note secrète par son identifiant et déchiffre son contenu si la clé est fournie.
   */
  async getNoteById(id: string, key?: Uint8Array): Promise<SanctumNote | null> {
    if (id === '__pin_hash__') return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync<SanctumNote>(
      'SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes WHERE id = ?',
      id
    );
    if (!row) return null;

    if (key) {
      try {
        const plainContent = await decryptSanctumNote(row.content, key);
        return { ...row, content: plainContent };
      } catch {
        return row;
      }
    }
    return row;
  },

  /**
   * Crée ou met à jour une note secrète en chiffrant son contenu avec XChaCha20-Poly1305.
   * Si l'id existe, on met à jour titre, contenu chiffré, dossier et updated_at.
   * Sinon, on insère une nouvelle note avec un UUID et des timestamps frais.
   */
  async saveNote(
    note: {
      id?: string;
      title: string;
      content: string;
      folder: string;
    },
    key?: Uint8Array
  ): Promise<SanctumNote> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const storedContent = key ? await encryptSanctumNote(note.content, key) : note.content;

    if (note.id) {
      // Mise à jour
      await db.runAsync(
        `UPDATE sanctum_notes SET title = ?, content = ?, folder = ?, updated_at = ? WHERE id = ?`,
        note.title,
        storedContent,
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
    const id = randomUUID();
    await db.runAsync(
      `INSERT INTO sanctum_notes (id, title, content, folder, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      note.title,
      storedContent,
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

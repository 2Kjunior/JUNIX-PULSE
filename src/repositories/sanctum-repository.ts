/**
 * Repository pour le coffre-fort Sanctum (V2 — Multi-carnets).
 * CRUD complet pour les notes secrètes protégées par biométrie ou PIN.
 *
 * Règle R-12 : données locales uniquement, pas de cryptographie maison.
 * Le titre, le contenu et le dossier sont chiffrés : la clé est obligatoire pour les lire ou les écrire.
 * BR-022 : les changements de schéma passent par migration.
 */

import { randomUUID } from 'expo-crypto';
import { getDatabase } from '../database/sqlite';
import { encryptSanctumNote, decryptSanctumNote, isSanctumNoteEncrypted } from '../services/sanctum-crypto';

export interface SanctumNote {
  id: string;
  title: string;
  content: string;
  folder: string;
  created_at: string;
  updated_at: string;
  /** Impossible à déchiffrer avec la clé actuelle : ni modifiable, ni à enregistrer. */
  unreadable?: boolean;
}

const FALLBACK_FOLDER = 'Général';

async function decryptNote(row: SanctumNote, key: Uint8Array): Promise<SanctumNote> {
  try {
    return {
      ...row,
      title: await decryptSanctumNote(row.title, key),
      content: await decryptSanctumNote(row.content, key),
      folder: await decryptSanctumNote(row.folder, key),
    };
  } catch {
    // Jamais le texte chiffré à l'écran : la note est signalée et reste intacte en base
    return {
      ...row,
      title: 'Note illisible',
      content: 'Cette note ne peut pas être déchiffrée avec le code PIN actuel.',
      folder: FALLBACK_FOLDER,
      unreadable: true,
    };
  }
}

export const SanctumRepository = {
  /**
   * Récupère toutes les notes secrètes, triées par date de modification décroissante.
   * Filtre la ligne interne '__pin_hash__' et déchiffre le contenu avec la clé fournie.
   */
  async getAllNotes(key: Uint8Array): Promise<SanctumNote[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SanctumNote>(
      `SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes WHERE id != '__pin_hash__' ORDER BY updated_at DESC`
    );

    const decryptedNotes: SanctumNote[] = [];
    for (const row of rows) {
      decryptedNotes.push(await decryptNote(row, key));
    }
    return decryptedNotes;
  },

  /**
   * Récupère une note secrète par son identifiant et déchiffre son contenu si la clé est fournie.
   */
  async getNoteById(id: string, key: Uint8Array): Promise<SanctumNote | null> {
    if (id === '__pin_hash__') return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync<SanctumNote>(
      'SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes WHERE id = ?',
      id
    );
    return row ? decryptNote(row, key) : null;
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
    key: Uint8Array
  ): Promise<SanctumNote> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const storedTitle = await encryptSanctumNote(note.title, key);
    const storedContent = await encryptSanctumNote(note.content, key);
    const storedFolder = await encryptSanctumNote(note.folder, key);

    if (note.id) {
      // Mise à jour
      await db.runAsync(
        `UPDATE sanctum_notes SET title = ?, content = ?, folder = ?, updated_at = ? WHERE id = ?`,
        storedTitle,
        storedContent,
        storedFolder,
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
      storedTitle,
      storedContent,
      storedFolder,
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
   * Re-chiffre l'ensemble des notes existantes avec une nouvelle clé symétrique
   * lors d'une modification de code PIN. Tout est validé ou rien : au moindre échec, y compris
   * de `beforeCommit`, les notes restent chiffrées avec l'ancienne clé.
   * Une note déjà illisible avec l'ancienne clé est laissée telle quelle.
   */
  async reencryptAllNotes(
    oldKey: Uint8Array,
    newKey: Uint8Array,
    beforeCommit?: () => Promise<void>
  ): Promise<void> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SanctumNote>(
      `SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes WHERE id != '__pin_hash__'`
    );

    const updates: { id: string; title: string; content: string; folder: string }[] = [];
    for (const row of rows) {
      const note = await decryptNote(row, oldKey);
      if (note.unreadable) continue;
      updates.push({
        id: row.id,
        title: await encryptSanctumNote(note.title, newKey),
        content: await encryptSanctumNote(note.content, newKey),
        folder: await encryptSanctumNote(note.folder, newKey),
      });
    }

    // Same connection as the SQLCipher key: an exclusive transaction would open one without it
    await db.withTransactionAsync(async () => {
      for (const update of updates) {
        await db.runAsync(
          `UPDATE sanctum_notes SET title = ?, content = ?, folder = ? WHERE id = ?`,
          update.title,
          update.content,
          update.folder,
          update.id
        );
      }
      await beforeCommit?.();
    });
  },

  /**
   * Chiffre les titres, contenus et dossiers encore en clair, écrits par d'anciennes versions.
   */
  async encryptLegacyFields(key: Uint8Array): Promise<void> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SanctumNote>(
      `SELECT id, title, content, folder, created_at, updated_at FROM sanctum_notes WHERE id != '__pin_hash__'`
    );

    const seal = async (value: string) =>
      isSanctumNoteEncrypted(value) ? value : encryptSanctumNote(value, key);

    for (const row of rows) {
      if ([row.title, row.content, row.folder].every(isSanctumNoteEncrypted)) continue;
      await db.runAsync(
        `UPDATE sanctum_notes SET title = ?, content = ?, folder = ? WHERE id = ?`,
        await seal(row.title),
        await seal(row.content),
        await seal(row.folder),
        row.id
      );
    }
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

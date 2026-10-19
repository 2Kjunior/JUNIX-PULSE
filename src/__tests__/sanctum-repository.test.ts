/**
 * Tests d'intégration pour SanctumRepository (DEF-01 / I-02, P1).
 *
 * Prouve formellement :
 * 1. Que le contenu des notes enregistrées avec une clé est chiffré en XChaCha20-Poly1305 dans SQLite.
 * 2. Qu'une inspection SQL brute de la table `sanctum_notes` démontre l'illisibilité du contenu.
 * 3. Que `getAllNotes(key)` et `getNoteById(id, key)` restituent fidèlement le texte en clair.
 * 4. Que les notes en clair existantes (legacy) restent lisibles sans régression.
 * 5. Que la ligne interne spéciale '__pin_hash__' est exclue de tout retour de note.
 */

import { SanctumRepository } from '../repositories/sanctum-repository';
import { getDatabase } from '../database/sqlite';
import { deriveSanctumKey, isSanctumNoteEncrypted } from '../services/sanctum-crypto';

// In-memory SQLite mock for SanctumRepository tests
jest.mock('../database/sqlite', () => {
  const notesTable = new Map<string, any>();
  return {
    getDatabase: jest.fn(async () => ({
      getAllAsync: jest.fn(async (query: string) => {
        const rows = Array.from(notesTable.values());
        if (query.includes("id != '__pin_hash__'")) {
          return rows.filter((r) => r.id !== '__pin_hash__');
        }
        return rows;
      }),
      getFirstAsync: jest.fn(async (query: string, ...params: any[]) => {
        if (params && params.length > 0) {
          const id = params[0];
          return notesTable.get(id) ?? null;
        }
        return null;
      }),
      runAsync: jest.fn(async (query: string, ...params: any[]) => {
        if (query.startsWith('INSERT INTO sanctum_notes')) {
          const [id, title, content, folder, created_at, updated_at] = params;
          notesTable.set(id, { id, title, content, folder, created_at, updated_at });
        } else if (query.startsWith('UPDATE sanctum_notes SET title = ?')) {
          const [title, content, folder, updated_at, id] = params;
          const existing = notesTable.get(id) || {};
          notesTable.set(id, { ...existing, title, content, folder, updated_at });
        } else if (query.startsWith('DELETE FROM sanctum_notes WHERE id = ?')) {
          const [id] = params;
          notesTable.delete(id);
        }
      }),
      __getRawRow: (id: string) => notesTable.get(id),
      __clearNotes: () => notesTable.clear(),
      __seedRawRow: (row: any) => notesTable.set(row.id, row),
    })),
  };
});

describe('SanctumRepository — Persistance chiffrée XChaCha20-Poly1305', () => {
  let masterKey: Uint8Array;
  const mockSalt = new Uint8Array(16).fill(0x77);

  beforeAll(async () => {
    masterKey = await deriveSanctumKey('2468', mockSalt);
  });

  beforeEach(async () => {
    const db = await getDatabase();
    (db as any).__clearNotes?.();
  });

  it('enregistre une note en chiffrant son contenu dans SQLite (Preuve DEF-01)', async () => {
    const plainText = 'Mot de passe ultra confidentiel : TopSecret42!';
    const saved = await SanctumRepository.saveNote(
      {
        title: 'Mots de passe',
        content: plainText,
        folder: 'Coffre',
      },
      masterKey
    );

    // 1. En mémoire, l'objet retourné contient le texte en clair pour l'UI
    expect(saved.content).toBe(plainText);

    // 2. Inspection SQL brute : dans la table SQLite, le texte en clair N'APPARAÎT PAS
    const db = await getDatabase();
    const rawSqlRow = (db as any).__getRawRow(saved.id);
    expect(rawSqlRow).toBeDefined();
    expect(rawSqlRow.content).not.toBe(plainText);
    expect(rawSqlRow.content.includes('TopSecret42!')).toBe(false);

    // 3. Le contenu en base est authentifié au format versionné xcha:v1:
    expect(isSanctumNoteEncrypted(rawSqlRow.content)).toBe(true);
  });

  it('déchiffre fidèlement les notes avec la bonne clé', async () => {
    const plainText = 'Journal intime du 19 octobre : journée productive.';
    const saved = await SanctumRepository.saveNote(
      {
        title: 'Journal',
        content: plainText,
        folder: 'Personnel',
      },
      masterKey
    );

    const allNotes = await SanctumRepository.getAllNotes(masterKey);
    expect(allNotes.length).toBe(1);
    expect(allNotes[0].id).toBe(saved.id);
    expect(allNotes[0].content).toBe(plainText);

    const singleNote = await SanctumRepository.getNoteById(saved.id, masterKey);
    expect(singleNote).toBeDefined();
    expect(singleNote?.content).toBe(plainText);
  });

  it('gère la rétrocompatibilité des notes non chiffrées existantes (legacy)', async () => {
    const legacyPlain = 'Ancienne note créée avant le déploiement du chiffrement.';
    const db = await getDatabase();
    (db as any).__seedRawRow({
      id: 'legacy-1',
      title: 'Note ancienne',
      content: legacyPlain,
      folder: 'Général',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    // getAllNotes avec la clé doit renvoyer la note legacy intacte
    const notes = await SanctumRepository.getAllNotes(masterKey);
    expect(notes.length).toBe(1);
    expect(notes[0].content).toBe(legacyPlain);
  });

  it('exclut rigoureusement la ligne __pin_hash__ de toute liste de notes', async () => {
    const db = await getDatabase();
    (db as any).__seedRawRow({
      id: '__pin_hash__',
      title: '__system__',
      content: 'fake_legacy_hash',
      folder: '__system__',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const notes = await SanctumRepository.getAllNotes(masterKey);
    expect(notes.some((n) => n.id === '__pin_hash__')).toBe(false);

    const noteById = await SanctumRepository.getNoteById('__pin_hash__', masterKey);
    expect(noteById).toBeNull();
  });
});

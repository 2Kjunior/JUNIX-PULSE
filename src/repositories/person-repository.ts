/**
 * Repository pour la gestion des personnes et du journal d'interactions.
 */

import type { SQLiteBindValue } from 'expo-sqlite';
import { getDatabase } from '../database/sqlite';
import { Person, Interaction } from '../domain/entities';
import { isPersonForgotten } from '../domain/rules/person-rules';

type NullableFields<T> = {
  [K in keyof T]?: T[K] | null;
};

export type UpdatePersonParams = NullableFields<Omit<Person, 'id' | 'createdAt'>> & { id: string; updatedAt: string };

function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    relationship: (row.relationship as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    email: (row.email as string | null) ?? undefined,
    birthDate: (row.birth_date as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    lastInteractionAt: (row.last_interaction_at as string | null) ?? undefined,
    forgottenThresholdDays: (row.forgotten_threshold_days as number) ?? 30,
    importedFromContacts: (row.imported_from_contacts as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function rowToInteraction(row: Record<string, unknown>): Interaction {
  return {
    id: row.id as string,
    personId: row.person_id as string,
    type: row.type as Interaction['type'],
    occurredAt: row.occurred_at as string,
    notes: (row.notes as string | null) ?? undefined,
    reminderId: (row.reminder_id as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export const PersonRepository = {
  async create(person: Omit<Person, 'deletedAt'>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO persons (id, display_name, relationship, phone, email, birth_date,
        notes, last_interaction_at, forgotten_threshold_days, imported_from_contacts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      person.id,
      person.displayName,
      person.relationship ?? null,
      person.phone ?? null,
      person.email ?? null,
      person.birthDate ?? null,
      person.notes ?? null,
      person.lastInteractionAt ?? null,
      person.forgottenThresholdDays ?? 30,
      person.importedFromContacts ? 1 : 0,
      person.createdAt,
      person.updatedAt
    );
  },

  async update(params: UpdatePersonParams): Promise<void> {
    const setClauses: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (params.displayName !== undefined) {
      setClauses.push('display_name = ?');
      values.push(params.displayName);
    }
    if (params.relationship !== undefined) {
      setClauses.push('relationship = ?');
      values.push(params.relationship);
    }
    if (params.phone !== undefined) {
      setClauses.push('phone = ?');
      values.push(params.phone);
    }
    if (params.email !== undefined) {
      setClauses.push('email = ?');
      values.push(params.email);
    }
    if (params.birthDate !== undefined) {
      setClauses.push('birth_date = ?');
      values.push(params.birthDate);
    }
    if (params.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(params.notes);
    }
    if (params.lastInteractionAt !== undefined) {
      setClauses.push('last_interaction_at = ?');
      values.push(params.lastInteractionAt);
    }
    if (params.forgottenThresholdDays !== undefined) {
      setClauses.push('forgotten_threshold_days = ?');
      values.push(params.forgottenThresholdDays);
    }
    if (params.importedFromContacts !== undefined) {
      setClauses.push('imported_from_contacts = ?');
      values.push(params.importedFromContacts ? 1 : 0);
    }
    if (params.deletedAt !== undefined) {
      setClauses.push('deleted_at = ?');
      values.push(params.deletedAt);
    }

    setClauses.push('updated_at = ?');
    values.push(params.updatedAt);

    values.push(params.id);

    const db = await getDatabase();
    await db.runAsync(
      `UPDATE persons SET ${setClauses.join(', ')} WHERE id = ?`,
      ...values
    );
  },

  async softDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE persons SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      now, now, id
    );
  },

  async undoDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE persons SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
      now, id
    );
  },

  async findById(id: string): Promise<Person | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM persons WHERE id = ? AND deleted_at IS NULL', id
    );
    return row ? rowToPerson(row) : null;
  },

  async findAll(): Promise<Person[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM persons WHERE deleted_at IS NULL ORDER BY display_name ASC`
    );
    return rows.map(rowToPerson);
  },

  /**
   * Retourne les personnes non contactées depuis leur seuil d'oubli (forgotten_threshold_days).
   */
  async findForgotten(): Promise<Person[]> {
    const all = await this.findAll();
    const now = new Date();

    return all.filter(p => isPersonForgotten(p, now));
  },

  // ─── Interactions ───────────────────────────────────────────────────────────

  async createInteraction(interaction: Interaction): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO interactions (id, person_id, type, occurred_at, notes, reminder_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      interaction.id,
      interaction.personId,
      interaction.type,
      interaction.occurredAt,
      interaction.notes ?? null,
      interaction.reminderId ?? null,
      interaction.createdAt
    );

    // Mettre à jour automatiquement la date de dernière interaction de la personne
    await db.runAsync(
      `UPDATE persons SET last_interaction_at = ?, updated_at = ? WHERE id = ?`,
      interaction.occurredAt,
      new Date().toISOString(),
      interaction.personId
    );
  },

  async findInteractions(personId: string): Promise<Interaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM interactions WHERE person_id = ? ORDER BY occurred_at DESC`,
      personId
    );
    return rows.map(rowToInteraction);
  },

  async deleteInteraction(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM interactions WHERE id = ?`, id);
  },
};

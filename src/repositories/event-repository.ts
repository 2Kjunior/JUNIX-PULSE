/**
 * Repository pour la gestion des événements et de leurs personnes associées.
 */

import type { SQLiteBindValue } from 'expo-sqlite';
import { getDatabase } from '../database/sqlite';
import { Event, Person } from '../domain/entities';

type NullableFields<T> = {
  [K in keyof T]?: T[K] | null;
};

export type UpdateEventParams = NullableFields<Omit<Event, 'id' | 'createdAt'>> & { id: string; updatedAt: string };

function rowToEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    title: row.title as string,
    notes: (row.notes as string | null) ?? undefined,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    timezone: row.timezone as string,
    location: (row.location as string | null) ?? undefined,
    type: row.type as Event['type'],
    travelBufferMinutes: (row.travel_buffer_minutes as number | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

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

export const EventRepository = {
  async create(event: Omit<Event, 'deletedAt'>, personIds?: string[]): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO events (id, title, notes, start_at, end_at, timezone, location, type, travel_buffer_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      event.id,
      event.title,
      event.notes ?? null,
      event.startAt,
      event.endAt,
      event.timezone ?? 'UTC',
      event.location ?? null,
      event.type,
      event.travelBufferMinutes ?? 0,
      event.createdAt,
      event.updatedAt
    );

    if (personIds && personIds.length > 0) {
      for (const pId of personIds) {
        await db.runAsync(
          `INSERT OR IGNORE INTO event_persons (event_id, person_id) VALUES (?, ?)`,
          event.id, pId
        );
      }
    }
  },

  async update(params: UpdateEventParams, personIds?: string[]): Promise<void> {
    const setClauses: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (params.title !== undefined) {
      setClauses.push('title = ?');
      values.push(params.title);
    }
    if (params.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(params.notes);
    }
    if (params.startAt !== undefined) {
      setClauses.push('start_at = ?');
      values.push(params.startAt);
    }
    if (params.endAt !== undefined) {
      setClauses.push('end_at = ?');
      values.push(params.endAt);
    }
    if (params.timezone !== undefined) {
      setClauses.push('timezone = ?');
      values.push(params.timezone);
    }
    if (params.location !== undefined) {
      setClauses.push('location = ?');
      values.push(params.location);
    }
    if (params.type !== undefined) {
      setClauses.push('type = ?');
      values.push(params.type);
    }
    if (params.travelBufferMinutes !== undefined) {
      setClauses.push('travel_buffer_minutes = ?');
      values.push(params.travelBufferMinutes);
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
      `UPDATE events SET ${setClauses.join(', ')} WHERE id = ?`,
      ...values
    );

    if (personIds !== undefined) {
      await db.runAsync(`DELETE FROM event_persons WHERE event_id = ?`, params.id);
      for (const pId of personIds) {
        await db.runAsync(
          `INSERT OR IGNORE INTO event_persons (event_id, person_id) VALUES (?, ?)`,
          params.id, pId
        );
      }
    }
  },

  async softDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      now, now, id
    );
  },

  async undoDelete(id: string, now: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE events SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
      now, id
    );
  },

  async findById(id: string): Promise<Event | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL', id
    );
    return row ? rowToEvent(row) : null;
  },

  async findForDate(dateYmd: string): Promise<Event[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM events
       WHERE deleted_at IS NULL
         AND DATE(start_at) <= ?
         AND DATE(end_at)   >= ?
       ORDER BY start_at ASC`,
      dateYmd, dateYmd
    );
    return rows.map(rowToEvent);
  },

  async findForRange(startDateIso: string, endDateIso: string): Promise<Event[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM events
       WHERE deleted_at IS NULL AND start_at >= ? AND start_at <= ?
       ORDER BY start_at ASC`,
      startDateIso, endDateIso
    );
    return rows.map(rowToEvent);
  },

  async findAll(): Promise<Event[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM events WHERE deleted_at IS NULL ORDER BY start_at ASC`
    );
    return rows.map(rowToEvent);
  },

  async findEventPersons(eventId: string): Promise<Person[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT p.* FROM persons p
       JOIN event_persons ep ON p.id = ep.person_id
       WHERE ep.event_id = ? AND p.deleted_at IS NULL
       ORDER BY p.display_name ASC`,
      eventId
    );
    return rows.map(rowToPerson);
  },
};

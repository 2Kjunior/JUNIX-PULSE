/**
 * Repository pour le stockage et la gestion des suggestions.
 * BR-001 : Une suggestion n'est jamais exécutée automatiquement sans validation humaine.
 */

import { getDatabase } from '../database/sqlite';
import { Suggestion } from '../domain/entities';

function rowToSuggestion(row: Record<string, unknown>): Suggestion {
  return {
    id: row.id as string,
    type: row.type as Suggestion['type'],
    status: row.status as Suggestion['status'],
    title: row.title as string,
    explanation: row.explanation as string,
    targetId: (row.target_id as string | null) ?? undefined,
    targetType: (row.target_type as string | null) ?? undefined,
    proposedData: (row.proposed_data as string | null) ?? undefined,
    generatedAt: row.generated_at as string,
    expiresAt: (row.expires_at as string | null) ?? undefined,
    decidedAt: (row.decided_at as string | null) ?? undefined,
  };
}

export const SuggestionRepository = {
  async create(suggestion: Suggestion): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO suggestions (id, type, status, title, explanation, target_id, target_type, proposed_data, generated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      suggestion.id,
      suggestion.type,
      suggestion.status,
      suggestion.title,
      suggestion.explanation,
      suggestion.targetId ?? null,
      suggestion.targetType ?? null,
      suggestion.proposedData ?? null,
      suggestion.generatedAt,
      suggestion.expiresAt ?? null
    );
  },

  async updateStatus(id: string, status: Suggestion['status'], decidedAt: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE suggestions SET status = ?, decided_at = ? WHERE id = ?',
      status,
      decidedAt,
      id
    );
  },

  async findPending(): Promise<Suggestion[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM suggestions WHERE status = 'PENDING' ORDER BY generated_at DESC`
    );
    return rows.map(rowToSuggestion);
  },

  async findAll(): Promise<Suggestion[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM suggestions ORDER BY generated_at DESC LIMIT 50'
    );
    return rows.map(rowToSuggestion);
  },
};

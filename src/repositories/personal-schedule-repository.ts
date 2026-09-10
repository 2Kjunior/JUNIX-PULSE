/**
 * Repository pour le planning personnel et les blocs hebdomadaires récurrents.
 * BR-013 : le planning est une intention de structure, pas une autorité.
 * BR-014 : un planning temporaire doit avoir une période de validité.
 */

import { getDatabase } from '../database/sqlite';
import { PersonalSchedule, PlanningBlock } from '../domain/entities';

function rowToSchedule(row: Record<string, unknown>): PersonalSchedule {
  return {
    id: row.id as string,
    name: row.name as string,
    validFrom: row.valid_from as string,
    validUntil: (row.valid_until as string | null) ?? undefined,
    status: row.status as PersonalSchedule['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToBlock(row: Record<string, unknown>): PlanningBlock {
  return {
    id: row.id as string,
    scheduleId: row.schedule_id as string,
    label: row.label as string,
    type: row.type as PlanningBlock['type'],
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    color: (row.color as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const PersonalScheduleRepository = {
  async createSchedule(schedule: PersonalSchedule): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO personal_schedules (id, name, valid_from, valid_until, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      schedule.id,
      schedule.name,
      schedule.validFrom,
      schedule.validUntil ?? null,
      schedule.status,
      schedule.createdAt,
      schedule.updatedAt
    );
  },

  async findActiveSchedule(): Promise<PersonalSchedule | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM personal_schedules
       WHERE status = 'ACTIVE'
         AND valid_from <= ?
         AND (valid_until IS NULL OR valid_until >= ?)
       ORDER BY created_at DESC LIMIT 1`,
      now,
      now
    );
    return row ? rowToSchedule(row) : null;
  },

  async findAllSchedules(): Promise<PersonalSchedule[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM personal_schedules ORDER BY created_at DESC'
    );
    return rows.map(rowToSchedule);
  },

  // ── Blocs de planning ────────────────────────────────────────────────────────

  async createBlock(block: PlanningBlock): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO planning_blocks (id, schedule_id, label, type, day_of_week, start_time, end_time, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      block.id,
      block.scheduleId,
      block.label,
      block.type,
      block.dayOfWeek,
      block.startTime,
      block.endTime,
      block.color ?? null,
      block.createdAt,
      block.updatedAt
    );
  },

  async deleteBlock(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM planning_blocks WHERE id = ?', id);
  },

  async getBlocksForSchedule(scheduleId: string): Promise<PlanningBlock[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM planning_blocks WHERE schedule_id = ? ORDER BY day_of_week ASC, start_time ASC`,
      scheduleId
    );
    return rows.map(rowToBlock);
  },

  async getBlocksForDay(scheduleId: string, dayOfWeek: number): Promise<PlanningBlock[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM planning_blocks WHERE schedule_id = ? AND day_of_week = ? ORDER BY start_time ASC`,
      scheduleId,
      dayOfWeek
    );
    return rows.map(rowToBlock);
  },
};

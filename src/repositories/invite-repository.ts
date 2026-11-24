/**
 * Who was sent an item, and who takes part (sheet 025): one row per item and person, in the
 * item_invites table (migration 38). No row: never sent to them.
 */

import { getDatabase } from '../database/sqlite';
import { inviteStatusOf, type InviteKind, type InviteStatus } from '../domain/rules/invite-rules';

export const InviteRepository = {
  /** The status of each person of an item, by person id. */
  async findFor(kind: InviteKind, itemId: string): Promise<Record<string, InviteStatus>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ person_id: string; status: string }>(
      'SELECT person_id, status FROM item_invites WHERE item_type = ? AND item_id = ?',
      kind,
      itemId
    );
    const statuses: Record<string, InviteStatus> = {};
    for (const row of rows) {
      const status = inviteStatusOf(row.status);
      if (status) statuses[row.person_id] = status;
    }
    return statuses;
  },

  async setStatus(kind: InviteKind, itemId: string, personId: string, status: InviteStatus): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO item_invites (item_type, item_id, person_id, status, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (item_type, item_id, person_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
      kind,
      itemId,
      personId,
      status,
      new Date().toISOString()
    );
  },
};

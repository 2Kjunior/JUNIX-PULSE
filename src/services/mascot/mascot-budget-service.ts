/**
 * Remembers what the mascot has already proposed today and what the user refused, so its
 * attention budget holds across opens of the app: proposals shown today, refusals per type,
 * types the user asked never to see again. Stored in the small mascot_state table.
 */

import { MascotProposalId } from '../../domain/rules/mascot-preferences';
import { MascotStateRepository } from '../../repositories/mascot-state-repository';

const REFUSALS_KEY = 'budget:refusals';
const MUTED_KEY = 'budget:muted';
const shownKey = (day: string) => `budget:shown:${day}`;

/** Refusals older than this can no longer matter and are dropped as the list is saved. */
const KEEP_REFUSALS_MS = 8 * 24 * 60 * 60 * 1000;

export interface StoredBudget {
  shownToday: string[];
  refusals: Partial<Record<MascotProposalId, number[]>>;
  muted: MascotProposalId[];
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toRefusals(value: unknown): Partial<Record<MascotProposalId, number[]>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: Partial<Record<MascotProposalId, number[]>> = {};
  for (const [id, times] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(times)) {
      result[id as MascotProposalId] = times.filter((time): time is number => typeof time === 'number');
    }
  }
  return result;
}

export async function loadBudget(day: string): Promise<StoredBudget> {
  try {
    const [shown, refusals, muted] = await Promise.all([
      MascotStateRepository.get(shownKey(day)),
      MascotStateRepository.get(REFUSALS_KEY),
      MascotStateRepository.get(MUTED_KEY),
    ]);
    return {
      shownToday: toStringList(parseJson(shown)),
      refusals: toRefusals(parseJson(refusals)),
      muted: toStringList(parseJson(muted)) as MascotProposalId[],
    };
  } catch {
    return { shownToday: [], refusals: {}, muted: [] };
  }
}

/** A proposal has been put in front of the user today. Counted once, whatever the number of opens. */
export async function recordProposalShown(day: string, suggestionId: string): Promise<void> {
  try {
    const current = toStringList(parseJson(await MascotStateRepository.get(shownKey(day))));
    if (current.includes(suggestionId)) return;
    await MascotStateRepository.set(shownKey(day), JSON.stringify([...current, suggestionId]));
  } catch {
    // The budget is a courtesy: failing to record it must never break the screen
  }
}

export async function recordProposalRefused(id: MascotProposalId, now: number): Promise<void> {
  try {
    const refusals = toRefusals(parseJson(await MascotStateRepository.get(REFUSALS_KEY)));
    const recent = (refusals[id] ?? []).filter(time => now - time < KEEP_REFUSALS_MS);
    refusals[id] = [...recent, now];
    await MascotStateRepository.set(REFUSALS_KEY, JSON.stringify(refusals));
  } catch {
    // Ignored on purpose
  }
}

/** The user has just refused a proposal of this type. */
export async function noteProposalRefused(id: MascotProposalId): Promise<void> {
  await recordProposalRefused(id, Date.now());
}

/** "Forget what I have seen": the proposals counters and refusals start afresh. */
export async function resetBudget(): Promise<void> {
  try {
    await MascotStateRepository.deleteByPrefix('budget:');
  } catch {
    // Ignored on purpose
  }
}

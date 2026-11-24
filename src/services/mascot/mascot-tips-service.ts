/**
 * Remembers which tips and tours the mascot has already given, in the small mascot_state table.
 * A tip is given once; "Oublier les astuces vues" and "Revoir la présentation" give it back.
 * The day of the last tip is kept too (sheet 024): a gesture tip never comes on the same day as
 * another one. It is a "tip:" key, so forgetting the tips forgets it as well.
 */

import { LAST_TIP_DAY_ID, tipDay } from '../../domain/rules/gesture-tip-rules';
import { HOME_TOUR_TIP_ID, tipKey } from '../../domain/rules/mascot-tour-rules';
import { MascotStateRepository } from '../../repositories/mascot-state-repository';

/** True when the tip was already given. A failed read counts as seen: better silent than repeated. */
export async function hasSeenTip(id: string): Promise<boolean> {
  try {
    return (await MascotStateRepository.get(tipKey(id))) !== null;
  } catch {
    return true;
  }
}

export async function markTipSeen(id: string): Promise<void> {
  try {
    await MascotStateRepository.set(tipKey(id), '1');
    await MascotStateRepository.set(tipKey(LAST_TIP_DAY_ID), tipDay(new Date()));
  } catch {
    // The tip may come back once more: harmless
  }
}

/** The day (YYYY-MM-DD) a tip was last given, or null. A failed read counts as today: better silent. */
export async function lastTipDay(): Promise<string | null> {
  try {
    return await MascotStateRepository.get(tipKey(LAST_TIP_DAY_ID));
  } catch {
    return tipDay(new Date());
  }
}

/** "Revoir la présentation": the home tour will run again the next time the home screen shows. */
export async function replayHomeTour(): Promise<void> {
  await MascotStateRepository.delete(tipKey(HOME_TOUR_TIP_ID));
}

/**
 * Remembers which tips and tours the mascot has already given, in the small mascot_state table.
 * A tip is given once; "Oublier les astuces vues" and "Revoir la présentation" give it back.
 * The day of the last tip is kept too (sheet 024): a gesture tip never comes on the same day as
 * another one. It is a "tip:" key, so forgetting the tips forgets it as well.
 */

import { LAST_TIP_DAY_ID, tipDay } from '../../domain/rules/gesture-tip-rules';
import { LAST_SECRET_DAY_ID } from '../../domain/rules/secret-tips-rules';
import { HOME_TOUR_TIP_ID, SCREEN_TOURS, tipKey } from '../../domain/rules/mascot-tour-rules';
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

/** The day (YYYY-MM-DD) the last secret was told, or null (sheet 046). A failed read counts as today. */
export async function lastSecretDay(): Promise<string | null> {
  try {
    return await MascotStateRepository.get(tipKey(LAST_SECRET_DAY_ID));
  } catch {
    return tipDay(new Date());
  }
}

/** A secret told (sheet 046): seen as a tip (the day of the last tip with it), and the day of the last secret. */
export async function markSecretTold(id: string): Promise<void> {
  await markTipSeen(id);
  try {
    await MascotStateRepository.set(tipKey(LAST_SECRET_DAY_ID), tipDay(new Date()));
  } catch {
    // A secret may come a little sooner: harmless
  }
}

/** "Revoir la présentation" gives back the tours of the other tabs too (sheet 045). */
export async function replayAllTours(): Promise<void> {
  await Promise.all(Object.values(SCREEN_TOURS).map(tour => MascotStateRepository.delete(tipKey(tour.tipId))));
}

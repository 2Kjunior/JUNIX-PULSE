/**
 * Remembers which tips and tours the mascot has already given, in the small mascot_state table.
 * A tip is given once; "Oublier les astuces vues" and "Revoir la présentation" give it back.
 */

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
  } catch {
    // The tip may come back once more: harmless
  }
}

/** "Revoir la présentation": the home tour will run again the next time the home screen shows. */
export async function replayHomeTour(): Promise<void> {
  await MascotStateRepository.delete(tipKey(HOME_TOUR_TIP_ID));
}

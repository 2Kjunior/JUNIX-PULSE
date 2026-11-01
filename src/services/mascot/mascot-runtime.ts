/**
 * Small module-level state the mascot needs but no store owns: whether a Focus session is in
 * progress (the timer is local to its screen) and the user's presence setting.
 * Plain values, read when a reaction is computed; nothing re-renders from them.
 */

import type { FocusState } from '../../domain/rules/focus-rules';
import { DEFAULT_MASCOT_PREFERENCES, MascotPresence } from '../../domain/rules/mascot-preferences';

let focusState: FocusState = 'idle';
let presence: MascotPresence = DEFAULT_MASCOT_PREFERENCES.presence;

export function setMascotFocusState(state: FocusState): void {
  focusState = state;
}

export function getMascotFocusState(): FocusState {
  return focusState;
}

/** Wired to the settings in the settings step; defaults to full presence until then. */
export function setMascotPresence(value: MascotPresence): void {
  presence = value;
}

export function getMascotPresence(): MascotPresence {
  return presence;
}

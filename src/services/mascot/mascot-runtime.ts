/**
 * Small module-level state the mascot needs but no store owns: whether a Focus session is in
 * progress (the timer is local to its screen) and the user's four mascot settings.
 * Plain values read when a reaction or a message is computed. The settings can be listened to,
 * so a screen follows a change made in the settings at once.
 */

import type { FocusState } from '../../domain/rules/focus-rules';
import {
  DEFAULT_MASCOT_SETTINGS,
  MascotPreferences,
  MascotPresence,
  MascotSettings,
  mascotPreferencesFromSettings,
} from '../../domain/rules/mascot-preferences';

let focusState: FocusState = 'idle';
let settings: MascotSettings = DEFAULT_MASCOT_SETTINGS;
let preferences: MascotPreferences = mascotPreferencesFromSettings(settings);

const listeners = new Set<() => void>();

export function setMascotFocusState(state: FocusState): void {
  focusState = state;
}

export function getMascotFocusState(): FocusState {
  return focusState;
}

/** Applies the user's settings. Everything that reads them sees the change straight away. */
export function setMascotSettings(next: MascotSettings): void {
  settings = next;
  preferences = mascotPreferencesFromSettings(next);
  for (const listener of [...listeners]) listener();
}

export function getMascotSettings(): MascotSettings {
  return settings;
}

/** The full preferences, derived from the settings; the same object until the settings change. */
export function getMascotPreferences(): MascotPreferences {
  return preferences;
}

export function subscribeMascotSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setMascotPresence(value: MascotPresence): void {
  setMascotSettings({ ...settings, presence: value });
}

export function getMascotPresence(): MascotPresence {
  return settings.presence;
}

/**
 * Keeps what the reaction rules need between events: the recent history, for habituation,
 * and the last reaction, for the cooldown. It owns no React state and reads no clock itself.
 */

import type { FocusState } from '../../domain/rules/focus-rules';
import type { MascotPresence } from '../../domain/rules/mascot-preferences';
import {
  computeMascotReaction,
  HABITUATION_WINDOW_MS,
  MascotEvent,
  MascotEventType,
  MascotReaction,
} from '../../domain/rules/mascot-reaction-rules';

export interface MascotReactionEnvironment {
  now: number; // Epoch milliseconds
  hour: number; // Local hour, 0 to 23
  keyboardOpen: boolean;
  focusState: FocusState;
  presence: MascotPresence;
}

export interface MascotReactionEngine {
  /** The reaction to show for this event, or null when the mascot stays silent. */
  handle(event: MascotEvent, environment: MascotReactionEnvironment): MascotReaction | null;
  reset(): void;
}

export function createMascotReactionEngine(): MascotReactionEngine {
  let history: { type: MascotEventType; at: number }[] = [];
  let lastReaction: { weight: number; at: number } | null = null;

  return {
    handle(event, environment) {
      // Entries older than the habituation window can no longer matter
      history = history.filter(entry => environment.now - entry.at < HABITUATION_WINDOW_MS);

      const reaction = computeMascotReaction(event, {
        now: environment.now,
        hour: environment.hour,
        keyboardOpen: environment.keyboardOpen,
        focusState: environment.focusState,
        presence: environment.presence,
        history,
        lastReaction,
      });

      // Only a reaction that was actually shown counts towards habituation and the cooldown
      if (reaction) {
        history.push({ type: event.type, at: environment.now });
        lastReaction = { weight: reaction.weight, at: environment.now };
      }
      return reaction;
    },

    reset() {
      history = [];
      lastReaction = null;
    },
  };
}

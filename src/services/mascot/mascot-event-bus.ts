/**
 * Event bus between the use cases and the mascot.
 * A use case announces what just succeeded; the mascot, if mounted, decides how to react.
 * It has no React or store dependency, so use cases can call it, and a failing listener
 * can never break the action that triggered it.
 */

import type { MascotEvent } from '../../domain/rules/mascot-reaction-rules';

export type MascotEventListener = (event: MascotEvent) => void;

const listeners = new Set<MascotEventListener>();

/** Announces an event. Call it only after the write has succeeded, never before. */
export function emitMascotEvent(event: MascotEvent): void {
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // The mascot is decoration: a broken listener must not affect the caller
    }
  }
}

/** Listens to events. Returns the function that stops listening. */
export function subscribeMascotEvents(listener: MascotEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

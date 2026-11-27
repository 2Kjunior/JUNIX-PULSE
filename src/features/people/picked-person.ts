/**
 * A person created from "Avec qui ?" of a form (sheet 040): the person form leaves her id here, and
 * the form she was created for takes it when it comes back into view, already ticked. Kept in memory
 * only: one person at a time, taken once.
 */
let lastCreated: string | null = null;

export function leavePickedPerson(id: string): void {
  lastCreated = id;
}

/** The person just created for a form, once; null when there is none. */
export function takePickedPerson(): string | null {
  const id = lastCreated;
  lastCreated = null;
  return id;
}

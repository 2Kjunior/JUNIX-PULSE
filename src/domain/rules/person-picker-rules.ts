/**
 * The order and the search of the person picker: the people seen most recently first, then the
 * others by name; the search ignores case and accents ("Zoe" finds "Zoé").
 */

export interface PickablePerson {
  id: string;
  displayName: string;
  relationship?: string;
  lastInteractionAt?: string;
}

export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function pickerPersons<T extends PickablePerson>(persons: readonly T[], query: string): T[] {
  const needle = foldText(query);
  const matching = needle
    ? persons.filter(
        person => foldText(person.displayName).includes(needle) || foldText(person.relationship ?? '').includes(needle)
      )
    : [...persons];
  return matching.sort((a, b) => {
    const seenA = a.lastInteractionAt ?? '';
    const seenB = b.lastInteractionAt ?? '';
    if (seenA !== seenB) return seenB.localeCompare(seenA);
    return a.displayName.localeCompare(b.displayName);
  });
}

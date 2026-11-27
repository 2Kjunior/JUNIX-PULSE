import { leavePickedPerson, takePickedPerson } from '../picked-person';

describe('picked-person, a person created from "Avec qui ?" (sheet 040)', () => {
  it('gives the person created once, to the form she was made for', () => {
    expect(takePickedPerson()).toBeNull();
    leavePickedPerson('p1');
    expect(takePickedPerson()).toBe('p1');
    // Taken: a second form does not tick her again
    expect(takePickedPerson()).toBeNull();
  });
});

/**
 * Unit tests for the mascot preferences rules.
 */

import {
  DEFAULT_MASCOT_PREFERENCES,
  isProposalFamilyEnabled,
  MAX_FIRST_NAME_LENGTH,
  MascotPreferences,
  maxProposalsPerDay,
  PROPOSAL_FAMILIES,
  resolveFirstName,
  sanitizeFirstName,
} from '../mascot-preferences';

const prefs = (overrides: Partial<MascotPreferences>): MascotPreferences => ({
  ...DEFAULT_MASCOT_PREFERENCES,
  ...overrides,
});

describe('defaults', () => {
  it('match the settings table of the brief', () => {
    expect(DEFAULT_MASCOT_PREFERENCES).toEqual({
      presence: 'full',
      address: 'tu',
      useFirstName: true,
      tone: 'warm',
      proposalsEnabled: true,
      proposalFrequency: 'normal',
      contactProposals: true,
      habitGoalProposals: true,
      taskPlanningProposals: true,
    });
  });
});

describe('sanitizeFirstName', () => {
  it.each([
    [undefined, null],
    [null, null],
    ['', null],
    ['   ', null],
    ['  Awa ', 'Awa'],
    ['Jean   Marc', 'Jean Marc'],
  ])('%j gives %j', (input, expected) => {
    expect(sanitizeFirstName(input)).toBe(expected);
  });

  it('cuts to 20 characters', () => {
    const result = sanitizeFirstName('A'.repeat(50));
    expect(result).toHaveLength(MAX_FIRST_NAME_LENGTH);
  });

  it('does not split an accented or emoji-free character in two', () => {
    expect(sanitizeFirstName('É'.repeat(25))).toBe('É'.repeat(20));
  });
});

describe('resolveFirstName', () => {
  it('returns the cleaned name when allowed', () => {
    expect(resolveFirstName(prefs({}), '  Awa ')).toBe('Awa');
  });

  it('returns null when the user does not want to be called by name', () => {
    expect(resolveFirstName(prefs({ useFirstName: false }), 'Awa')).toBeNull();
  });
});

describe('maxProposalsPerDay', () => {
  it('is 3 normally and 1 when rare', () => {
    expect(maxProposalsPerDay(prefs({ proposalFrequency: 'normal' }))).toBe(3);
    expect(maxProposalsPerDay(prefs({ proposalFrequency: 'rare' }))).toBe(1);
  });

  it('is 0 when proposals are off or the mascot is silent', () => {
    expect(maxProposalsPerDay(prefs({ proposalsEnabled: false }))).toBe(0);
    expect(maxProposalsPerDay(prefs({ presence: 'off' }))).toBe(0);
  });
});

describe('proposal families', () => {
  it('covers the twelve proposals as in the brief', () => {
    expect(PROPOSAL_FAMILIES).toEqual({
      P1: 'contacts', P4: 'contacts',
      P3: 'habitsGoals', P10: 'habitsGoals',
      P2: 'tasksPlanning', P5: 'tasksPlanning', P6: 'tasksPlanning', P7: 'tasksPlanning', P11: 'tasksPlanning',
      P8: 'always', P9: 'always', P12: 'always',
    });
  });

  it.each([
    ['contacts', { contactProposals: false }],
    ['habitsGoals', { habitGoalProposals: false }],
    ['tasksPlanning', { taskPlanningProposals: false }],
  ] as const)('respects the %s switch', (family, off) => {
    expect(isProposalFamilyEnabled(prefs({}), family)).toBe(true);
    expect(isProposalFamilyEnabled(prefs(off), family)).toBe(false);
  });

  it('never switches off the families governed elsewhere', () => {
    expect(
      isProposalFamilyEnabled(
        prefs({ contactProposals: false, habitGoalProposals: false, taskPlanningProposals: false }),
        'always'
      )
    ).toBe(true);
  });
});

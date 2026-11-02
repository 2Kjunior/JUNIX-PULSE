/**
 * Unit tests for the mascot preferences rules.
 */

import {
  DEFAULT_MASCOT_PREFERENCES,
  DEFAULT_MASCOT_SETTINGS,
  mascotPreferencesFromSettings,
  MascotSettings,
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
      language: 'fr',
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

describe('mascotPreferencesFromSettings', () => {
  const from = (overrides: Partial<MascotSettings> = {}) =>
    mascotPreferencesFromSettings({ ...DEFAULT_MASCOT_SETTINGS, ...overrides });

  it('turns the default settings into the default preferences', () => {
    expect(from()).toEqual(DEFAULT_MASCOT_PREFERENCES);
  });

  it('keeps the presence and the way of addressing', () => {
    expect(from({ presence: 'off', address: 'vous' })).toMatchObject({ presence: 'off', address: 'vous' });
  });

  it('is sober exactly when discreet', () => {
    expect(from({ presence: 'discreet' }).tone).toBe('sober');
    expect(from({ presence: 'full' }).tone).toBe('warm');
    expect(from({ presence: 'off' }).tone).toBe('warm');
  });

  it.each([
    ['normal', true, 'normal', 3],
    ['rare', true, 'rare', 1],
    ['off', false, 'normal', 0],
  ] as const)('proposals %s give %s, %s and %i a day', (proposals, enabled, frequency, perDay) => {
    const preferences = from({ proposals });
    expect(preferences.proposalsEnabled).toBe(enabled);
    expect(preferences.proposalFrequency).toBe(frequency);
    expect(maxProposalsPerDay(preferences)).toBe(perDay);
  });

  it('never switches a proposal family off on its own, and always uses the name', () => {
    expect(from({ proposals: 'rare', presence: 'discreet' })).toMatchObject({
      useFirstName: true,
      contactProposals: true,
      habitGoalProposals: true,
      taskPlanningProposals: true,
    });
  });

  it('silences proposals when the mascot is off, whatever the proposals setting', () => {
    expect(maxProposalsPerDay(from({ presence: 'off', proposals: 'normal' }))).toBe(0);
  });
});

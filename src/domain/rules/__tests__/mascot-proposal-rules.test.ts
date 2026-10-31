/**
 * Unit tests for the mascot attention budget.
 */

import { DEFAULT_MASCOT_PREFERENCES, MascotPreferences, MascotProposalId } from '../mascot-preferences';
import {
  canShowProposal,
  PROPOSAL_SILENCE_MS,
  ProposalState,
  selectProposal,
} from '../mascot-proposal-rules';

const NOW = 2_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const state = (overrides: Partial<ProposalState> = {}): ProposalState => ({
  now: NOW,
  hour: 14,
  focusState: 'idle',
  keyboardOpen: false,
  bubbleVisible: false,
  briefingsEnabled: true,
  proposalsShownToday: 0,
  refusals: {},
  mutedProposals: [],
  ...overrides,
});

const prefs = (overrides: Partial<MascotPreferences> = {}): MascotPreferences => ({
  ...DEFAULT_MASCOT_PREFERENCES,
  ...overrides,
});

const reason = (id: MascotProposalId, s: ProposalState, p: MascotPreferences) => {
  const decision = canShowProposal(id, s, p);
  return decision.allowed ? null : decision.reason;
};

describe('canShowProposal', () => {
  it('allows a proposal in the normal case', () => {
    expect(canShowProposal('P1', state(), prefs())).toEqual({ allowed: true });
  });

  it('denies everything when the mascot is off', () => {
    for (const id of ['P1', 'P8', 'P12'] as const) {
      expect(reason(id, state(), prefs({ presence: 'off' }))).toBe('presence_off');
    }
  });

  it('denies proposals, not the briefings, when proposals are off', () => {
    expect(reason('P1', state(), prefs({ proposalsEnabled: false }))).toBe('proposals_disabled');
    expect(reason('P12', state(), prefs({ proposalsEnabled: false }))).toBe('proposals_disabled');
    expect(canShowProposal('P8', state(), prefs({ proposalsEnabled: false }))).toEqual({ allowed: true });
    expect(canShowProposal('P9', state(), prefs({ proposalsEnabled: false }))).toEqual({ allowed: true });
  });

  it('lets the existing switch govern the briefings', () => {
    expect(reason('P8', state({ briefingsEnabled: false }), prefs())).toBe('briefings_disabled');
    expect(reason('P9', state({ briefingsEnabled: false }), prefs())).toBe('briefings_disabled');
    expect(canShowProposal('P1', state({ briefingsEnabled: false }), prefs())).toEqual({ allowed: true });
  });

  it.each([
    ['P1', { contactProposals: false }],
    ['P4', { contactProposals: false }],
    ['P3', { habitGoalProposals: false }],
    ['P10', { habitGoalProposals: false }],
    ['P2', { taskPlanningProposals: false }],
    ['P5', { taskPlanningProposals: false }],
    ['P6', { taskPlanningProposals: false }],
    ['P7', { taskPlanningProposals: false }],
    ['P11', { taskPlanningProposals: false }],
  ] as const)('%s follows its family switch', (id, off) => {
    expect(reason(id, state(), prefs(off))).toBe('family_disabled');
  });

  it('keeps other families when one is off', () => {
    expect(canShowProposal('P3', state(), prefs({ contactProposals: false }))).toEqual({ allowed: true });
  });

  it('respects a muted type', () => {
    expect(reason('P5', state({ mutedProposals: ['P5'] }), prefs())).toBe('muted');
    expect(canShowProposal('P6', state({ mutedProposals: ['P5'] }), prefs())).toEqual({ allowed: true });
  });

  describe('silence after refusals', () => {
    it('does not silence after one refusal', () => {
      expect(canShowProposal('P1', state({ refusals: { P1: [NOW - DAY] } }), prefs())).toEqual({ allowed: true });
    });

    it('silences for 7 days after two refusals of the same type', () => {
      const refusals = { P1: [NOW - 2 * DAY, NOW - DAY] };
      expect(reason('P1', state({ refusals }), prefs())).toBe('silenced');
      expect(canShowProposal('P2', state({ refusals }), prefs())).toEqual({ allowed: true });
    });

    it('lifts the silence once the refusals are older than 7 days', () => {
      const refusals = { P1: [NOW - PROPOSAL_SILENCE_MS - DAY, NOW - PROPOSAL_SILENCE_MS - 1] };
      expect(canShowProposal('P1', state({ refusals }), prefs())).toEqual({ allowed: true });
    });
  });

  it.each(['running', 'paused'] as const)('is silent while focus is %s', focusState => {
    expect(reason('P1', state({ focusState }), prefs())).toBe('focus');
    expect(reason('P8', state({ focusState }), prefs())).toBe('focus');
  });

  it('is silent with the keyboard open', () => {
    expect(reason('P1', state({ keyboardOpen: true }), prefs())).toBe('keyboard');
  });

  it.each([23, 2, 4])('is silent at %i h', hour => {
    expect(reason('P1', state({ hour }), prefs())).toBe('night');
  });

  it.each([22, 5])('may speak at %i h', hour => {
    expect(canShowProposal('P1', state({ hour }), prefs())).toEqual({ allowed: true });
  });

  it('shows one bubble at a time', () => {
    expect(reason('P1', state({ bubbleVisible: true }), prefs())).toBe('bubble_visible');
  });

  describe('daily budget', () => {
    it('allows 3 a day normally', () => {
      expect(canShowProposal('P1', state({ proposalsShownToday: 2 }), prefs())).toEqual({ allowed: true });
      expect(reason('P1', state({ proposalsShownToday: 3 }), prefs())).toBe('budget_exhausted');
    });

    it('allows 1 a day when rare', () => {
      const rare = prefs({ proposalFrequency: 'rare' });
      expect(canShowProposal('P1', state({ proposalsShownToday: 0 }), rare)).toEqual({ allowed: true });
      expect(reason('P1', state({ proposalsShownToday: 1 }), rare)).toBe('budget_exhausted');
    });

    it('does not count the briefings against it', () => {
      expect(canShowProposal('P8', state({ proposalsShownToday: 3 }), prefs())).toEqual({ allowed: true });
      expect(canShowProposal('P9', state({ proposalsShownToday: 3 }), prefs({ proposalFrequency: 'rare' }))).toEqual({
        allowed: true,
      });
    });
  });
});

describe('selectProposal', () => {
  it('returns the first allowed candidate in order', () => {
    expect(selectProposal(['P1', 'P2', 'P3'], state(), prefs({ contactProposals: false }))).toBe('P2');
  });

  it('returns null when none is allowed', () => {
    expect(selectProposal(['P1', 'P2'], state({ keyboardOpen: true }), prefs())).toBeNull();
    expect(selectProposal([], state(), prefs())).toBeNull();
  });

  it('skips a silenced candidate', () => {
    const refusals = { P1: [NOW - 2 * DAY, NOW - DAY] };
    expect(selectProposal(['P1', 'P3'], state({ refusals }), prefs())).toBe('P3');
  });
});

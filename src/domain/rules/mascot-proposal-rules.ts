/**
 * Pure rules for the mascot's attention budget: when it may speak up on its own.
 * One bubble at a time, a daily cap, a 7 day silence after two refusals of the same type,
 * and nothing during a Focus session, with the keyboard open or at night.
 * The morning and evening summaries (P8, P9) follow their own switch and are not counted.
 */

import { FocusState } from './focus-rules';
import { isNightHour } from './mascot-mood-rules';
import {
  isProposalFamilyEnabled,
  maxProposalsPerDay,
  MascotPreferences,
  MascotProposalId,
  PROPOSAL_FAMILIES,
} from './mascot-preferences';

export const REFUSALS_BEFORE_SILENCE = 2;
export const PROPOSAL_SILENCE_MS = 7 * 24 * 60 * 60 * 1000;

export type ProposalDenial =
  | 'presence_off'
  | 'proposals_disabled'
  | 'briefings_disabled'
  | 'family_disabled'
  | 'muted'
  | 'silenced'
  | 'budget_exhausted'
  | 'focus'
  | 'keyboard'
  | 'night'
  | 'bubble_visible';

export type ProposalDecision = { allowed: true } | { allowed: false; reason: ProposalDenial };

export interface ProposalState {
  now: number;
  hour: number; // Local hour, 0 to 23
  focusState: FocusState;
  keyboardOpen: boolean;
  bubbleVisible: boolean;
  briefingsEnabled: boolean;
  proposalsShownToday: number; // P8 and P9 excluded
  refusals: Readonly<Partial<Record<MascotProposalId, readonly number[]>>>; // Refusal timestamps
  mutedProposals: readonly MascotProposalId[]; // "Ne plus me proposer ça"
}

const BRIEFINGS: readonly MascotProposalId[] = ['P8', 'P9'];

function isSilenced(id: MascotProposalId, state: ProposalState): boolean {
  const times = state.refusals[id] ?? [];
  const recent = times.filter(at => state.now - at < PROPOSAL_SILENCE_MS);
  return recent.length >= REFUSALS_BEFORE_SILENCE;
}

export function canShowProposal(
  id: MascotProposalId,
  state: ProposalState,
  preferences: MascotPreferences
): ProposalDecision {
  const deny = (reason: ProposalDenial): ProposalDecision => ({ allowed: false, reason });
  const isBriefing = BRIEFINGS.includes(id);

  if (preferences.presence === 'off') return deny('presence_off');
  if (isBriefing && !state.briefingsEnabled) return deny('briefings_disabled');
  if (!isBriefing && !preferences.proposalsEnabled) return deny('proposals_disabled');
  if (!isProposalFamilyEnabled(preferences, PROPOSAL_FAMILIES[id])) return deny('family_disabled');
  if (state.mutedProposals.includes(id)) return deny('muted');
  if (isSilenced(id, state)) return deny('silenced');
  if (state.focusState === 'running' || state.focusState === 'paused') return deny('focus');
  if (state.keyboardOpen) return deny('keyboard');
  if (isNightHour(state.hour)) return deny('night');
  if (state.bubbleVisible) return deny('bubble_visible');
  if (!isBriefing && state.proposalsShownToday >= maxProposalsPerDay(preferences)) {
    return deny('budget_exhausted');
  }
  return { allowed: true };
}

/** First candidate, in the caller's priority order, that the budget allows. */
export function selectProposal(
  candidates: readonly MascotProposalId[],
  state: ProposalState,
  preferences: MascotPreferences
): MascotProposalId | null {
  for (const id of candidates) {
    if (canShowProposal(id, state, preferences).allowed) return id;
  }
  return null;
}

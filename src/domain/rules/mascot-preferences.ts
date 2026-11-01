/**
 * Single preferences object of the Pulse mascot.
 * It is read from settings by the caller and passed as input to every mascot rule:
 * the rules never read the database themselves.
 */

import type { MascotAddress, MascotPresence, MascotProposalsLevel } from '../enums';

export type { MascotAddress, MascotPresence, MascotProposalsLevel };
export type MascotTone = 'warm' | 'sober';
export type MascotProposalFrequency = 'normal' | 'rare';

export interface MascotPreferences {
  presence: MascotPresence;
  address: MascotAddress;
  useFirstName: boolean;
  tone: MascotTone;
  proposalsEnabled: boolean;
  proposalFrequency: MascotProposalFrequency;
  contactProposals: boolean; // P1, P4
  habitGoalProposals: boolean; // P3, P10
  taskPlanningProposals: boolean; // P2, P5, P6, P7, P11
}

export const DEFAULT_MASCOT_PREFERENCES: MascotPreferences = {
  presence: 'full',
  address: 'tu',
  useFirstName: true,
  tone: 'warm',
  proposalsEnabled: true,
  proposalFrequency: 'normal',
  contactProposals: true,
  habitGoalProposals: true,
  taskPlanningProposals: true,
};

/**
 * What the user actually chooses: four settings. The rest of MascotPreferences follows from them:
 * the tone is sober when the presence is discreet, proposals follow one three-way setting,
 * the name is used whenever one was given, and no proposal family is switched off on its own.
 */
export interface MascotSettings {
  presence: MascotPresence;
  address: MascotAddress;
  proposals: MascotProposalsLevel;
  briefings: boolean;
}

export const DEFAULT_MASCOT_SETTINGS: MascotSettings = {
  presence: 'full',
  address: 'tu',
  proposals: 'normal',
  briefings: true,
};

export function mascotPreferencesFromSettings(settings: MascotSettings): MascotPreferences {
  return {
    presence: settings.presence,
    address: settings.address,
    useFirstName: true,
    tone: settings.presence === 'discreet' ? 'sober' : 'warm',
    proposalsEnabled: settings.proposals !== 'off',
    proposalFrequency: settings.proposals === 'rare' ? 'rare' : 'normal',
    contactProposals: true,
    habitGoalProposals: true,
    taskPlanningProposals: true,
  };
}

export const MAX_FIRST_NAME_LENGTH = 20;
export const MAX_PROPOSALS_PER_DAY = { normal: 3, rare: 1 } as const;

export type MascotProposalId =
  | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'
  | 'P7' | 'P8' | 'P9' | 'P10' | 'P11' | 'P12';

/** `always` families are governed elsewhere: P8 and P9 by their own switch, P12 by `proposalsEnabled`. */
export type MascotProposalFamily = 'contacts' | 'habitsGoals' | 'tasksPlanning' | 'always';

export const PROPOSAL_FAMILIES: Record<MascotProposalId, MascotProposalFamily> = {
  P1: 'contacts',
  P2: 'tasksPlanning',
  P3: 'habitsGoals',
  P4: 'contacts',
  P5: 'tasksPlanning',
  P6: 'tasksPlanning',
  P7: 'tasksPlanning',
  P8: 'always',
  P9: 'always',
  P10: 'habitsGoals',
  P11: 'tasksPlanning',
  P12: 'always',
};

/**
 * Display form of the first name: trimmed, inner whitespace collapsed, cut to 20 characters.
 * Returns null when there is nothing to show. The name is never stored in the mascot state.
 */
export function sanitizeFirstName(name: string | null | undefined): string | null {
  if (!name) return null;
  const cleaned = name.replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return null;
  return Array.from(cleaned).slice(0, MAX_FIRST_NAME_LENGTH).join('').trim();
}

/** The first name to use in a message, or null when the user does not want to be called by name. */
export function resolveFirstName(
  preferences: MascotPreferences,
  displayName: string | null | undefined
): string | null {
  return preferences.useFirstName ? sanitizeFirstName(displayName) : null;
}

export function isProposalFamilyEnabled(
  preferences: MascotPreferences,
  family: MascotProposalFamily
): boolean {
  switch (family) {
    case 'contacts':
      return preferences.contactProposals;
    case 'habitsGoals':
      return preferences.habitGoalProposals;
    case 'tasksPlanning':
      return preferences.taskPlanningProposals;
    case 'always':
      return true;
  }
}

/** How many proposals the mascot may make per day: zero when it is silent or proposals are off. */
export function maxProposalsPerDay(preferences: MascotPreferences): number {
  if (preferences.presence === 'off' || !preferences.proposalsEnabled) return 0;
  return MAX_PROPOSALS_PER_DAY[preferences.proposalFrequency];
}

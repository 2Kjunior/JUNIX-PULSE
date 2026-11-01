/**
 * What the onboarding screens tell the guide mascot: where the welcome screen has left room for
 * it, and how the notification permission turned out. Plain shared values the guide follows.
 * The guide lives above the whole onboarding stack, so a screen cannot hand it props.
 */

import { useSyncExternalStore } from 'react';

import type { GuidePermissionOutcome } from '@/domain/rules/mascot-guide-rules';

export interface OnboardingGuideState {
  permission: GuidePermissionOutcome;
  /** Height, in window coordinates, where the mascot stands on the welcome screen. */
  welcomeAnchorY: number | null;
  /** Heights, in window coordinates, of the centres of the three discovery cards. */
  discoverCardsY: readonly number[];
}

const INITIAL: OnboardingGuideState = { permission: 'ask', welcomeAnchorY: null, discoverCardsY: [] };

let state: OnboardingGuideState = INITIAL;
const listeners = new Set<() => void>();

function update(next: Partial<OnboardingGuideState>): void {
  const merged = { ...state, ...next };
  const unchanged =
    merged.permission === state.permission &&
    merged.welcomeAnchorY === state.welcomeAnchorY &&
    merged.discoverCardsY.length === state.discoverCardsY.length &&
    merged.discoverCardsY.every((y, index) => y === state.discoverCardsY[index]);
  if (unchanged) return;
  state = merged; // A new object, so subscribers see the change
  for (const listener of [...listeners]) listener();
}

export function setGuidePermission(permission: GuidePermissionOutcome): void {
  update({ permission });
}

export function setWelcomeAnchorY(y: number | null): void {
  update({ welcomeAnchorY: y === null ? null : Math.round(y) });
}

export function setDiscoverCardsY(ys: readonly number[]): void {
  update({ discoverCardsY: ys.map(Math.round) });
}

export function resetOnboardingGuideState(): void {
  update(INITIAL);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): OnboardingGuideState {
  return state;
}

export function useOnboardingGuideState(): OnboardingGuideState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

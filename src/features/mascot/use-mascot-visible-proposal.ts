/**
 * Decides whether the mascot may put a proposal in front of the user right now.
 * It applies the attention budget: not when the mascot or its proposals are off, not at night
 * or during a Focus session, not past the daily limit, not after two refusals of the same type
 * in the week, not for a type the user muted. A proposal already shown today stays visible.
 */

import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import type { Suggestion } from '@/domain/entities';
import { canShowProposal } from '@/domain/rules/mascot-proposal-rules';
import { suggestionProposalId } from '@/domain/rules/mascot-suggestion-rules';
import {
  loadBudget,
  recordProposalRefused,
  recordProposalShown,
} from '@/services/mascot/mascot-budget-service';
import { getMascotFocusState } from '@/services/mascot/mascot-runtime';

import { useMascotPreferences } from './use-mascot-preferences';

export interface UseVisibleProposal {
  /** The suggestion to show, or null when the mascot must stay quiet. */
  proposal: Suggestion | null;
  /** Remembers that the user refused it, towards the silence after two refusals. */
  noteRefusal: (suggestion: Suggestion) => Promise<void>;
}

export function useVisibleProposal(suggestion: Suggestion | null): UseVisibleProposal {
  const { preferences, settings } = useMascotPreferences();
  const [proposal, setProposal] = useState<Suggestion | null>(null);

  const suggestionId = suggestion?.id ?? null;

  useEffect(() => {
    let active = true;

    async function decide() {
      if (!suggestion) {
        setProposal(null);
        return;
      }

      const now = new Date();
      const day = format(now, 'yyyy-MM-dd');
      const budget = await loadBudget(day);

      const decision = canShowProposal(
        suggestionProposalId(suggestion.type),
        {
          now: now.getTime(),
          hour: now.getHours(),
          focusState: getMascotFocusState(),
          keyboardOpen: false,
          bubbleVisible: false,
          briefingsEnabled: settings.briefings,
          // The one on screen does not count against itself
          proposalsShownToday: budget.shownToday.filter(id => id !== suggestion.id).length,
          refusals: budget.refusals,
          mutedProposals: budget.muted,
        },
        preferences
      );

      if (!active) return;
      if (decision.allowed) {
        setProposal(suggestion);
        if (!budget.shownToday.includes(suggestion.id)) await recordProposalShown(day, suggestion.id);
      } else {
        setProposal(null);
      }
    }

    void decide();
    return () => {
      active = false;
    };
    // The suggestion is identified by its id: a new object with the same id decides nothing new
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionId, preferences, settings.briefings]);

  const noteRefusal = useCallback(async (refused: Suggestion) => {
    await recordProposalRefused(suggestionProposalId(refused.type), Date.now());
  }, []);

  return { proposal, noteRefusal };
}

/**
 * A suggestion told by the mascot: the catalogue message when the suggestion carries its
 * parameters, the stored title otherwise, with the two answers Accepter and Ignorer.
 *
 * Preferences are the defaults until the settings step adds the mascot columns, so the mascot
 * speaks with "tu" in a warm tone and uses the first name.
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import { Suggestion } from '@/domain/entities';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { DEFAULT_MASCOT_PREFERENCES, MascotPreferences } from '@/domain/rules/mascot-preferences';
import { isViewOnlySuggestion, suggestionToMascotMessage } from '@/domain/rules/mascot-suggestion-rules';
import { useT } from '@/i18n';
import { suggestionTexts } from '@/i18n/suggestion-text';

import { BubbleTailSide, MascotBubble } from './MascotBubble';

export interface MascotProposalBubbleProps {
  suggestion: Suggestion;
  displayName?: string | null;
  preferences?: MascotPreferences;
  maxWidth: number;
  tailSide?: BubbleTailSide;
  onAccept: () => void;
  onRefuse: () => void;
  style?: StyleProp<ViewStyle>;
}

export function MascotProposalBubble({
  suggestion,
  displayName,
  preferences = DEFAULT_MASCOT_PREFERENCES,
  maxWidth,
  tailSide = 'top',
  onAccept,
  onRefuse,
  style,
}: MascotProposalBubbleProps) {
  const t = useT();
  const message = suggestionToMascotMessage(suggestion, preferences.language);
  let text: string | null = null;
  if (message) {
    try {
      text = resolveMascotMessage(message.id, message.params, preferences, displayName);
    } catch {
      text = null; // A malformed suggestion must never break the screen
    }
  }

  return (
    <MascotBubble
      text={text ?? suggestionTexts(suggestion, preferences.language, t).title}
      maxWidth={maxWidth}
      tailSide={tailSide}
      style={style}
      actions={[
        { label: t('pulse.ignore'), onPress: onRefuse, accessibilityLabel: t('proposal.ignoreA11y') },
        {
          label: isViewOnlySuggestion(suggestion.type) ? t('proposal.view') : t('proposal.accept'),
          onPress: onAccept,
          primary: true,
          accessibilityLabel: t('pulse.acceptA11y', { title: suggestionTexts(suggestion, preferences.language, t).title }),
        },
      ]}
    />
  );
}

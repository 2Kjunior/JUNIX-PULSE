/**
 * The title and the explanation of a suggestion, in the language being shown.
 *
 * The engine stores each suggestion with a French title and explanation, written when it was
 * created. A suggestion also carries its parameters in `proposedData`, so its texts are built
 * again here from the translation tables. A suggestion without usable parameters keeps the texts
 * it was stored with.
 */

import type { AppLanguage } from '../domain/rules/language-rules';
import { suggestionToMascotMessage } from '../domain/rules/mascot-suggestion-rules';
import type { SuggestionType } from '../domain/enums';
import type { TFunction } from './index';

export interface SuggestionTexts {
  title: string;
  explanation: string;
}

interface SuggestionTextSource {
  type: SuggestionType;
  title: string;
  explanation: string;
  proposedData?: string | null;
}

export function suggestionTexts(
  suggestion: SuggestionTextSource,
  language: AppLanguage,
  t: TFunction
): SuggestionTexts {
  const stored = { title: suggestion.title, explanation: suggestion.explanation };
  const message = suggestionToMascotMessage(suggestion, language);
  if (!message) return stored;
  const p = message.params;

  switch (suggestion.type) {
    case 'RESCHEDULE_REMINDER':
      return { title: t('suggestionText.reschedule.title', p), explanation: t('suggestionText.reschedule.text') };
    case 'PLANNING_CONFLICT':
      return { title: t('suggestionText.conflict.title'), explanation: t('suggestionText.conflict.text') };
    case 'HABIT_REMINDER':
      return { title: t('suggestionText.habit.title', p), explanation: t('suggestionText.habit.text', p) };
    case 'BIRTHDAY_REMINDER':
      return message.id === 'BIRTHDAY_TODAY'
        ? { title: t('suggestionText.birthdayToday.title', p), explanation: t('suggestionText.birthdayToday.text', p) }
        : { title: t('suggestionText.birthday.title', p), explanation: t('suggestionText.birthday.text', p) };
    case 'FORGOTTEN_CONTACT':
      return { title: t('suggestionText.contact.title', p), explanation: t('suggestionText.contact.text', p) };
    case 'GOAL_APPROACHING':
      return { title: t('suggestionText.goal.title', p), explanation: t('suggestionText.goal.text', p) };
    case 'POSTPONE_TASK':
      return {
        title: t(Number(p.count) < 2 ? 'suggestionText.postpone.titleOne' : 'suggestionText.postpone.titleMany', p),
        explanation: t('suggestionText.postpone.text'),
      };
    case 'OVERLOADED_DAY':
      return { title: t('suggestionText.overloaded.title'), explanation: t('suggestionText.overloaded.text', p) };
    case 'LINGERING_TASK':
      return { title: t('suggestionText.lingering.title', p), explanation: t('suggestionText.lingering.text') };
    case 'WELCOME_BACK':
      return { title: t('suggestionText.welcomeBack.title'), explanation: t('suggestionText.welcomeBack.text', p) };
  }
}

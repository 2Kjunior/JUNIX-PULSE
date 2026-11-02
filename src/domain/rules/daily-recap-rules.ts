/**
 * Which daily recap notifications the user should receive, and their wording.
 * They follow the same switches as the recap bubble on the home screen, so that opening the
 * notification leads to something. The text stays generic: it is written long before it fires,
 * when the day's tasks are not known yet.
 */

import { Settings } from '../entities';
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';

export type DailyRecapKind = 'MORNING_SUMMARY' | 'EVENING_REVIEW';

export interface DailyRecapNotification {
  kind: DailyRecapKind;
  hour: number;
  title: string;
  body: string;
}

export type DailyRecapSettings = Pick<
  Settings,
  | 'onboardingCompleted'
  | 'notificationsEnabled'
  | 'mascotPresence'
  | 'mascotBriefings'
  | 'mascotAddress'
  | 'morningBriefingHour'
  | 'endOfDayHour'
>;

export function plannedDailyRecaps(
  settings: DailyRecapSettings,
  language: AppLanguage = 'fr'
): DailyRecapNotification[] {
  if (
    !settings.onboardingCompleted ||
    !settings.notificationsEnabled ||
    settings.mascotPresence === 'off' ||
    !settings.mascotBriefings
  ) {
    return [];
  }

  // Tu and vous only exist in French: the English texts are the same for both
  const form = settings.mascotAddress === 'tu' ? 'tu' : 'vous';
  return [
    {
      kind: 'MORNING_SUMMARY',
      hour: settings.morningBriefingHour,
      title: translate(language, form === 'tu' ? 'recap.morningTitle.tu' : 'recap.morningTitle.vous'),
      body: translate(language, form === 'tu' ? 'recap.morningBody.tu' : 'recap.morningBody.vous'),
    },
    {
      kind: 'EVENING_REVIEW',
      hour: settings.endOfDayHour,
      title: translate(language, form === 'tu' ? 'recap.eveningTitle.tu' : 'recap.eveningTitle.vous'),
      body: translate(language, form === 'tu' ? 'recap.eveningBody.tu' : 'recap.eveningBody.vous'),
    },
  ];
}

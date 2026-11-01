/**
 * Which daily recap notifications the user should receive, and their wording.
 * They follow the same switches as the recap bubble on the home screen, so that opening the
 * notification leads to something. The text stays generic: it is written long before it fires,
 * when the day's tasks are not known yet.
 */

import { Settings } from '../entities';

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

export function plannedDailyRecaps(settings: DailyRecapSettings): DailyRecapNotification[] {
  if (
    !settings.onboardingCompleted ||
    !settings.notificationsEnabled ||
    settings.mascotPresence === 'off' ||
    !settings.mascotBriefings
  ) {
    return [];
  }

  const tu = settings.mascotAddress === 'tu';
  return [
    {
      kind: 'MORNING_SUMMARY',
      hour: settings.morningBriefingHour,
      title: tu ? 'Ton résumé du matin' : 'Votre résumé du matin',
      body: tu ? 'Ta journée est prête, viens la découvrir.' : 'Votre journée est prête, venez la découvrir.',
    },
    {
      kind: 'EVENING_REVIEW',
      hour: settings.endOfDayHour,
      title: tu ? 'Ton bilan du soir' : 'Votre bilan du soir',
      body: tu ? "Viens voir où tu en es aujourd'hui." : "Venez voir où vous en êtes aujourd'hui.",
    },
  ];
}

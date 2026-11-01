import { DailyRecapSettings, plannedDailyRecaps } from '../daily-recap-rules';

const settings = (overrides: Partial<DailyRecapSettings> = {}): DailyRecapSettings => ({
  onboardingCompleted: true,
  notificationsEnabled: true,
  mascotPresence: 'full',
  mascotBriefings: true,
  mascotAddress: 'tu',
  morningBriefingHour: 7,
  endOfDayHour: 21,
  ...overrides,
});

describe('plannedDailyRecaps', () => {
  it('plans the morning summary and the evening review at the chosen hours', () => {
    expect(plannedDailyRecaps(settings()).map(({ kind, hour }) => ({ kind, hour }))).toEqual([
      { kind: 'MORNING_SUMMARY', hour: 7 },
      { kind: 'EVENING_REVIEW', hour: 21 },
    ]);
  });

  it.each<[string, Partial<DailyRecapSettings>]>([
    ['the onboarding is not finished', { onboardingCompleted: false }],
    ['notifications are off', { notificationsEnabled: false }],
    ['the mascot is off', { mascotPresence: 'off' }],
    ['the briefings are off', { mascotBriefings: false }],
  ])('plans nothing when %s', (_label, overrides) => {
    expect(plannedDailyRecaps(settings(overrides))).toEqual([]);
  });

  it('follows the chosen form of address', () => {
    expect(plannedDailyRecaps(settings())[0].title).toBe('Ton résumé du matin');
    expect(plannedDailyRecaps(settings({ mascotAddress: 'vous' }))[0].title).toBe('Votre résumé du matin');
  });
});

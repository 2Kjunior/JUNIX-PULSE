/**
 * Timezones offered when a person lives elsewhere than the user. The most common ones: the
 * list is a shortcut, not a limit (a zone can still be typed as an IANA name).
 */

export interface TimezoneOption {
  /** City, as the user says it. */
  city: string;
  /** IANA name, what is stored. */
  value: string;
}

export const COMMON_TIMEZONES: readonly TimezoneOption[] = [
  { city: 'Abidjan', value: 'Africa/Abidjan' },
  { city: 'Dakar', value: 'Africa/Dakar' },
  { city: 'Lagos', value: 'Africa/Lagos' },
  { city: 'Kinshasa', value: 'Africa/Kinshasa' },
  { city: 'Casablanca', value: 'Africa/Casablanca' },
  { city: 'Johannesburg', value: 'Africa/Johannesburg' },
  { city: 'Paris', value: 'Europe/Paris' },
  { city: 'Londres', value: 'Europe/London' },
  { city: 'Bruxelles', value: 'Europe/Brussels' },
  { city: 'Berlin', value: 'Europe/Berlin' },
  { city: 'New York', value: 'America/New_York' },
  { city: 'Chicago', value: 'America/Chicago' },
  { city: 'Denver', value: 'America/Denver' },
  { city: 'Los Angeles', value: 'America/Los_Angeles' },
  { city: 'Montréal', value: 'America/Toronto' },
  { city: 'São Paulo', value: 'America/Sao_Paulo' },
  { city: 'Dubaï', value: 'Asia/Dubai' },
  { city: 'Pékin', value: 'Asia/Shanghai' },
  { city: 'Tokyo', value: 'Asia/Tokyo' },
  { city: 'Sydney', value: 'Australia/Sydney' },
  { city: 'UTC', value: 'UTC' },
];

/** The option for a stored zone, or null when it is not in the list. */
export function timezoneOption(value: string | undefined): TimezoneOption | null {
  return COMMON_TIMEZONES.find(option => option.value === value) ?? null;
}

/** "New York" for a listed zone, otherwise the IANA name itself. */
export function timezoneLabel(value: string): string {
  return timezoneOption(value)?.city ?? value;
}

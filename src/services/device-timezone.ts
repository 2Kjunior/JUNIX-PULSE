/**
 * The timezone of the phone, read from its calendar settings. It is the timezone of the user:
 * it follows the phone when they travel, so it is never asked.
 */

import { getCalendars } from 'expo-localization';

import { isValidTimezone } from '../domain/rules/person-availability-rules';

export function detectDeviceTimezone(): string {
  try {
    const zone = getCalendars()[0]?.timeZone;
    return isValidTimezone(zone) ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Reading the phone calendars, never writing to them. Off until the user turns it on in the
 * settings, which asks the system permission. Without the permission, or without the module,
 * it simply returns nothing.
 */

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import { DeviceEvent, toDeviceEvents } from '@/domain/rules/device-calendar-rules';
import { logger } from '@/utils/logger';

/** The phone calendars exist on Android and iOS only. */
const available = Platform.OS === 'android' || Platform.OS === 'ios';

/** Asks the permission to read the calendars. True when granted. */
export async function requestDeviceCalendarAccess(): Promise<boolean> {
  if (!available) return false;
  try {
    return (await Calendar.requestCalendarPermissions()).granted;
  } catch (error) {
    logger.warn('[DeviceCalendar] Permission non demandée', error);
    return false;
  }
}

/** The events of every phone calendar between the two dates, or none. */
export async function loadDeviceEvents(start: Date, end: Date): Promise<DeviceEvent[]> {
  if (!available) return [];
  try {
    if (!(await Calendar.getCalendarPermissions()).granted) return [];
    const calendars = await Calendar.getCalendars();
    if (calendars.length === 0) return [];
    const events = await Calendar.listEvents(calendars.map(item => item.id), start, end);
    return toDeviceEvents(
      events.map(event => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay,
        location: event.location,
      }))
    );
  } catch (error) {
    logger.warn('[DeviceCalendar] Agenda du téléphone illisible', error);
    return [];
  }
}

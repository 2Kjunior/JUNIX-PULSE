/**
 * Events of the phone calendars (Google Agenda, Samsung Agenda...), shown read-only next to the
 * reminders. Pure: the service gives what the system returned, already read.
 */

export interface RawDeviceEvent {
  id: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  allDay: boolean;
  location: string | null;
}

export interface DeviceEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  location: string | null;
}

/** Valid events, each occurrence once, sorted by start (all-day ones first on their day). */
export function toDeviceEvents(raw: readonly RawDeviceEvent[]): DeviceEvent[] {
  const seen = new Set<string>();
  const events: DeviceEvent[] = [];
  for (const item of raw) {
    const startAt = new Date(item.startDate);
    const endAt = new Date(item.endDate);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) continue;
    // A repeating event comes back once per occurrence, with the same id
    const key = `${item.id}:${startAt.getTime()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({
      id: key,
      title: item.title.trim() || '—',
      startAt,
      endAt,
      allDay: item.allDay,
      location: item.location?.trim() || null,
    });
  }
  return events.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startAt.getTime() - b.startAt.getTime());
}

/** The events that touch this day, from midnight to midnight. */
export function deviceEventsForDay(events: readonly DeviceEvent[], day: Date): DeviceEvent[] {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return events.filter(event => event.startAt < end && event.endAt > start);
}

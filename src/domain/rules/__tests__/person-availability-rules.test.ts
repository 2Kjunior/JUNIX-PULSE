import {
  callAdvice,
  DEFAULT_AVAILABILITY,
  formatLocalTime,
  formatMinutes,
  isAvailableAt,
  isValidAvailability,
  isValidTimezone,
  nextAvailableStart,
  parseAvailability,
  PersonAvailability,
  personTimeState,
  serializeAvailability,
  timezoneOffsetMinutes,
  zonedParts,
  zonedToInstant,
} from '../person-availability-rules';

const NEW_YORK = 'America/New_York';
const PARIS = 'Europe/Paris';
const ABIDJAN = 'Africa/Abidjan';
const TOKYO = 'Asia/Tokyo';

/** Monday to Friday, 9:00 to 20:00. */
const WEEKDAYS: PersonAvailability = { days: [1, 2, 3, 4, 5], startMinutes: 9 * 60, endMinutes: 20 * 60 };

// Monday 5 January 2026, 12:00 UTC: winter
const MONDAY_NOON_UTC = new Date(Date.UTC(2026, 0, 5, 12, 0));

describe('isValidTimezone', () => {
  it('accepts real IANA zones', () => {
    for (const zone of [NEW_YORK, PARIS, ABIDJAN, TOKYO, 'UTC']) expect(isValidTimezone(zone)).toBe(true);
  });

  it('rejects anything else', () => {
    for (const zone of ['', 'Not/AZone', 'abidjan', null, undefined]) expect(isValidTimezone(zone)).toBe(false);
  });
});

describe('zonedParts', () => {
  it('reads the wall clock of the zone', () => {
    expect(zonedParts(MONDAY_NOON_UTC, NEW_YORK)).toEqual({ year: 2026, month: 1, day: 5, hour: 7, minute: 0, weekday: 1 });
    expect(zonedParts(MONDAY_NOON_UTC, PARIS)).toMatchObject({ hour: 13, weekday: 1 });
    expect(zonedParts(MONDAY_NOON_UTC, ABIDJAN)).toMatchObject({ hour: 12, weekday: 1 });
  });

  it('changes the day and the weekday with the zone', () => {
    // 20:00 UTC on Monday is already Tuesday morning in Tokyo
    const instant = new Date(Date.UTC(2026, 0, 5, 20, 0));
    expect(zonedParts(instant, TOKYO)).toMatchObject({ day: 6, hour: 5, weekday: 2 });
    expect(zonedParts(instant, NEW_YORK)).toMatchObject({ day: 5, hour: 15, weekday: 1 });
  });

  it('writes midnight as 0, not 24', () => {
    expect(zonedParts(new Date(Date.UTC(2026, 0, 5, 5, 0)), NEW_YORK).hour).toBe(0);
  });

  it('knows Sunday is 7', () => {
    expect(zonedParts(new Date(Date.UTC(2026, 0, 4, 12, 0)), ABIDJAN).weekday).toBe(7);
  });
});

describe('timezoneOffsetMinutes', () => {
  it('follows the clock change of a zone', () => {
    expect(timezoneOffsetMinutes(MONDAY_NOON_UTC, NEW_YORK)).toBe(-300); // Winter, UTC-5
    expect(timezoneOffsetMinutes(new Date(Date.UTC(2026, 6, 6, 12, 0)), NEW_YORK)).toBe(-240); // Summer, UTC-4
    expect(timezoneOffsetMinutes(MONDAY_NOON_UTC, PARIS)).toBe(60);
    expect(timezoneOffsetMinutes(MONDAY_NOON_UTC, ABIDJAN)).toBe(0);
    expect(timezoneOffsetMinutes(MONDAY_NOON_UTC, TOKYO)).toBe(540);
  });
});

describe('zonedToInstant', () => {
  it('is the opposite of reading the wall clock', () => {
    const instant = zonedToInstant(NEW_YORK, { year: 2026, month: 1, day: 5 }, 9 * 60);
    expect(instant.toISOString()).toBe('2026-01-05T14:00:00.000Z');
    expect(formatLocalTime(instant, NEW_YORK)).toBe('09:00');
  });

  it('uses the summer offset in summer', () => {
    const instant = zonedToInstant(NEW_YORK, { year: 2026, month: 7, day: 6 }, 9 * 60);
    expect(instant.toISOString()).toBe('2026-07-06T13:00:00.000Z');
  });

  it('works for a zone ahead of UTC', () => {
    const instant = zonedToInstant(TOKYO, { year: 2026, month: 1, day: 6 }, 9 * 60);
    expect(instant.toISOString()).toBe('2026-01-06T00:00:00.000Z');
  });
});

describe('formatLocalTime and formatMinutes', () => {
  it('writes 24 hours with two digits', () => {
    expect(formatLocalTime(MONDAY_NOON_UTC, NEW_YORK)).toBe('07:00');
    expect(formatLocalTime(MONDAY_NOON_UTC, PARIS)).toBe('13:00');
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(9 * 60 + 5)).toBe('09:05');
    expect(formatMinutes(24 * 60)).toBe('24:00');
  });
});

describe('isValidAvailability', () => {
  it('accepts the default window', () => {
    expect(isValidAvailability(DEFAULT_AVAILABILITY)).toBe(true);
  });

  it.each<[string, PersonAvailability]>([
    ['no day', { days: [], startMinutes: 540, endMinutes: 1200 }],
    ['a day out of range', { days: [0], startMinutes: 540, endMinutes: 1200 }],
    ['a day above 7', { days: [8], startMinutes: 540, endMinutes: 1200 }],
    ['an end before the start', { days: [1], startMinutes: 1200, endMinutes: 540 }],
    ['an empty window', { days: [1], startMinutes: 540, endMinutes: 540 }],
    ['a start before midnight', { days: [1], startMinutes: -1, endMinutes: 540 }],
    ['an end after the day', { days: [1], startMinutes: 0, endMinutes: 1441 }],
    ['half minutes', { days: [1], startMinutes: 540.5, endMinutes: 1200 }],
  ])('rejects %s', (_name, value) => {
    expect(isValidAvailability(value)).toBe(false);
  });
});

describe('parseAvailability and serializeAvailability', () => {
  it('round-trips a window, with its days in order and without duplicates', () => {
    const stored = serializeAvailability({ days: [5, 1, 3, 3], startMinutes: 600, endMinutes: 1080 });
    expect(parseAvailability(stored)).toEqual({ days: [1, 3, 5], startMinutes: 600, endMinutes: 1080 });
  });

  it('reads nothing from nothing', () => {
    expect(parseAvailability(null)).toBeNull();
    expect(parseAvailability(undefined)).toBeNull();
    expect(parseAvailability('')).toBeNull();
  });

  it('reads nothing from what is not a valid window', () => {
    for (const stored of ['not json', '[]', '"text"', '{}', '{"days":[1],"startMinutes":"9","endMinutes":1200}']) {
      expect(parseAvailability(stored)).toBeNull();
    }
    expect(parseAvailability('{"days":[1],"startMinutes":900,"endMinutes":600}')).toBeNull();
    expect(parseAvailability('{"days":[9],"startMinutes":600,"endMinutes":900}')).toBeNull();
  });
});

describe('isAvailableAt', () => {
  it('is false before the window, true inside, false from its end', () => {
    // 12:00 UTC is 07:00 in New York: too early
    expect(isAvailableAt(WEEKDAYS, NEW_YORK, MONDAY_NOON_UTC)).toBe(false);
    // 14:00 UTC is 09:00 there: the window opens
    expect(isAvailableAt(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 0, 5, 14, 0)))).toBe(true);
    expect(isAvailableAt(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 0, 5, 14, 59)))).toBe(true);
    // 01:00 UTC on Tuesday is 20:00 on Monday there: the window is closed
    expect(isAvailableAt(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 0, 6, 1, 0)))).toBe(false);
    expect(isAvailableAt(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 0, 6, 0, 59)))).toBe(true);
  });

  it('is false on a day that is not chosen', () => {
    // Saturday 10 January, 10:00 in New York
    expect(isAvailableAt(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 0, 10, 15, 0)))).toBe(false);
  });

  it('uses the weekday of the person, not of the caller', () => {
    // 23:30 UTC on Sunday is already Monday 08:30 in Tokyo
    const sundayNightUtc = new Date(Date.UTC(2026, 0, 4, 23, 30));
    expect(isAvailableAt({ days: [1], startMinutes: 8 * 60, endMinutes: 12 * 60 }, TOKYO, sundayNightUtc)).toBe(true);
  });
});

describe('nextAvailableStart', () => {
  it('is the moment itself when the person can be called', () => {
    const open = new Date(Date.UTC(2026, 0, 5, 16, 0));
    expect(nextAvailableStart(WEEKDAYS, NEW_YORK, open)).toBe(open);
  });

  it('is the opening of the same day when it is too early', () => {
    const next = nextAvailableStart(WEEKDAYS, NEW_YORK, MONDAY_NOON_UTC);
    expect(next?.toISOString()).toBe('2026-01-05T14:00:00.000Z');
  });

  it('is the opening of the next day when the window has closed', () => {
    // 02:00 UTC on Tuesday is 21:00 on Monday in New York
    const next = nextAvailableStart(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 0, 6, 2, 0)));
    expect(next?.toISOString()).toBe('2026-01-06T14:00:00.000Z');
  });

  it('skips the weekend', () => {
    // Saturday 10 January 10:00 in New York: next is Monday 12 January 09:00
    const next = nextAvailableStart(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 0, 10, 15, 0)));
    expect(next?.toISOString()).toBe('2026-01-12T14:00:00.000Z');
  });

  it('follows the clock change when the next window is after it', () => {
    // Friday 6 March 2026 evening in New York; the clocks go forward on Sunday 8 March
    const next = nextAvailableStart(WEEKDAYS, NEW_YORK, new Date(Date.UTC(2026, 2, 7, 2, 0)));
    expect(next?.toISOString()).toBe('2026-03-09T13:00:00.000Z'); // 09:00 EDT is 13:00 UTC, not 14:00
  });

  it('is null when no window comes within the horizon', () => {
    const never: PersonAvailability = { days: [1], startMinutes: 540, endMinutes: 600 };
    const tuesday = new Date(Date.UTC(2026, 0, 6, 12, 0));
    expect(nextAvailableStart(never, NEW_YORK, tuesday, 3)).toBeNull();
    expect(nextAvailableStart(never, NEW_YORK, tuesday)?.toISOString()).toBe('2026-01-12T14:00:00.000Z');
  });
});

describe('personTimeState', () => {
  const person = (availability: PersonAvailability | null = WEEKDAYS) => ({ timezone: NEW_YORK, availability });

  it('tells only the local time when no window was given', () => {
    expect(personTimeState(person(null), MONDAY_NOON_UTC, PARIS)).toEqual({
      kind: 'local-time-only',
      localTime: '07:00',
      weekday: 1,
    });
  });

  it('says available, with the end of the window, inside it', () => {
    const state = personTimeState(person(), new Date(Date.UTC(2026, 0, 5, 16, 0)), PARIS);
    expect(state).toEqual({ kind: 'available', localTime: '11:00', weekday: 1, untilTime: '20:00' });
  });

  it('gives the next opening in the time of the person and in the time of the user', () => {
    // Monday 07:00 in New York: opens at 09:00 there, which is 15:00 in Paris, the same day
    const state = personTimeState(person(), MONDAY_NOON_UTC, PARIS);
    expect(state).toEqual({
      kind: 'unavailable',
      localTime: '07:00',
      weekday: 1,
      next: { there: { weekday: 1, time: '09:00' }, here: { weekday: 1, time: '15:00' }, sameDay: true },
    });
  });

  it('says it is another day for the user when the opening falls on the next one', () => {
    // Friday 21:00 in New York, Saturday 03:00 in Paris: next opening is Monday 09:00 there, 15:00 in Paris
    const fridayEvening = new Date(Date.UTC(2026, 0, 10, 2, 0));
    const state = personTimeState(person(), fridayEvening, PARIS);
    expect(state.kind).toBe('unavailable');
    if (state.kind !== 'unavailable' || !state.next) return;
    expect(state.next.there).toEqual({ weekday: 1, time: '09:00' });
    expect(state.next.here).toEqual({ weekday: 1, time: '15:00' });
    expect(state.next.sameDay).toBe(false);
  });

  it('has no next opening when none comes soon', () => {
    const never: PersonAvailability = { days: [1], startMinutes: 540, endMinutes: 600 };
    const tuesday = new Date(Date.UTC(2026, 0, 6, 12, 0));
    const state = personTimeState({ timezone: NEW_YORK, availability: never }, tuesday, PARIS);
    expect(state.kind).toBe('unavailable');
  });
});

describe('callAdvice', () => {
  const mom = { timezone: NEW_YORK, availability: WEEKDAYS as PersonAvailability | null };

  it('says nothing when the zone of the person is not known', () => {
    expect(callAdvice({}, MONDAY_NOON_UTC, PARIS)).toBeNull();
    expect(callAdvice({ timezone: 'Nowhere/Land' }, MONDAY_NOON_UTC, PARIS)).toBeNull();
  });

  it('gives only the time there when no window was given', () => {
    expect(callAdvice({ timezone: NEW_YORK }, MONDAY_NOON_UTC, PARIS)).toEqual({ kind: 'info', localTime: '07:00' });
  });

  it('says it suits them inside the window', () => {
    const at = new Date(Date.UTC(2026, 0, 5, 18, 0)); // 13:00 in New York
    expect(callAdvice(mom, at, PARIS)).toEqual({ kind: 'inside', localTime: '13:00' });
  });

  it('offers the next opening when the moment is outside the window', () => {
    // 18:00 in Paris is 12:00 UTC... too early there at 07:00, so the opening at 09:00 is offered
    const advice = callAdvice(mom, MONDAY_NOON_UTC, PARIS);
    expect(advice?.kind).toBe('outside');
    if (advice?.kind !== 'outside') return;
    expect(advice.localTime).toBe('07:00');
    expect(advice.suggestion?.instant.toISOString()).toBe('2026-01-05T14:00:00.000Z');
    expect(advice.suggestion?.there).toEqual({ weekday: 1, time: '09:00' });
    expect(advice.suggestion?.here).toEqual({ weekday: 1, time: '15:00' });
  });

  it('still offers the following Monday when the window is a single day a week', () => {
    const never: PersonAvailability = { days: [1], startMinutes: 540, endMinutes: 600 };
    const tuesday = new Date(Date.UTC(2026, 0, 6, 12, 0));
    const advice = callAdvice({ timezone: NEW_YORK, availability: never }, tuesday, PARIS);
    expect(advice?.kind).toBe('outside');
    if (advice?.kind !== 'outside') return;
    expect(advice.suggestion?.instant.toISOString()).toBe('2026-01-12T14:00:00.000Z');
  });
});

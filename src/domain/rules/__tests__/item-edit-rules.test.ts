import { alertTimeRefused, simpleRecurrenceOf, splitAlertMoment, taskStatusAfterEdit } from '../item-edit-rules';

describe('taskStatusAfterEdit', () => {
  it('takes a task out of the Inbox once it has a day, and back without one', () => {
    expect(taskStatusAfterEdit('INBOX', '2026-11-25')).toBe('SCHEDULED');
    expect(taskStatusAfterEdit('SCHEDULED', undefined)).toBe('INBOX');
  });

  it('keeps every other status', () => {
    expect(taskStatusAfterEdit('SCHEDULED', '2026-11-25')).toBe('SCHEDULED');
    expect(taskStatusAfterEdit('INBOX', undefined)).toBe('INBOX');
    expect(taskStatusAfterEdit('IN_PROGRESS', undefined)).toBe('IN_PROGRESS');
    expect(taskStatusAfterEdit('COMPLETED', '2026-11-25')).toBe('COMPLETED');
    expect(taskStatusAfterEdit('POSTPONED', undefined)).toBe('POSTPONED');
  });
});

describe('simpleRecurrenceOf', () => {
  it('shows every day, every week and every month', () => {
    expect(simpleRecurrenceOf({ type: 'DAILY', interval: 1 })).toBe('DAILY');
    expect(simpleRecurrenceOf({ type: 'WEEKLY', interval: 1, daysOfWeek: [1] })).toBe('WEEKLY');
    expect(simpleRecurrenceOf({ type: 'MONTHLY', interval: 1 })).toBe('MONTHLY');
  });

  it('does not show what the form cannot say, so that it is kept', () => {
    expect(simpleRecurrenceOf(null)).toBeNull();
    expect(simpleRecurrenceOf(undefined)).toBeNull();
    expect(simpleRecurrenceOf({ type: 'DAILY', interval: 3 })).toBeNull();
    expect(simpleRecurrenceOf({ type: 'CUSTOM_INTERVAL', interval: 1 })).toBeNull();
    expect(simpleRecurrenceOf({ type: 'WEEKLY', interval: 1, daysOfWeek: [1, 3] })).toBeNull();
    expect(simpleRecurrenceOf({ type: 'MONTHLY', interval: 1, weekPosition: 'LAST' })).toBeNull();
  });
});

describe('alertTimeRefused', () => {
  const now = new Date('2026-11-24T10:00:00');
  const past = new Date('2026-11-24T09:00:00');
  const future = new Date('2026-11-24T11:00:00');

  it('accepts a time to come', () => {
    expect(alertTimeRefused(null, future, now)).toBe(false);
    expect(alertTimeRefused(past, future, now)).toBe(false);
  });

  it('refuses a past time chosen now', () => {
    expect(alertTimeRefused(null, past, now)).toBe(true);
    expect(alertTimeRefused(future, past, now)).toBe(true);
  });

  it('lets a late reminder keep its time when something else changes', () => {
    expect(alertTimeRefused(past, new Date(past), now)).toBe(false);
  });
});

describe('splitAlertMoment', () => {
  it('gives the day and the time the form shows', () => {
    expect(splitAlertMoment(new Date('2026-11-25T18:30:00'))).toEqual({ day: '2026-11-25', time: { hour: 18, minute: 30 } });
  });
});

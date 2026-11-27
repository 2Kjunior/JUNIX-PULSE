import {
  alertMoment,
  dayParam,
  hourParam,
  ITEM_FORMS,
  visibleMoreFields,
  visibleSections,
} from '../constants/item-forms';
import { ITEM_FAMILIES } from '../constants/item-kinds';
import { focusMinutesForTask } from '../domain/rules/focus-rules';

describe('the forms registry', () => {
  it('gives each family its own form, in the order of the study', () => {
    expect(Object.keys(ITEM_FORMS).sort()).toEqual([...ITEM_FAMILIES].sort());
    expect(visibleSections('todo')).toEqual(['what', 'when', 'alert', 'who', 'more']);
    expect(ITEM_FORMS.moment.sections).toEqual(['what', 'kind', 'slot', 'where', 'leave', 'who', 'more']);
  });

  it('offers "Leave … min before" only once a place is written', () => {
    expect(visibleSections('moment', { place: '' })).not.toContain('leave');
    expect(visibleSections('moment', { place: '   ' })).not.toContain('leave');
    expect(visibleSections('moment', { place: 'Chez Léa' })).toContain('leave');
  });

  it('hides what a reminder does not have once the alert is on', () => {
    expect(visibleMoreFields('todo')).toEqual(['priority', 'deadline', 'duration', 'subtasks', 'tags', 'color']);
    // With an alert, the time to do it stays: it fills that time in the Planning (sheet 033)
    expect(visibleMoreFields('todo', { alert: true })).toEqual(['duration', 'tags', 'color']);
    // The colour of the card stays in both cases (sheet 043)
    expect(visibleMoreFields('moment', { alert: true })).toEqual(['priority', 'availability', 'tags', 'color']);
  });

  it('reads the day and the hour handed by the Planning', () => {
    expect(dayParam('2026-11-24')).toBe('2026-11-24');
    expect(dayParam('2026-11-24T10:00:00.000Z')).toBe('2026-11-24');
    expect(dayParam('demain')).toBeUndefined();
    expect(dayParam(undefined)).toBeUndefined();
    expect(hourParam('14')).toBe(14);
    expect(hourParam('0')).toBe(0);
    expect(hourParam('24')).toBeUndefined();
    expect(hourParam('9.5')).toBeUndefined();
    expect(hourParam('')).toBeUndefined();
  });

  it('puts the alert on its day at its time, today when no day is chosen', () => {
    const now = new Date(2026, 10, 23, 15, 10);
    const onDay = alertMoment('2026-11-25', { hour: 9, minute: 30 }, now);
    expect([onDay.getFullYear(), onDay.getMonth(), onDay.getDate(), onDay.getHours(), onDay.getMinutes()]).toEqual([2026, 10, 25, 9, 30]);
    const today = alertMoment(undefined, { hour: 18, minute: 0 }, now);
    expect([today.getDate(), today.getHours()]).toEqual([23, 18]);
  });
});

describe('the time to do a task, in Focus', () => {
  it('sets the timer to the time of the task', () => {
    expect(focusMinutesForTask(15)).toEqual({ durationMinutes: 15, selectionMode: 'preset' });
    expect(focusMinutesForTask(45)).toEqual({ durationMinutes: 45, selectionMode: 'custom' });
  });

  it('keeps 25 minutes for a task without a time', () => {
    expect(focusMinutesForTask(undefined)).toEqual({ durationMinutes: 25, selectionMode: 'preset' });
    expect(focusMinutesForTask(Number(''))).toEqual({ durationMinutes: 25, selectionMode: 'preset' });
    expect(focusMinutesForTask(Number(undefined))).toEqual({ durationMinutes: 25, selectionMode: 'preset' });
  });

  it('keeps the timer within what Focus allows', () => {
    expect(focusMinutesForTask(180)).toEqual({ durationMinutes: 120, selectionMode: 'custom' });
  });
});

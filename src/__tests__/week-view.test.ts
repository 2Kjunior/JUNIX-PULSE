import {
  DEFAULT_WEEK_ZOOM,
  FIT_WEEK_ZOOM,
  WEEK_ZOOM_LEVELS,
  clampZoom,
  scrollTargetFor,
  weekBandItems,
  weekSizes,
  zoomAfterPinch,
} from '../domain/rules/week-view-rules';

describe('the Week view (sheet 047)', () => {
  it('opens at the size of before, and « Semaine entière » fits the 7 days', () => {
    expect(weekSizes(DEFAULT_WEEK_ZOOM, 300)).toEqual({ dayWidth: 128, hourHeight: 88 });
    expect(weekSizes(FIT_WEEK_ZOOM, 280).dayWidth).toBe(40);
    // Never thinner than a finger's tip, even on a narrow screen
    expect(weekSizes(FIT_WEEK_ZOOM, 100).dayWidth).toBe(32);
  });

  it('zooms one level per pinch, within its bounds', () => {
    expect(zoomAfterPinch(2, 1.4)).toBe(3);
    expect(zoomAfterPinch(2, 0.6)).toBe(1);
    expect(zoomAfterPinch(2, 1.05)).toBe(2);
    expect(zoomAfterPinch(WEEK_ZOOM_LEVELS.length - 1, 2)).toBe(WEEK_ZOOM_LEVELS.length - 1);
    expect(zoomAfterPinch(0, 0.5)).toBe(0);
    expect(clampZoom(-3)).toBe(0);
  });

  it('brings a day and a time into view, without going past the edges', () => {
    const base = { startHour: 7, dayWidth: 128, hourHeight: 88, totalHours: 15, viewport: { width: 280, height: 440 } };
    // Friday 18:00: the day centred, the hour a third down
    expect(scrollTargetFor({ ...base, dayIndex: 4, minutes: 18 * 60 })).toEqual({ x: 436, y: 821 });
    // Monday 7:00: at the very start
    expect(scrollTargetFor({ ...base, dayIndex: 0, minutes: 7 * 60 })).toEqual({ x: 0, y: 0 });
    // Sunday 23:00: at the very end
    expect(scrollTargetFor({ ...base, dayIndex: 6, minutes: 23 * 60 })).toEqual({ x: 7 * 128 - 280, y: 15 * 88 - 440 });
  });

  it('lists the band in week order, and in the current week only what is still to come', () => {
    const items = [
      { id: 'sat', label: 'Tâche du soir', dayIndex: 5, minutes: 20 * 60, startTime: '20:00' },
      { id: 'mon', label: 'Réunion', dayIndex: 0, minutes: 9 * 60, startTime: '09:00' },
      { id: 'thuLate', label: 'Appeler Zoé', dayIndex: 3, minutes: 19 * 60, startTime: '19:00' },
      { id: 'thuEarly', label: 'Déjeuner', dayIndex: 3, minutes: 12 * 60, startTime: '12:00' },
    ];
    expect(weekBandItems(items, { todayIndex: null, nowMinutes: 0 }).map(i => i.id)).toEqual(['mon', 'thuEarly', 'thuLate', 'sat']);
    // Thursday 18:30: Monday and lunch are behind
    expect(weekBandItems(items, { todayIndex: 3, nowMinutes: 18 * 60 + 30 }).map(i => i.id)).toEqual(['thuLate', 'sat']);
    expect(weekBandItems(items, { todayIndex: null, nowMinutes: 0, limit: 2 })).toHaveLength(2);
  });
});

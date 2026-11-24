import {
  clampColumn,
  columnsForOffset,
  dayDots,
  dayFromKey,
  dayHours,
  dayKey,
  daysBetween,
  layoutDay,
  minutesForOffset,
  monthGrid,
  monthGridRange,
  movedRange,
  movedStart,
  shiftedRecurrence,
  snapMinutes,
} from '../planning-move-rules';

describe('planning-move-rules (sheet 026)', () => {
  it('lands on a quarter of an hour', () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(-7)).toBe(0);
    expect(snapMinutes(-8)).toBe(-15);
    expect(snapMinutes(52)).toBe(45);
  });

  it('turns a finger move into minutes and columns', () => {
    expect(minutesForOffset(64, 64)).toBe(60);
    expect(minutesForOffset(20, 64)).toBe(15);
    expect(minutesForOffset(-33, 64)).toBe(-30);
    expect(minutesForOffset(10, 0)).toBe(0);
    expect(columnsForOffset(40, 84)).toBe(0);
    expect(columnsForOffset(43, 84)).toBe(1);
    expect(columnsForOffset(-170, 84)).toBe(-2);
    expect(clampColumn(9)).toBe(6);
    expect(clampColumn(-1)).toBe(0);
  });

  it('moves a start and keeps the length of a moment', () => {
    const start = new Date(2026, 10, 24, 18, 50);
    expect(movedStart(start, 15, 0)).toEqual(new Date(2026, 10, 24, 19, 0));
    expect(movedStart(new Date(2026, 10, 24, 19, 0), 15, 2)).toEqual(new Date(2026, 10, 26, 19, 15));
    const range = movedRange(new Date(2026, 10, 24, 9, 0), new Date(2026, 10, 24, 10, 30), 60, -1);
    expect(range.start).toEqual(new Date(2026, 10, 23, 10, 0));
    expect(range.end).toEqual(new Date(2026, 10, 23, 11, 30));
  });

  it('reads and writes days', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayFromKey('2026-01-05')).toEqual(new Date(2026, 0, 5));
    expect(daysBetween(new Date(2026, 2, 28, 22), new Date(2026, 2, 30, 1))).toBe(2);
  });

  it('makes a repeat follow its card to another day', () => {
    const monday = new Date(2026, 10, 23, 9);
    const tuesday = new Date(2026, 10, 24, 9);
    expect(shiftedRecurrence({ type: 'WEEKLY', interval: 1, daysOfWeek: [1] }, monday, tuesday)).toEqual({
      type: 'WEEKLY',
      interval: 1,
      daysOfWeek: [2],
    });
    expect(shiftedRecurrence({ type: 'WEEKLY', interval: 1, daysOfWeek: [1, 6] }, monday, tuesday)?.daysOfWeek).toEqual([0, 2]);
    expect(shiftedRecurrence({ type: 'WEEKLY', interval: 1, daysOfWeek: [1] }, monday, new Date(2026, 10, 30))).toBeNull();
    expect(shiftedRecurrence({ type: 'MONTHLY', interval: 1, dayOfMonth: 23 }, monday, tuesday)).toEqual({
      type: 'MONTHLY',
      interval: 1,
      dayOfMonth: 24,
    });
    expect(shiftedRecurrence({ type: 'DAILY', interval: 1 }, monday, tuesday)).toBeNull();
    // A new rule never keeps the id of the old one (it would replace the new id when saved)
    expect(shiftedRecurrence({ id: 'old', type: 'WEEKLY', interval: 1, daysOfWeek: [1] }, monday, tuesday)).not.toHaveProperty('id');
    expect(shiftedRecurrence({ type: 'WEEKLY', interval: 1, daysOfWeek: [1] }, monday, monday)).toBeNull();
  });

  it('draws a month on six weeks, Monday first', () => {
    const days = monthGrid(new Date(2026, 10, 24)); // November 2026 starts on a Sunday
    expect(days).toHaveLength(42);
    expect(days[0]).toEqual(new Date(2026, 9, 26));
    expect(days[6]).toEqual(new Date(2026, 10, 1));
    expect(monthGridRange(new Date(2026, 10, 1))).toEqual({ from: '2026-10-26', to: '2026-12-06' });
  });

  it('gives three dots and the rest as a number', () => {
    expect(dayDots(['a', 'b', 'c', 'd', 'e'])).toEqual({ dots: ['a', 'b', 'c'], more: 2 });
    expect(dayDots(['a'])).toEqual({ dots: ['a'], more: 0 });
  });

  it('widens the day for an early or a late card', () => {
    expect(dayHours([])).toEqual({ first: 7, last: 22 });
    expect(dayHours([{ startMin: 6 * 60 + 30, endMin: 23 * 60 + 10 }])).toEqual({ first: 6, last: 24 });
  });

  it('places the cards of a day side by side when they meet', () => {
    const boxes = layoutDay(
      [
        { id: 'a', startMin: 9 * 60, endMin: 10 * 60 },
        { id: 'b', startMin: 9 * 60 + 30, endMin: 11 * 60 },
        { id: 'c', startMin: 12 * 60, endMin: 12 * 60 },
      ],
      7,
      64
    );
    const byId = Object.fromEntries(boxes.map(box => [box.id, box]));
    expect(byId.a).toMatchObject({ top: 128, column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    expect(byId.c).toMatchObject({ top: 320, column: 0, columns: 1, height: 28 });
  });
});

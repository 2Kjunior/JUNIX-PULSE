import { makeHabitCandidates, normalizeTitle } from '../habit-candidate-rules';
import { suggestionToMascotMessage } from '../mascot-suggestion-rules';

/** Monday 23 November 2026. */
const now = new Date(2026, 10, 23, 12, 0);
const doneOn = (day: number, title = 'Ranger le bureau') => ({ id: `t${day}`, title, completedAt: new Date(2026, 10, day, 18, 0).toISOString() });

describe('make it a habit', () => {
  it('proposes a reminder repeated every day, ringing at the same time', () => {
    const [candidate] = makeHabitCandidates({
      now,
      repeatedReminders: [{ id: 'r1', title: 'Prendre mes vitamines', time: '08:00', frequency: 'DAILY' }],
    });
    expect(candidate.type).toBe('MAKE_HABIT');
    expect(JSON.parse(candidate.proposedData)).toMatchObject({ source: 'reminder', reminderId: 'r1', frequency: 'DAILY', time: '08:00' });
  });

  it('proposes a task done 3 times in 14 days, as a weekly habit', () => {
    const [candidate] = makeHabitCandidates({ now, recentDoneTasks: [doneOn(10), doneOn(15), doneOn(20), doneOn(22)] });
    expect(JSON.parse(candidate.proposedData)).toMatchObject({ source: 'task', frequency: 'WEEKLY', targetDaysPerWeek: 2 });
  });

  it('waits for 3 times, inside the 14 days', () => {
    expect(makeHabitCandidates({ now, recentDoneTasks: [doneOn(20), doneOn(22)] })).toEqual([]);
    expect(makeHabitCandidates({ now, recentDoneTasks: [doneOn(1), doneOn(2), doneOn(3)] })).toEqual([]);
  });

  it('never proposes what is a habit already, whatever its capitals or accents', () => {
    expect(normalizeTitle('  Méditer  le Matin ')).toBe('mediter le matin');
    expect(
      makeHabitCandidates({
        now,
        repeatedReminders: [{ id: 'r1', title: 'Méditer', time: '07:00', frequency: 'DAILY' }],
        habitTitles: ['mediter'],
      })
    ).toEqual([]);
  });

  it('makes one proposal at a time', () => {
    const candidates = makeHabitCandidates({
      now,
      repeatedReminders: [
        { id: 'r1', title: 'Vitamines', time: '08:00', frequency: 'DAILY' },
        { id: 'r2', title: 'Sport', time: '18:00', frequency: 'WEEKLY' },
      ],
      recentDoneTasks: [doneOn(20), doneOn(21), doneOn(22)],
    });
    expect(candidates).toHaveLength(1);
  });

  it('gives Pulse its words', () => {
    const message = suggestionToMascotMessage({ type: 'MAKE_HABIT', title: '', proposedData: JSON.stringify({ title: 'Sport' }) });
    expect(message?.id).toBe('MAKE_HABIT');
  });
});

/**
 * Unit tests for the proposal candidates and their reconciliation with stored suggestions.
 */

import {
  buildSuggestionCandidates,
  CandidateFacts,
  daysUntilBirthday,
  DECISION_COOLDOWN_MS,
  findBusyConflict,
  reconcileSuggestions,
  streakAlertHour,
  StoredSuggestion,
  SuggestionCandidate,
} from '../mascot-candidate-rules';
import { suggestionProposalId, suggestionToMascotMessage } from '../mascot-suggestion-rules';
import { resolveMascotMessage } from '../mascot-message-rules';
import { DEFAULT_MASCOT_PREFERENCES } from '../mascot-preferences';

const at = (hour: number, minute = 0, day = 31) => new Date(2026, 9, day, hour, minute); // 31 October 2026

const facts = (overrides: Partial<CandidateFacts> = {}): CandidateFacts => ({
  now: at(14),
  endOfDayHour: 20,
  persons: [],
  missedReminders: [],
  habits: [],
  todayTasks: [],
  inboxTasks: [],
  tomorrowItemCount: 0,
  tomorrowEvents: [],
  goals: [],
  daysSinceLastOpen: null,
  waitingReminderCount: 0,
  ...overrides,
});

const typesOf = (overrides: Partial<CandidateFacts>) => buildSuggestionCandidates(facts(overrides)).map(c => c.type);

describe('daysUntilBirthday', () => {
  const now = at(14);
  it.each([
    ['1990-10-31', 0],
    ['1990-11-03', 3],
    ['1990-11-01', 1],
    ['1990-10-30', 364],
    ['2000-12-25', 55],
    ['1990-02-28', 120],
  ])('%s is in %i days', (birthDate, expected) => {
    expect(daysUntilBirthday(birthDate, now)).toBe(expected);
  });

  it('puts 29 February on the 28th in a year without one', () => {
    expect(daysUntilBirthday('2000-02-29', new Date(2027, 1, 27))).toBe(1);
    expect(daysUntilBirthday('2000-02-29', new Date(2028, 1, 27))).toBe(2);
  });

  it.each([null, undefined, '', 'nope', '1990-13-01', '1990-00-10'])('rejects %j', value => {
    expect(daysUntilBirthday(value, now)).toBeNull();
  });
});

describe('streakAlertHour', () => {
  it.each([
    [20, 18],
    [22, 18],
    [17, 15],
    [1, 0],
  ])('with the review at %i h it is %i h', (endOfDay, expected) => {
    expect(streakAlertHour(endOfDay)).toBe(expected);
  });
});

describe('findBusyConflict', () => {
  const ev = (id: string, start: number, end: number, type: 'BUSY' | 'FREE' = 'BUSY') => ({
    id, type, startAt: at(start).toISOString(), endAt: at(end).toISOString(),
  });

  it('finds two overlapping busy events', () => {
    expect(findBusyConflict([ev('a', 9, 11), ev('b', 10, 12)])).toMatchObject({ first: { id: 'a' }, second: { id: 'b' } });
  });

  it('ignores events that only touch', () => {
    expect(findBusyConflict([ev('a', 9, 10), ev('b', 10, 11)])).toBeNull();
  });

  it('ignores free events', () => {
    expect(findBusyConflict([ev('a', 9, 11), ev('b', 10, 12, 'FREE')])).toBeNull();
  });

  it('works whatever the order', () => {
    expect(findBusyConflict([ev('b', 10, 12), ev('a', 9, 11)])?.first.id).toBe('a');
  });

  it('finds nothing in no or one event', () => {
    expect(findBusyConflict([])).toBeNull();
    expect(findBusyConflict([ev('a', 9, 11)])).toBeNull();
  });
});

describe('buildSuggestionCandidates', () => {
  it('has nothing to say on an empty day', () => {
    expect(typesOf({})).toEqual([]);
  });

  it('P2: proposes to move each missed reminder', () => {
    const missed = [{ id: 'r1', title: 'Appeler papa', scheduledAt: at(9).toISOString() }];
    const [candidate] = buildSuggestionCandidates(facts({ missedReminders: missed }));
    expect(candidate).toMatchObject({ type: 'RESCHEDULE_REMINDER', targetId: 'r1' });
    expect(JSON.parse(candidate.proposedData)).toEqual({ title: 'Appeler papa', time: '9 h' });
  });

  describe('P3, a streak at risk', () => {
    const habit = { id: 'h1', title: 'Lecture', active: true, currentStreak: 6, completedToday: false };

    it('waits for the evening', () => {
      expect(typesOf({ now: at(17, 59), habits: [habit] })).toEqual([]);
      expect(typesOf({ now: at(18), habits: [habit] })).toEqual(['HABIT_REMINDER']);
    });

    it('follows an earlier evening review', () => {
      expect(typesOf({ now: at(15), endOfDayHour: 17, habits: [habit] })).toEqual(['HABIT_REMINDER']);
    });

    it.each([
      ['already done', { completedToday: true }],
      ['no streak yet', { currentStreak: 0 }],
      ['paused or archived', { active: false }],
    ])('skips a habit that is %s', (_label, change) => {
      expect(typesOf({ now: at(19), habits: [{ ...habit, ...change }] })).toEqual([]);
    });

    it('lapses at the end of the day', () => {
      const [candidate] = buildSuggestionCandidates(facts({ now: at(19), habits: [habit] }));
      expect(new Date(candidate.expiresAt!).getTime()).toBe(new Date(2026, 10, 1).getTime());
    });
  });

  describe('P4, a birthday', () => {
    const person = (birthDate: string) => ({
      id: 'p1', displayName: 'Awa', birthDate, lastInteractionAt: at(10, 0, 30).toISOString(), forgottenThresholdDays: 30,
    });

    it('speaks three days before and on the day itself', () => {
      expect(typesOf({ persons: [person('1990-11-03')] })).toEqual(['BIRTHDAY_REMINDER']);
      expect(typesOf({ persons: [person('1990-10-31')] })).toEqual(['BIRTHDAY_REMINDER']);
    });

    it.each(['1990-11-02', '1990-11-04', '1990-11-10', '1990-10-30'])('stays quiet for %s', birthDate => {
      expect(typesOf({ persons: [person(birthDate)] })).toEqual([]);
    });

    it('gives each day its own key, so yesterday\'s wording expires', () => {
      const early = buildSuggestionCandidates(facts({ now: at(14, 0, 28), persons: [person('1990-10-31')] }))[0];
      const dayOf = buildSuggestionCandidates(facts({ persons: [person('1990-10-31')] }))[0];
      expect(early.targetId).not.toBe(dayOf.targetId);
    });

    it('phrases the day itself with its own message', () => {
      const [candidate] = buildSuggestionCandidates(facts({ persons: [person('1990-10-31')] }));
      const message = suggestionToMascotMessage({ type: candidate.type, title: candidate.title, proposedData: candidate.proposedData });
      expect(message?.id).toBe('BIRTHDAY_TODAY');
      expect(resolveMascotMessage(message!.id, message!.params, DEFAULT_MASCOT_PREFERENCES, null)).toBe(
        "C'est l'anniversaire d'Awa aujourd'hui. Un petit message ?"
      );
    });
  });

  it('P1: proposes a person who was forgotten, with the real number of days', () => {
    const person = {
      id: 'p1', displayName: 'Marc', lastInteractionAt: new Date(2026, 8, 26).toISOString(), forgottenThresholdDays: 30,
    };
    const [candidate] = buildSuggestionCandidates(facts({ persons: [person] }));
    expect(candidate.type).toBe('FORGOTTEN_CONTACT');
    expect(JSON.parse(candidate.proposedData)).toEqual({ person: 'Marc', days: 35 });
  });

  it('P1: leaves a recently contacted person alone', () => {
    const person = { id: 'p1', displayName: 'Marc', lastInteractionAt: at(9, 0, 20).toISOString(), forgottenThresholdDays: 30 };
    expect(typesOf({ persons: [person] })).toEqual([]);
  });

  describe('P5, tasks to move', () => {
    const task = (id: string, status: 'SCHEDULED' | 'COMPLETED') => ({ id, title: id, status, createdAt: at(8).toISOString() });

    it('waits for the evening review hour', () => {
      expect(typesOf({ now: at(19, 59), todayTasks: [task('a', 'SCHEDULED')] })).toEqual([]);
      expect(typesOf({ now: at(20), todayTasks: [task('a', 'SCHEDULED')] })).toEqual(['POSTPONE_TASK']);
    });

    it('counts only the unfinished ones and keeps their ids', () => {
      const [candidate] = buildSuggestionCandidates(
        facts({ now: at(21), todayTasks: [task('a', 'SCHEDULED'), task('b', 'COMPLETED'), task('c', 'SCHEDULED')] })
      );
      expect(JSON.parse(candidate.proposedData)).toEqual({ count: 2, taskIds: ['a', 'c'] });
    });

    it('says nothing once everything is done', () => {
      expect(typesOf({ now: at(21), todayTasks: [task('a', 'COMPLETED')] })).toEqual([]);
    });
  });

  it.each([
    [7, []],
    [8, ['OVERLOADED_DAY']],
    [12, ['OVERLOADED_DAY']],
  ])('P6: tomorrow with %i items gives %j', (count, expected) => {
    expect(typesOf({ tomorrowItemCount: count })).toEqual(expected);
  });

  it('P7: proposes to look at a conflict tomorrow', () => {
    const ev = (id: string, start: number, end: number) => ({
      id, type: 'BUSY' as const, startAt: at(start, 0, 1).toISOString(), endAt: at(end, 0, 1).toISOString(),
    });
    const [candidate] = buildSuggestionCandidates(facts({ tomorrowEvents: [ev('a', 14, 16), ev('b', 15, 17)] }));
    expect(candidate).toMatchObject({ type: 'PLANNING_CONFLICT', targetId: 'a:b' });
    expect(JSON.parse(candidate.proposedData)).toEqual({ time: '15 h' });
  });

  describe('P10, a goal due soon', () => {
    const goal = (daysLeft: number | null, extra = {}) => ({ id: 'g1', title: 'Permis', active: true, daysLeft, progress: 59.6, ...extra });

    it.each([
      [1, true], [7, true], [0, false], [8, false], [-2, false], [null, false],
    ])('with %s days left: %s', (daysLeft, expected) => {
      expect(typesOf({ goals: [goal(daysLeft)] }).includes('GOAL_APPROACHING')).toBe(expected);
    });

    it('rounds the progress and skips an inactive goal', () => {
      const [candidate] = buildSuggestionCandidates(facts({ goals: [goal(5)] }));
      expect(JSON.parse(candidate.proposedData)).toEqual({ goal: 'Permis', days: 5, percent: 60 });
      expect(typesOf({ goals: [goal(5, { active: false })] })).toEqual([]);
    });
  });

  describe('P11, a task that lingers', () => {
    const task = (id: string, daysAgo: number) => ({
      id, title: `Tâche ${id}`, status: 'INBOX' as const, createdAt: at(8, 0, 31 - daysAgo).toISOString(),
    });

    it('needs 14 days', () => {
      expect(typesOf({ inboxTasks: [task('a', 13)] })).toEqual([]);
      expect(typesOf({ inboxTasks: [task('a', 14)] })).toEqual(['LINGERING_TASK']);
    });

    it('speaks of the oldest one only', () => {
      const candidates = buildSuggestionCandidates(facts({ inboxTasks: [task('a', 20), task('b', 29)] }));
      expect(candidates).toHaveLength(1);
      expect(candidates[0].targetId).toBe('b');
      expect(JSON.parse(candidates[0].proposedData)).toEqual({ title: 'Tâche b', days: 29 });
    });
  });

  describe('P12, back after a while', () => {
    it.each([
      [2, 3, false], [3, 3, true], [10, 2, true], [10, 0, false], [null, 3, false],
    ])('away %s days with %i reminders waiting: %s', (away, waiting, expected) => {
      expect(typesOf({ daysSinceLastOpen: away, waitingReminderCount: waiting }).includes('WELCOME_BACK')).toBe(expected);
    });
  });

  it('puts the most pressing proposals first', () => {
    const candidates = buildSuggestionCandidates(
      facts({
        now: at(21),
        missedReminders: [{ id: 'r', title: 'x', scheduledAt: at(9).toISOString() }],
        todayTasks: [{ id: 't', title: 't', status: 'SCHEDULED', createdAt: at(8).toISOString() }],
        tomorrowItemCount: 9,
        daysSinceLastOpen: 5,
        waitingReminderCount: 1,
      })
    );
    expect(candidates.map(c => c.type)).toEqual(['RESCHEDULE_REMINDER', 'POSTPONE_TASK', 'OVERLOADED_DAY', 'WELCOME_BACK']);
  });

  it('only builds proposals the mascot knows how to say', () => {
    const everything = facts({
      now: at(21),
      persons: [{ id: 'p', displayName: 'Awa', birthDate: '1990-10-31', lastInteractionAt: at(9, 0, 1).toISOString(), forgottenThresholdDays: 30 }],
      missedReminders: [{ id: 'r', title: 'x', scheduledAt: at(9).toISOString() }],
      habits: [{ id: 'h', title: 'Lecture', active: true, currentStreak: 3, completedToday: false }],
      todayTasks: [{ id: 't', title: 't', status: 'SCHEDULED', createdAt: at(8).toISOString() }],
      inboxTasks: [{ id: 'i', title: 'Idée', status: 'INBOX', createdAt: at(8, 0, 1).toISOString() }],
      tomorrowItemCount: 9,
      tomorrowEvents: [
        { id: 'a', type: 'BUSY', startAt: at(14, 0, 1).toISOString(), endAt: at(16, 0, 1).toISOString() },
        { id: 'b', type: 'BUSY', startAt: at(15, 0, 1).toISOString(), endAt: at(17, 0, 1).toISOString() },
      ],
      goals: [{ id: 'g', title: 'Permis', active: true, daysLeft: 3, progress: 40 }],
      daysSinceLastOpen: 4,
      waitingReminderCount: 2,
    });
    const candidates = buildSuggestionCandidates(everything);
    expect(candidates.length).toBeGreaterThanOrEqual(10);
    for (const candidate of candidates) {
      const message = suggestionToMascotMessage({ type: candidate.type, title: candidate.title, proposedData: candidate.proposedData });
      expect(message).not.toBeNull();
      expect(suggestionProposalId(candidate.type)).toMatch(/^P\d+$/);
      const text = resolveMascotMessage(message!.id, message!.params, DEFAULT_MASCOT_PREFERENCES, 'Awa');
      expect(text).not.toMatch(/[{}]/);
    }
  });
});

describe('reconcileSuggestions', () => {
  const NOW = at(14);
  const candidate = (type: SuggestionCandidate['type'], targetId: string): SuggestionCandidate => ({
    type, targetId, targetType: 'x', title: 't', explanation: 'e', proposedData: '{}',
  });
  const stored = (id: string, type: StoredSuggestion['type'], targetId: string, extra: Partial<StoredSuggestion> = {}): StoredSuggestion => ({
    id, type, targetId, status: 'PENDING', ...extra,
  });

  it('creates what is new', () => {
    const result = reconcileSuggestions({ candidates: [candidate('FORGOTTEN_CONTACT', 'p1')], pending: [], decided: [], now: NOW });
    expect(result.toCreate).toHaveLength(1);
    expect(result.toExpire).toEqual([]);
  });

  it('does not create what is already pending', () => {
    const result = reconcileSuggestions({
      candidates: [candidate('FORGOTTEN_CONTACT', 'p1')],
      pending: [stored('s1', 'FORGOTTEN_CONTACT', 'p1')],
      decided: [],
      now: NOW,
    });
    expect(result).toEqual({ toCreate: [], toExpire: [] });
  });

  it('keeps two types for the same target apart', () => {
    const result = reconcileSuggestions({
      candidates: [candidate('BIRTHDAY_REMINDER', 'p1'), candidate('FORGOTTEN_CONTACT', 'p1')],
      pending: [stored('s1', 'FORGOTTEN_CONTACT', 'p1')],
      decided: [],
      now: NOW,
    });
    expect(result.toCreate.map(c => c.type)).toEqual(['BIRTHDAY_REMINDER']);
  });

  it('expires a pending suggestion that stopped being true', () => {
    const result = reconcileSuggestions({
      candidates: [],
      pending: [stored('s1', 'FORGOTTEN_CONTACT', 'p1'), stored('s2', 'RESCHEDULE_REMINDER', 'r1')],
      decided: [],
      now: NOW,
    });
    expect(result.toExpire).toEqual(['s1', 's2']);
  });

  it('expires a suggestion whose time is up even if it still holds', () => {
    const result = reconcileSuggestions({
      candidates: [candidate('POSTPONE_TASK', 'tasks:today')],
      pending: [stored('s1', 'POSTPONE_TASK', 'tasks:today', { expiresAt: at(13).toISOString() })],
      decided: [],
      now: NOW,
    });
    expect(result.toExpire).toEqual(['s1']);
    expect(result.toCreate).toEqual([]);
  });

  it('keeps one whose time has not come', () => {
    const result = reconcileSuggestions({
      candidates: [candidate('POSTPONE_TASK', 'tasks:today')],
      pending: [stored('s1', 'POSTPONE_TASK', 'tasks:today', { expiresAt: at(23).toISOString() })],
      decided: [],
      now: NOW,
    });
    expect(result).toEqual({ toCreate: [], toExpire: [] });
  });

  describe('a decision the user just took', () => {
    const decidedAgo = (ms: number, status: string) =>
      stored('d1', 'FORGOTTEN_CONTACT', 'p1', { status, decidedAt: new Date(NOW.getTime() - ms).toISOString() });
    const run = (decided: StoredSuggestion[]) =>
      reconcileSuggestions({ candidates: [candidate('FORGOTTEN_CONTACT', 'p1')], pending: [], decided, now: NOW });

    it.each(['REFUSED', 'ACCEPTED'])('is not offered again within a day after %s', status => {
      expect(run([decidedAgo(60 * 60 * 1000, status)]).toCreate).toEqual([]);
    });

    it('is offered again once the day has passed', () => {
      expect(run([decidedAgo(DECISION_COOLDOWN_MS + 1000, 'REFUSED')]).toCreate).toHaveLength(1);
    });

    it('is offered again after it had merely expired', () => {
      expect(run([decidedAgo(60 * 1000, 'EXPIRED')]).toCreate).toHaveLength(1);
    });

    it('ignores a decision without a date', () => {
      expect(run([stored('d1', 'FORGOTTEN_CONTACT', 'p1', { status: 'REFUSED' })]).toCreate).toHaveLength(1);
    });
  });
});

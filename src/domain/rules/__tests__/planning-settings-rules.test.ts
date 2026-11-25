import { knownRelationKey } from '../person-rules';
import { monthGrid, movedStart, snapMinutes } from '../planning-move-rules';
import { DEFAULT_PLANNING_PREFS, planningPrefsOf, planningPrefsText } from '../planning-settings-rules';

describe('planning settings (sheet 028)', () => {
  it('reads the settings strictly and falls back on each value', () => {
    expect(planningPrefsOf(null)).toEqual(DEFAULT_PLANNING_PREFS);
    expect(planningPrefsOf('not json')).toEqual(DEFAULT_PLANNING_PREFS);
    expect(planningPrefsOf('{"openView":"month","weekStart":0,"dragStep":30}')).toEqual({ openView: 'month', weekStart: 0, dragStep: 30 });
    expect(planningPrefsOf('{"openView":"year","weekStart":3,"dragStep":7}')).toEqual(DEFAULT_PLANNING_PREFS);
    const prefs = { openView: 'week', weekStart: 0, dragStep: 5 } as const;
    expect(planningPrefsOf(planningPrefsText(prefs))).toEqual(prefs);
  });

  it('moves by the chosen step', () => {
    expect(snapMinutes(7, 5)).toBe(5);
    expect(snapMinutes(14, 30)).toBe(0);
    expect(snapMinutes(16, 30)).toBe(30);
    expect(movedStart(new Date(2026, 10, 25, 9, 0), 22, 0, 10)).toEqual(new Date(2026, 10, 25, 9, 20));
  });

  it('starts the month on Sunday when asked', () => {
    // November 2026 starts on a Sunday
    expect(monthGrid(new Date(2026, 10, 25), 0)[0]).toEqual(new Date(2026, 10, 1));
    expect(monthGrid(new Date(2026, 10, 25), 1)[0]).toEqual(new Date(2026, 9, 26));
  });
});

describe('knownRelationKey (sheet 028)', () => {
  const labels = {
    'rel.friend': ['Ami·e', 'Friend'],
    'rel.family': ['Famille', 'Family'],
    'rel.client': ['Client·e', 'Client'],
  } as const;

  it('finds a known relation in any language and any writing', () => {
    expect(knownRelationKey('Friend', labels)).toBe('rel.friend');
    expect(knownRelationKey('ami', labels)).toBe('rel.friend');
    expect(knownRelationKey('Amie', labels)).toBe('rel.friend');
    expect(knownRelationKey('  FAMILLE ', labels)).toBe('rel.family');
    expect(knownRelationKey('cliente', labels)).toBe('rel.client');
  });

  it('leaves a free text as it is', () => {
    expect(knownRelationKey('Maman', labels)).toBeNull();
    expect(knownRelationKey('', labels)).toBeNull();
    expect(knownRelationKey(undefined, labels)).toBeNull();
  });
});

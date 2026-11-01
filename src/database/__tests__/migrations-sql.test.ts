/**
 * Guards on the SQL of the migrations.
 *
 * The web build of expo-sqlite reads an apostrophe inside a `--` comment as the start of a string,
 * so a comment with an odd number of them swallows the statements that follow, with no error. The
 * migration is then recorded as applied while nothing ran. Keep comment lines free of stray quotes.
 */

import { MIGRATIONS } from '../migrations';

describe('migrations SQL', () => {
  it('numbers the migrations one by one from 1', () => {
    expect(MIGRATIONS.map(m => m.version)).toEqual(MIGRATIONS.map((_, index) => index + 1));
  });

  // The 22nd predates this guard and is already applied: an applied migration is never edited.
  // (Its stray apostrophe only matters on the web build.)
  it.each(MIGRATIONS.filter(m => m.version >= 23).map(m => [m.version, m.name, m.sql] as const))(
    'migration %i (%s) has no comment line with an odd number of apostrophes',
    (_version, _name, sql) => {
      const offenders = sql
        .split('\n')
        .filter(line => line.trim().startsWith('--'))
        .filter(line => (line.match(/'/g) ?? []).length % 2 === 1);
      expect(offenders).toEqual([]);
    }
  );

  it('adds the four mascot columns and the state table in migration 24', () => {
    const migration = MIGRATIONS.find(m => m.version === 24);
    expect(migration?.sql).toContain("ADD COLUMN mascot_presence TEXT NOT NULL DEFAULT 'full'");
    expect(migration?.sql).toContain("ADD COLUMN mascot_address TEXT NOT NULL DEFAULT 'tu'");
    expect(migration?.sql).toContain("ADD COLUMN mascot_proposals TEXT NOT NULL DEFAULT 'normal'");
    expect(migration?.sql).toContain('ADD COLUMN mascot_briefings INTEGER NOT NULL DEFAULT 1');
    expect(migration?.sql).toContain('CREATE TABLE IF NOT EXISTS mascot_state');
  });
});

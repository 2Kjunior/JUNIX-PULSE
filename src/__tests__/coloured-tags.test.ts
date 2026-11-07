/**
 * Phase 3, coloured tags: the rules (name, colour proposed, card, filter), the colours readable
 * in both themes, the database links, creating and changing a tag, the migration and backups.
 */

import { TAG_COLOR_VALUES } from '@/constants/tag-colors';
import { darkPalette, lightPalette } from '@/constants/palettes';
import { MIGRATIONS } from '@/database/migrations';
import { getDatabase } from '@/database/sqlite';
import type { Tag } from '@/domain/entities';
import {
  cardTags,
  cleanTagName,
  isTagColor,
  nextTagColor,
  sortTags,
  TAG_COLORS,
  TAG_NAME_MAX,
  tagNameTaken,
  tagsOf,
  withTag,
} from '@/domain/rules/tag-rules';
import { TagRepository } from '@/repositories/tag-repository';
import { TagUseCases } from '@/use-cases/tag-use-cases';
import { contrastRatio } from '@/utils/color';

jest.mock('@/database/sqlite', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-tag' }));

const tag = (id: string, name: string, color: Tag['color'] = 'violet'): Tag => ({
  id,
  name,
  color,
  createdAt: '2026-11-07T10:00:00.000Z',
  updatedAt: '2026-11-07T10:00:00.000Z',
});

const db = {
  runAsync: jest.fn(async () => ({ changes: 1 })),
  getAllAsync: jest.fn(async (): Promise<unknown[]> => []),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getDatabase as jest.Mock).mockResolvedValue(db);
});

describe('tag rules', () => {
  it('cleans the name: spaces trimmed and collapsed, cut at the maximum', () => {
    expect(cleanTagName('  Projet   X  ')).toBe('Projet X');
    expect(cleanTagName('a'.repeat(40))).toHaveLength(TAG_NAME_MAX);
    expect(cleanTagName('   ')).toBe('');
  });

  it('sees a name already taken without caring about case or accents, except the tag itself', () => {
    const tags = [tag('a', 'École'), tag('b', 'Maison')];
    expect(tagNameTaken('ecole', tags)).toBe(true);
    expect(tagNameTaken(' MAISON ', tags)).toBe(true);
    expect(tagNameTaken('Ecole', tags, 'a')).toBe(false);
    expect(tagNameTaken('Travail', tags)).toBe(false);
  });

  it('proposes the least used colour, in the order of the palette', () => {
    expect(nextTagColor([])).toBe('violet');
    expect(nextTagColor([tag('a', 'A', 'violet')])).toBe('blue');
    const allOnce = TAG_COLORS.map((color, index) => tag(String(index), color, color));
    expect(nextTagColor([...allOnce, tag('x', 'X', 'violet')])).toBe('blue');
  });

  it('knows its eight colours only', () => {
    expect(TAG_COLORS).toHaveLength(8);
    expect(isTagColor('green')).toBe(true);
    expect(isTagColor('red')).toBe(false);
  });

  it('sorts by name, finds the tags of an item in their order, and shows one on a card then +N', () => {
    const tags = sortTags([tag('m', 'Maths'), tag('a', 'anglais'), tag('e', 'École')]);
    expect(tags.map(item => item.id)).toEqual(['a', 'e', 'm']);
    expect(tagsOf(['m', 'gone', 'a'], tags).map(item => item.id)).toEqual(['m', 'a']);
    expect(tagsOf(undefined, tags)).toEqual([]);
    const { shown, more } = cardTags(tagsOf(['m', 'a', 'e'], tags));
    expect(shown.map(item => item.id)).toEqual(['m']);
    expect(more).toBe(2);
  });

  it('filters the items carrying a tag, and shows them all without a tag chosen', () => {
    const items = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
    const links = { t1: ['maths'], t3: ['maths', 'home'] };
    expect(withTag(items, links, 'maths').map(item => item.id)).toEqual(['t1', 't3']);
    expect(withTag(items, links, null)).toHaveLength(3);
    expect(withTag(items, links, 'nothing')).toEqual([]);
  });
});

describe('tag colours', () => {
  it.each([
    ['dark', darkPalette],
    ['light', lightPalette],
  ] as const)('keep at least 3:1 against every surface of the %s theme', (mode, palette) => {
    for (const color of TAG_COLORS) {
      for (const surface of [palette.surface.base, palette.surface.container, palette.surface.high]) {
        expect(contrastRatio(TAG_COLOR_VALUES[mode][color], surface)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('are all different within a theme', () => {
    for (const mode of ['dark', 'light'] as const) {
      expect(new Set(Object.values(TAG_COLOR_VALUES[mode])).size).toBe(TAG_COLORS.length);
    }
  });
});

describe('tag links in the database', () => {
  it.each([
    ['task', 'task_tags', 'task_id'],
    ['reminder', 'reminder_tags', 'reminder_id'],
    ['event', 'event_tags', 'event_id'],
  ] as const)('replaces the tags of a %s, each once', async (type, table, column) => {
    await TagRepository.setFor(type, 'x1', ['maths', 'home', 'maths']);
    expect(db.runAsync.mock.calls).toEqual([
      [`DELETE FROM ${table} WHERE ${column} = ?`, 'x1'],
      [`INSERT OR IGNORE INTO ${table} (${column}, tag_id) VALUES (?, ?)`, 'x1', 'maths'],
      [`INSERT OR IGNORE INTO ${table} (${column}, tag_id) VALUES (?, ?)`, 'x1', 'home'],
    ]);
  });

  it('reads the tags of every item of a kind in one go', async () => {
    db.getAllAsync.mockResolvedValueOnce([
      { item_id: 't1', tag_id: 'maths' },
      { item_id: 't1', tag_id: 'home' },
      { item_id: 't2', tag_id: 'home' },
    ]);
    expect(await TagRepository.findLinks('task')).toEqual({ t1: ['maths', 'home'], t2: ['home'] });
  });

  it('falls back on violet for a colour it does not know', async () => {
    db.getAllAsync.mockResolvedValueOnce([{ id: 'a', name: 'A', color: 'neon', created_at: '', updated_at: '' }]);
    expect((await TagRepository.findAll())[0].color).toBe('violet');
  });
});

describe('creating and changing a tag', () => {
  const existing = [tag('maison', 'Maison', 'green')];

  it('creates a tag with a clean name', async () => {
    const result = await TagUseCases.create('  Projet   X ', 'pink', existing);
    expect(result).toEqual({ ok: true, tag: expect.objectContaining({ id: 'new-tag', name: 'Projet X', color: 'pink' }) });
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT INTO tags (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      'new-tag',
      'Projet X',
      'pink',
      expect.any(String),
      expect.any(String)
    );
  });

  it('refuses an empty name or one already taken, and writes nothing', async () => {
    expect(await TagUseCases.create('   ', 'pink', existing)).toEqual({ ok: false, reason: 'empty' });
    expect(await TagUseCases.create('maison', 'pink', existing)).toEqual({ ok: false, reason: 'taken' });
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('renames and recolours a tag, keeping its own name allowed', async () => {
    const result = await TagUseCases.update(existing[0], 'MAISON', 'sky', existing);
    expect(result).toEqual({ ok: true, tag: expect.objectContaining({ id: 'maison', name: 'MAISON', color: 'sky' }) });
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?',
      'MAISON',
      'sky',
      expect.any(String),
      'maison'
    );
  });
});

describe('migration 33', () => {
  const sql = MIGRATIONS.find(m => m.version === 33)?.sql ?? '';

  it('creates the tags and one link table per kind, removed with their item or their tag', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS tags');
    for (const table of ['task_tags', 'reminder_tags', 'event_tags']) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(sql.match(/ON DELETE CASCADE/g)).toHaveLength(6);
  });

  it('is the last migration', () => {
    expect(Math.max(...MIGRATIONS.map(m => m.version))).toBe(33);
  });
});

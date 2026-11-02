/**
 * Unit tests for the mascot message catalogue and rendering.
 * The catalogue tests prove that every message exists in all eight variants.
 */

import { MASCOT_MESSAGES, MascotMessageId } from '../mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../mascot-message-catalog-en';
import {
  buildMascotSignal,
  renderMascotTemplate,
  resolveMascotMessage,
  templateParams,
} from '../mascot-message-rules';
import { DEFAULT_MASCOT_PREFERENCES, MascotPreferences } from '../mascot-preferences';

const prefs = (overrides: Partial<MascotPreferences> = {}): MascotPreferences => ({
  ...DEFAULT_MASCOT_PREFERENCES,
  ...overrides,
});

const ids = Object.keys(MASCOT_MESSAGES) as MascotMessageId[];
const addresses = ['tu', 'vous'] as const;
const tones = ['warm', 'sober'] as const;
const forms = ['plain', 'named'] as const;

const SAMPLE_PARAMS: Record<string, string | number> = {
  name: 'Awa', title: 'Lecture', person: 'Paul', days: 31, time: '9 h', place: 'Cocody',
  count: 3, reminders: 2, done: 4, total: 5, goal: 'Passer le permis', percent: 60,
  streak: 6, block: 'Révisions',
};

function allVariants(id: MascotMessageId) {
  const entry = MASCOT_MESSAGES[id];
  return addresses.flatMap(address =>
    tones.flatMap(tone =>
      forms.map(form => ({ address, tone, form, text: entry[address][tone][form] as string }))
    )
  );
}

function sentenceCount(text: string): number {
  return (text.match(/[.!?…](\s|$)/g) ?? []).length;
}

describe('catalogue', () => {
  it('is not empty', () => {
    expect(ids.length).toBeGreaterThanOrEqual(25);
  });

  describe.each(ids)('%s', id => {
    const variants = allVariants(id);

    it('has all eight variants, none empty', () => {
      expect(variants).toHaveLength(8);
      expect(variants.every(v => v.text.trim().length > 0)).toBe(true);
    });

    it('uses {name} in the named forms only', () => {
      for (const v of variants) {
        expect(v.text.includes('{name}')).toBe(v.form === 'named');
      }
    });

    it('needs the same parameters in every variant', () => {
      const sets = variants.map(v => templateParams(v.text).join(','));
      expect(new Set(sets).size).toBe(1);
    });

    it('renders every variant without a missing parameter or leftover brace', () => {
      for (const v of variants) {
        const text = renderMascotTemplate(v.text, SAMPLE_PARAMS);
        expect(text).not.toMatch(/[{}]/);
      }
    });

    it('stays within two sentences', () => {
      for (const v of variants) {
        expect(sentenceCount(renderMascotTemplate(v.text, SAMPLE_PARAMS))).toBeLessThanOrEqual(2);
      }
    });

    it('keeps tu and vous apart', () => {
      for (const v of variants) {
        const text = renderMascotTemplate(v.text, SAMPLE_PARAMS);
        if (v.address === 'tu') {
          expect(text).not.toMatch(/\b(vous|votre|vos)\b/i);
        } else {
          expect(text).not.toMatch(/\b(tu|ton|ta|tes|toi|te)\b|\bt'|-tu\b/i);
        }
      }
    });

    it('never uses an emoji', () => {
      for (const v of variants) {
        expect(v.text).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    });
  });

  it('keeps the sober tone free of exclamation marks', () => {
    for (const id of ids) {
      for (const v of allVariants(id).filter(item => item.tone === 'sober')) {
        expect(v.text).not.toContain('!');
      }
    }
  });
});

describe('English catalogue', () => {
  it('has the same messages as the French one', () => {
    expect(Object.keys(MASCOT_MESSAGES_EN).sort()).toEqual([...ids].sort());
  });

  describe.each(ids)('%s', id => {
    const english = MASCOT_MESSAGES_EN[id];
    const variants = tones.flatMap(tone => forms.map(form => ({ tone, form, text: english[tone][form] as string })));

    it('has four variants, none empty', () => {
      expect(variants).toHaveLength(4);
      expect(variants.every(v => v.text.trim().length > 0)).toBe(true);
    });

    it('uses {name} in the named forms only', () => {
      for (const v of variants) {
        expect(v.text.includes('{name}')).toBe(v.form === 'named');
      }
    });

    it('needs the same parameters as the French message', () => {
      const french = templateParams(MASCOT_MESSAGES[id].tu.warm.plain).join(',');
      for (const v of variants) {
        expect(templateParams(v.text).join(',')).toBe(french);
      }
    });

    it('renders without a missing parameter or leftover brace, within two sentences', () => {
      for (const v of variants) {
        const text = renderMascotTemplate(v.text, SAMPLE_PARAMS);
        expect(text).not.toMatch(/[{}]/);
        expect(sentenceCount(text)).toBeLessThanOrEqual(2);
        expect(v.text).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    });

    it('keeps the sober tone free of exclamation marks', () => {
      for (const v of variants.filter(item => item.tone === 'sober')) {
        expect(v.text).not.toContain('!');
      }
    });
  });

  it('is used when the mascot speaks English, whatever the address', () => {
    const english = prefs({ language: 'en' });
    expect(resolveMascotMessage('PERMISSION_GRANTED', {}, english, 'Awa')).toBe(
      "Perfect Awa, I'll take care of the rest."
    );
    expect(resolveMascotMessage('PERMISSION_GRANTED', {}, { ...english, address: 'vous' }, null)).toBe(
      "Perfect, I'll take care of the rest."
    );
    expect(resolveMascotMessage('EVENT_START', { title: 'Meeting' }, { ...english, tone: 'sober' }, null)).toBe(
      'Meeting starts now.'
    );
  });

  it('picks the plural form of a count', () => {
    const english = prefs({ language: 'en', tone: 'sober' });
    expect(resolveMascotMessage('TASKS_TO_POSTPONE', { count: 1 }, english, null)).toBe(
      '1 task from today remains to do. Move to tomorrow?'
    );
    expect(resolveMascotMessage('TASKS_TO_POSTPONE', { count: 3 }, english, null)).toBe(
      '3 tasks from today remain to do. Move to tomorrow?'
    );
  });
});

describe('renderMascotTemplate', () => {
  it('fills plain parameters', () => {
    expect(renderMascotTemplate('Bonjour {name}', { name: 'Awa' })).toBe('Bonjour Awa');
  });

  it.each([
    [0, 'tâche'],
    [1, 'tâche'],
    [2, 'tâches'],
    [8, 'tâches'],
  ])('picks the plural form for %i', (count, word) => {
    expect(renderMascotTemplate('{count} {count|tâche|tâches}', { count })).toBe(`${count} ${word}`);
  });

  it.each([
    ['Awa', "d'Awa"],
    ['Élodie', "d'Élodie"],
    ['Hugo', "d'Hugo"],
    ['Paul', 'de Paul'],
    ['Marie', 'de Marie'],
  ])('elides before %s', (person, expected) => {
    expect(renderMascotTemplate('{de:person}', { person })).toBe(expected);
  });

  it('throws on a missing parameter', () => {
    expect(() => renderMascotTemplate('{title}', {})).toThrow('Missing mascot message parameter: title');
  });
});

describe('resolveMascotMessage', () => {
  it('uses the named form when a name is known', () => {
    expect(resolveMascotMessage('PERMISSION_GRANTED', {}, prefs(), 'Awa')).toBe(
      "Parfait Awa, je m'occupe du reste."
    );
  });

  it('uses the plain form without a name', () => {
    expect(resolveMascotMessage('PERMISSION_GRANTED', {}, prefs(), undefined)).toBe(
      "Parfait, je m'occupe du reste."
    );
  });

  it('uses the plain form when the user switched the first name off', () => {
    expect(resolveMascotMessage('PERMISSION_GRANTED', {}, prefs({ useFirstName: false }), 'Awa')).toBe(
      "Parfait, je m'occupe du reste."
    );
  });

  it('cuts a long first name to 20 characters', () => {
    const text = resolveMascotMessage('PERMISSION_GRANTED', {}, prefs(), 'B'.repeat(40));
    expect(text).toContain('B'.repeat(20));
    expect(text).not.toContain('B'.repeat(21));
  });

  it('follows the address and the tone', () => {
    expect(resolveMascotMessage('EVENT_START', { title: 'Réunion' }, prefs(), null)).toBe("C'est l'heure : Réunion.");
    expect(resolveMascotMessage('EVENT_START', { title: 'Réunion' }, prefs({ tone: 'sober' }), null)).toBe(
      'Réunion commence maintenant.'
    );
    expect(resolveMascotMessage('DISCOVER_REMINDER', {}, prefs({ address: 'vous' }), null)).toBe(
      "Un rappel vous prévient à l'heure."
    );
  });

  it('says nothing when the mascot is off', () => {
    for (const id of ids) {
      expect(resolveMascotMessage(id, SAMPLE_PARAMS, prefs({ presence: 'off' }), 'Awa')).toBeNull();
    }
  });

  it('renders every message in every preference combination', () => {
    for (const id of ids) {
      for (const address of addresses) {
        for (const tone of tones) {
          for (const name of ['Awa', null]) {
            const text = resolveMascotMessage(id, SAMPLE_PARAMS, prefs({ address, tone }), name);
            expect(text).toEqual(expect.any(String));
            expect(text).not.toMatch(/[{}]/);
          }
        }
      }
    }
  });
});

describe('buildMascotSignal', () => {
  it('carries the mood, the reaction and the message', () => {
    expect(
      buildMascotSignal('happy', null, { id: 'PERMISSION_GRANTED', params: {} }, prefs(), null)
    ).toEqual({ mood: 'happy', reaction: null, message: "Parfait, je m'occupe du reste." });
  });

  it('has no message when none is asked for', () => {
    expect(buildMascotSignal('calm', null, null, prefs(), 'Awa').message).toBeNull();
  });
});

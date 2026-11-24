import { guessMomentKind, MOMENT_KIND_ALERT_SHIFT, MOMENT_KIND_TONES, MOMENT_KINDS, momentKindOf } from '../moment-kind-rules';

describe('the types of a moment (study 001, 6-C)', () => {
  it('has the nine types of the study, "Autre" last', () => {
    expect(MOMENT_KINDS).toEqual(['appointment', 'work', 'health', 'birthday', 'party', 'ceremony', 'mourning', 'travel', 'other']);
  });

  it('gives every type a tone and an alert shift', () => {
    for (const kind of MOMENT_KINDS) {
      expect(MOMENT_KIND_TONES[kind]).toBeDefined();
      expect(MOMENT_KIND_ALERT_SHIFT[kind]).toBeDefined();
    }
    expect(MOMENT_KIND_TONES.mourning).toBe('sober');
    expect(MOMENT_KIND_TONES.birthday).toBe('festive');
  });

  it('reads an unknown or missing type as "Autre"', () => {
    expect(momentKindOf(undefined)).toBe('other');
    expect(momentKindOf(null)).toBe('other');
    expect(momentKindOf('concert')).toBe('other');
    expect(momentKindOf('health')).toBe('health');
  });
});

describe('guessMomentKind', () => {
  it.each([
    ['Enterrement de Mamie', 'mourning'],
    ["Fête d'anniversaire de Léa", 'birthday'],
    ['Rendez-vous chez le médecin', 'health'],
    ['Dentiste', 'health'],
    ['Messe de Noël', 'ceremony'],
    ['Mariage de Paul', 'ceremony'],
    ['Vol pour Dakar', 'travel'],
    ["Train à la gare de Lyon", 'travel'],
    ['Soirée chez Awa', 'party'],
    ['Réunion d’équipe', 'work'],
    ['RDV banque', 'appointment'],
  ])('reads « %s » as %s', (title, kind) => {
    expect(guessMomentKind(title, 'fr')).toBe(kind);
  });

  it('reads English too', () => {
    expect(guessMomentKind("Mom's birthday dinner", 'en')).toBe('birthday');
    expect(guessMomentKind('Team meeting', 'en')).toBe('work');
    expect(guessMomentKind('Flight to Lagos', 'en')).toBe('travel');
  });

  it('takes whole words only, and says nothing when nothing is said', () => {
    expect(guessMomentKind('Volley avec Paul', 'fr')).toBeNull();
    expect(guessMomentKind('Café avec Marc', 'fr')).toBeNull();
    expect(guessMomentKind('', 'fr')).toBeNull();
  });
});

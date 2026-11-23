import type { Person } from '../../entities';
import { endOf, momentFromSentence, placeOf, priorityOf, todoFromSentence } from '../form-dictation-rules';
import { mapsDirectionsUrl, mapsSearchUrl } from '../maps-links';

/** Monday 23 November 2026, 10:00. */
const now = new Date(2026, 10, 23, 10, 0);
const paul = { id: 'p1', displayName: 'Paul' } as Person;
const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe('dictating a todo', () => {
  it('fills "Appeler Paul demain à 18h" and keeps "Appeler Paul" as the title', () => {
    const fill = todoFromSentence('Appeler Paul demain à 18h', [paul], now);
    expect(fill).toMatchObject({
      title: 'Appeler Paul',
      day: '2026-11-24',
      alert: true,
      time: { hour: 18, minute: 0 },
      actionType: 'CALL',
      personId: 'p1',
    });
  });

  it('fills the example of the study: a day, an hour and the highest priority', () => {
    const fill = todoFromSentence('Aller à la maison à 18h le lundi 30 novembre, priorité max', [], now);
    expect(fill).toMatchObject({ title: 'Aller à la maison', day: '2026-11-30', alert: true, priority: 'URGENT' });
    expect(fill.time).toEqual({ hour: 18, minute: 0 });
  });

  it('leaves a thing without a day nor an hour as it is', () => {
    expect(todoFromSentence('Acheter du pain', [], now)).toMatchObject({
      title: 'Acheter du pain',
      day: undefined,
      alert: false,
      priority: 'NORMAL',
    });
  });

  it('keeps a day said without an hour, without an alert', () => {
    expect(todoFromSentence('Réviser le dossier vendredi', [], now)).toMatchObject({
      title: 'Réviser le dossier',
      day: '2026-11-27',
      alert: false,
    });
  });

  it('repeats, rings and hears "urgent" in "tous les jours à 8h, urgent"', () => {
    expect(todoFromSentence('Prendre mes médicaments tous les jours à 8h, urgent', [], now)).toMatchObject({
      title: 'Prendre mes médicaments',
      alert: true,
      recurrence: 'DAILY',
      priority: 'URGENT',
    });
  });

  it('reads a deadline, a length, a low priority and a note in one sentence', () => {
    const fill = todoFromSentence(
      'Rapport à rendre avant vendredi, ça prend 40 min, pas urgent, note : demander les chiffres à Marc',
      [],
      now
    );
    expect(fill).toMatchObject({
      title: 'Rapport à rendre',
      dueDate: '2026-11-27',
      estimatedMinutes: 45,
      priority: 'LOW',
      notes: 'Demander les chiffres à Marc',
      alert: false,
      day: undefined,
    });
  });

  it('rings until confirmed for "insiste", and does not take "ça prend 2h" for an hour', () => {
    expect(todoFromSentence('Payer le loyer ce soir, insiste', [], now)).toMatchObject({
      title: 'Payer le loyer',
      alert: true,
      confirm: true,
    });
    expect(todoFromSentence('Ranger le garage, ça prend 2h', [], now)).toMatchObject({ alert: false, estimatedMinutes: 120 });
  });

  it('keeps a number that is not a date, and ignores "avant de partir"', () => {
    expect(todoFromSentence('Acheter 3 baguettes avant de partir', [], now)).toMatchObject({
      title: 'Acheter 3 baguettes avant de partir',
      dueDate: undefined,
    });
  });
});

describe('the priority said', () => {
  it('knows the words for each level, in the right order', () => {
    expect(priorityOf('situation très très urgente')?.value).toBe('URGENT');
    expect(priorityOf('priorité maximale')?.value).toBe('URGENT');
    expect(priorityOf('assez urgent')?.value).toBe('HIGH');
    expect(priorityOf('c’est important')?.value).toBe('HIGH');
    expect(priorityOf('pas pressé')?.value).toBe('LOW');
    expect(priorityOf('not urgent')?.value).toBe('LOW');
    expect(priorityOf('Acheter du pain')).toBeUndefined();
  });
});

describe('dictating a moment', () => {
  it('finds the title, place, start and end of "Dîner chez Léa samedi à 19h pendant 2h"', () => {
    const fill = momentFromSentence('Dîner chez Léa samedi à 19h pendant 2h', [], now);
    expect(fill.title).toBe('Dîner');
    expect(fill.place).toBe('Chez Léa');
    expect([...ymd(fill.start), fill.start.getHours()]).toEqual([2026, 11, 28, 19]);
    expect([fill.end.getHours(), fill.end.getMinutes()]).toEqual([21, 0]);
  });

  it('reads "à la mairie", "jusqu’à 11h30" and a note', () => {
    const fill = momentFromSentence('Réunion à la mairie demain à 10h jusqu’à 11h30, note : apporter le dossier', [], now);
    expect(fill).toMatchObject({ title: 'Réunion', place: 'La mairie', notes: 'Apporter le dossier' });
    expect([fill.start.getHours(), fill.end.getHours(), fill.end.getMinutes()]).toEqual([10, 11, 30]);
  });

  it('lasts one hour without a said end, and keeps the person in the title', () => {
    const fill = momentFromSentence('Anniversaire de Marc le 12 décembre à 20h', [], now);
    expect(fill.title).toBe('Anniversaire de Marc');
    expect(fill.place).toBeUndefined();
    expect(fill.end.getTime() - fill.start.getTime()).toBe(60 * 60000);
  });

  it('understands English places and lengths', () => {
    expect(placeOf('Meeting at the office tomorrow at 9am')).toBe('The office');
    expect(placeOf('Lunch at noon')).toBeUndefined();
    expect(endOf('Meeting for 30 minutes', new Date(2026, 10, 24, 9, 0)).getMinutes()).toBe(30);
    expect(endOf('Party until 11 pm', new Date(2026, 10, 24, 20, 0)).getHours()).toBe(23);
  });

  it('ignores an end before the start, and reads 1h30', () => {
    const start = new Date(2026, 10, 24, 10, 0);
    expect(endOf('Cours jusqu’à 8h', start).getHours()).toBe(11);
    const long = endOf('Cours pendant 1h30', start);
    expect([long.getHours(), long.getMinutes()]).toEqual([11, 30]);
  });
});

describe('Google Maps links', () => {
  it('opens a place, or the route to it', () => {
    expect(mapsSearchUrl(' 12 rue des Lilas ')).toBe('https://www.google.com/maps/search/?api=1&query=12%20rue%20des%20Lilas');
    expect(mapsDirectionsUrl('Chez Léa')).toBe('https://www.google.com/maps/dir/?api=1&destination=Chez%20L%C3%A9a');
  });
});

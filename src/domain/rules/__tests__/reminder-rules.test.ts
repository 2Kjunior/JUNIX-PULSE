/**
 * Tests unitaires pour les regles metier des rappels.
 * Couvre : isReminderTerminal, isReminderMissed, getNextOccurrence,
 *          computeSnoozeUntil, computeSnoozeTomorrowSameTime.
 */

import {
  isReminderTerminal,
  isReminderMissed,
  getNextOccurrence,
  computeSnoozeUntil,
  computeSnoozeTomorrowSameTime,
  SNOOZE_OPTIONS_MINUTES,
  UNDO_DELETE_TIMEOUT_MS,
} from '../reminder-rules';
import { RecurrenceRule } from '../../entities';

// --- isReminderTerminal ------------------------------------------------------

describe('isReminderTerminal', () => {
  it('COMPLETED est terminal', () => {
    expect(isReminderTerminal('COMPLETED')).toBe(true);
  });

  it('DELETED est terminal', () => {
    expect(isReminderTerminal('DELETED')).toBe(true);
  });

  it("UPCOMING n'est pas terminal", () => {
    expect(isReminderTerminal('UPCOMING')).toBe(false);
  });

  it("SNOOZED n'est pas terminal", () => {
    expect(isReminderTerminal('SNOOZED')).toBe(false);
  });

  it("MISSED n'est pas terminal", () => {
    expect(isReminderTerminal('MISSED')).toBe(false);
  });
});

// --- isReminderMissed (BR-002) -----------------------------------------------

describe('isReminderMissed (BR-002)', () => {
  it('un rappel planifie dans le passe est manque', () => {
    const scheduled = '2025-06-15T09:00:00.000Z';
    const now = new Date('2025-06-15T10:00:00.000Z');
    expect(isReminderMissed(scheduled, now)).toBe(true);
  });

  it("un rappel planifie dans le futur n'est pas manque", () => {
    const scheduled = '2025-06-15T15:00:00.000Z';
    const now = new Date('2025-06-15T10:00:00.000Z');
    expect(isReminderMissed(scheduled, now)).toBe(false);
  });

  it("marge de 2 minutes : juste apres n'est pas encore manque", () => {
    const scheduled = '2025-06-15T09:00:00.000Z';
    const now = new Date('2025-06-15T09:01:00.000Z'); // 1 min apres
    expect(isReminderMissed(scheduled, now)).toBe(false);
  });
});

// --- getNextOccurrence (BR-004) ----------------------------------------------

describe('getNextOccurrence (BR-004)', () => {
  it('DAILY interval=1 ajoute 1 jour', () => {
    const rule: RecurrenceRule = { id: 'r1', type: 'DAILY', interval: 1 };
    const result = getNextOccurrence('2025-06-15T09:00:00.000Z', rule);
    expect(result).not.toBeNull();
    const d = new Date(result!);
    expect(d.getUTCDate()).toBe(16);
  });

  it('DAILY interval=3 ajoute 3 jours', () => {
    const rule: RecurrenceRule = { id: 'r2', type: 'DAILY', interval: 3 };
    const result = getNextOccurrence('2025-06-15T09:00:00.000Z', rule);
    expect(result).not.toBeNull();
    const d = new Date(result!);
    expect(d.getUTCDate()).toBe(18);
  });

  it('WEEKLY sans daysOfWeek ajoute N semaines', () => {
    const rule: RecurrenceRule = { id: 'r3', type: 'WEEKLY', interval: 2 };
    const result = getNextOccurrence('2025-06-15T09:00:00.000Z', rule);
    expect(result).not.toBeNull();
    const d = new Date(result!);
    expect(d.getUTCDate()).toBe(29); // 15 + 14
  });

  it('MONTHLY ajoute N mois', () => {
    const rule: RecurrenceRule = { id: 'r4', type: 'MONTHLY', interval: 1 };
    const result = getNextOccurrence('2025-06-15T09:00:00.000Z', rule);
    expect(result).not.toBeNull();
    const d = new Date(result!);
    expect(d.getUTCMonth()).toBe(6); // juillet = index 6
  });

  it('retourne null si la date de fin de la regle est depassee', () => {
    const rule: RecurrenceRule = {
      id: 'r5',
      type: 'DAILY',
      interval: 1,
      endDate: '2025-06-15T23:59:59.000Z',
    };
    const result = getNextOccurrence('2025-06-15T09:00:00.000Z', rule);
    expect(result).toBeNull();
  });

  it('CUSTOM_INTERVAL fonctionne comme DAILY', () => {
    const rule: RecurrenceRule = { id: 'r6', type: 'CUSTOM_INTERVAL', interval: 5 };
    const result = getNextOccurrence('2025-06-10T09:00:00.000Z', rule);
    expect(result).not.toBeNull();
    const d = new Date(result!);
    expect(d.getUTCDate()).toBe(15);
  });

  it('DEF-04 : avec referenceNow, avance jusqu’à la première occurrence strictement future', () => {
    // Rappel DAILY prévu le 1er juin 2025 à 09:00
    // Complété en retard le 15 juin 2025 à 14:00
    const rule: RecurrenceRule = { id: 'r-daily', type: 'DAILY', interval: 1 };
    const referenceNow = new Date('2025-06-15T14:00:00.000Z');

    const result = getNextOccurrence('2025-06-01T09:00:00.000Z', rule, referenceNow);
    expect(result).not.toBeNull();

    const nextDate = new Date(result!);
    // Doit être le 16 juin 2025 à 09:00 (strictement futur par rapport au 15 juin 14:00)
    expect(nextDate.getUTCDate()).toBe(16);
    expect(nextDate.getUTCMonth()).toBe(5); // juin
    expect(nextDate.getUTCHours()).toBe(9);
    expect(nextDate.getTime()).toBeGreaterThan(referenceNow.getTime());
  });

  it('DEF-04 : retourne null si la règle expire avant d’atteindre une date future', () => {
    const rule: RecurrenceRule = {
      id: 'r-exp',
      type: 'DAILY',
      interval: 1,
      endDate: '2025-06-10T23:59:59.000Z',
    };
    const referenceNow = new Date('2025-06-15T14:00:00.000Z');

    const result = getNextOccurrence('2025-06-01T09:00:00.000Z', rule, referenceNow);
    expect(result).toBeNull();
  });

  it('DEF-15 : MONTHLY préserve le jour d’origine du mois (dayOfMonth) sans dérive', () => {
    const rule: RecurrenceRule = { id: 'r-monthly', type: 'MONTHLY', interval: 1 };
    // Le 31 janvier 2025 (non bissextile)
    const jan31 = '2025-01-31T10:00:00.000Z';
    const nextFeb = getNextOccurrence(jan31, rule);
    expect(nextFeb).not.toBeNull();
    const dFeb = new Date(nextFeb!);
    // Février a 28 jours en 2025 -> 28 février
    expect(dFeb.getUTCDate()).toBe(28);
    expect(dFeb.getUTCMonth()).toBe(1); // février
  });

  it('DEF-15 : MONTHLY sur une année bissextile (2024) gère correctement le 29 février', () => {
    const rule: RecurrenceRule = { id: 'r-leap', type: 'MONTHLY', interval: 1, dayOfMonth: 31 };
    const jan31Leap = '2024-01-31T10:00:00.000Z';
    const nextFebLeap = getNextOccurrence(jan31Leap, rule);
    expect(nextFebLeap).not.toBeNull();
    const dFeb = new Date(nextFebLeap!);
    // 2024 est bissextile -> 29 février
    expect(dFeb.getUTCDate()).toBe(29);
    expect(dFeb.getUTCMonth()).toBe(1);
  });

  it('WEEKLY multi-jours (Lun, Mer, Ven) en retard de 3 semaines saute vers le prochain jour futur', () => {
    // Règle : Lundi (1), Mercredi (3), Vendredi (5)
    const rule: RecurrenceRule = {
      id: 'r-weekly-multi',
      type: 'WEEKLY',
      interval: 1,
      daysOfWeek: [1, 3, 5],
    };
    // Échéance initiale : Mercredi 4 juin 2025 à 09:00 UTC
    // Référence Now : Vendredi 20 juin 2025 à 11:00 UTC (le créneau de 9h est passé)
    const initial = '2025-06-04T09:00:00.000Z';
    const referenceNow = new Date('2025-06-20T11:00:00.000Z');

    const next = getNextOccurrence(initial, rule, referenceNow);
    expect(next).not.toBeNull();
    const nextDate = new Date(next!);
    // Le prochain créneau doit être Lundi 23 juin 2025 à 09:00
    expect(nextDate.getUTCDay()).toBe(1); // Lundi
    expect(nextDate.getUTCDate()).toBe(23);
    expect(nextDate.getUTCHours()).toBe(9);
    expect(nextDate.getTime()).toBeGreaterThan(referenceNow.getTime());
  });
});

// --- computeSnoozeUntil (BR-003) ---------------------------------------------

describe('computeSnoozeUntil (BR-003)', () => {
  const now = new Date('2025-06-15T10:00:00.000Z');

  it('snooze de 15 min', () => {
    const result = computeSnoozeUntil(15, now);
    expect(new Date(result).getUTCMinutes()).toBe(15);
  });

  it('snooze de 60 min', () => {
    const result = computeSnoozeUntil(60, now);
    expect(new Date(result).getUTCHours()).toBe(11);
  });
});

// --- computeSnoozeTomorrowSameTime (BR-003b / DEF-04) -------------------------

describe('computeSnoozeTomorrowSameTime (BR-003b / DEF-04)', () => {
  it('retourne demain a la meme heure que scheduledAt quand now est le jour même', () => {
    const now = new Date('2025-06-15T14:00:00.000Z');
    const result = computeSnoozeTomorrowSameTime('2025-06-15T09:00:00.000Z', now);
    const d = new Date(result);
    expect(d.getUTCDate()).toBe(16);
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getTime()).toBeGreaterThan(now.getTime());
  });

  it('DEF-04 : ne produit JAMAIS une date dans le passé si le rappel est en retard de plusieurs jours', () => {
    // Rappel prévu le 10 juin à 09:00
    // Snooze cliqué le 15 juin à 14:00
    const now = new Date('2025-06-15T14:00:00.000Z');
    const result = computeSnoozeTomorrowSameTime('2025-06-10T09:00:00.000Z', now);
    const d = new Date(result);

    // Le report doit tomber le 16 juin (demain par rapport à now) à 09:00
    expect(d.getUTCDate()).toBe(16);
    expect(d.getUTCMonth()).toBe(5); // juin
    expect(d.getUTCHours()).toBe(9);
    expect(d.getTime()).toBeGreaterThan(now.getTime());
  });

  it('Option A : si cliqué avant l’heure du jour même (ex: 7h30 pour 8h00), reporte bien à demain 8h00', () => {
    const now = new Date('2025-06-15T07:30:00.000Z');
    const result = computeSnoozeTomorrowSameTime('2025-06-15T08:00:00.000Z', now);
    const d = new Date(result);

    // Doit être le 16 juin à 08:00
    expect(d.getUTCDate()).toBe(16);
    expect(d.getUTCHours()).toBe(8);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it('reporte au lendemain de l’échéance si le rappel est planifié dans le futur lointain', () => {
    const now = new Date('2025-06-15T10:00:00.000Z');
    // Rappel planifié dans 5 jours (le 20 juin à 09:00)
    const result = computeSnoozeTomorrowSameTime('2025-06-20T09:00:00.000Z', now);
    const d = new Date(result);

    // Le lendemain de l’échéance : le 21 juin à 09:00
    expect(d.getUTCDate()).toBe(21);
    expect(d.getUTCHours()).toBe(9);
    expect(d.getTime()).toBeGreaterThan(now.getTime());
  });
});

// --- Constants ---------------------------------------------------------------

describe('Constants', () => {
  it('SNOOZE_OPTIONS_MINUTES contient 15, 30, 60', () => {
    expect(SNOOZE_OPTIONS_MINUTES).toEqual([15, 30, 60]);
  });

  it('UNDO_DELETE_TIMEOUT_MS vaut 30 secondes', () => {
    expect(UNDO_DELETE_TIMEOUT_MS).toBe(30_000);
  });
});

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

// --- computeSnoozeTomorrowSameTime (BR-003b) ----------------------------------

describe('computeSnoozeTomorrowSameTime (BR-003b)', () => {
  it('retourne demain a la meme heure que scheduledAt', () => {
    const result = computeSnoozeTomorrowSameTime('2025-06-15T09:00:00.000Z');
    const d = new Date(result);
    expect(d.getUTCDate()).toBe(16);
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it("ne repart pas de l'heure actuelle", () => {
    // scheduledAt = 9h, l'heure actuelle est sans importance ici
    const result = computeSnoozeTomorrowSameTime('2025-06-15T09:00:00.000Z');
    const d = new Date(result);
    expect(d.getUTCHours()).toBe(9); // pas l'heure de now
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

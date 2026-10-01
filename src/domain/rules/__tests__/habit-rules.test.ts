/**
 * Tests unitaires pour les regles metier des habitudes.
 * Couvre : isDayPaused, calculateCurrentStreak, calculateBestStreak, isCompletedToday.
 */

import {
  isDayPaused,
  calculateCurrentStreak,
  calculateBestStreak,
  isCompletedToday,
} from '../habit-rules';
import { HabitCompletion, HabitPause } from '../../entities';

// --- Helpers -----------------------------------------------------------------

/** Cree une completion factice pour une date donnee (YYYY-MM-DD). */
function makeCompletion(date: string): HabitCompletion {
  return {
    id: `c-${date}`,
    habitId: 'h1',
    completedDate: date,
    createdAt: `${date}T08:00:00.000Z`,
  };
}

/** Cree une pause factice. */
function makePause(startDate: string, endDate?: string): HabitPause {
  return {
    id: `p-${startDate}`,
    habitId: 'h1',
    startDate,
    endDate,
    createdAt: `${startDate}T00:00:00.000Z`,
  };
}

// --- isDayPaused -------------------------------------------------------------

describe('isDayPaused', () => {
  it('retourne false sans aucune pause', () => {
    expect(isDayPaused(new Date('2025-06-15'), [])).toBe(false);
  });

  it('retourne true pour un jour couvert par une pause avec endDate', () => {
    const pauses = [makePause('2025-06-10', '2025-06-20')];
    expect(isDayPaused(new Date('2025-06-15'), pauses)).toBe(true);
  });

  it('retourne false pour un jour hors de la pause', () => {
    const pauses = [makePause('2025-06-10', '2025-06-12')];
    expect(isDayPaused(new Date('2025-06-15'), pauses)).toBe(false);
  });

  it('retourne true le jour de debut de la pause', () => {
    const pauses = [makePause('2025-06-10', '2025-06-12')];
    expect(isDayPaused(new Date('2025-06-10'), pauses)).toBe(true);
  });

  it('retourne true le jour de fin de la pause', () => {
    const pauses = [makePause('2025-06-10', '2025-06-12')];
    expect(isDayPaused(new Date('2025-06-12'), pauses)).toBe(true);
  });

  it('pause sans endDate (en cours) couvre le jour actuel', () => {
    const pauses = [makePause('2025-06-10')]; // pas de endDate
    const today = new Date('2025-06-15');
    expect(isDayPaused(today, pauses)).toBe(true);
  });
});

// --- calculateCurrentStreak --------------------------------------------------

describe('calculateCurrentStreak', () => {
  it('retourne 0 sans aucune completion', () => {
    const result = calculateCurrentStreak([], [], new Date('2025-06-15'));
    expect(result).toBe(0);
  });

  it('retourne 3 pour trois jours consecutifs valides', () => {
    const completions = [
      makeCompletion('2025-06-13'),
      makeCompletion('2025-06-14'),
      makeCompletion('2025-06-15'),
    ];
    const result = calculateCurrentStreak(completions, [], new Date('2025-06-15'));
    expect(result).toBe(3);
  });

  it("ne rompt pas le streak si aujourd'hui pas encore valide", () => {
    // Hier + avant-hier valides, aujourd'hui pas encore
    const completions = [
      makeCompletion('2025-06-13'),
      makeCompletion('2025-06-14'),
    ];
    const result = calculateCurrentStreak(completions, [], new Date('2025-06-15'));
    expect(result).toBe(2);
  });

  it('BR-011 : un jour en pause ne rompt pas le streak', () => {
    // 12, 13 valides - 14 en pause - 15 valide
    const completions = [
      makeCompletion('2025-06-12'),
      makeCompletion('2025-06-13'),
      makeCompletion('2025-06-15'),
    ];
    const pauses = [makePause('2025-06-14', '2025-06-14')];
    const result = calculateCurrentStreak(completions, pauses, new Date('2025-06-15'));
    expect(result).toBe(3); // 15 + 13 + 12 (14 ignore)
  });

  it('rompt le streak sur un jour passe non valide et non en pause', () => {
    // 12 valide, 13 manque, 14+15 valides
    const completions = [
      makeCompletion('2025-06-12'),
      makeCompletion('2025-06-14'),
      makeCompletion('2025-06-15'),
    ];
    const result = calculateCurrentStreak(completions, [], new Date('2025-06-15'));
    expect(result).toBe(2); // seulement 14+15
  });
});

// --- calculateBestStreak -----------------------------------------------------

describe('calculateBestStreak', () => {
  it('retourne 0 sans completion', () => {
    expect(calculateBestStreak([], [], '2025-06-01')).toBe(0);
  });

  it("retourne le streak max quand il y a une interruption", () => {
    // 01, 02, 03 valides - 04 manque - 05, 06 valides
    const completions = [
      makeCompletion('2025-06-01'),
      makeCompletion('2025-06-02'),
      makeCompletion('2025-06-03'),
      makeCompletion('2025-06-05'),
      makeCompletion('2025-06-06'),
    ];
    const result = calculateBestStreak(completions, [], '2025-06-01');
    expect(result).toBe(3);
  });

  it('BR-011 : les jours en pause ne rompent pas le best streak', () => {
    // 01, 02, 03 - 04 en pause - 05, 06
    const completions = [
      makeCompletion('2025-06-01'),
      makeCompletion('2025-06-02'),
      makeCompletion('2025-06-03'),
      makeCompletion('2025-06-05'),
      makeCompletion('2025-06-06'),
    ];
    const pauses = [makePause('2025-06-04', '2025-06-04')];
    const result = calculateBestStreak(completions, pauses, '2025-06-01');
    expect(result).toBe(5); // continu grace a la pause
  });
});

// --- isCompletedToday --------------------------------------------------------

describe('isCompletedToday', () => {
  it("retourne true si aujourd'hui est dans la liste", () => {
    const completions = [makeCompletion('2025-06-15')];
    expect(isCompletedToday(completions, new Date('2025-06-15'))).toBe(true);
  });

  it("retourne false si aujourd'hui n'est pas dans la liste", () => {
    const completions = [makeCompletion('2025-06-14')];
    expect(isCompletedToday(completions, new Date('2025-06-15'))).toBe(false);
  });

  it('retourne false avec une liste vide', () => {
    expect(isCompletedToday([], new Date('2025-06-15'))).toBe(false);
  });
});

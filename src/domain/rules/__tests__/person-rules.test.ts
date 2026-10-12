/**
 * Tests unitaires des règles métier pures pour les personnes (person-rules).
 */

import {
  daysSinceLastInteraction,
  isPersonForgotten,
  getContactHealthStatus,
  isBirthdaySoon,
} from '../person-rules';

describe('person-rules', () => {
  const referenceDate = new Date('2026-10-12T12:00:00Z');

  describe('daysSinceLastInteraction', () => {
    it('retourne null si aucune interaction n\'est renseignée (undefined, null ou vide)', () => {
      expect(daysSinceLastInteraction(undefined, referenceDate)).toBeNull();
      expect(daysSinceLastInteraction(null, referenceDate)).toBeNull();
      expect(daysSinceLastInteraction('', referenceDate)).toBeNull();
      expect(daysSinceLastInteraction('invalide', referenceDate)).toBeNull();
    });

    it('retourne 0 si l\'interaction a eu lieu le jour même', () => {
      const todayIso = '2026-10-12T08:30:00Z';
      expect(daysSinceLastInteraction(todayIso, referenceDate)).toBe(0);
    });

    it('retourne le nombre exact de jours écoulés', () => {
      const tenDaysAgoIso = '2026-10-02T10:00:00Z';
      expect(daysSinceLastInteraction(tenDaysAgoIso, referenceDate)).toBe(10);
    });

    it('retourne 0 si la date est dans le futur (tolérance décalage d\'horloge)', () => {
      const tomorrowIso = '2026-10-13T12:00:00Z';
      expect(daysSinceLastInteraction(tomorrowIso, referenceDate)).toBe(0);
    });
  });

  describe('isPersonForgotten', () => {
    it('retourne true si le contact n\'a jamais été contacté (Option 1 retenue)', () => {
      const person = {
        lastInteractionAt: undefined,
        forgottenThresholdDays: 30,
      };
      expect(isPersonForgotten(person, referenceDate)).toBe(true);
    });

    it('retourne true si le seuil est dépassé ou atteint', () => {
      const person = {
        lastInteractionAt: '2026-09-12T12:00:00Z', // 30 jours pile
        forgottenThresholdDays: 30,
      };
      expect(isPersonForgotten(person, referenceDate)).toBe(true);
    });

    it('retourne false si l\'interaction est plus récente que le seuil', () => {
      const person = {
        lastInteractionAt: '2026-10-05T12:00:00Z', // 7 jours
        forgottenThresholdDays: 30,
      };
      expect(isPersonForgotten(person, referenceDate)).toBe(false);
    });

    it('utilise un seuil personnalisé (ex: 7 jours pour un proche)', () => {
      const person = {
        lastInteractionAt: '2026-10-02T12:00:00Z', // 10 jours
        forgottenThresholdDays: 7,
      };
      expect(isPersonForgotten(person, referenceDate)).toBe(true);
    });

    it('applique le seuil par défaut de 30 jours si non spécifié', () => {
      const person = {
        lastInteractionAt: '2026-09-10T12:00:00Z', // 32 jours
        forgottenThresholdDays: undefined as unknown as number,
      };
      expect(isPersonForgotten(person, referenceDate)).toBe(true);
    });
  });

  describe('getContactHealthStatus', () => {
    it('retourne FORGOTTEN pour un contact sans interaction', () => {
      const person = { lastInteractionAt: undefined, forgottenThresholdDays: 30 };
      expect(getContactHealthStatus(person, referenceDate)).toBe('FORGOTTEN');
    });

    it('retourne FORGOTTEN si le seuil est atteint ou dépassé', () => {
      const person = {
        lastInteractionAt: '2026-09-10T12:00:00Z',
        forgottenThresholdDays: 30,
      };
      expect(getContactHealthStatus(person, referenceDate)).toBe('FORGOTTEN');
    });

    it('retourne ATTENTION si entre 50% et 100% du seuil (ex: 20 jours sans nouvelles)', () => {
      const person = {
        lastInteractionAt: '2026-09-22T12:00:00Z', // 20 jours pour seuil de 30 (50% = 15)
        forgottenThresholdDays: 30,
      };
      expect(getContactHealthStatus(person, referenceDate)).toBe('ATTENTION');
    });

    it('retourne OPTIMAL si moins de 50% du seuil écoulé (ex: 5 jours)', () => {
      const person = {
        lastInteractionAt: '2026-10-07T12:00:00Z', // 5 jours
        forgottenThresholdDays: 30,
      };
      expect(getContactHealthStatus(person, referenceDate)).toBe('OPTIMAL');
    });
  });

  describe('isBirthdaySoon', () => {
    it('retourne false si birthDate est manquant ou invalide', () => {
      expect(isBirthdaySoon(undefined, 7, referenceDate)).toBe(false);
      expect(isBirthdaySoon('', 7, referenceDate)).toBe(false);
      expect(isBirthdaySoon('format-invalide', 7, referenceDate)).toBe(false);
    });

    it('retourne true si l\'anniversaire est aujourd\'hui (format YYYY-MM-DD)', () => {
      expect(isBirthdaySoon('1990-10-12', 7, referenceDate)).toBe(true);
    });

    it('retourne true si l\'anniversaire est aujourd\'hui (format MM-DD)', () => {
      expect(isBirthdaySoon('10-12', 7, referenceDate)).toBe(true);
    });

    it('retourne true si l\'anniversaire est dans 4 jours', () => {
      expect(isBirthdaySoon('1985-10-16', 7, referenceDate)).toBe(true);
    });

    it('retourne false si l\'anniversaire est passé de 2 jours', () => {
      expect(isBirthdaySoon('1992-10-10', 7, referenceDate)).toBe(false);
    });

    it('retourne false si l\'anniversaire est au-delà de la fenêtre (ex: dans 15 jours)', () => {
      expect(isBirthdaySoon('1995-10-28', 7, referenceDate)).toBe(false);
    });

    it('gère correctement le passage de fin d\'année (fin décembre -> début janvier)', () => {
      const endOfYearDate = new Date('2026-12-29T12:00:00Z');
      // Anniversaire le 2 janvier (dans 4 jours)
      expect(isBirthdaySoon('1990-01-02', 7, endOfYearDate)).toBe(true);
      // Anniversaire le 15 janvier (au-delà de 7 jours)
      expect(isBirthdaySoon('1990-01-15', 7, endOfYearDate)).toBe(false);
    });
  });
});

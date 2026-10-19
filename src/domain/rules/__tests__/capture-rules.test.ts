/**
 * Tests unitaires pour le parseur de Capture Rapide (DEF-10).
 *
 * Prouve la resolution des 4 defauts majeurs de parsing :
 * 1. "apres-demain" n'est plus ecrase par "demain"
 * 2. Une heure explicite (ex: 19h) n'est plus ecrasee par "ce soir"
 * 3. La presence de la lettre "h" dans un mot ("chez") avec un chiffre ("2") ne cree plus de fausse heure
 * 4. La recherche de contact utilise des frontieres de mots ("Marc" ne matche plus "Marcher")
 */

import { parseQuickCapture } from '../capture-rules';
import { Person } from '../../entities';

const FIXED_NOW = new Date('2025-06-15T10:00:00.000Z'); // Dimanche 15 Juin 2025

const SAMPLE_PERSONS: Person[] = [
  {
    id: 'p-1',
    displayName: 'Marc Dupont',
    forgottenThresholdDays: 30,
    importedFromContacts: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'p-2',
    displayName: 'Aline Martin',
    forgottenThresholdDays: 30,
    importedFromContacts: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('parseQuickCapture (DEF-10)', () => {
  // ─── 1. Ordre d'evaluation des dates ───────────────────────────────────────
  describe('Resolution des dates (apres-demain vs demain)', () => {
    it('DEF-10 : "apres-demain" planifie a J+2 et non a demain (J+1)', () => {
      const result = parseQuickCapture('Appeler Thomas apres-demain', [], FIXED_NOW);
      // Dimanche 15 + 2 = Mardi 17 Juin
      expect(result.targetDate.getDate()).toBe(17);
    });

    it('DEF-10 : "apres demain" avec espace planifie egalement a J+2', () => {
      const result = parseQuickCapture('Appeler Thomas apres demain', [], FIXED_NOW);
      expect(result.targetDate.getDate()).toBe(17);
    });

    it('"demain" planifie bien a J+1', () => {
      const result = parseQuickCapture('Appeler Thomas demain', [], FIXED_NOW);
      // Dimanche 15 + 1 = Lundi 16 Juin
      expect(result.targetDate.getDate()).toBe(16);
    });

    it('"aujourd\'hui" conserve le jour meme', () => {
      const result = parseQuickCapture("Faire les courses aujourd'hui", [], FIXED_NOW);
      expect(result.targetDate.getDate()).toBe(15);
    });

    it('nom de jour de semaine explicite (ex: "mardi") projette au prochain mardi', () => {
      const result = parseQuickCapture('Rdv dentiste mardi', [], FIXED_NOW);
      // Dimanche 15 Juin -> prochain Mardi = 17 Juin
      expect(result.targetDate.getDate()).toBe(17);
    });
  });

  // ─── 2. Priorite de l'heure explicite sur les raccourcis flous ────────────
  describe('Priorite de l heure explicite (DEF-10)', () => {
    it('DEF-10 : "ce soir a 19h" retient 19:00 et n ecrase PAS avec 20:30', () => {
      const result = parseQuickCapture('Cinema ce soir a 19h', [], FIXED_NOW);
      expect(result.targetTime).toBe('19:00');
    });

    it('DEF-10 : "ce soir a 19h30" retient 19:30', () => {
      const result = parseQuickCapture('Diner ce soir a 19h30', [], FIXED_NOW);
      expect(result.targetTime).toBe('19:30');
    });

    it('DEF-10 : "ce matin a 10:15" retient 10:15 et n ecrase PAS avec 08:30', () => {
      const result = parseQuickCapture('Reunion ce matin a 10:15', [], FIXED_NOW);
      expect(result.targetTime).toBe('10:15');
    });

    it('"ce soir" sans heure explicite utilise le raccourci 20:30', () => {
      const result = parseQuickCapture('Lire un livre ce soir', [], FIXED_NOW);
      expect(result.targetTime).toBe('20:30');
    });

    it('"midi" sans heure explicite utilise 12:00', () => {
      const result = parseQuickCapture('Dejeuner avec Paul midi', [], FIXED_NOW);
      expect(result.targetTime).toBe('12:00');
    });

    it('"matin" sans heure explicite utilise 08:30', () => {
      const result = parseQuickCapture('Courir demain matin', [], FIXED_NOW);
      expect(result.targetTime).toBe('08:30');
    });
  });

  // ─── 3. Faux positifs sur mots contenant 'h' ──────────────────────────────
  describe('Evitement des faux positifs horaires (DEF-10)', () => {
    it('DEF-10 : "Diner chez Paul 2 personnes" ne cree PAS une fausse heure a 02:00', () => {
      const result = parseQuickCapture('Diner chez Paul 2 personnes', [], FIXED_NOW);
      // "chez" a un "h" et il y a un "2", mais ce n'est pas "2h" !
      // Doit conserver l'heure par defaut pour un diner (ou defaut 09:00 car "diner" est une action MEET)
      expect(result.targetTime).not.toBe('02:00');
      expect(result.actionType).toBe('MEET');
    });

    it('DEF-10 : "Acheter 3 theoriques" ne cree pas une fausse heure a 03:00', () => {
      const result = parseQuickCapture('Acheter 3 livres theoriques', [], FIXED_NOW);
      expect(result.targetTime).not.toBe('03:00');
    });

    it('"14h" ou "14h00" est bien reconnu', () => {
      const result = parseQuickCapture('Appel a 14h', [], FIXED_NOW);
      expect(result.targetTime).toBe('14:00');
    });

    it('"14:45" est bien reconnu', () => {
      const result = parseQuickCapture('Train a 14:45', [], FIXED_NOW);
      expect(result.targetTime).toBe('14:45');
    });
  });

  // ─── 4. Recherche de contacts avec frontieres de mots ───────────────────────
  describe('Frontieres de mots pour les contacts (DEF-10)', () => {
    it('DEF-10 : "Marcher 30 minutes" ne selectionne PAS le contact "Marc Dupont"', () => {
      const result = parseQuickCapture('Marcher 30 minutes', SAMPLE_PERSONS, FIXED_NOW);
      expect(result.targetPerson).toBeUndefined();
    });

    it('DEF-10 : "Alimenter le compte" ne selectionne PAS le contact "Aline Martin"', () => {
      const result = parseQuickCapture('Alimenter le compte bancaire', SAMPLE_PERSONS, FIXED_NOW);
      expect(result.targetPerson).toBeUndefined();
    });

    it('reconnaît le contact "Marc" quand le mot est entier', () => {
      const result = parseQuickCapture('Appeler Marc ce soir', SAMPLE_PERSONS, FIXED_NOW);
      expect(result.targetPerson).toBeDefined();
      expect(result.targetPerson?.displayName).toBe('Marc Dupont');
    });

    it('reconnaît le contact sur son nom complet "Aline Martin"', () => {
      const result = parseQuickCapture('Email a Aline Martin', SAMPLE_PERSONS, FIXED_NOW);
      expect(result.targetPerson).toBeDefined();
      expect(result.targetPerson?.displayName).toBe('Aline Martin');
    });
  });

  // ─── 5. Actions & Priorites ────────────────────────────────────────────────
  describe('Actions et priorite', () => {
    it('detecte l action CALL', () => {
      expect(parseQuickCapture('Appeler Marie').actionType).toBe('CALL');
      expect(parseQuickCapture('Coup de fil a Papa').actionType).toBe('CALL');
    });

    it('detecte l action MESSAGE', () => {
      expect(parseQuickCapture('SMS a Paul').actionType).toBe('MESSAGE');
      expect(parseQuickCapture('Whatsapp a Julie').actionType).toBe('MESSAGE');
    });

    it('detecte l action EMAIL', () => {
      expect(parseQuickCapture('Envoyer un mail pour le devis').actionType).toBe('EMAIL');
    });

    it('detecte l action TASK', () => {
      expect(parseQuickCapture('Acheter du pain').actionType).toBe('TASK');
      expect(parseQuickCapture('Payer la facture').actionType).toBe('TASK');
    });

    it('detecte la priorite URGENT', () => {
      expect(parseQuickCapture('Payer le loyer urgent').priority).toBe('URGENT');
      expect(parseQuickCapture('Rappel critique').priority).toBe('URGENT');
      expect(parseQuickCapture('Faire les courses').priority).toBe('NORMAL');
    });
  });
});

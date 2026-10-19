/**
 * Tests unitaires pour Lot 7 (DEF-16, U-06).
 *
 * Couverture :
 * - makeCalendarStyles : todayBtnDisabled possède une bordure visible et un contraste adapté
 * - makePulseStyles : remplacement des rayures rgba(255,255,255,0.04) par les jetons theme.glass.card et theme.surface.container
 */

import { makeCalendarStyles } from '../styles/tabs/calendar-styles';
import { makePulseStyles } from '../styles/tabs/pulse-styles';
import { darkPalette, lightPalette } from '../constants/palettes';

describe('Lot 7 — Barres et composition d\'écran (DEF-16, U-06)', () => {
  describe('Calendar Styles (DEF-16)', () => {
    it('définit todayBtnDisabled avec une bordure visible et un fond thématique en mode sombre', () => {
      const darkStyles = makeCalendarStyles(darkPalette);
      expect(darkStyles.todayBtnDisabled).toBeDefined();
      expect(darkStyles.todayBtnDisabled.borderColor).toBe(darkPalette.outline.default);
      expect(darkStyles.todayBtnDisabled.opacity).toBeGreaterThanOrEqual(0.7);
      expect(darkStyles.todayBtnDisabled.backgroundColor).not.toBe('transparent');
    });

    it('définit todayBtnDisabled avec une bordure visible et un fond thématique en mode clair', () => {
      const lightStyles = makeCalendarStyles(lightPalette);
      expect(lightStyles.todayBtnDisabled).toBeDefined();
      expect(lightStyles.todayBtnDisabled.borderColor).toBe(lightPalette.outline.default);
      expect(lightStyles.todayBtnDisabled.opacity).toBeGreaterThanOrEqual(0.7);
      expect(lightStyles.todayBtnDisabled.backgroundColor).toBe(lightPalette.surface.container);
    });

    it('associe todayBtnTextDisabled à la couleur onSurface.disabled', () => {
      const darkStyles = makeCalendarStyles(darkPalette);
      const lightStyles = makeCalendarStyles(lightPalette);
      expect(darkStyles.todayBtnTextDisabled.color).toBe(darkPalette.onSurface.disabled);
      expect(lightStyles.todayBtnTextDisabled.color).toBe(lightPalette.onSurface.disabled);
    });
  });

  describe('Pulse Styles (DEF-16)', () => {
    it('utilise les jetons theme.glass.card en mode sombre pour moduleCard et statCell', () => {
      const darkStyles = makePulseStyles(darkPalette);
      expect(darkStyles.moduleCard.backgroundColor).toBe(darkPalette.glass.card.backgroundColor);
      expect(darkStyles.moduleCard.borderColor).toBe(darkPalette.glass.card.borderColor);
      expect(darkStyles.statCell.backgroundColor).toBe(darkPalette.glass.card.backgroundColor);
      expect(darkStyles.statCell.borderColor).toBe(darkPalette.glass.card.borderColor);
    });

    it('utilise les jetons surface.container en mode clair pour moduleCard et statCell', () => {
      const lightStyles = makePulseStyles(lightPalette);
      expect(lightStyles.moduleCard.backgroundColor).toBe(lightPalette.surface.container);
      expect(lightStyles.moduleCard.borderColor).toBe(lightPalette.outline.variant);
      expect(lightStyles.statCell.backgroundColor).toBe(lightPalette.surface.container);
      expect(lightStyles.statCell.borderColor).toBe(lightPalette.outline.variant);
    });

    it('harmonise refuseBtn et emptyCard avec les jetons thématiques', () => {
      const darkStyles = makePulseStyles(darkPalette);
      expect(darkStyles.refuseBtn.borderColor).toBe(darkPalette.outline.default);
      expect(darkStyles.emptyCard.borderColor).toBe(darkPalette.outline.default);
    });
  });
});

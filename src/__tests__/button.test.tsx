/**
 * Tests unitaires pour Button (Phase P5 Lot 3).
 *
 * Couverture :
 * - Rendu des 4 variants ('primary', 'secondary', 'ghost', 'destructive') en mode sombre.
 * - Rendu des 4 variants en mode clair.
 * - Vérification du label et de l'accessibilité (role="button").
 * - Vérification de l'état disabled et du loader ActivityIndicator.
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Button, makeButtonStyles, type ButtonVariant } from '../components/ui/Button';
import { darkPalette, lightPalette } from '../constants/palettes';
import { useAppStore } from '../store/app-store';

describe('Phase P5 Lot 3 — Button Theming & Behavior', () => {
  const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'destructive'];

  beforeEach(() => {
    act(() => {
      useAppStore.setState({ themeMode: 'dark' });
    });
  });

  describe('makeButtonStyles - Contrat des styles thématiques', () => {
    it('génère des styles contrastés et distincts pour darkPalette et lightPalette', () => {
      const darkStyles = makeButtonStyles(darkPalette);
      const lightStyles = makeButtonStyles(lightPalette);

      // Label secondary doit s'adapter à la couleur du texte sur surface
      expect(darkStyles.label_secondary.color).toBe(darkPalette.onSurface.primary);
      expect(lightStyles.label_secondary.color).toBe(lightPalette.onSurface.primary);

      // Label ghost doit suivre l'accent primaire
      expect(darkStyles.label_ghost.color).toBe(darkPalette.primary.default);
      expect(lightStyles.label_ghost.color).toBe(lightPalette.primary.default);

      // Label primary conserve le blanc éclatant sur le dégradé
      expect(darkStyles.label_primary.color).toBe('#FFFFFF');
      expect(lightStyles.label_primary.color).toBe('#FFFFFF');
    });
  });

  describe('Rendu en mode sombre', () => {
    it.each(variants)('rend correctement le variant "%s" en mode sombre', (variant) => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <Button label={`Bouton ${variant}`} variant={variant} onPress={jest.fn()} />
        );
      });
      expect(root!).toBeDefined();
    });
  });

  describe('Rendu en mode clair', () => {
    beforeEach(() => {
      act(() => {
        useAppStore.setState({ themeMode: 'light' });
      });
    });

    it.each(variants)('rend correctement le variant "%s" en mode clair', (variant) => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <Button label={`Bouton clair ${variant}`} variant={variant} onPress={jest.fn()} />
        );
      });
      expect(root!).toBeDefined();
    });
  });

  describe('Accessibilité, interactions et états', () => {
    it('déclenche onPress lors du clic', () => {
      const onPressMock = jest.fn();
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <Button label="Valider" onPress={onPressMock} />
        );
      });

      const pressable = root!.root.findByProps({ accessibilityRole: 'button' });
      expect(pressable).toBeDefined();
      act(() => {
        pressable.props.onPress();
      });
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('désactive le clic et applique accessibilityState.disabled lorsque disabled=true', () => {
      const onPressMock = jest.fn();
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <Button label="Désactivé" disabled onPress={onPressMock} />
        );
      });

      const pressable = root!.root.findByProps({ accessibilityRole: 'button' });
      expect(pressable.props.accessibilityState.disabled).toBe(true);
    });

    it('affiche un ActivityIndicator lorsque loading=true', () => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <Button label="Chargement..." loading onPress={jest.fn()} />
        );
      });

      const indicator = root!.root.findByType(ActivityIndicator);
      expect(indicator).toBeDefined();
    });
  });
});

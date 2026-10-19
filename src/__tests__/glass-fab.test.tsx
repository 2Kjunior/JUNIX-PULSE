/**
 * Tests unitaires pour GlassFloatingActionButton (Lot 6 - DEF-17).
 *
 * Couverture :
 * - makeGlassFabStyles pour darkPalette et lightPalette
 * - Rendu du FAB avec label et icône
 * - Présence du rôle et label d'accessibilité
 * - Déclenchement de onPress
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { GlassFloatingActionButton, makeGlassFabStyles } from '../components/ui/GlassFloatingActionButton';
import { darkPalette, lightPalette } from '../constants/palettes';
import { useAppStore } from '../store/app-store';

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => {
        return cb();
      }, [cb]);
    },
  };
});

describe('GlassFloatingActionButton (Lot 6)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      useAppStore.setState({ themeMode: 'dark' });
    });
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  describe('makeGlassFabStyles', () => {
    it('génère les styles pour le mode sombre', () => {
      const styles = makeGlassFabStyles(darkPalette);
      expect(styles.container).toBeDefined();
      expect(styles.touchableWrapper).toBeDefined();
      expect(styles.label.color).toBe('#FFFFFF');
    });

    it('génère les styles pour le mode clair', () => {
      const styles = makeGlassFabStyles(lightPalette);
      expect(styles.container).toBeDefined();
      expect(styles.touchableWrapper).toBeDefined();
      expect(styles.label.color).toBe('#FFFFFF');
    });
  });

  describe('Rendu et interactions', () => {
    it('rend correctement le FAB avec son label', () => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <GlassFloatingActionButton label="Nouveau rappel" onPress={jest.fn()} />
        );
      });
      expect(root!).toBeDefined();
    });

    it('déclenche onPress et possède les attributs d\'accessibilité', () => {
      const onPressMock = jest.fn();
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <GlassFloatingActionButton
            label="Ajouter"
            onPress={onPressMock}
            accessibilityLabel="Ajouter un élément"
          />
        );
      });

      const button = root!.root.findByProps({ accessibilityRole: 'button' });
      expect(button).toBeDefined();
      expect(button.props.accessibilityLabel).toBe('Ajouter un élément');

      act(() => {
        button.props.onPress();
      });
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });
});

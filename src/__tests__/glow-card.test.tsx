/**
 * Tests unitaires pour GlowCard (Phase P5 Lot 1).
 *
 * Couverture :
 * - Rendu des 6 tones en mode sombre.
 * - Rendu des 6 tones en mode clair.
 * - Teintes GlowLight conformes à la spécification du Master Prompt (Section 10).
 * - Accessibilité et présence du footer.
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { GlowCard, GlowLight } from '../components/ui/GlowCard';
import { Glow, type GlowTone } from '../constants/theme';
import { useAppStore } from '../store/app-store';

describe('Phase P5 Lot 1 — GlowCard', () => {
  const tones: GlowTone[] = ['neutral', 'info', 'primary', 'attention', 'urgent', 'success'];

  beforeEach(() => {
    act(() => {
      useAppStore.setState({ themeMode: 'dark' });
    });
  });

  describe('Teintes de lueur', () => {
    it('GlowLight contient les 6 tones spécifiés pour le mode clair', () => {
      expect(GlowLight.neutral).toBe('transparent');
      expect(GlowLight.info).toBe('#0284C7');
      expect(GlowLight.primary).toBe('#7C3AED');
      expect(GlowLight.attention).toBe('#D97706');
      expect(GlowLight.urgent).toBe('#DC2626');
      expect(GlowLight.success).toBe('#16A34A');
    });

    it('Glow contient les 6 tones originaux pour le mode sombre', () => {
      expect(Glow.neutral).toBe('transparent');
      expect(Glow.info).toBe('#38BDF8');
      expect(Glow.primary).toBe('#A855F7');
      expect(Glow.attention).toBe('#FBBF24');
      expect(Glow.urgent).toBe('#FFB4AB');
      expect(Glow.success).toBe('#6DD58C');
    });
  });

  describe('Rendu en mode sombre', () => {
    it.each(tones)('rend sans erreur avec tone="%s" en mode sombre', (tone) => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <GlowCard tone={tone} size="list" intensity="default">
            <Text>Contenu {tone}</Text>
          </GlowCard>
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

    it.each(tones)('rend sans erreur avec tone="%s" en mode clair', (tone) => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <GlowCard tone={tone} size="hero" intensity="soft">
            <Text>Contenu Clair {tone}</Text>
          </GlowCard>
        );
      });
      expect(root!).toBeDefined();
    });
  });

  describe('Interactions et Footer', () => {
    it('rend le footer lorsqu\'il est fourni', () => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <GlowCard
            tone="primary"
            footer={<Text testID="test-footer">Pied de carte</Text>}
          >
            <Text>Corps</Text>
          </GlowCard>
        );
      });
      const footerElement = root!.root.findByProps({ testID: 'test-footer' });
      expect(footerElement).toBeDefined();
    });

    it('ajoute accessibilityRole="button" si onPress est défini', () => {
      const onPressMock = jest.fn();
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <GlowCard tone="info" onPress={onPressMock}>
            <Text>Cliquable</Text>
          </GlowCard>
        );
      });
      const pressable = root!.root.findByProps({ accessibilityRole: 'button' });
      expect(pressable).toBeDefined();
    });
  });
});

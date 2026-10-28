/**
 * Tests unitaires pour SwipeableItem — nouvelle API (rightActions / leftActions).
 *
 * Couverture :
 * - Rendu de l'élément avec enfants
 * - Comportement lorsque enabled=false
 * - Présence et déclenchement des actions via les nouvelles props
 * - Accessibilité WCAG (rôle button, accessibilityLabel)
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SwipeableItem } from '../components/ui/SwipeableItem';
import { useAppStore } from '../store/app-store';

describe('Lot 8 — SwipeableItem & Confirmations ergonomiques (DEF-08, DEF-13)', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.setState({ themeMode: 'dark' });
    });
  });

  it('rend les enfants transmis dans le composant', () => {
    const onDelete = jest.fn();
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <SwipeableItem
          rightActions={[
            { key: 'delete', icon: 'trash-outline', label: 'Supprimer', color: '#FFB4AB', onPress: onDelete },
          ]}
        >
          <Text testID="child-text">Tâche exemple</Text>
        </SwipeableItem>
      );
    });

    const child = root!.root.findByProps({ testID: 'child-text' });
    expect(child).toBeDefined();
    expect(child.props.children).toBe('Tâche exemple');
  });

  it('affiche uniquement les enfants directs lorsque enabled=false', () => {
    const onDelete = jest.fn();
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <SwipeableItem
          enabled={false}
          rightActions={[
            { key: 'delete', icon: 'trash-outline', label: 'Supprimer', color: '#FFB4AB', onPress: onDelete },
          ]}
        >
          <Text testID="disabled-child">Contenu non swipable</Text>
        </SwipeableItem>
      );
    });

    const child = root!.root.findByProps({ testID: 'disabled-child' });
    expect(child).toBeDefined();
  });

  it('possède les boutons d\'action accessibles avec rôle et label explicite', () => {
    const onDelete = jest.fn();
    const onComplete = jest.fn();

    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <SwipeableItem
          rightActions={[
            { key: 'delete', icon: 'trash-outline', label: 'Supprimer la tâche', color: '#FFB4AB', onPress: onDelete },
          ]}
          leftActions={[
            { key: 'complete', icon: 'checkmark-circle-outline', label: 'Valider la tâche', color: '#6DD58C', onPress: onComplete },
          ]}
        >
          <Text>Élément interactif</Text>
        </SwipeableItem>
      );
    });

    // Bouton de suppression
    const deleteBtn = root!.root.findByProps({ accessibilityLabel: 'Supprimer la tâche' });
    expect(deleteBtn).toBeDefined();
    expect(deleteBtn.props.accessibilityRole).toBe('button');

    act(() => {
      deleteBtn.props.onPress();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);

    // Bouton de complétion
    const completeBtn = root!.root.findByProps({ accessibilityLabel: 'Valider la tâche' });
    expect(completeBtn).toBeDefined();
    expect(completeBtn.props.accessibilityRole).toBe('button');

    act(() => {
      completeBtn.props.onPress();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

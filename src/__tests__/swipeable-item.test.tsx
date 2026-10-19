/**
 * Tests unitaires pour SwipeableItem et confirmations ergonomiques (Lot 8 - DEF-08, DEF-13).
 *
 * Couverture :
 * - Rendu de l'élément avec enfants
 * - Présence et déclenchement des actions droite (Supprimer) et gauche (Terminer)
 * - Accessibilité WCAG (rôle button, accessibilityLabel)
 * - Comportement lorsque enabled=false
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
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <SwipeableItem onDelete={jest.fn()}>
          <Text testID="child-text">Tâche exemple</Text>
        </SwipeableItem>
      );
    });

    const child = root!.root.findByProps({ testID: 'child-text' });
    expect(child).toBeDefined();
    expect(child.props.children).toBe('Tâche exemple');
  });

  it('affiche uniquement les enfants directs lorsque enabled=false', () => {
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <SwipeableItem enabled={false} onDelete={jest.fn()}>
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
          onDelete={onDelete}
          onComplete={onComplete}
          deleteLabel="Supprimer la tâche"
          completeLabel="Valider la tâche"
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

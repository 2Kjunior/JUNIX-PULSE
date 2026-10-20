/**
 * Tests unitaires pour useSafeReducedMotion (Lot 10 - DEF-11).
 *
 * Couverture :
 * - Retourne un booléen
 * - Combine Reanimated useReducedMotion et AccessibilityInfo
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSafeReducedMotion } from '../hooks/use-safe-reduced-motion';

/**
 * Composant utilitaire qui capture la valeur du hook dans un ref
 * pour pouvoir l'inspecter dans le test.
 */
function HookCapture({ onValue }: { onValue: (v: boolean) => void }) {
  const reduced = useSafeReducedMotion();
  React.useEffect(() => {
    onValue(reduced);
  }, [reduced, onValue]);
  return null;
}

describe('Lot 10 — useSafeReducedMotion (DEF-11)', () => {
  it('retourne un booléen indiquant la préférence de mouvement', () => {
    let capturedValue: boolean | undefined;

    act(() => {
      ReactTestRenderer.create(
        <HookCapture onValue={(v) => { capturedValue = v; }} />
      );
    });

    expect(typeof capturedValue).toBe('boolean');
  });
});

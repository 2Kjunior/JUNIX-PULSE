/**
 * Hook centralisé pour le respect strict du mouvement réduit (WCAG 2.2 SC 2.3.3).
 *
 * Combine useReducedMotion de Reanimated 4 et AccessibilityInfo du système d'exploitation.
 * Retourne true si l'utilisateur a activé la préférence de mouvement réduit.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export function useSafeReducedMotion(): boolean {
  const reanimatedReduced = useReducedMotion();
  const [systemReduced, setSystemReduced] = useState<boolean>(Boolean(reanimatedReduced));

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setSystemReduced(enabled);
      })
      .catch(() => {
        // Environnement sans AccessibilityInfo natif
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) setSystemReduced(enabled);
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  return Boolean(reanimatedReduced || systemReduced);
}

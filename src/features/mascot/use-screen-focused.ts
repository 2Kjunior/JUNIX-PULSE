/**
 * True while the screen that calls it is the one the user looks at.
 *
 * The tabs stay mounted when another one is shown, so a looping animation on a hidden tab keeps
 * costing frames for nothing. A mascot gets `animated={focused}`: it rests while its screen is behind.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useScreenFocused(): boolean {
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  return focused;
}

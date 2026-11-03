/**
 * Swipe actions cannot be reached with a screen reader. A swipeable row shares them through this
 * context, and the card inside exposes them as accessibility actions.
 */

import { createContext, useContext } from 'react';
import type { AccessibilityActionEvent, AccessibilityProps } from 'react-native';

export interface SwipeAccessibilityAction {
  key: string;
  label: string;
  onPress: () => void;
}

export const SwipeAccessibilityContext = createContext<readonly SwipeAccessibilityAction[]>([]);

export function useSwipeAccessibilityProps(): AccessibilityProps & {
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
} {
  const actions = useContext(SwipeAccessibilityContext);
  if (actions.length === 0) return {};

  return {
    accessibilityActions: actions.map(action => ({ name: action.key, label: action.label })),
    onAccessibilityAction: event => {
      actions.find(action => action.key === event.nativeEvent.actionName)?.onPress();
    },
  };
}

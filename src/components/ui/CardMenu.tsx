/**
 * The actions of a card without swiping (study 001, 3-B and 3-C; sheet 024): a visible "⋯"
 * button, and a long press on the card, open the same actions as the swipe, in a small menu.
 * Both read the actions the swipeable row shares (swipe-accessibility), so a card shows them
 * only inside a row that has actions, and a list never declares them twice.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useContext } from 'react';
import { Platform, TouchableOpacity } from 'react-native';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import { SwipeAccessibilityContext } from '@/components/ui/swipe-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { playHaptic } from '@/services/haptic-service';

/** Opens the menu of the row's actions, or undefined when the row has none. */
export function useCardMenu(title: string): (() => void) | undefined {
  const t = useT();
  const actions = useContext(SwipeAccessibilityContext);
  if (actions.length === 0) return undefined;
  return () => {
    playHaptic('light');
    GlassAlert.alert(title, undefined, [
      ...actions.map(action => ({
        text: action.label,
        style: action.key === 'delete' ? ('destructive' as const) : ('default' as const),
        onPress: action.onPress,
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  };
}

/** The "⋯" of a card: 44 dp to touch, named for the screen reader. Nothing outside a row with actions. */
export function CardMenuButton({ title, testID }: { title: string; testID?: string }) {
  const t = useT();
  const { palette } = useTheme();
  const open = useCardMenu(title);
  if (!open) return null;
  return (
    <TouchableOpacity
      onPress={open}
      // On the web a <button> may not sit inside the card, itself a <button>: there "⋯" keeps its
      // name and its place in the keyboard order, without the role. On the phone it is a button.
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={t('cardMenu.open', { title })}
      testID={testID}
      hitSlop={4}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name="ellipsis-horizontal" size={20} color={palette.onSurface.variant} />
    </TouchableOpacity>
  );
}

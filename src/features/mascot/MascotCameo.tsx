/**
 * MascotCameo: the small mascot that appears for a moment after an action succeeded.
 *
 * Mounted once, in the root layout, above the Snackbar. It listens to the mascot event bus,
 * asks the reaction engine whether and how to react, shows a 40 px mascot for the length of the
 * reaction (72 px for a big one), then goes away. It never takes a touch.
 * Nothing shows while the keyboard is open.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MascotReaction } from '@/domain/rules/mascot-reaction-rules';
import { subscribeMascotEvents } from '@/services/mascot/mascot-event-bus';
import { createMascotReactionEngine } from '@/services/mascot/mascot-reaction-engine';
import { getMascotFocusState, getMascotPresence } from '@/services/mascot/mascot-runtime';
import { loadMascotSettings } from '@/services/mascot/mascot-settings-service';

import { PulseMascot } from './PulseMascot';
import type { MascotSize } from './mascot-visuals';

/** The Snackbar sits 80 dp above the bottom inset; the cameo stands above it. */
const ABOVE_SNACKBAR_DP = 150;
const SIDE_MARGIN_DP = 16;
const FADE_MS = 200;
/** A big reaction grows the cameo to 72 px for the length of the reaction. */
const HIGHLIGHT_SIZE: MascotSize = 72;
const CAMEO_SIZE: MascotSize = 40;

interface ShownReaction {
  id: number;
  reaction: MascotReaction;
}

export function MascotCameo() {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<ShownReaction | null>(null);

  const engineRef = useRef(createMascotReactionEngine());
  const keyboardOpenRef = useRef(false);
  const counterRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The cameo lives in the root layout for the whole session: it loads the user's settings once
  useEffect(() => {
    void loadMascotSettings();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      keyboardOpenRef.current = true;
      setShown(null);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardOpenRef.current = false;
    });

    const unsubscribe = subscribeMascotEvents(event => {
      const now = Date.now();
      const reaction = engineRef.current.handle(event, {
        now,
        hour: new Date(now).getHours(),
        keyboardOpen: keyboardOpenRef.current,
        focusState: getMascotFocusState(),
        presence: getMascotPresence(),
      });
      if (!reaction) return;

      counterRef.current += 1;
      const id = counterRef.current;
      setShown({ id, reaction });

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShown(current => (current?.id === id ? null : current));
      }, reaction.durationMs + FADE_MS);
    });

    return () => {
      unsubscribe();
      showSub.remove();
      hideSub.remove();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!shown) return null;

  const { id, reaction } = shown;
  return (
    <Animated.View
      key={id}
      entering={FadeIn.duration(FADE_MS)}
      exiting={FadeOut.duration(FADE_MS)}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.cameo, { left: SIDE_MARGIN_DP, bottom: insets.bottom + ABOVE_SNACKBAR_DP }]}
    >
      <PulseMascot
        mood={reaction.mood}
        size={reaction.level === 'large' ? HIGHLIGHT_SIZE : CAMEO_SIZE}
        reaction={{ level: reaction.level, key: id }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cameo: {
    position: 'absolute',
    zIndex: 1001, // Above the Snackbar (1000)
  },
});

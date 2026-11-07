/**
 * MascotCompanion: Pulse itself, following the user from screen to screen.
 *
 * One single instance, mounted in the root layout above the whole navigation, so the mascot can
 * travel from a screen to the next instead of being redrawn on each. It waits where the rules
 * put it (see mascot-companion-rules), stands in the place a screen holds for it when there is
 * one (the header of Home, the hero of Pulse), and reacts on the spot to what the user does: a
 * gesture of the body and arms, and for the bigger ones a short bubble. It replaces the popup
 * that used to appear for a moment.
 *
 * The layer lets every touch through: the mascot never blocks a button, a field or the tab bar.
 * It steps aside while the keyboard is open, and it is not there when the user turned it off.
 */

import { useSegments } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Keyboard, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  COMPANION_DOZE_AFTER_MS,
  COMPANION_EXPRESSION_HOLD_MS,
  COMPANION_GLANCE_AFTER_MS,
  COMPANION_GLANCE_FOR_MS,
  companionBehavior,
  companionDirection,
  CompanionScreen,
  companionScreenFromSegments,
  computeCompanionPlacement,
  glancePointAt,
  glanceTarget,
  reactionHasBubble,
  reactionMessageId,
} from '@/domain/rules/mascot-companion-rules';
import type { GuidePlacement, GuideSize } from '@/domain/rules/mascot-guide-rules';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import type { MascotReaction } from '@/domain/rules/mascot-reaction-rules';
import { relativeToLayer } from '@/domain/rules/mascot-tour-rules';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';
import { SettingsRepository } from '@/repositories/settings-repository';
import { subscribeMascotEvents } from '@/services/mascot/mascot-event-bus';
import { createMascotReactionEngine } from '@/services/mascot/mascot-reaction-engine';
import { getMascotFocusState, getMascotPresence } from '@/services/mascot/mascot-runtime';

import { ANCHORED_SCREENS, measureCompanionAnchor } from './CompanionAnchor';
import { MascotBubble } from './MascotBubble';
import type { MascotReactionTrigger } from './PulseMascot';
import { PulseMascotMover } from './PulseMascotMover';
import { layoutBubble, layoutBubbleAbove } from './mascot-bubble-layout';
import { loadMascotDayMood } from './use-mascot-day-mood';
import { useMascotPreferences } from './use-mascot-preferences';

/** A screen that holds a place for the mascot is measured once its transition is over. */
const ANCHOR_FIRST_MS = 450;
const ANCHOR_RETRY_MS = 400;
const ANCHOR_ATTEMPTS = 5;
/** A bubble stays long enough to read a short sentence, even after the gesture is over. */
const BUBBLE_MIN_MS = 2800;
const FADE_MS = 200;
/** A mascot lower than this share of the screen height speaks from above. */
const LOW_ON_SCREEN = 0.6;

interface ShownReaction {
  id: number;
  reaction: MascotReaction;
  text: string | null;
}

interface Anchor {
  center: { x: number; y: number };
  size: GuideSize;
}

export function MascotCompanion() {
  const segments = useSegments();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useSafeReducedMotion();
  const { settings, preferences } = useMascotPreferences();

  const screen = companionScreenFromSegments(segments);
  const presence = settings.presence;

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [baseMood, setBaseMood] = useState<MascotMood>('calm');
  const [shown, setShown] = useState<ShownReaction | null>(null);
  const [idle, setIdle] = useState(false);
  const [glancing, setGlancing] = useState(false);
  const [trigger, setTrigger] = useState<MascotReactionTrigger | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [anchorSettled, setAnchorSettled] = useState(false);
  const [placement, setPlacement] = useState<GuidePlacement | null>(null);

  const layerRef = useRef<React.ComponentRef<typeof View>>(null);
  const engineRef = useRef(createMascotReactionEngine());
  const keyboardOpenRef = useRef(false);
  const counterRef = useRef(0);
  const dozingRef = useRef(false);
  const baseMoodRef = useRef<MascotMood>('calm');
  baseMoodRef.current = baseMood;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const previousScreenRef = useRef<CompanionScreen | null>(null);

  // Direction of the trip: read before the effect below remembers the screen it came from
  const direction = useMemo(() => companionDirection(previousScreenRef.current, screen), [screen]);
  useEffect(() => {
    previousScreenRef.current = screen;
  }, [screen]);

  // The mood of the day, read again whenever the user arrives somewhere or something happened
  const refreshMood = useCallback(() => {
    void loadMascotDayMood().then(next => setBaseMood(next.mood));
  }, []);
  useEffect(() => {
    refreshMood();
  }, [screen, refreshMood]);

  // Nothing touched for a while: a calm mascot dozes off. Any change of screen, any reaction,
  // any keyboard movement wakes it.
  useEffect(() => {
    if (dozingRef.current) {
      dozingRef.current = false;
      // Waking up from a doze: a small stretch of the arms, unless a reaction is already playing
      if (!shown && (baseMoodRef.current === 'calm' || baseMoodRef.current === 'happy')) {
        counterRef.current += 1;
        setTrigger({ level: 'micro', key: counterRef.current });
      }
    }
    setIdle(false);
    const timer = setTimeout(() => {
      dozingRef.current = true;
      setIdle(true);
    }, COMPANION_DOZE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [screen, shown, keyboardOpen]);

  // A quiet moment on a screen with a main button: the mascot points at it for a few seconds,
  // once per quiet moment. Any change of screen, any reaction, any keyboard movement starts over.
  useEffect(() => {
    setGlancing(false);
    if (keyboardOpen) return;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
      setGlancing(true);
      stopTimer = setTimeout(() => setGlancing(false), COMPANION_GLANCE_FOR_MS);
    }, COMPANION_GLANCE_AFTER_MS);
    return () => {
      clearTimeout(startTimer);
      if (stopTimer) clearTimeout(stopTimer);
    };
  }, [screen, shown, keyboardOpen]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      keyboardOpenRef.current = true;
      setKeyboardOpen(true);
      setShown(null);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardOpenRef.current = false;
      setKeyboardOpen(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // A reaction to what the user does: played on the spot, wherever the mascot stands
  useEffect(() => {
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
      const messageId = reactionMessageId(reaction.eventType, id);
      const wantsBubble = messageId !== null && reactionHasBubble(reaction.level, getMascotPresence());

      const show = (text: string | null) => {
        setShown({ id, reaction, text });
        setTrigger({ level: reaction.level, key: id });
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        // The gesture is short, the mood stays long enough to be seen
        const hold = COMPANION_EXPRESSION_HOLD_MS[reaction.level];
        const stay = text ? Math.max(hold, BUBBLE_MIN_MS) : hold;
        hideTimerRef.current = setTimeout(() => {
          setShown(current => (current?.id === id ? null : current));
        }, stay + FADE_MS);
        refreshMood(); // What the user just did can change the mood of the day
      };

      if (!wantsBubble || !messageId) {
        show(null);
        return;
      }
      void SettingsRepository.get()
        .catch(() => null)
        .then(saved => {
          show(resolveMascotMessage(messageId, {}, preferences, saved?.displayName ?? null));
        });
    });

    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [preferences, refreshMood]);

  // The app comes back from the background: a mascot that was dozing starts the day afresh
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        dozingRef.current = false;
        setIdle(false);
      }
    });
    return () => subscription.remove();
  }, []);

  // A screen that holds a place for the mascot: measure it once the screen is in place. Until it
  // is measured the mascot stays where it was, so it does not run to a corner and back.
  useEffect(() => {
    setAnchor(null);
    const size = ANCHORED_SCREENS[screen];
    if (!size || presence === 'off') {
      setAnchorSettled(true);
      return;
    }
    setAnchorSettled(false);

    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = async () => {
      const rect = await measureCompanionAnchor(screen);
      const layer = layerRef.current;
      if (!active) return;
      if (rect && layer) {
        // Measured in window coordinates, drawn in the layer's own (see HomeTour)
        const origin = await new Promise<{ x: number; y: number }>(resolve => {
          layer.measureInWindow((x, y) => resolve({ x, y }));
        });
        if (!active) return;
        const inLayer = relativeToLayer(rect, origin);
        setAnchor({ center: { x: inLayer.x + inLayer.width / 2, y: inLayer.y + inLayer.height / 2 }, size });
        setAnchorSettled(true);
        return;
      }
      attempts += 1;
      if (attempts >= ANCHOR_ATTEMPTS) {
        setAnchorSettled(true); // The screen has no place for it after all: the default one
        return;
      }
      timer = setTimeout(attempt, ANCHOR_RETRY_MS);
    };

    timer = setTimeout(attempt, ANCHOR_FIRST_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [screen, presence, width, height]);

  useEffect(() => {
    if (!anchorSettled) return;
    const next = computeCompanionPlacement({
      screen,
      presence,
      direction,
      window: { width, height, insets },
      keyboardOpen,
      reducedMotion,
      from: centerRef.current,
      anchor: anchor ?? undefined,
    });
    centerRef.current = next ? next.center : null;
    setPlacement(next);
  }, [screen, presence, direction, width, height, insets, keyboardOpen, reducedMotion, anchor, anchorSettled]);

  const canGlance = placement !== null && glanceTarget(screen, placement, { width, insets }) !== null;
  const behavior = companionBehavior({
    baseMood,
    reaction: shown ? { mood: shown.reaction.mood, level: shown.reaction.level } : null,
    idleMs: idle ? COMPANION_DOZE_AFTER_MS : 0,
    screen,
    glancing: glancing && canGlance,
  });

  // The pose changes in place: the trip of the mover does not restart for it
  const posed = useMemo(() => {
    if (!placement) return null;
    const target = behavior.pose === 'pointAt' ? glanceTarget(screen, placement, { width, insets }) : null;
    return { ...placement, pose: behavior.pose, pointAt: target ? glancePointAt(placement, target) : null };
  }, [placement, behavior.pose, screen, width, insets]);

  // Waiting low on the screen, by the floating button: the bubble rises above the mascot
  const bubble =
    posed && shown?.text
      ? posed.center.y > height * LOW_ON_SCREEN
        ? layoutBubbleAbove(posed, { width, height })
        : layoutBubble(posed, width)
      : null;

  return (
    <View ref={layerRef} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <PulseMascotMover placement={posed} mood={behavior.mood} reaction={trigger} />
      {bubble && shown?.text ? (
        <View pointerEvents="none" style={bubble.style}>
          <MascotBubble
            key={shown.id}
            text={shown.text}
            maxWidth={bubble.maxWidth}
            tailSide={bubble.tailSide}
            solid
          />
        </View>
      ) : null}
    </View>
  );
}

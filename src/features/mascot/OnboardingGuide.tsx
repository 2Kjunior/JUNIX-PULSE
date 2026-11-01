/**
 * OnboardingGuide: Pulse presents the app from step to step of the onboarding.
 *
 * One single instance, mounted above the onboarding stack, so the mascot can travel from one
 * screen to the next instead of being redrawn on each. The layer lets every touch through: the
 * mascot never blocks a button, a field or the step indicator, and it keeps out of the top bar
 * and the main button zone (see mascot-guide-rules). When the user turns the mascot off, it is
 * simply not there.
 */

import { useSegments } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  computeGuidePlacement,
  GuidePlacement,
  guideDirection,
  guideMessageFor,
  GuideStep,
  ONBOARDING_STEPS,
} from '@/domain/rules/mascot-guide-rules';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';
import { SettingsRepository } from '@/repositories/settings-repository';

import { BubbleTailSide, MascotBubble } from './MascotBubble';
import { PulseMascotMover } from './PulseMascotMover';
import { useOnboardingGuideState } from './onboarding-guide-state';
import { useMascotPreferences } from './use-mascot-preferences';

/** How long a bubble stays: long enough to read two short sentences. */
const BUBBLE_READING_MS = 7000;
const BUBBLE_GAP_DP = 6;
const EDGE_MARGIN_DP = 12;
/** The whole drawing, arms included, is 1.5 times as wide as the orb. */
const FOOTPRINT_HALF_WIDTH = 0.78;

/** The onboarding step a route stands for, or null outside the onboarding. */
export function stepFromSegments(segments: readonly string[]): GuideStep | null {
  if (segments[0] !== '(onboarding)') return null;
  const last = segments[segments.length - 1];
  if (last === '(onboarding)' || last === 'index') return 'welcome';
  return (ONBOARDING_STEPS as readonly string[]).includes(last) ? (last as GuideStep) : null;
}

interface BubbleLayout {
  style: ViewStyle;
  maxWidth: number;
  tailSide: BubbleTailSide;
  centered: boolean;
}

/** Where the bubble goes: beside the mascot when it stands at a side, under it when it is central. */
function layoutBubble(placement: GuidePlacement, windowWidth: number): BubbleLayout {
  const { center, size } = placement;
  const reach = size * FOOTPRINT_HALF_WIDTH + BUBBLE_GAP_DP;

  if (center.x < windowWidth * 0.4) {
    const left = center.x + reach;
    return {
      style: { position: 'absolute', left, top: center.y - size / 2 },
      maxWidth: Math.min(placement.bubbleMaxWidth, windowWidth - left - EDGE_MARGIN_DP),
      tailSide: 'left',
      centered: false,
    };
  }

  if (center.x > windowWidth * 0.6) {
    const right = windowWidth - (center.x - reach);
    return {
      style: { position: 'absolute', right, top: center.y - size / 2 },
      maxWidth: Math.min(placement.bubbleMaxWidth, center.x - reach - EDGE_MARGIN_DP),
      tailSide: 'right',
      centered: false,
    };
  }

  return {
    style: { position: 'absolute', left: 0, right: 0, top: center.y + size / 2 + 12, alignItems: 'center' },
    maxWidth: placement.bubbleMaxWidth,
    tailSide: 'top',
    centered: true,
  };
}

export function OnboardingGuide() {
  const segments = useSegments();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useSafeReducedMotion();
  const { settings, preferences } = useMascotPreferences();
  const guide = useOnboardingGuideState();

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [placement, setPlacement] = useState<GuidePlacement | null>(null);
  const previousStepRef = useRef<GuideStep | null>(null);

  const step = stepFromSegments(segments);
  const present = settings.presence !== 'off';

  // The bubble is read once: it gives way after a few seconds, so it never hides a title for long
  const [bubbleShown, setBubbleShown] = useState(true);
  useEffect(() => {
    setBubbleShown(true);
    const timer = setTimeout(() => setBubbleShown(false), BUBBLE_READING_MS);
    return () => clearTimeout(timer);
  }, [step, guide.permission]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // The name typed on the personalisation step is saved when the user moves on; read it afresh
  useEffect(() => {
    let active = true;
    SettingsRepository.get()
      .then(saved => {
        if (active) setDisplayName(saved.displayName ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [step]);

  useEffect(() => {
    if (!step || !present) {
      previousStepRef.current = null;
      setPlacement(null);
      return;
    }
    const direction = guideDirection(previousStepRef.current, step);
    previousStepRef.current = step;

    setPlacement(previous =>
      computeGuidePlacement({
        step,
        direction,
        phase: guide.permission === 'ask' ? 'ask' : 'done',
        screen: { width, height, insets },
        keyboardOpen,
        reducedMotion,
        from: previous?.center ?? null,
        anchorY: guide.welcomeAnchorY ?? undefined,
      })
    );
  }, [step, present, guide.permission, guide.welcomeAnchorY, keyboardOpen, width, height, insets, reducedMotion]);

  const message = step ? guideMessageFor(step, guide.permission) : null;
  const text = useMemo(
    () => (message ? resolveMascotMessage(message.id, {}, preferences, displayName) : null),
    [message, preferences, displayName]
  );

  // A stable object, so the reaction plays once when the permission is granted
  const granted = guide.permission === 'granted';
  const reaction = useMemo(() => (granted ? { level: 'medium' as const, key: 1 } : null), [granted]);

  if (!placement || !present) return null;

  const bubble = layoutBubble(placement, width);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <PulseMascotMover placement={placement} mood={message?.mood ?? 'calm'} reaction={reaction} />
      {text && placement.bubbleVisible && bubbleShown ? (
        <View pointerEvents="none" style={bubble.style}>
          <MascotBubble
            key={`${step}-${guide.permission}`}
            text={text}
            maxWidth={bubble.maxWidth}
            tailSide={bubble.tailSide}
            solid
          />
        </View>
      ) : null}
    </View>
  );
}

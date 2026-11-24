/**
 * A gesture tip in a list (study 001, 3-A and 12.3; sheet 024): the first time a list has enough
 * cards, and not on a day another tip was given, Pulse says it in a bubble and the first card
 * opens by itself for a moment to show its buttons. Once only. With the mascot off, the card still
 * opens (the gesture must be found), without the bubble. With reduced motion, it does not move.
 *
 * Usage in a list: const swipeTip = useGestureTip('swipe', cards.length);
 *   <SwipeableItem peek={swipeTip.peeking && index === 0} …> and {swipeTip.element} at the root.
 */
import React, { useEffect, useRef, useState } from 'react';

import { GESTURE_TIPS, gestureTipDue, PEEK_DELAY_MS, PEEK_OPEN_MS, type GestureTipId } from '@/domain/rules/gesture-tip-rules';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, lastTipDay, markTipSeen } from '@/services/mascot/mascot-tips-service';

import { isHomeTourRunning } from './HomeTour';
import { TipBubbleLayer } from './TipBubbleLayer';
import { useMascotPreferences } from './use-mascot-preferences';

const SHOW_DELAY_MS = 1200;
const READING_MS = 9000;

export function useGestureTip(id: GestureTipId, cardCount: number): { peeking: boolean; element: React.ReactElement | null } {
  const { preferences, settings } = useMascotPreferences();
  const [text, setText] = useState<string | null>(null);
  const [peeking, setPeeking] = useState(false);
  // Decided once per visit of the screen
  const decidedRef = useRef(false);
  const tip = GESTURE_TIPS[id];
  const ready = cardCount >= tip.minCards;

  useEffect(() => {
    if (!ready || decidedRef.current) return;
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(async () => {
        if (!active || isHomeTourRunning()) return;
        const [seen, lastDay] = await Promise.all([hasSeenTip(id), lastTipDay()]);
        if (!active || !gestureTipDue({ tip, cardCount, seen, lastTipDay: lastDay, now: new Date() })) return;
        decidedRef.current = true;
        void markTipSeen(id); // Seen from the moment it shows: it never comes twice

        setPeeking(true);
        timers.push(setTimeout(() => active && setPeeking(false), PEEK_DELAY_MS + PEEK_OPEN_MS + 400));

        if (settings.presence === 'off') return;
        const saved = await SettingsRepository.get().catch(() => null);
        const spoken = resolveMascotMessage(tip.message, {}, preferences, saved?.displayName ?? null);
        if (!active || !spoken) return;
        setText(spoken);
        timers.push(setTimeout(() => active && setText(null), READING_MS));
      }, SHOW_DELAY_MS)
    );

    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
    // Decided when the list is first long enough, not each time a preference object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ready]);

  return { peeking, element: text ? <TipBubbleLayer text={text} onClose={() => setText(null)} /> : null };
}

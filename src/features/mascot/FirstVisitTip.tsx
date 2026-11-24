/**
 * FirstVisitTip: one bubble the first time a screen is opened, then never again.
 *
 * It says one useful thing about the screen, stays a few seconds or until "Compris", and is
 * remembered as seen the moment it shows. It does not appear while the home tour is on, nor when
 * the mascot is off. The bubble itself is TipBubbleLayer, shared with the gesture tips (sheet 024).
 */

import React, { useEffect, useState } from 'react';

import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { TIP_MESSAGES, TipScreen } from '@/domain/rules/mascot-tour-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, markTipSeen } from '@/services/mascot/mascot-tips-service';

import { isHomeTourRunning } from './HomeTour';
import { TipBubbleLayer } from './TipBubbleLayer';
import { useMascotPreferences } from './use-mascot-preferences';

const SHOW_DELAY_MS = 1000;
const READING_MS = 9000;

export function FirstVisitTip({ screen }: { screen: TipScreen }) {
  const { preferences, settings } = useMascotPreferences();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    if (settings.presence === 'off') return;
    let active = true;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showTimer = setTimeout(async () => {
      if (!active || isHomeTourRunning() || (await hasSeenTip(screen))) return;
      const saved = await SettingsRepository.get().catch(() => null);
      const spoken = resolveMascotMessage(TIP_MESSAGES[screen], {}, preferences, saved?.displayName ?? null);
      if (!active || !spoken) return;

      setText(spoken);
      void markTipSeen(screen); // Seen from the moment it shows: it never comes twice
      hideTimer = setTimeout(() => active && setText(null), READING_MS);
    }, SHOW_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
    // The tip is decided when the screen shows, not each time a preference object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, settings.presence]);

  if (!text) return null;
  return <TipBubbleLayer text={text} onClose={() => setText(null)} />;
}

/**
 * SecretTip: now and then, on the home screen, Pulse tells one of its secrets (study 001, 16.13;
 * sheet 046). « Tu savais ? … » in the same bubble as the other tips.
 *
 * Only after the home tour was seen, never while a tour is on, never when Pulse is off, and as
 * secretDue decides: after a few days of use, at most one every few days, never on the day of
 * another tip. Told once: it is remembered the moment it shows.
 */

import React, { useEffect, useState } from 'react';

import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { SCREEN_TOURS } from '@/domain/rules/mascot-tour-rules';
import { SECRET_TIPS, secretDue } from '@/domain/rules/secret-tips-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, lastSecretDay, lastTipDay, markSecretTold } from '@/services/mascot/mascot-tips-service';

import { isHomeTourRunning } from './HomeTour';
import { TipBubbleLayer } from './TipBubbleLayer';
import { useMascotPreferences } from './use-mascot-preferences';

/** After the home screen has settled, and after a tour would have started. */
const SHOW_DELAY_MS = 4000;
const READING_MS = 12000;

export function SecretTip() {
  const { preferences, settings } = useMascotPreferences();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    if (settings.presence === 'off') return;
    let active = true;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showTimer = setTimeout(async () => {
      if (!active || isHomeTourRunning() || !(await hasSeenTip(SCREEN_TOURS.home.tipId))) return;
      const saved = await SettingsRepository.get().catch(() => null);
      if (!active || !saved) return;
      const seen = new Set<string>();
      for (const secret of SECRET_TIPS) if (await hasSeenTip(secret.id)) seen.add(secret.id);
      const secret = secretDue({
        seen,
        startedAt: new Date(saved.createdAt),
        lastTipDay: await lastTipDay(),
        lastSecretDay: await lastSecretDay(),
        now: new Date(),
      });
      if (!active || !secret) return;
      const spoken = resolveMascotMessage(secret.message, {}, preferences, saved.displayName ?? null);
      if (!spoken) return;

      setText(spoken);
      void markSecretTold(secret.id); // Told from the moment it shows: it never comes twice
      hideTimer = setTimeout(() => active && setText(null), READING_MS);
    }, SHOW_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
    // Decided when the home screen shows, not each time a preference object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.presence]);

  if (!text) return null;
  return <TipBubbleLayer text={text} onClose={() => setText(null)} />;
}

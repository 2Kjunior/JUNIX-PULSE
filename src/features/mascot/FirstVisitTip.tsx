/**
 * FirstVisitTip: one bubble the first time a screen is opened, then never again.
 *
 * It says one useful thing about the screen, stays a few seconds or until "Compris", and is
 * remembered as seen the moment it shows. It does not appear while the home tour is on, nor when
 * the mascot is off.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { TIP_MESSAGES, TipScreen } from '@/domain/rules/mascot-tour-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, markTipSeen } from '@/services/mascot/mascot-tips-service';

import { isHomeTourRunning } from './HomeTour';
import { MascotBubble } from './MascotBubble';
import { PulseMascot } from './PulseMascot';
import { useMascotPreferences } from './use-mascot-preferences';

const SHOW_DELAY_MS = 1000;
const READING_MS = 9000;
const SIDE_MARGIN_DP = 16;
const MASCOT_COLUMN_DP = 60;
/** Below the screen title row of the main tabs. */
const TOP_OFFSET_DP = 72;

export function FirstVisitTip({ screen }: { screen: TipScreen }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: SIDE_MARGIN_DP,
          right: SIDE_MARGIN_DP,
          top: insets.top + TOP_OFFSET_DP,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        <View pointerEvents="none" style={{ width: MASCOT_COLUMN_DP, alignItems: 'center', paddingTop: 6 }}>
          <PulseMascot mood="happy" size={40} />
        </View>
        <MascotBubble
          text={text}
          maxWidth={width - SIDE_MARGIN_DP * 2 - MASCOT_COLUMN_DP - 4}
          tailSide="left"
          solid
          actions={[{ label: 'Compris', onPress: () => setText(null), primary: true }]}
        />
      </View>
    </View>
  );
}

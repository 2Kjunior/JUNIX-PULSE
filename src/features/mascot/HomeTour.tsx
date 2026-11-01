/**
 * HomeTour: Pulse shows the home screen in four stops, once.
 *
 * A ring is drawn around each target and a bubble says what it is, with "Suivant" and "Passer".
 * It never blocks: the rest of the screen stays usable, and "Passer" ends it at any time.
 * It starts a moment after the home screen shows, only for a user who has the mascot on and has
 * not seen it. "Revoir la présentation" in the settings gives it back.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import {
  HOME_TOUR_TIP_ID,
  placeTourBubble,
  planTour,
  TOUR_STOPS,
  TourRect,
  TourScreen,
  TourStopId,
} from '@/domain/rules/mascot-tour-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, markTipSeen } from '@/services/mascot/mascot-tips-service';
import { useTheme } from '@/hooks/use-theme';

import { MascotBubble } from './MascotBubble';
import { PulseMascot } from './PulseMascot';
import { measureTourTarget } from './TourTarget';
import { useMascotPreferences } from './use-mascot-preferences';

const START_DELAY_MS = 1500;
const START_ATTEMPTS = 4;
const TAB_BAR_RESERVE_DP = 110;
const SIDE_MARGIN_DP = 16;
const MASCOT_COLUMN_DP = 60;
const RING_WIDTH = 2;

/** True while a tour is on, so a first visit tip does not talk over it. */
let tourRunning = false;
export function isHomeTourRunning(): boolean {
  return tourRunning;
}

interface ActiveTour {
  stops: TourStopId[];
  index: number;
  rect: TourRect;
}

export function HomeTour() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { preferences, settings } = useMascotPreferences();

  const [tour, setTour] = useState<ActiveTour | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const startedRef = useRef(false);

  const screen: TourScreen = {
    width,
    height,
    topInset: insets.top,
    bottomReserve: TAB_BAR_RESERVE_DP + insets.bottom,
  };
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const finish = useCallback(() => {
    tourRunning = false;
    setTour(null);
    void markTipSeen(HOME_TOUR_TIP_ID);
  }, []);

  // Start once, a moment after the home screen shows
  useEffect(() => {
    if (settings.presence === 'off' || startedRef.current) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = async (remaining: number) => {
      if (!active || (await hasSeenTip(HOME_TOUR_TIP_ID))) return;

      const measured: Partial<Record<TourStopId, TourRect | null>> = {};
      for (const stop of TOUR_STOPS) measured[stop.id] = await measureTourTarget(stop.id);
      const stops = planTour(measured, screenRef.current);
      if (!active) return;
      if (stops.length === 0) {
        // The screen is not laid out yet: look again shortly, a few times at most
        if (remaining > 1) timer = setTimeout(() => void attempt(remaining - 1), START_DELAY_MS);
        return;
      }

      const saved = await SettingsRepository.get().catch(() => null);
      if (!active) return;
      setDisplayName(saved?.displayName ?? null);

      const first = measured[stops[0]];
      if (!first) return;
      startedRef.current = true;
      tourRunning = true;
      setTour({ stops, index: 0, rect: first });
    };

    timer = setTimeout(() => void attempt(START_ATTEMPTS), START_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [settings.presence]);

  // Leaving the screen ends the tour for good: it has been shown
  useEffect(() => {
    return () => {
      tourRunning = false;
    };
  }, []);

  const next = useCallback(async () => {
    if (!tour) return;
    const index = tour.index + 1;
    if (index >= tour.stops.length) {
      finish();
      return;
    }
    // Measure again: the layout may have moved since the start
    const rect = await measureTourTarget(tour.stops[index]);
    if (!rect) {
      finish();
      return;
    }
    setTour({ ...tour, index, rect });
  }, [tour, finish]);

  if (!tour || settings.presence === 'off') return null;

  const stop = TOUR_STOPS.find(item => item.id === tour.stops[tour.index]);
  if (!stop) return null;

  const placement = placeTourBubble(tour.rect, screen);
  const text = resolveMascotMessage(stop.message, {}, preferences, displayName);
  if (!text) return null;

  const last = tour.index === tour.stops.length - 1;
  const position = `${tour.index + 1} sur ${tour.stops.length}`;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: placement.highlight.x,
          top: placement.highlight.y,
          width: placement.highlight.width,
          height: placement.highlight.height,
          borderRadius: 18,
          borderWidth: RING_WIDTH,
          borderColor: palette.primary.default,
        }}
      />
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: SIDE_MARGIN_DP,
          right: SIDE_MARGIN_DP,
          top: placement.top,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        <View pointerEvents="none" style={{ width: MASCOT_COLUMN_DP, alignItems: 'center', paddingTop: 8 }}>
                    {/* Still: the home screen already has its own animated mascot behind this one */}
          <PulseMascot mood="happy" size={40} pose="pointAt" pointAt={{ arm: 'right', angleDeg: -90 }} animated={false} />
        </View>
        <MascotBubble
          key={tour.index}
          text={text}
          maxWidth={width - SIDE_MARGIN_DP * 2 - MASCOT_COLUMN_DP - 4}
          tailSide="left"
          solid
          actions={[
            { label: 'Passer', onPress: finish, accessibilityLabel: 'Passer la présentation' },
            {
              label: last ? 'Terminer' : `Suivant (${position})`,
              onPress: next,
              primary: true,
              accessibilityLabel: last ? 'Terminer la présentation' : `Étape suivante, ${position}`,
            },
          ]}
        />
      </View>
    </View>
  );
}

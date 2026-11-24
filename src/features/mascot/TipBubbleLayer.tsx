/**
 * The bubble of a tip, under the title row of a screen, with Pulse beside it and "Compris"
 * (sheet 024: shared by the first visit tips and the gesture tips).
 */
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOUR_BUBBLE_MAX_WIDTH } from '@/domain/rules/mascot-tour-rules';
import { useT } from '@/i18n';

import { MascotBubble } from './MascotBubble';
import { PulseMascot } from './PulseMascot';

const SIDE_MARGIN_DP = 16;
const MASCOT_COLUMN_DP = 60;
/** Below the screen title row of the main tabs. */
const TOP_OFFSET_DP = 72;

export function TipBubbleLayer({ text, onClose }: { text: string; onClose: () => void }) {
  const t = useT();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
          maxWidth={Math.min(TOUR_BUBBLE_MAX_WIDTH, width - SIDE_MARGIN_DP * 2 - MASCOT_COLUMN_DP - 4)}
          tailSide="left"
          solid
          actions={[{ label: t('common.gotIt'), onPress: onClose, primary: true }]}
        />
      </View>
    </View>
  );
}

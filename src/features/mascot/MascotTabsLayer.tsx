/**
 * MascotTabsLayer: the mascot's guidance on the main tabs, mounted once in the tabs layout.
 * On the home screen it gives the four stop tour; on the other tabs, a tip on the first visit.
 * It lets every touch through except those on its own buttons.
 */

import { useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { tipScreenFromSegments, tourFromSegments } from '@/domain/rules/mascot-tour-rules';

import { FirstVisitTip } from './FirstVisitTip';
import { HomeTour } from './HomeTour';
import { SecretTip } from './SecretTip';

export function MascotTabsLayer() {
  const segments = useSegments();
  // A tab with a tour (sheet 045) has no single first visit tip: the tour says more
  const tour = tourFromSegments(segments);
  const tipScreen = tour ? null : tipScreenFromSegments(segments);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {tour ? <HomeTour key={tour} tour={tour} /> : null}
      {/* Now and then, a secret of Pulse on the home screen (sheet 046) */}
      {tour === 'home' ? <SecretTip /> : null}
      {tipScreen ? <FirstVisitTip key={tipScreen} screen={tipScreen} /> : null}
    </View>
  );
}

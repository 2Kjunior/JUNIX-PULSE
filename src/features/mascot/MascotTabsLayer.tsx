/**
 * MascotTabsLayer: the mascot's guidance on the main tabs, mounted once in the tabs layout.
 * On the home screen it gives the four stop tour; on the other tabs, a tip on the first visit.
 * It lets every touch through except those on its own buttons.
 */

import { useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { isHomeSegments, tipScreenFromSegments } from '@/domain/rules/mascot-tour-rules';

import { FirstVisitTip } from './FirstVisitTip';
import { HomeTour } from './HomeTour';

export function MascotTabsLayer() {
  const segments = useSegments();
  const tipScreen = tipScreenFromSegments(segments);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {isHomeSegments(segments) ? <HomeTour /> : null}
      {tipScreen ? <FirstVisitTip key={tipScreen} screen={tipScreen} /> : null}
    </View>
  );
}

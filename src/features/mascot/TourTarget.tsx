/**
 * Marks a part of a screen the home tour can point at.
 * A target registers how to measure itself in window coordinates; the tour asks for the
 * measure only when it needs it, so nothing is computed on every render.
 */

import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import type { TourRect, TourStopId } from '@/domain/rules/mascot-tour-rules';

const measurers = new Map<TourStopId, () => Promise<TourRect | null>>();

export async function measureTourTarget(id: TourStopId): Promise<TourRect | null> {
  const measure = measurers.get(id);
  return measure ? measure() : null;
}

interface TourTargetProps {
  id: TourStopId;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function TourTarget({ id, style, children }: TourTargetProps) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);

  useEffect(() => {
    measurers.set(id, () => {
      return new Promise<TourRect | null>(resolve => {
        const node = ref.current;
        if (!node) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
        });
      });
    });
    return () => {
      measurers.delete(id);
    };
  }, [id]);

  // collapsable=false keeps the view on Android, where an unstyled wrapper would be flattened away
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

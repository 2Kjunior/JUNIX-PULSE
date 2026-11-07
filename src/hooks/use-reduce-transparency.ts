/**
 * Whether the glass gives way to plain backgrounds: asked of the phone (reduce transparency in
 * its accessibility settings) or in the app settings. Kept up to date while mounted.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useAppStore } from '@/store/app-store';

export function useReduceTransparency(): boolean {
  const [systemReduced, setSystemReduced] = useState(false);
  const appReduced = useAppStore(state => state.reduceTransparency);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(enabled => {
        if (mounted) setSystemReduced(Boolean(enabled));
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', enabled => {
      if (mounted) setSystemReduced(Boolean(enabled));
    });
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return systemReduced || appReduced;
}

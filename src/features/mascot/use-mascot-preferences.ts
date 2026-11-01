/**
 * The mascot's preferences and settings, kept up to date: loaded once from the database, then
 * following every change made in the settings screen.
 */

import { useEffect, useSyncExternalStore } from 'react';

import type { MascotPreferences, MascotSettings } from '@/domain/rules/mascot-preferences';
import {
  getMascotPreferences,
  getMascotSettings,
  subscribeMascotSettings,
} from '@/services/mascot/mascot-runtime';
import { loadMascotSettings } from '@/services/mascot/mascot-settings-service';

export interface UseMascotPreferences {
  preferences: MascotPreferences;
  settings: MascotSettings;
}

export function useMascotPreferences(): UseMascotPreferences {
  // The runtime hands back the same objects until a setting changes, as the store contract needs
  const preferences = useSyncExternalStore(subscribeMascotSettings, getMascotPreferences, getMascotPreferences);
  const settings = useSyncExternalStore(subscribeMascotSettings, getMascotSettings, getMascotSettings);

  useEffect(() => {
    void loadMascotSettings();
  }, []);

  return { preferences, settings };
}

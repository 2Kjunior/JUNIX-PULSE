/**
 * Loads the user's mascot settings from the database into the runtime, and saves a change.
 */

import { Settings } from '../../domain/entities';
import { MascotSettings } from '../../domain/rules/mascot-preferences';
import { SettingsRepository } from '../../repositories/settings-repository';
import { syncDailyRecapNotifications } from '../daily-recap-service';
import { getMascotSettings, setMascotSettings } from './mascot-runtime';

export function mascotSettingsFrom(settings: Settings): MascotSettings {
  return {
    presence: settings.mascotPresence,
    address: settings.mascotAddress,
    proposals: settings.mascotProposals,
    briefings: settings.mascotBriefings,
  };
}

/** Reads the settings once and applies them. A failed read keeps the current ones. */
export async function loadMascotSettings(): Promise<MascotSettings> {
  try {
    const settings = mascotSettingsFrom(await SettingsRepository.get());
    setMascotSettings(settings);
    return settings;
  } catch {
    return getMascotSettings();
  }
}

/** Saves a change, then applies it. The runtime only changes once the write has succeeded. */
export async function saveMascotSettings(change: Partial<MascotSettings>): Promise<MascotSettings> {
  const next: MascotSettings = { ...getMascotSettings(), ...change };
  await SettingsRepository.update({
    mascotPresence: next.presence,
    mascotAddress: next.address,
    mascotProposals: next.proposals,
    mascotBriefings: next.briefings,
    updatedAt: new Date().toISOString(),
  });
  setMascotSettings(next);
  await syncDailyRecapNotifications();
  return next;
}

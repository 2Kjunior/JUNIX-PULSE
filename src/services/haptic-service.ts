/**
 * Plays the vibrations. It listens to what the use cases announce, so that every screen doing
 * the same action gives the same feedback. A phone without a vibrator simply stays silent.
 */

import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

import { ANDROID_HAPTIC_PATTERNS, hapticForEvent, HapticKind } from '@/domain/rules/haptic-rules';
import { subscribeMascotEvents } from '@/services/mascot/mascot-event-bus';
import { logger } from '@/utils/logger';

let actionHapticsEnabled = true;

/** The user's choice in the settings; the test panel plays regardless. */
export function setHapticsEnabled(enabled: boolean): void {
  actionHapticsEnabled = enabled;
}

export function playHaptic(kind: HapticKind): void {
  if (Platform.OS === 'android') {
    // The vibrator of React Native itself, at full strength: see ANDROID_HAPTIC_PATTERNS
    Vibration.vibrate([...ANDROID_HAPTIC_PATTERNS[kind]]);
    return;
  }

  const played =
    kind === 'light'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(
          kind === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : kind === 'warning'
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Error
        );
  // No vibrator, or an installed app built before this module: visible in development only
  played.catch(error => logger.warn('[HapticService] Vibration impossible', error));
}

/** Starts answering the actions of the user. Returns the function that stops it. */
export function startActionHaptics(): () => void {
  return subscribeMascotEvents(event => {
    const kind = hapticForEvent(event.type);
    if (kind && actionHapticsEnabled) playHaptic(kind);
  });
}

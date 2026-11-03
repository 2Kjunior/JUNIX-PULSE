/**
 * Plays the vibrations. It listens to what the use cases announce, so that every screen doing
 * the same action gives the same feedback. A phone without a vibrator simply stays silent.
 */

import * as Haptics from 'expo-haptics';

import { hapticForEvent, HapticKind } from '@/domain/rules/haptic-rules';
import { subscribeMascotEvents } from '@/services/mascot/mascot-event-bus';
import { logger } from '@/utils/logger';

export function playHaptic(kind: HapticKind): void {
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
    if (kind) playHaptic(kind);
  });
}

/**
 * NotificationSoundService
 *
 * Handles in-app (foreground) notification sound playback for Junix Pulse.
 *
 * Responsibilities:
 * - Play the MP3 signature sound when a notification arrives while the app is
 *   in the foreground (the system sound is disabled to avoid double playback).
 * - Respect the user's "notification sound" preference stored in SQLite.
 * - Enforce an anti-spam interval: only one play per NOTIFICATION_SOUND_MIN_INTERVAL_MS.
 * - Respect system silent / Do-Not-Disturb mode (expo-audio does this by default
 *   via `shouldDuckAndroid` / AudioSession category on iOS).
 * - Never throw — all failures are logged and silently swallowed.
 * - Release the audio player after playback to avoid memory leaks.
 * - Not play during the launch animation (checked via the app store flag).
 */

import { createAudioPlayer } from "expo-audio";
import { logger } from "@/utils/logger";
import { SettingsRepository } from "@/repositories/settings-repository";
import {
  NOTIFICATION_SOUND_MP3,
  NOTIFICATION_SOUND_VOLUME,
  NOTIFICATION_SOUND_MIN_INTERVAL_MS,
} from "./notification-sound-constants";

// ─── Internal state ──────────────────────────────────────────────────────────

/** Timestamp (ms) of the last successful in-app sound play. */
let _lastPlayedAt = 0;

/** Whether a play is already in progress (prevents concurrent plays). */
let _isPlaying = false;

// ─── Service ─────────────────────────────────────────────────────────────────

export const NotificationSoundService = {
  /**
   * Plays the notification sound in the foreground.
   *
   * @param splashVisible - Pass `true` while the launch animation is running
   *   to prevent overlap with the launch sound.
   */
  async play(splashVisible = false): Promise<void> {
    // Guard: do not play during the splash animation.
    if (splashVisible) {
      logger.info("[NotificationSoundService] Splash visible — skipping sound");
      return;
    }

    // Guard: anti-spam — skip if played less than MIN_INTERVAL ago.
    const now = Date.now();
    if (now - _lastPlayedAt < NOTIFICATION_SOUND_MIN_INTERVAL_MS) {
      logger.info("[NotificationSoundService] Anti-spam interval — skipping sound");
      return;
    }

    // Guard: skip if already playing.
    if (_isPlaying) {
      logger.info("[NotificationSoundService] Already playing — skipping");
      return;
    }

    // Guard: check user preference.
    try {
      const settings = await SettingsRepository.get();
      if (!settings.notificationSoundEnabled) {
        logger.info("[NotificationSoundService] Sound disabled in settings — skipping");
        return;
      }
    } catch {
      // If we cannot read settings, fail open (play the sound).
      logger.warn("[NotificationSoundService] Could not read settings, playing anyway");
    }

    // Play the sound.
    _isPlaying = true;
    let player: ReturnType<typeof createAudioPlayer> | null = null;

    try {
      player = createAudioPlayer(NOTIFICATION_SOUND_MP3);

      // Respect the system volume and do not interrupt other audio (duck only).
      // expo-audio respects silent mode on iOS by default (AudioSession).
      player.volume = NOTIFICATION_SOUND_VOLUME;

      await player.play();

      _lastPlayedAt = Date.now();
      logger.info("[NotificationSoundService] Sound played successfully");

      // Wait for the MP3 to finish before releasing the player.
      // The notification sound is ~1.5 s; we wait up to 3 s then release anyway.
      await _waitForPlayback(player, 3000);
    } catch (err) {
      logger.warn("[NotificationSoundService] Playback failed (silent)", err);
    } finally {
      _isPlaying = false;
      try {
        player?.remove();
      } catch {
        // Ignore cleanup errors.
      }
    }
  },

  /**
   * Resets the anti-spam timer. Useful in tests.
   * @internal
   */
  _resetLastPlayedAt(): void {
    _lastPlayedAt = 0;
  },

  /**
   * Exposes the last-played timestamp for testing.
   * @internal
   */
  _getLastPlayedAt(): number {
    return _lastPlayedAt;
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Waits until the player finishes or the timeout elapses, then resolves.
 * Uses polling because expo-audio's `AudioPlayer` exposes `.playing`
 * but does not have an `onPlaybackFinished` promise in SDK 58.
 */
function _waitForPlayback(
  player: ReturnType<typeof createAudioPlayer>,
  timeoutMs: number
): Promise<void> {
  return new Promise<void>((resolve) => {
    const startedAt = Date.now();

    const interval = setInterval(() => {
      // Resolve once playback stops or the timeout is exceeded.
      if (!player.playing || Date.now() - startedAt >= timeoutMs) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}


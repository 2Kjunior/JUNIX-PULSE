/**
 * Centralized constants for Junix Pulse notification sound.
 * All sound-related configuration lives here — no magic values elsewhere.
 */

/** MP3 used for in-app (foreground) playback via expo-audio. */
export const NOTIFICATION_SOUND_MP3 = require("../../../assets/sounds/junix-pulse-notification.mp3") as number;

/**
 * WAV filename declared in app.json expo-notifications plugin (iOS + Android).
 * The file must exist at assets/sounds/<NOTIFICATION_SOUND_WAV_FILENAME>.
 * iOS requires WAV/AIFF/CAF, duration < 30 s.
 */
export const NOTIFICATION_SOUND_WAV_FILENAME = "junix-pulse-notification.wav";

/**
 * Android notification channel ID that carries the custom sound.
 * A channel's sound can NEVER be changed after creation — always use a new ID.
 * The legacy "reminders" channel is preserved as-is.
 */
export const NOTIFICATION_CHANNEL_ID = "junix-pulse-reminders";

/** Human-readable label shown in Android system notification settings. */
export const NOTIFICATION_CHANNEL_NAME = "Rappels Junix Pulse";

/** Channel description (visible in Android settings). */
export const NOTIFICATION_CHANNEL_DESCRIPTION =
  "Notifications pour vos rappels avec le son signature Junix Pulse";

/** In-app playback volume (0.0 – 1.0). */
export const NOTIFICATION_SOUND_VOLUME = 0.8;

/**
 * Minimum milliseconds between two in-app sound plays.
 * Prevents audio spam when multiple notifications arrive close together.
 */
export const NOTIFICATION_SOUND_MIN_INTERVAL_MS = 2000;

/**
 * Maximum duration to wait for the audio player to initialise (ms).
 * After this delay, playback is silently skipped so the app never hangs.
 */
export const NOTIFICATION_SOUND_LOAD_TIMEOUT_MS = 3000;


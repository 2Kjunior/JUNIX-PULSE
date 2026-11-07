/**
 * When the app asks for the fingerprint again. Off by default; once on, at each launch, and
 * on a return after the delay the user picked (right away, or 1, 5 or 15 minutes away).
 */

export const APP_LOCK_DELAYS_MINUTES = [0, 1, 5, 15] as const;
export type AppLockDelayMinutes = (typeof APP_LOCK_DELAYS_MINUTES)[number];

export function isAppLockDelay(value: unknown): value is AppLockDelayMinutes {
  return APP_LOCK_DELAYS_MINUTES.includes(value as AppLockDelayMinutes);
}

/**
 * On a return to the app: locked again once the delay has passed since it went to the
 * background. A clock set back (negative time) locks too, as the splash rule does.
 */
export function shouldLockOnResume(
  enabled: boolean,
  backgroundAt: number | null,
  now: number,
  delayMinutes: number
): boolean {
  if (!enabled || backgroundAt === null) return false;
  const elapsed = now - backgroundAt;
  return elapsed < 0 || elapsed >= delayMinutes * 60 * 1000;
}

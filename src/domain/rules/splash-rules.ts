/**
 * When the launch animation plays again after the app comes back from the background.
 * A new process always plays it: React Native cannot tell a swipe from the recent apps from
 * Android stopping the app, and in both cases the navigation starts over anyway.
 */

export const SPLASH_REPLAY_AFTER_MS = 15 * 60 * 1000;

/**
 * True once the app stayed in the background for 15 minutes or more.
 * A clock set back since then counts as a long absence: better one animation too many than a
 * resume that pretends nothing happened.
 */
export function shouldReplaySplashOnResume(backgroundAt: number | null, now: number): boolean {
  if (backgroundAt === null) return false;
  const elapsed = now - backgroundAt;
  return elapsed < 0 || elapsed >= SPLASH_REPLAY_AFTER_MS;
}

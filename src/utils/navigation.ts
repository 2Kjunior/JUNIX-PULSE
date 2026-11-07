/**
 * Leaving a screen that may have been opened directly, by the home screen widget or a
 * notification: with nothing behind it, "back" would do nothing, so it goes home instead.
 */

import { router, type Href } from 'expo-router';

export function closeScreen(fallback: Href = '/(tabs)'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

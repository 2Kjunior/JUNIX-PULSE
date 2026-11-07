/**
 * The lock of the whole app: the fingerprint (or the code of the phone) at launch and on a
 * return after the chosen delay. The data itself is already encrypted on the phone; the lock
 * keeps someone holding the unlocked phone from reading it.
 *
 * Never a dead end: a phone with no fingerprint and no code at all cannot lock the app, and
 * when its security is removed later, the lock lets the user in.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';

import { shouldLockOnResume } from '@/domain/rules/app-lock-rules';
import { t } from '@/i18n';
import { logger } from '@/utils/logger';

let config = { enabled: false, delayMinutes: 0 };
let backgroundAt: number | null = null;
// A system window the app opened itself (file picker, share sheet...) is not leaving the app
let returnExpected = false;

/** The user's choice, read at launch and changed in the settings. */
export function setAppLockConfig(next: { enabled: boolean; delayMinutes: number }): void {
  config = next;
  // The app goes blank in the recent apps screen, and screenshots are refused, while it is locked
  const protect = next.enabled
    ? ScreenCapture.preventScreenCaptureAsync('app-lock')
    : ScreenCapture.allowScreenCaptureAsync('app-lock');
  protect.catch(() => {});
}

export function isAppLockEnabled(): boolean {
  return config.enabled;
}

/** The app went to the background: the first moment counts, as for the splash. */
export function recordAppLockBackground(now = Date.now()): void {
  if (backgroundAt === null) backgroundAt = now;
}

/**
 * Called right before the app opens a system window and waits for its answer (file picker,
 * folder choice, share sheet, system settings): coming back from it does not lock the app.
 */
export function expectAppLockReturn(): void {
  returnExpected = true;
}

/** Back in front: whether to ask again, then forget the background moment. */
export function consumeAppLockResume(now = Date.now()): boolean {
  const lock = !returnExpected && shouldLockOnResume(config.enabled, backgroundAt, now, config.delayMinutes);
  backgroundAt = null;
  returnExpected = false;
  return lock;
}

/** Whether the phone can lock the app: a fingerprint, a face or at least a code. */
export async function canUseAppLock(): Promise<boolean> {
  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export type UnlockResult = 'unlocked' | 'cancelled';

/** Asks the fingerprint, or the code of the phone. */
export async function authenticateAppUnlock(): Promise<UnlockResult> {
  // No security left on the phone: nothing to check against, the user gets in
  if (!(await canUseAppLock())) return 'unlocked';
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('appLock.prompt'),
      cancelLabel: t('common.cancel'),
      disableDeviceFallback: false,
    });
    return result.success ? 'unlocked' : 'cancelled';
  } catch (error) {
    logger.warn('[AppLock] Authentification impossible', error);
    return 'cancelled';
  }
}

/** For the tests. */
export function _resetAppLockForTesting(): void {
  config = { enabled: false, delayMinutes: 0 };
  backgroundAt = null;
  returnExpected = false;
}

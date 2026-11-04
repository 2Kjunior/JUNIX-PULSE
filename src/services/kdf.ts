/**
 * scrypt key derivation for the PIN and the backups.
 * The native implementation (react-native-quick-crypto) runs in C++ off the JavaScript thread:
 * the JavaScript one takes tens of seconds on a phone. Both follow RFC 7914, so a key made by
 * one is the same as by the other: switching never makes a note or a backup unreadable.
 * The JavaScript one stays as a fallback: tests, web, or an app installed before this module.
 */

import { scryptAsync } from '@noble/hashes/scrypt.js';

import { logger } from '@/utils/logger';

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
  dkLen: number;
}

interface NativeScryptOptions {
  N: number;
  r: number;
  p: number;
  maxmem: number;
}

type NativeScrypt = (
  password: Uint8Array,
  salt: Uint8Array,
  keylen: number,
  options: NativeScryptOptions,
  callback: (error: Error | null, key?: Uint8Array) => void
) => void;

// undefined: not looked up yet; null: unavailable in this app
let nativeScrypt: NativeScrypt | null | undefined;

function loadNativeScrypt(): NativeScrypt | null {
  if (nativeScrypt !== undefined) return nativeScrypt;
  try {
    // Loaded on demand: requiring it fails where the native module is absent
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const candidate: unknown = require('react-native-quick-crypto').scrypt;
    nativeScrypt = typeof candidate === 'function' ? (candidate as NativeScrypt) : null;
  } catch {
    nativeScrypt = null;
  }
  return nativeScrypt;
}

function deriveNatively(scrypt: NativeScrypt, password: Uint8Array, salt: Uint8Array, params: ScryptParams) {
  return new Promise<Uint8Array>((resolve, reject) => {
    scrypt(
      password,
      salt,
      params.dkLen,
      // The working memory is 128 * r * N bytes: leave room above the default limit of 32 MB
      { N: params.N, r: params.r, p: params.p, maxmem: 256 * params.r * params.N },
      (error, key) => {
        if (error || !key) reject(error ?? new Error('Native scrypt returned no key'));
        else resolve(Uint8Array.from(key));
      }
    );
  });
}

export async function deriveScryptKey(
  password: Uint8Array,
  salt: Uint8Array,
  params: ScryptParams
): Promise<Uint8Array> {
  const scrypt = loadNativeScrypt();
  if (scrypt) {
    try {
      return await deriveNatively(scrypt, password, salt, params);
    } catch (error) {
      // A module present but not working must not block the PIN or a backup
      logger.warn('[Kdf] scrypt natif indisponible, repli sur JavaScript', error);
      nativeScrypt = null;
    }
  }
  return scryptAsync(password, salt, params);
}

/** For the tests: forget which implementation was found. */
export function _resetKdfForTesting(): void {
  nativeScrypt = undefined;
}

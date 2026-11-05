import * as SecureStore from 'expo-secure-store';

import { SanctumAuthService } from '../services/sanctum-auth-service';
import { bytesToHex, deriveSanctumKey, encryptSanctumNote, SANCTUM_CRYPTO_CONSTANTS } from '../services/sanctum-crypto';

jest.mock('../database/sqlite', () => ({
  getDatabase: jest.fn(async () => ({
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async () => undefined),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => callback()),
  })),
}));

const KEY = new Uint8Array(32).fill(7);
const store = SecureStore as unknown as {
  __resetMockStorage: () => void;
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  canUseBiometricAuthentication: jest.Mock;
};

describe('Sanctuary biometric unlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.__resetMockStorage();
    store.canUseBiometricAuthentication.mockReturnValue(true);
  });

  it('stores the key so that only a system authentication can read it', async () => {
    expect(await SanctumAuthService.enableBiometricUnlock(KEY)).toBe(true);

    const keyWrite = store.setItemAsync.mock.calls.find(([name]) => name === 'jp_sanctum_biometric_key_v2');
    expect(keyWrite?.[2]).toMatchObject({ requireAuthentication: true });
    expect(await SanctumAuthService.isBiometricUnlockEnabled()).toBe(true);
  });

  it('returns the key, reading it with the authentication requirement', async () => {
    await SanctumAuthService.enableBiometricUnlock(KEY);

    expect(await SanctumAuthService.unlockWithBiometrics()).toEqual({ status: 'unlocked', key: KEY });
    expect(store.getItemAsync).toHaveBeenLastCalledWith(
      'jp_sanctum_biometric_key_v2',
      expect.objectContaining({ requireAuthentication: true })
    );
  });

  it('keeps the setting when the user cancels the prompt', async () => {
    await SanctumAuthService.enableBiometricUnlock(KEY);
    store.getItemAsync.mockRejectedValueOnce(new Error('canceled'));

    expect(await SanctumAuthService.unlockWithBiometrics()).toEqual({ status: 'cancelled' });
    expect(await SanctumAuthService.isBiometricUnlockEnabled()).toBe(true);
  });

  it('falls back to the PIN once the enrolled biometrics changed', async () => {
    await SanctumAuthService.enableBiometricUnlock(KEY);
    store.getItemAsync.mockResolvedValueOnce(null);

    expect(await SanctumAuthService.unlockWithBiometrics()).toEqual({ status: 'unavailable' });
    expect(await SanctumAuthService.isBiometricUnlockEnabled()).toBe(false);
  });

  it('reports a refused activation', async () => {
    store.setItemAsync.mockRejectedValueOnce(new Error('canceled'));

    expect(await SanctumAuthService.enableBiometricUnlock(KEY)).toBe(false);
    expect(await SanctumAuthService.isBiometricUnlockEnabled()).toBe(false);
  });

  it('offers it only on a compatible device, until the user declines', async () => {
    expect(await SanctumAuthService.shouldOfferBiometricUnlock()).toBe(true);

    await SanctumAuthService.declineBiometricUnlock();
    expect(await SanctumAuthService.shouldOfferBiometricUnlock()).toBe(false);

    store.__resetMockStorage();
    store.canUseBiometricAuthentication.mockReturnValue(false);
    expect(await SanctumAuthService.shouldOfferBiometricUnlock()).toBe(false);
  });

  it('removes the unprotected key of older versions after a correct PIN', async () => {
    await SanctumAuthService.setupPin('123456');
    await store.setItemAsync('jp_sanctum_biometric_key_v1', 'old-key');

    await SanctumAuthService.verifyAndUnlockWithPin('123456');

    expect(await SecureStore.getItemAsync('jp_sanctum_biometric_key_v1')).toBeNull();
  });

  it.each([
    SANCTUM_CRYPTO_CONSTANTS.LEGACY_SCRYPT_N,
    SANCTUM_CRYPTO_CONSTANTS.FAST_SCRYPT_N,
  ])('still opens a key made with N=%i', async n => {
    const salt = new Uint8Array(16).fill(4);
    const key = await deriveSanctumKey('123456', salt, n);
    await store.setItemAsync('jp_sanctum_salt_v1', bytesToHex(salt));
    await store.setItemAsync('jp_sanctum_kdf_n_v1', String(n));
    await store.setItemAsync(
      'jp_sanctum_verifier_v1',
      await encryptSanctumNote('__SANCTUM_PIN_VERIFIER_TOKEN__', key)
    );

    const unlock = await SanctumAuthService.verifyAndUnlockWithPin('123456');

    expect(unlock.key).toEqual(key);
  });

  it('gives a new PIN the strongest key, now derived natively', async () => {
    await SanctumAuthService.setupPin('123456');

    expect(SANCTUM_CRYPTO_CONSTANTS.SCRYPT_PARAMS.N).toBe(32768);
    expect(await SecureStore.getItemAsync('jp_sanctum_kdf_n_v1')).toBe('32768');
  });

  it('unlocks a key with the old parameters without rewriting anything, until the PIN changes', async () => {
    const salt = new Uint8Array(16).fill(3);
    const oldKey = await deriveSanctumKey('123456', salt, SANCTUM_CRYPTO_CONSTANTS.LEGACY_SCRYPT_N);
    await store.setItemAsync('jp_sanctum_salt_v1', bytesToHex(salt));
    await store.setItemAsync(
      'jp_sanctum_verifier_v1',
      await encryptSanctumNote('__SANCTUM_PIN_VERIFIER_TOKEN__', oldKey)
    );

    const unlocks = await Promise.all([
      SanctumAuthService.verifyAndUnlockWithPin('123456'),
      SanctumAuthService.verifyAndUnlockWithPin('123456'),
    ]);
    expect(unlocks.map(unlock => unlock.key)).toEqual([oldKey, oldKey]);
    expect(await SecureStore.getItemAsync('jp_sanctum_salt_v1')).toBe(bytesToHex(salt));
    expect(await SecureStore.getItemAsync('jp_sanctum_kdf_n_v1')).toBeNull();

    const changed = await SanctumAuthService.changePin('123456', '654321');
    expect(changed.success).toBe(true);
    expect(await SecureStore.getItemAsync('jp_sanctum_kdf_n_v1')).toBe(
      String(SANCTUM_CRYPTO_CONSTANTS.SCRYPT_PARAMS.N)
    );
  });
});

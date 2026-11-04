import { scryptAsync } from '@noble/hashes/scrypt.js';

// Node's own scrypt, loaded at run time: the project has no Node type definitions
const { scrypt: nodeScrypt } = jest.requireActual('crypto') as {
  scrypt: (...args: unknown[]) => void;
};

const PARAMS = { N: 1024, r: 8, p: 1, dkLen: 32 };
const password = new TextEncoder().encode('123456');
const salt = new Uint8Array(16).fill(9);

const mockNative = jest.fn();
jest.mock('react-native-quick-crypto', () => ({ scrypt: (...args: unknown[]) => mockNative(...args) }));

// Imported after the mock, so that it finds the "native" implementation
// eslint-disable-next-line import/first
import { _resetKdfForTesting, deriveScryptKey } from '../kdf';

describe('deriveScryptKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetKdfForTesting();
  });

  it('uses the native implementation, which gives the same key as the JavaScript one', async () => {
    // Node's own scrypt stands for the native module: both follow RFC 7914
    mockNative.mockImplementation((pass, s, keylen, options, callback) =>
      nodeScrypt(pass, s, keylen, options, callback)
    );

    const key = await deriveScryptKey(password, salt, PARAMS);

    expect(mockNative).toHaveBeenCalledTimes(1);
    expect(key).toEqual(await scryptAsync(password, salt, PARAMS));
  });

  it('gives the native module enough memory for the strongest cost', async () => {
    mockNative.mockImplementation((_pass, _salt, keylen, _options, callback) => callback(null, new Uint8Array(keylen)));

    await deriveScryptKey(password, salt, { N: 32768, r: 8, p: 1, dkLen: 32 });

    expect(mockNative.mock.calls[0][3].maxmem).toBeGreaterThan(128 * 8 * 32768);
  });

  it('falls back to JavaScript when the native module fails, and stays on it', async () => {
    mockNative.mockImplementation(() => {
      throw new Error('Nitro module not linked');
    });

    const first = await deriveScryptKey(password, salt, PARAMS);
    await deriveScryptKey(password, salt, PARAMS);

    expect(first).toEqual(await scryptAsync(password, salt, PARAMS));
    expect(mockNative).toHaveBeenCalledTimes(1);
  });
});

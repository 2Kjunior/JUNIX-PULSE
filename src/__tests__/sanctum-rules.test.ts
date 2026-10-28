import {
  validateSanctumPin,
  validateNewSanctumPin,
  getSanctumLockoutDurationMs,
  registerSanctumFailedAttempt,
  getSanctumLockoutStatus,
  INITIAL_SANCTUM_LOCKOUT,
  filterSanctumNotes,
  formatSanctumSnippet,
  extractUniqueFolders,
  SanctumNoteItem,
} from '../domain/rules/sanctum-rules';

describe('Sanctum Rules — Validation des codes PIN (V-02)', () => {
  it('accepte un PIN de 4 chiffres pour le déverrouillage rétrocompatible', () => {
    expect(validateSanctumPin('1234').valid).toBe(true);
    expect(validateSanctumPin('123456').valid).toBe(true);
    expect(validateSanctumPin('12345678').valid).toBe(true);
  });

  it('rejette un PIN invalide pour le déverrouillage', () => {
    expect(validateSanctumPin('').valid).toBe(false);
    expect(validateSanctumPin('123').valid).toBe(false);
    expect(validateSanctumPin('123456789').valid).toBe(false);
    expect(validateSanctumPin('abcd').valid).toBe(false);
  });

  it('exige au minimum 6 chiffres pour les nouveaux PINs (V-02)', () => {
    expect(validateNewSanctumPin('1234').valid).toBe(false);
    expect(validateNewSanctumPin('12345').valid).toBe(false);
    expect(validateNewSanctumPin('123456').valid).toBe(true);
    expect(validateNewSanctumPin('12345678').valid).toBe(true);
    expect(validateNewSanctumPin('123456789').valid).toBe(false);
  });
});

describe('Sanctum Rules — Paliers de Lockout exponentiel (V-03)', () => {
  it('ne pénalise pas pour moins de 3 échecs consécutifs', () => {
    expect(getSanctumLockoutDurationMs(0)).toBe(0);
    expect(getSanctumLockoutDurationMs(1)).toBe(0);
    expect(getSanctumLockoutDurationMs(2)).toBe(0);
  });

  it('applique 30 secondes pour 3 et 4 échecs', () => {
    expect(getSanctumLockoutDurationMs(3)).toBe(30_000);
    expect(getSanctumLockoutDurationMs(4)).toBe(30_000);
  });

  it('applique 2 minutes (120 s) pour 5 à 7 échecs', () => {
    expect(getSanctumLockoutDurationMs(5)).toBe(120_000);
    expect(getSanctumLockoutDurationMs(7)).toBe(120_000);
  });

  it('applique 15 minutes (900 s) à partir de 8 échecs', () => {
    expect(getSanctumLockoutDurationMs(8)).toBe(900_000);
    expect(getSanctumLockoutDurationMs(15)).toBe(900_000);
  });

  it('calcule correctement la transition d’état lors d’un échec', () => {
    const t0 = 1_000_000;
    // 1er échec
    const s1 = registerSanctumFailedAttempt(INITIAL_SANCTUM_LOCKOUT, t0);
    expect(s1.failedAttempts).toBe(1);
    expect(s1.lockedUntil).toBeNull();
    expect(getSanctumLockoutStatus(s1, t0).isLocked).toBe(false);

    // 2e échec
    const s2 = registerSanctumFailedAttempt(s1, t0);
    expect(s2.failedAttempts).toBe(2);
    expect(s2.lockedUntil).toBeNull();

    // 3e échec -> blocage 30s
    const s3 = registerSanctumFailedAttempt(s2, t0);
    expect(s3.failedAttempts).toBe(3);
    expect(s3.lockedUntil).toBe(t0 + 30_000);

    const statusA = getSanctumLockoutStatus(s3, t0);
    expect(statusA.isLocked).toBe(true);
    expect(statusA.remainingSeconds).toBe(30);

    // 10 secondes plus tard
    const statusB = getSanctumLockoutStatus(s3, t0 + 10_000);
    expect(statusB.isLocked).toBe(true);
    expect(statusB.remainingSeconds).toBe(20);

    // Après expiration (31 secondes plus tard)
    const statusC = getSanctumLockoutStatus(s3, t0 + 31_000);
    expect(statusC.isLocked).toBe(false);
    expect(statusC.remainingSeconds).toBe(0);
  });
});

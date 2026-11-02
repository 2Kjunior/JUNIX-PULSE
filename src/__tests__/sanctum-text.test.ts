import { translate } from '@/i18n/translate';
import { sanctumFolderLabel, translateSanctumError } from '@/i18n/sanctum-text';
import { validateNewSanctumPin, validateSanctumNoteInput, validateSanctumPin } from '@/domain/rules/sanctum-rules';

const french = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
  translate('fr', key, params);
const english = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
  translate('en', key, params);

describe('translateSanctumError', () => {
  it('keeps the French message in French', () => {
    const error = validateSanctumPin('').error ?? '';
    expect(translateSanctumError(error, french)).toBe(error);
  });

  it('translates the messages of the PIN and note rules', () => {
    expect(translateSanctumError(validateSanctumPin('').error ?? '', english)).toBe('The PIN code cannot be empty');
    expect(translateSanctumError(validateSanctumPin('12ab').error ?? '', english)).toBe(
      'The PIN code must contain digits only'
    );
    expect(translateSanctumError(validateSanctumPin('123456789').error ?? '', english)).toBe(
      'The PIN code cannot be longer than 8 digits'
    );
    expect(translateSanctumError(validateNewSanctumPin('1234').error ?? '', english)).toMatch(
      /^The PIN code must contain at least \d+ digits$/
    );
    expect(translateSanctumError(validateSanctumNoteInput('', '').error ?? '', english)).toBe(
      'The notebook cannot be completely empty'
    );
  });

  it('translates the messages of the authentication service with their number', () => {
    expect(translateSanctumError('Coffre-fort verrouillé. Réessayez dans 30s.', english)).toBe(
      'Vault locked. Try again in 30s.'
    );
    expect(translateSanctumError('Code PIN incorrect. Verrouillé pendant 60s.', english)).toBe(
      'Incorrect PIN code. Locked for 60s.'
    );
    expect(translateSanctumError('Code PIN incorrect', english)).toBe('Incorrect PIN code');
  });

  it('lets an unknown message through unchanged', () => {
    expect(translateSanctumError('Something else', english)).toBe('Something else');
  });
});

describe('sanctumFolderLabel', () => {
  it('translates the default folders', () => {
    expect(sanctumFolderLabel('Tous', english)).toBe('All');
    expect(sanctumFolderLabel('Idées', english)).toBe('Ideas');
    expect(sanctumFolderLabel('Général', french)).toBe('Général');
  });

  it('keeps the name of a folder the user created', () => {
    expect(sanctumFolderLabel('Voyages', english)).toBe('Voyages');
  });
});

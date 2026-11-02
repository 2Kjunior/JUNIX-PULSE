/**
 * Texts of the Sanctuary that are not written by the screen itself.
 *
 * The PIN rules and the authentication service return their messages in French, and the folders
 * are stored under their French name. The screen shows them through these helpers, which map the
 * known ones to the translation tables and let anything unknown through unchanged.
 */

import type { MessageKey } from './messages';
import type { TFunction } from './index';

const FIXED_ERRORS: Record<string, MessageKey> = {
  'Le code PIN ne peut pas être vide': 'sanctumError.empty',
  'Le code PIN doit comporter uniquement des chiffres': 'sanctumError.digits',
  'Le code PIN ne peut pas dépasser 8 chiffres': 'sanctumError.tooLong',
  'Le carnet ne peut pas être entièrement vide': 'sanctumError.emptyNote',
  'Code PIN incorrect': 'sanctumError.wrongPin',
  'Aucun code PIN configuré pour le Sanctuaire': 'sanctumError.noPin',
  'Ancien code PIN incorrect': 'sanctumError.wrongOldPin',
  'Échec lors du changement de code PIN': 'sanctumError.changeFailed',
};

const MIN_LENGTH = /^Le code PIN doit contenir au moins (\d+) chiffres$/;
const LOCKED = /^Coffre-fort verrouillé\. Réessayez dans (\d+)s\.$/;
const WRONG_LOCKED = /^Code PIN incorrect\. Verrouillé pendant (\d+)s\.$/;

export function translateSanctumError(error: string, t: TFunction): string {
  const fixed = FIXED_ERRORS[error];
  if (fixed) return t(fixed);

  const min = MIN_LENGTH.exec(error);
  if (min) return t('sanctumError.minLength', { count: min[1] });

  const locked = LOCKED.exec(error);
  if (locked) return t('sanctum.lockedRetry', { seconds: locked[1] });

  const wrongLocked = WRONG_LOCKED.exec(error);
  if (wrongLocked) return t('sanctumError.wrongLocked', { seconds: wrongLocked[1] });

  return error;
}

const FOLDERS: Record<string, MessageKey> = {
  Tous: 'sanctumFolder.all',
  Général: 'sanctumFolder.general',
  Personnel: 'sanctumFolder.personal',
  Idées: 'sanctumFolder.ideas',
  Coffre: 'sanctumFolder.vault',
  Projets: 'sanctumFolder.projects',
};

/** The name of a folder as shown; custom folders keep the name they were given. */
export function sanctumFolderLabel(folder: string, t: TFunction): string {
  const key = FOLDERS[folder];
  return key ? t(key) : folder;
}

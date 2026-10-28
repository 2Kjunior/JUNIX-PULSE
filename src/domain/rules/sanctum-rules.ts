/**
 * Règles métier pures pour le coffre-fort Sanctum (Sanctuaire).
 * Couvre la validation des codes PIN, le filtrage des carnets, l'extraction de dossiers et l'affichage.
 */

export interface SanctumNoteItem {
  id: string;
  title: string;
  content: string;
  folder: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SANCTUM_FOLDERS = [
  'Général',
  'Personnel',
  'Idées',
  'Coffre',
  'Projets',
] as const;

/**
 * Valide la saisie d'un code PIN existant pour le déverrouillage du Sanctuaire.
 * Accepte de 4 à 8 chiffres pour assurer la rétrocompatibilité des anciens PINs.
 */
export function validateSanctumPin(pin: string, minLength: number = 4): { valid: boolean; error?: string } {
  const trimmed = pin.trim();
  if (!trimmed) {
    return { valid: false, error: 'Le code PIN ne peut pas être vide' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Le code PIN doit comporter uniquement des chiffres' };
  }
  if (trimmed.length < minLength) {
    return { valid: false, error: `Le code PIN doit contenir au moins ${minLength} chiffres` };
  }
  if (trimmed.length > 8) {
    return { valid: false, error: 'Le code PIN ne peut pas dépasser 8 chiffres' };
  }
  return { valid: true };
}

/**
 * Valide la création ou modification d'un code PIN (V-02 : 6 à 8 chiffres recommandés).
 * Un PIN de 6 chiffres offre 1 000 000 de combinaisons (contre 10 000 pour 4 chiffres).
 */
export function validateNewSanctumPin(pin: string): { valid: boolean; error?: string } {
  return validateSanctumPin(pin, 6);
}

// ─── Règles de limitation des tentatives & Lockout (V-03) ───────────────────

export interface SanctumLockoutState {
  failedAttempts: number;
  lockedUntil: number | null; // Timestamp en millisecondes ou null si non verrouillé
}

export const INITIAL_SANCTUM_LOCKOUT: SanctumLockoutState = {
  failedAttempts: 0,
  lockedUntil: null,
};

/**
 * Calcule la durée de pénalité en millisecondes selon le nombre d'échecs consécutifs.
 * - Moins de 3 échecs : aucune pénalité (tolérance erreur de frappe).
 * - 3 à 4 échecs : 30 secondes.
 * - 5 à 7 échecs : 120 secondes (2 minutes).
 * - 8 échecs et plus : 900 secondes (15 minutes).
 */
export function getSanctumLockoutDurationMs(failedAttempts: number): number {
  if (failedAttempts < 3) return 0;
  if (failedAttempts < 5) return 30 * 1000;
  if (failedAttempts < 8) return 120 * 1000;
  return 900 * 1000;
}

/**
 * Calcule le nouvel état de verrouillage suite à une tentative infructueuse.
 */
export function registerSanctumFailedAttempt(
  currentState: SanctumLockoutState,
  nowMs: number = Date.now()
): SanctumLockoutState {
  const nextAttempts = currentState.failedAttempts + 1;
  const penaltyDurationMs = getSanctumLockoutDurationMs(nextAttempts);

  return {
    failedAttempts: nextAttempts,
    lockedUntil: penaltyDurationMs > 0 ? nowMs + penaltyDurationMs : null,
  };
}

/**
 * Détermine si le coffre est actuellement verrouillé et renvoie les secondes restantes.
 */
export function getSanctumLockoutStatus(
  state: SanctumLockoutState,
  nowMs: number = Date.now()
): { isLocked: boolean; remainingSeconds: number } {
  if (!state.lockedUntil || nowMs >= state.lockedUntil) {
    return { isLocked: false, remainingSeconds: 0 };
  }
  const remainingMs = state.lockedUntil - nowMs;
  return {
    isLocked: true,
    remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
  };
}


/**
 * Formate un extrait d'une note secrète pour l'aperçu dans la liste.
 * Nettoie les retours à la ligne consécutifs et tronque avec élégance.
 */
export function formatSanctumSnippet(content: string, maxLength: number = 90): string {
  if (!content) return '';
  const singleLine = content.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength).trim()}...`;
}

/**
 * Filtre et trie les notes secrètes par dossier et recherche textuelle.
 * Le tri est toujours antéchronologique (dernière modification en premier).
 */
export function filterSanctumNotes(
  notes: SanctumNoteItem[],
  query: string = '',
  folder: string = 'Tous'
): SanctumNoteItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return [...notes]
    .filter((note) => {
      // Filtre dossier
      if (folder !== 'Tous' && note.folder.toLowerCase() !== folder.toLowerCase()) {
        return false;
      }
      // Filtre recherche
      if (normalizedQuery) {
        const matchesTitle = note.title.toLowerCase().includes(normalizedQuery);
        const matchesContent = note.content.toLowerCase().includes(normalizedQuery);
        const matchesFolder = note.folder.toLowerCase().includes(normalizedQuery);
        return matchesTitle || matchesContent || matchesFolder;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.updated_at).getTime() || 0;
      const timeB = new Date(b.updated_at).getTime() || 0;
      return timeB - timeA;
    });
}

/**
 * Extrait la liste ordonnée des dossiers disponibles, sans doublons.
 */
export function extractUniqueFolders(
  notes: SanctumNoteItem[],
  baseFolders: readonly string[] = DEFAULT_SANCTUM_FOLDERS
): string[] {
  const foldersSet = new Set<string>(baseFolders);
  for (const note of notes) {
    if (note.folder && note.folder.trim()) {
      foldersSet.add(note.folder.trim());
    }
  }
  return ['Tous', ...Array.from(foldersSet)];
}

/**
 * Valide les champs requis pour la création ou mise à jour d'un carnet secret.
 */
export function validateSanctumNoteInput(
  title: string,
  content: string
): { valid: boolean; error?: string } {
  if (!title.trim() && !content.trim()) {
    return { valid: false, error: 'Le carnet ne peut pas être entièrement vide' };
  }
  return { valid: true };
}

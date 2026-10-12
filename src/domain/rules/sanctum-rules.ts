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
 * Valide la saisie d'un code PIN pour le Sanctuaire.
 * Doit être composé de 4 à 8 chiffres numériques.
 */
export function validateSanctumPin(pin: string): { valid: boolean; error?: string } {
  const trimmed = pin.trim();
  if (!trimmed) {
    return { valid: false, error: 'Le code PIN ne peut pas être vide' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Le code PIN doit comporter uniquement des chiffres' };
  }
  if (trimmed.length < 4) {
    return { valid: false, error: 'Le code PIN doit contenir au moins 4 chiffres' };
  }
  if (trimmed.length > 8) {
    return { valid: false, error: 'Le code PIN ne peut pas dépasser 8 chiffres' };
  }
  return { valid: true };
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

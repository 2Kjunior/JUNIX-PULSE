/**
 * Tests unitaires des règles métier du Sanctuaire (Sanctum).
 * Couvre : validation PIN, snippet, filtrage/tri des notes, extraction de dossiers,
 * et validation d'entrée de carnet.
 */

import {
  validateSanctumPin,
  formatSanctumSnippet,
  filterSanctumNotes,
  extractUniqueFolders,
  validateSanctumNoteInput,
  DEFAULT_SANCTUM_FOLDERS,
  type SanctumNoteItem,
} from '../sanctum-rules';

// ────────────────────────────────────────────────────────────────────────────
// validateSanctumPin
// ────────────────────────────────────────────────────────────────────────────
describe('validateSanctumPin', () => {
  it('rejette un PIN vide', () => {
    expect(validateSanctumPin('')).toEqual({
      valid: false,
      error: 'Le code PIN ne peut pas être vide',
    });
  });

  it('rejette un PIN uniquement composé d\'espaces', () => {
    expect(validateSanctumPin('   ')).toEqual({
      valid: false,
      error: 'Le code PIN ne peut pas être vide',
    });
  });

  it('rejette un PIN contenant des lettres', () => {
    expect(validateSanctumPin('12ab')).toEqual({
      valid: false,
      error: 'Le code PIN doit comporter uniquement des chiffres',
    });
  });

  it('rejette un PIN contenant des caractères spéciaux', () => {
    expect(validateSanctumPin('12-34')).toEqual({
      valid: false,
      error: 'Le code PIN doit comporter uniquement des chiffres',
    });
  });

  it('rejette un PIN de moins de 4 chiffres', () => {
    expect(validateSanctumPin('123')).toEqual({
      valid: false,
      error: 'Le code PIN doit contenir au moins 4 chiffres',
    });
  });

  it('rejette un PIN de plus de 8 chiffres', () => {
    expect(validateSanctumPin('123456789')).toEqual({
      valid: false,
      error: 'Le code PIN ne peut pas dépasser 8 chiffres',
    });
  });

  it('accepte un PIN de 4 chiffres', () => {
    expect(validateSanctumPin('1234')).toEqual({ valid: true });
  });

  it('accepte un PIN de 6 chiffres', () => {
    expect(validateSanctumPin('987654')).toEqual({ valid: true });
  });

  it('accepte un PIN de 8 chiffres', () => {
    expect(validateSanctumPin('12345678')).toEqual({ valid: true });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatSanctumSnippet
// ────────────────────────────────────────────────────────────────────────────
describe('formatSanctumSnippet', () => {
  it('retourne une chaîne vide pour un contenu vide', () => {
    expect(formatSanctumSnippet('')).toBe('');
  });

  it('retourne le contenu intact si inférieur à maxLength', () => {
    expect(formatSanctumSnippet('Bonjour le monde')).toBe('Bonjour le monde');
  });

  it('tronque le contenu avec des points de suspension', () => {
    const long = 'A'.repeat(120);
    const result = formatSanctumSnippet(long, 90);
    expect(result.length).toBeLessThanOrEqual(93); // 90 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('remplace les sauts de ligne multiples par un espace', () => {
    expect(formatSanctumSnippet('Ligne 1\n\n\nLigne 2')).toBe('Ligne 1 Ligne 2');
  });

  it('respecte le maxLength personnalisé', () => {
    const result = formatSanctumSnippet('ABCDEFGHIJ', 5);
    expect(result).toBe('ABCDE...');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// filterSanctumNotes
// ────────────────────────────────────────────────────────────────────────────
describe('filterSanctumNotes', () => {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

  const mockNotes: SanctumNoteItem[] = [
    { id: '1', title: 'Code bancaire', content: 'Mon code est 1234', folder: 'Coffre', created_at: twoDaysAgo, updated_at: now },
    { id: '2', title: 'Idée startup', content: 'Créer une app de jardinage', folder: 'Idées', created_at: twoDaysAgo, updated_at: yesterday },
    { id: '3', title: 'Journal perso', content: 'Bonne journée au parc', folder: 'Personnel', created_at: twoDaysAgo, updated_at: twoDaysAgo },
  ];

  it('retourne toutes les notes sans filtres', () => {
    const result = filterSanctumNotes(mockNotes);
    expect(result).toHaveLength(3);
  });

  it('filtre par dossier', () => {
    const result = filterSanctumNotes(mockNotes, '', 'Coffre');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filtre par recherche textuelle dans le titre', () => {
    const result = filterSanctumNotes(mockNotes, 'bancaire');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filtre par recherche textuelle dans le contenu', () => {
    const result = filterSanctumNotes(mockNotes, 'jardinage');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filtre par recherche dans le nom du dossier', () => {
    const result = filterSanctumNotes(mockNotes, 'personnel');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('combine filtre dossier et recherche', () => {
    const result = filterSanctumNotes(mockNotes, 'code', 'Coffre');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('retourne un tableau vide si aucun résultat', () => {
    const result = filterSanctumNotes(mockNotes, 'xyz inexistant');
    expect(result).toHaveLength(0);
  });

  it('trie par date de mise à jour décroissante', () => {
    const result = filterSanctumNotes(mockNotes);
    expect(result[0].id).toBe('1'); // now
    expect(result[1].id).toBe('2'); // yesterday
    expect(result[2].id).toBe('3'); // twoDaysAgo
  });

  it('est insensible à la casse pour la recherche', () => {
    const result = filterSanctumNotes(mockNotes, 'CODE');
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('ignore les espaces avant/après la recherche', () => {
    const result = filterSanctumNotes(mockNotes, '  bancaire  ');
    expect(result).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// extractUniqueFolders
// ────────────────────────────────────────────────────────────────────────────
describe('extractUniqueFolders', () => {
  it('retourne les dossiers de base précédés de Tous', () => {
    const result = extractUniqueFolders([]);
    expect(result[0]).toBe('Tous');
    expect(result.length).toBe(DEFAULT_SANCTUM_FOLDERS.length + 1);
  });

  it('ajoute les dossiers personnalisés sans doublons', () => {
    const notes: SanctumNoteItem[] = [
      { id: '1', title: '', content: '', folder: 'Voyages', created_at: '', updated_at: '' },
      { id: '2', title: '', content: '', folder: 'Général', created_at: '', updated_at: '' },
    ];
    const result = extractUniqueFolders(notes);
    expect(result).toContain('Voyages');
    // Pas de doublon pour 'Général'
    expect(result.filter((f) => f === 'Général')).toHaveLength(1);
  });

  it('ignore les dossiers vides ou composés uniquement d\'espaces', () => {
    const notes: SanctumNoteItem[] = [
      { id: '1', title: '', content: '', folder: '', created_at: '', updated_at: '' },
      { id: '2', title: '', content: '', folder: '   ', created_at: '', updated_at: '' },
    ];
    const result = extractUniqueFolders(notes);
    // Seuls les dossiers de base + 'Tous'
    expect(result.length).toBe(DEFAULT_SANCTUM_FOLDERS.length + 1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// validateSanctumNoteInput
// ────────────────────────────────────────────────────────────────────────────
describe('validateSanctumNoteInput', () => {
  it('rejette un carnet totalement vide', () => {
    expect(validateSanctumNoteInput('', '')).toEqual({
      valid: false,
      error: 'Le carnet ne peut pas être entièrement vide',
    });
  });

  it('rejette un carnet avec uniquement des espaces', () => {
    expect(validateSanctumNoteInput('   ', '   ')).toEqual({
      valid: false,
      error: 'Le carnet ne peut pas être entièrement vide',
    });
  });

  it('accepte un carnet avec un titre seul', () => {
    expect(validateSanctumNoteInput('Mon carnet', '')).toEqual({ valid: true });
  });

  it('accepte un carnet avec un contenu seul', () => {
    expect(validateSanctumNoteInput('', 'Du texte ici')).toEqual({ valid: true });
  });

  it('accepte un carnet avec titre et contenu', () => {
    expect(validateSanctumNoteInput('Titre', 'Contenu')).toEqual({ valid: true });
  });
});

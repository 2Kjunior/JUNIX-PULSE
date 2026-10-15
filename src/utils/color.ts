/**
 * Utilitaires de couleur pour Junix Pulse.
 *
 * Fonctions pures, sans dépendance runtime, testables unitairement.
 * Aucune dépendance ajoutée (ni polished, ni tinycolor).
 *
 * CONTRAT PÉDAGOGIQUE :
 * - hexToRgba : transforme #RRGGBB(AA) en rgba(r, g, b, a).
 * - withAlpha : applique une opacité à une couleur hex.
 * - luminance : luminance relative WCAG 2.1 (pour calcul de contraste).
 * - contrastRatio : rapport de contraste WCAG entre deux couleurs.
 * - resolveAccent : adapte une couleur stockée (sombre) pour le mode clair.
 * - resolveScheme : détermine le scheme effectif ('light'|'dark') à partir
 *   du mode utilisateur et du scheme système.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppearanceMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

// ─── hexToRgba ───────────────────────────────────────────────────────────────

/**
 * Convertit une couleur hex (#RGB, #RRGGBB ou #RRGGBBAA) en chaîne rgba().
 *
 * @example
 * hexToRgba('#D0BCFF', 0.5) → 'rgba(208, 188, 255, 0.50)'
 * hexToRgba('#FFF')          → 'rgba(255, 255, 255, 1.00)'
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const cleaned = hex.replace('#', '');
  let r: number, g: number, b: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6 || cleaned.length === 8) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
    if (cleaned.length === 8 && alpha === 1) {
      alpha = parseInt(cleaned.substring(6, 8), 16) / 255;
    }
  } else {
    throw new Error(`Format hex invalide : "${hex}"`);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

// ─── withAlpha ───────────────────────────────────────────────────────────────

/**
 * Raccourci : applique une opacité à une couleur hex.
 * Identique à hexToRgba mais nom plus explicite pour les usages in-component.
 */
export function withAlpha(hex: string, alpha: number): string {
  return hexToRgba(hex, alpha);
}

// ─── Luminance relative (WCAG 2.1) ──────────────────────────────────────────

/**
 * Calcule la luminance relative d'une couleur hex.
 * Formule WCAG 2.1 : https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * @returns Nombre entre 0 (noir) et 1 (blanc).
 */
export function luminance(hex: string): number {
  const cleaned = hex.replace('#', '');
  let r: number, g: number, b: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
  } else {
    r = parseInt(cleaned.substring(0, 2), 16) / 255;
    g = parseInt(cleaned.substring(2, 4), 16) / 255;
    b = parseInt(cleaned.substring(4, 6), 16) / 255;
  }

  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ─── Rapport de contraste WCAG ───────────────────────────────────────────────

/**
 * Calcule le rapport de contraste entre deux couleurs hex.
 * Résultat entre 1 (identiques) et 21 (noir/blanc).
 *
 * @example
 * contrastRatio('#1C1917', '#FBF7F2') → ~15.8
 * contrastRatio('#6B46C1', '#FBF7F2') → ~5.2
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── resolveAccent ───────────────────────────────────────────────────────────

/**
 * Adapte une couleur d'accent stockée (optimisée sombre) pour l'affichage
 * en mode clair.
 *
 * Stratégie :
 * - En sombre : retourne la couleur originale (identité).
 * - En clair : si la couleur a un contraste < 3:1 sur le fond clair,
 *   on la remplace par la variante « profonde » fournie.
 *   Sinon on garde l'originale.
 *
 * POURQUOI NE PAS MIGRER LES DONNÉES ?
 * Les couleurs sont des données utilisateur (habit.color, planning_blocks.color).
 * Réécrire #D0BCFF en #6B46C1 casserait le rendu sombre.
 * On adapte à l'affichage uniquement.
 *
 * @param stored    Couleur stockée en base (ex: '#D0BCFF')
 * @param mode      Mode effectif actuel
 * @param lightBg   Fond clair de référence (défaut: '#FBF7F2')
 * @param deepFallback Variante profonde pour le clair (défaut: '#6B46C1')
 * @param minContrast  Contraste minimum acceptable (défaut: 3.0)
 */
export function resolveAccent(
  stored: string,
  mode: ColorScheme,
  lightBg: string = '#FBF7F2',
  deepFallback: string = '#6B46C1',
  minContrast: number = 3.0,
): string {
  if (mode === 'dark') return stored;

  const ratio = contrastRatio(stored, lightBg);
  return ratio >= minContrast ? stored : deepFallback;
}

// ─── resolveScheme ───────────────────────────────────────────────────────────

/**
 * Détermine le scheme effectif à partir du mode choisi par l'utilisateur
 * et du scheme système (fourni par `Appearance.getColorScheme()` ou
 * `useColorScheme()`).
 *
 * @param userMode   'system' | 'light' | 'dark' — préférence utilisateur en DB
 * @param systemScheme 'light' | 'dark' | null — scheme OS courant
 * @returns 'light' | 'dark' — scheme à appliquer
 *
 * @example
 * resolveScheme('system', 'light')  → 'light'
 * resolveScheme('system', 'dark')   → 'dark'
 * resolveScheme('system', null)     → 'dark' (fallback)
 * resolveScheme('light', 'dark')    → 'light'
 * resolveScheme('dark', 'light')    → 'dark'
 */
export function resolveScheme(
  userMode: AppearanceMode,
  systemScheme: ColorScheme | 'unspecified' | null | undefined,
): ColorScheme {
  if (userMode === 'light') return 'light';
  if (userMode === 'dark') return 'dark';
  // userMode === 'system' : suit le système, fallback sur 'dark' si indéterminé
  return systemScheme === 'light' ? 'light' : 'dark';
}


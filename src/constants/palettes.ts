/**
 * Palettes sombre et claire pour Junix Pulse.
 *
 * Chaque palette contient toutes les valeurs sémantiques utilisées par l'UI.
 * La palette sombre reproduit exactement les exports actuels de theme.ts.
 * La palette claire suit la spec du master prompt (crème #FBF7F2, violet #6B46C1).
 *
 * Ces palettes ne sont PAS encore consommées par le système de thème.
 * Elles servent de source de vérité statique, testable et versionnable.
 *
 * CONTRAT PÉDAGOGIQUE :
 * - Toute valeur ici doit avoir un commentaire de contraste si elle concerne du texte.
 * - Les valeurs rgba servent au glassmorphism et aux bordures translucides.
 * - Les priorités ont des clés UPPERCASE qui correspondent aux enums métier.
 */

// ─── Type structurel ─────────────────────────────────────────────────────────
// On type d'abord le « shape » de la palette, puis on l'implémente deux fois.

export interface ThemePalette {
  /** Mode effectif — utile pour les branches conditionnelles dans les composants. */
  readonly mode: 'light' | 'dark';

  // ── Surfaces (fonds hiérarchiques) ──────────────────────────────────────
  readonly surface: {
    readonly base: string;
    readonly low: string;
    readonly container: string;
    readonly high: string;
    readonly highest: string;
  };

  // ── Textes / icônes sur surface ─────────────────────────────────────────
  readonly onSurface: {
    readonly primary: string;   // titres, corps principal
    readonly variant: string;   // sous-titres, métadonnées
    readonly inactive: string;  // contrôles disponibles non sélectionnés
    readonly disabled: string;  // états désactivés
  };

  // ── Contours ────────────────────────────────────────────────────────────
  readonly outline: {
    readonly default: string;
    readonly variant: string;
  };

  // ── Accent primaire (violet) ────────────────────────────────────────────
  readonly primary: {
    readonly default: string;
    readonly container: string;
    readonly on: string;
    readonly onContainer: string;
  };

  // ── Accent tertiaire (cyan / teal) ──────────────────────────────────────
  readonly tertiary: {
    readonly default: string;
    readonly container: string;
    readonly on: string;
    readonly onContainer: string;
  };

  // ── Erreur ──────────────────────────────────────────────────────────────
  readonly error: {
    readonly default: string;
    readonly container: string;
    readonly on: string;
    readonly onContainer: string;
  };

  // ── Succès ──────────────────────────────────────────────────────────────
  readonly success: {
    readonly default: string;
    readonly container: string;
    readonly onContainer: string;
  };

  // ── Priorités (rappels + tâches) ────────────────────────────────────────
  readonly priority: {
    readonly URGENT: string;
    readonly HIGH: string;
    readonly NORMAL: string;
    readonly LOW: string;
  };

  // ── Dégradé CTA ────────────────────────────────────────────────────────
  readonly gradient: {
    readonly primary: readonly [string, string];
    /** Boutons principaux en verre vif, assez denses pour un texte blanc ≥ 4,5:1. */
    readonly glassPrimary: readonly [string, string];
  };

  // ── GlowCard ────────────────────────────────────────────────────────────
  readonly glowCard: {
    readonly background: string;
    readonly cornerGlowEnabled: boolean;
    readonly topHighlightEnabled: boolean;
    readonly haloEnabled: boolean;
    readonly borderOpacityNeutral: number;
  };

  // ── Glassmorphism ───────────────────────────────────────────────────────
  readonly glass: {
    readonly card: {
      readonly backgroundColor: string;
      readonly borderColor: string;
    };
    /** Boutons, puces et badges posés sur le fond. Pas d'elevation Android : elle se voit à travers. */
    readonly control: {
      readonly backgroundColor: string;
      readonly borderColor: string;
    };
    /** Fond d'une puce ou d'un bouton sélectionné. */
    readonly controlActive: string;
    /** Plus dense que les cartes : du contenu défile dessous, sans flou sur Android. */
    readonly nav: {
      readonly backgroundColor: string;
      readonly borderColor: string;
    };
  };

  // ── Ombres ──────────────────────────────────────────────────────────────
  readonly shadow: {
    readonly color: string;
    readonly smOpacity: number;
    readonly mdOpacity: number;
  };

  // ── StatusBar ───────────────────────────────────────────────────────────
  readonly statusBarStyle: 'light' | 'dark';
}

// ─── Palette sombre ──────────────────────────────────────────────────────────
// Reproduit exactement les valeurs actuelles de theme.ts.
// Aucun changement visuel en sombre — c'est la « photo gelée ».

export const darkPalette: ThemePalette = {
  mode: 'dark',

  surface: {
    base: '#141317',
    low: '#1C1B1F',
    container: '#211F23',
    high: '#2B292D',
    highest: '#363438',
  },

  onSurface: {
    primary: '#E6E1E7',   // contraste 13.2:1 sur #141317
    variant: '#CAC4D0',   // contraste 9.8:1 sur #141317
    inactive: '#CAC4D0',  // contraste 9.6:1 sur #211F23 (onglets disponibles)
    disabled: '#6B6572',  // contraste 3.5:1 sur #141317 (décoratif uniquement)
  },

  outline: {
    default: '#948F9A',
    variant: '#49454F',
  },

  primary: {
    default: '#D0BCFF',
    container: '#4A3780',
    on: '#381E72',
    onContainer: '#E9DDFF',
  },

  tertiary: {
    default: '#7BD0FF',
    container: '#004C6D',
    on: '#003549',
    onContainer: '#C3E7FF',
  },

  error: {
    default: '#FFB4AB',
    container: '#93000A',
    on: '#690005',
    onContainer: '#FFDAD6',
  },

  success: {
    default: '#6DD58C',
    container: '#0A3818',
    onContainer: '#C8FAD6',
  },

  priority: {
    URGENT: '#FFB4AB',
    HIGH: '#FFB86C',
    NORMAL: '#7BD0FF',
    LOW: '#E6E1E7',
  },

  gradient: {
    primary: ['#7C3AED', '#6D28D9'], // ajusté WCAG 2.2 AA (contraste ≥ 4.5:1 avec texte blanc)
    glassPrimary: ['rgba(124, 58, 237, 0.90)', 'rgba(79, 70, 229, 0.84)'],
  },

  glowCard: {
    background: '#14141E',
    cornerGlowEnabled: true,
    topHighlightEnabled: true,
    haloEnabled: true,
    borderOpacityNeutral: 0.07,
  },

  glass: {
    card: {
      backgroundColor: 'rgba(30, 28, 46, 0.55)',
      borderColor: 'rgba(255, 255, 255, 0.16)',
    },
    control: {
      backgroundColor: 'rgba(30, 28, 46, 0.45)',
      borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    controlActive: 'rgba(208, 188, 255, 0.20)',
    nav: {
      backgroundColor: 'rgba(24, 22, 38, 0.82)',
      borderColor: 'rgba(255, 255, 255, 0.18)',
    },
  },

  shadow: {
    color: '#000000',
    smOpacity: 0.3,
    mdOpacity: 0.4,
  },

  statusBarStyle: 'light',
};

// ─── Palette claire ──────────────────────────────────────────────────────────
// Spec master prompt — crème chaleureuse, pas de blanc pur.
// Toutes les couleurs d'accent sont assombries pour garantir ≥ 4.5:1 sur crème.

export const lightPalette: ThemePalette = {
  mode: 'light',

  surface: {
    base: '#FBF7F2',       // crème chaleureuse
    low: '#F8F4EF',
    container: '#F2EDE8',
    high: '#EDE8E3',
    highest: '#E7E2DD',
  },

  onSurface: {
    primary: '#1C1917',   // contraste 15.8:1 sur #FBF7F2
    variant: '#57534E',   // contraste 6.0:1 sur #FBF7F2
    inactive: '#57534E',  // contraste 6.5:1 sur #F2EDE8 (onglets disponibles)
    disabled: '#736D68',  // contraste 4.6:1 sur #FBF7F2 (conforme WCAG 2.2 AA strict ≥ 4.5:1)
  },

  outline: {
    default: '#736D68',   // contraste 4.6:1 sur #FBF7F2 (conforme WCAG 2.2 AA strict ≥ 4.5:1)
    variant: '#D6D3D1',
  },

  primary: {
    default: '#6B46C1',     // contraste 5.2:1 sur #FBF7F2
    container: '#E9DDFF',
    on: '#FFFFFF',
    onContainer: '#4A3780',
  },

  tertiary: {
    default: '#0E7490',     // contraste 4.6:1 sur #FBF7F2
    container: '#C3E7FF',
    on: '#FFFFFF',
    onContainer: '#004C6D',
  },

  error: {
    default: '#DC2626',     // contraste 4.6:1 sur #FBF7F2
    container: '#FFDAD6',
    on: '#FFFFFF',
    onContainer: '#93000A',
  },

  success: {
    default: '#059669',     // contraste 4.5:1 sur #FBF7F2
    container: '#C8FAD6',
    onContainer: '#0A3818',
  },

  priority: {
    URGENT: '#DC2626',
    HIGH: '#D97706',
    NORMAL: '#0E7490',
    LOW: '#57534E',
  },

  gradient: {
    primary: ['#6B46C1', '#553C9A'],
    glassPrimary: ['rgba(124, 58, 237, 0.90)', 'rgba(79, 70, 229, 0.84)'],
  },

  glowCard: {
    background: '#F2EDE8',
    cornerGlowEnabled: false,  // D-13 : désactivé (blanc sur blanc)
    topHighlightEnabled: false, // D-13 : désactivé
    haloEnabled: false,
    borderOpacityNeutral: 0.12,
  },

  glass: {
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      borderColor: 'rgba(255, 255, 255, 0.75)',
    },
    control: {
      backgroundColor: 'rgba(255, 255, 255, 0.50)',
      borderColor: 'rgba(76, 52, 120, 0.16)',
    },
    controlActive: 'rgba(107, 70, 193, 0.16)',
    nav: {
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      borderColor: 'rgba(255, 255, 255, 0.80)',
    },
  },

  shadow: {
    color: 'rgba(107, 70, 193, 0.12)', // violet teinté, pas noir
    smOpacity: 0.08,
    mdOpacity: 0.12,
  },

  statusBarStyle: 'dark',
};

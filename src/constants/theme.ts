/**
 * Design system tokens pour Junix Pulse.
 * Palette sombre avec violet électrique (primary) et cyan numérique (tertiary).
 * Basé sur les tokens définis dans le contrat produit V1.0.
 */
import { Platform } from 'react-native';

// ─── Surfaces ───────────────────────────────────────────────────────────────
export const Surface = {
  base: '#141317',
  low: '#1C1B1F',
  container: '#211F23',
  high: '#2B292D',
  highest: '#363438',
} as const;

// ─── Couleurs sur surfaces ───────────────────────────────────────────────────
export const OnSurface = {
  primary: '#E6E1E7',
  variant: '#CAC4D0',
  disabled: '#6B6572',
} as const;

// ─── Contours ────────────────────────────────────────────────────────────────
export const Outline = {
  default: '#948F9A',
  variant: '#49454F',
} as const;

// ─── Accent primaire (violet) ────────────────────────────────────────────────
export const Primary = {
  default: '#D0BCFF',
  container: '#4A3780',
  on: '#381E72',
  onContainer: '#E9DDFF',
} as const;

// ─── Accent tertiaire (cyan) ─────────────────────────────────────────────────
export const Tertiary = {
  default: '#7BD0FF',
  container: '#004C6D',
  on: '#003549',
  onContainer: '#C3E7FF',
} as const;

// ─── Erreur ──────────────────────────────────────────────────────────────────
export const Error = {
  default: '#FFB4AB',
  container: '#93000A',
  on: '#690005',
  onContainer: '#FFDAD6',
} as const;

// ─── Succès ──────────────────────────────────────────────────────────────────
export const Success = {
  default: '#6DD58C',
  container: '#0A3818',
  onContainer: '#C8FAD6',
} as const;

// ─── Priorités des rappels ───────────────────────────────────────────────────
// Les couleurs de priorité ne sont jamais l'unique indicateur (règle BR-025)
export const Priority = {
  URGENT: '#FFB4AB',   // rouge
  HIGH: '#FFB86C',     // orange
  NORMAL: '#7BD0FF',   // cyan
  LOW: '#E6E1E7',      // blanc/neutre
} as const;

// ─── Espacement ──────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── Rayons de bord ──────────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// ─── Typographie ─────────────────────────────────────────────────────────────
export const Typography = {
  displayLarge: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  displayMedium: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  headlineLarge: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  headlineMedium: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  titleLarge: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  titleMedium: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  labelLarge: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  labelSmall: { fontSize: 10, fontWeight: '500' as const, lineHeight: 14 },
} as const;

// ─── Fonte ───────────────────────────────────────────────────────────────────
export const FontFamily = Platform.select({
  ios: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  android: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  default: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
});

// ─── Typographie titres (Outfit — réservé aux titres et onboarding) ──────────
export const TitleFontFamily = Platform.select({
  ios: { bold: 'Outfit-Bold', semiBold: 'Outfit-SemiBold' },
  android: { bold: 'Outfit-Bold', semiBold: 'Outfit-SemiBold' },
  default: { bold: 'Outfit-Bold', semiBold: 'Outfit-SemiBold' },
});

// ─── Dégradé principal (CTA + logo) ──────────────────────────────────────────
// Utilisé sur UN SEUL élément par écran — jamais sur les cartes de liste
export const Gradient = {
  primary: ['#D0BCFF', '#A078FF', '#4CD7F6'] as const,
  primaryStart: { x: 0, y: 0 } as const,
  primaryEnd: { x: 1, y: 0 } as const,
} as const;

// ─── Glassmorphism — deux niveaux, hiérarchie stricte ────────────────────────
// glass-card : cartes de contenu standard
// glass-nav  : navigation flottante, modales (niveau élevé)
export const Glass = {
  card: {
    backgroundColor: 'rgba(17, 19, 26, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  nav: {
    backgroundColor: 'rgba(12, 14, 21, 0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

// ─── Ombres (légères, performantes) ─────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

// ─── Durées d'animation ──────────────────────────────────────────────────────
export const Duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ─── Thème principal (compatibilité legacy) ──────────────────────────────────
export const Colors = {
  dark: {
    text: OnSurface.primary,
    textSecondary: OnSurface.variant,
    background: Surface.base,
    backgroundElement: Surface.container,
    backgroundSelected: Surface.high,
    primary: Primary.default,
    tertiary: Tertiary.default,
    error: Error.default,
    outline: Outline.default,
  },
  light: {
    // Junix Pulse est dark-first. Le mode clair est un fallback minimal.
    text: '#1C1B1F',
    textSecondary: '#49454F',
    background: '#FFFBFE',
    backgroundElement: '#F4EFF4',
    backgroundSelected: '#E7E0EC',
    primary: '#6750A4',
    tertiary: '#006688',
    error: '#B3261E',
    outline: '#79747E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Inset pour la tab bar native
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

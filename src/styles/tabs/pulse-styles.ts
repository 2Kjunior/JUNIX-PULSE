/**
 * Styles de l'écran Pulse — Moteur de suggestion local de Junix Pulse.
 * Fabrique dynamique supportant les palettes sombre et claire avec contrastes adaptés.
 *
 * Structure visuelle :
 *  1) Hero orbe   — PulseLogo grand format + sous-titre état système
 *  2) Bande stats — 3 métriques compactes (habitudes, objectifs, en attente)
 *  3) Suggestions — GlowCard sémantiques (tone par type de suggestion)
 *  4) Modules     — raccourcis Habitudes / Objectifs en bas
 *
 * Règle A.1 : zéro emoji.
 * Règle A.2 : un seul dégradé de marque (CTA "Voir tout" en bas).
 * Règle A.3 : orbe en mode "idle" = seul élément ambiant sur cet écran.
 */
import { StyleSheet, Platform } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makePulseStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    // --- Conteneur principal --------------------------------------------------
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    title: {
      ...Typography.headlineLarge,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      color: theme.onSurface.primary,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.high : 'rgba(26, 30, 44, 0.75)',
      borderWidth: 1,
      borderColor: theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      flexGrow: 1,
    },

    // --- Hero : orbe central --------------------------------------------------
    heroSection: {
      alignItems: 'center',
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    orbContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    // Anneau vitré derrière l'orbe — glassmorphism à deux couches
    orbRing: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: Radius.full,
      backgroundColor: isLight ? 'rgba(107, 70, 193, 0.08)' : 'rgba(160, 120, 255, 0.08)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(107, 70, 193, 0.16)' : 'rgba(208, 188, 255, 0.12)',
    },
    orbRingOuter: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: Radius.full,
      backgroundColor: isLight ? 'rgba(107, 70, 193, 0.04)' : 'rgba(160, 120, 255, 0.04)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(107, 70, 193, 0.08)' : 'rgba(208, 188, 255, 0.06)',
    },
    heroTitle: {
      ...Typography.headlineMedium,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      color: theme.onSurface.primary,
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    heroSubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      textAlign: 'center',
      maxWidth: 260,
      lineHeight: 18,
    },
    // Puce d'état système : "Analyse active" / "À jour"
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.primary.container : 'rgba(160, 120, 255, 0.12)',
      borderWidth: 1,
      borderColor: isLight ? theme.primary.default + '40' : 'rgba(208, 188, 255, 0.20)',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: Radius.full,
      backgroundColor: theme.primary.default,
    },
    statusText: {
      ...Typography.labelSmall,
      color: isLight ? theme.primary.onContainer : theme.primary.default,
      fontWeight: '600',
      fontFamily: FontFamily?.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    // --- Bande métriques (3 colonnes) ----------------------------------------
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.xl,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: isLight ? theme.surface.container : theme.glass.card.backgroundColor,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xs,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : theme.glass.card.borderColor,
    },
    statValue: {
      ...Typography.displayMedium,
      color: theme.onSurface.primary,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      lineHeight: 30,
    },
    statLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      marginTop: 4,
      textAlign: 'center',
      fontFamily: FontFamily?.medium,
    },

    // --- En-tête de section suggestions --------------------------------------
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    sectionTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontFamily: FontFamily?.semiBold,
    },
    suggCount: {
      ...Typography.labelSmall,
      color: isLight ? theme.primary.onContainer : theme.primary.default,
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.14)',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      fontWeight: '700',
      fontFamily: FontFamily?.bold,
      overflow: 'hidden',
    },

    // --- Contenu interne d'une carte de suggestion ---------------------------
    suggInner: {
      gap: Spacing.sm,
    },
    suggTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    // Chip pill catégorie — couleur injectée via style inline
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    typePillText: {
      fontSize: 9,
      fontWeight: '700',
      fontFamily: FontFamily?.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    suggTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontFamily: FontFamily?.semiBold,
      lineHeight: 20,
    },
    suggExplanation: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      lineHeight: 18,
    },
    suggActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    refuseBtn: {
      paddingHorizontal: Spacing.md + 2,
      paddingVertical: Spacing.xs + 2,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : theme.outline.default,
      backgroundColor: isLight ? theme.surface.high : theme.glass.card.backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 38,
    },
    refuseText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      fontFamily: FontFamily?.medium,
      fontSize: 13,
    },
    acceptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.xs + 2,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.primary.container : 'rgba(168, 129, 243, 0.22)',
      borderWidth: 1,
      borderColor: isLight ? theme.primary.default + '55' : 'rgba(168, 129, 243, 0.60)',
      minHeight: 38,
    },
    acceptText: {
      ...Typography.labelMedium,
      color: isLight ? theme.primary.onContainer : '#FFFFFF',
      fontWeight: '700',
      fontFamily: FontFamily?.bold,
      fontSize: 13,
    },

    // --- État vide (aucune suggestion) ----------------------------------------
    emptyCard: {
      alignItems: 'center',
      paddingVertical: Spacing.xxl,
      paddingHorizontal: Spacing.xl,
      backgroundColor: isLight ? theme.surface.container : theme.surface.container,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : theme.outline.default,
      marginBottom: Spacing.xl,
    },
    emptyIconCircle: {
      width: 52,
      height: 52,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.10)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    emptyTitle: {
      ...Typography.titleMedium,
      color: theme.primary.default,
      marginBottom: Spacing.xs,
      fontFamily: FontFamily?.semiBold,
    },
    emptyDesc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      textAlign: 'center',
      lineHeight: 18,
    },

    // --- Modules raccourcis (Habitudes, Objectifs) ----------------------------
    modulesSection: {
      marginTop: Spacing.xl,
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    moduleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: isLight ? theme.surface.container : theme.glass.card.backgroundColor,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : theme.glass.card.borderColor,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.shadow.smOpacity,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
    moduleIcon: {
      width: 42,
      height: 42,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moduleBody: {
      flex: 1,
    },
    moduleLabel: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontFamily: FontFamily?.semiBold,
    },
    moduleDesc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },

    // --- Liste des suggestions ------------------------------------------------
    suggestionsList: {
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
  });
}

/** Rétrocompatibilité */
export const styles = makePulseStyles(darkPalette);

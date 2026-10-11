/**
 * Styles de l'écran Pulse — Moteur de suggestion local de Junix Pulse.
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
  OnSurface,
  Primary,
  Spacing,
  Radius,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';

export const styles = StyleSheet.create({
  // --- Conteneur principal --------------------------------------------------
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  // Anneau vitré derrière l'orbe — glassmorphism à deux couches
  orbRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(160, 120, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.12)',
  },
  orbRingOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(160, 120, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.06)',
  },
  heroTitle: {
    ...Typography.headlineLarge,
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    color: OnSurface.primary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
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
    backgroundColor: 'rgba(160, 120, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.20)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Primary.default,
  },
  statusText: {
    ...Typography.labelSmall,
    color: Primary.default,
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  statValue: {
    ...Typography.displayMedium,
    color: OnSurface.primary,
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    lineHeight: 30,
  },
  statLabel: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
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
    color: OnSurface.primary,
    fontFamily: FontFamily?.semiBold,
  },
  suggCount: {
    ...Typography.labelSmall,
    color: Primary.default,
    backgroundColor: 'rgba(208, 188, 255, 0.14)',
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
    color: OnSurface.primary,
    fontFamily: FontFamily?.semiBold,
    lineHeight: 20,
  },
  suggExplanation: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 18,
  },
  suggActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  refuseBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  refuseText: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    fontFamily: FontFamily?.medium,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(208, 188, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.30)',
  },
  acceptText: {
    ...Typography.labelMedium,
    color: Primary.default,
    fontWeight: '700',
    fontFamily: FontFamily?.bold,
  },

  // --- État vide (aucune suggestion) ----------------------------------------
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.10)',
    marginBottom: Spacing.xl,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(208, 188, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: Primary.default,
    marginBottom: Spacing.xs,
    fontFamily: FontFamily?.semiBold,
  },
  emptyDesc: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.20,
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
    color: OnSurface.primary,
    fontFamily: FontFamily?.semiBold,
  },
  moduleDesc: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },

  // --- Liste des suggestions ------------------------------------------------
  suggestionsList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
});

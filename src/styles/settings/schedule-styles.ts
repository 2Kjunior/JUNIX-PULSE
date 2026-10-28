/**
 * Styles de l'écran Planning Personnel (settings/schedule.tsx).
 * Fabrique thématique pour supporter le mode clair/sombre.
 * Inclut les styles pour la vue liste et la vue grille 7 jours.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';

export function makeScheduleStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    // ─── Conteneur principal ─────────────────────────────────────────────────
    container: { flex: 1, backgroundColor: theme.surface.base },

    // ─── Header R-09 (Modèle Personnes) ─────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    title: {
      ...Typography.headlineLarge,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      color: theme.onSurface.primary,
      fontWeight: '700',
      letterSpacing: -0.5,
      fontSize: 22,
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
    circularBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.high : 'rgba(26, 30, 44, 0.75)',
      borderWidth: 1,
      borderColor: theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ─── Toggle Vue Liste / Grille ───────────────────────────────────────────
    viewToggleRow: {
      flexDirection: 'row',
      padding: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.surface.container,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
      gap: Spacing.xs,
    },
    viewToggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : theme.surface.high,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    viewToggleBtnActive: {
      backgroundColor: theme.primary.default,
      borderColor: theme.primary.default,
    },
    viewToggleText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      fontWeight: '600',
    },
    viewToggleTextActive: {
      color: theme.surface.base,
    },

    // ─── Barre des jours (vue liste) ─────────────────────────────────────────
    daysBar: {
      flexDirection: 'row',
      backgroundColor: theme.surface.container,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
      paddingHorizontal: Spacing.xs,
    },
    dayTab: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      gap: 3,
    },
    dayTabActive: { borderBottomColor: theme.primary.default },
    dayTabText: { ...Typography.labelMedium, color: theme.onSurface.disabled },
    dayTabTextActive: { color: theme.primary.default, fontWeight: '700' },
    dayTabBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayTabBadgeText: {
      ...Typography.labelSmall,
      fontSize: 9,
      color: '#FFFFFF',
      fontWeight: '700',
    },

    // ─── Contenu liste ───────────────────────────────────────────────────────
    content: { padding: Spacing.lg, paddingBottom: 100 },
    dayHeader: { marginBottom: Spacing.lg },
    dayTitle: { ...Typography.headlineMedium, color: theme.onSurface.primary },
    daySub: { ...Typography.bodySmall, color: theme.onSurface.variant, marginTop: 2 },

    // ─── État vide ───────────────────────────────────────────────────────────
    emptyCard: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    emptyTitle: { ...Typography.titleMedium, color: theme.onSurface.primary, marginTop: Spacing.md },
    emptyDesc: { ...Typography.bodySmall, color: theme.onSurface.variant, textAlign: 'center', marginTop: 4 },

    // ─── Carte bloc planning GlowCard (vue liste) ───────────────────────────
    listGlowCard: {
      marginBottom: Spacing.md,
      padding: Spacing.md,
    },
    blockCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs + 2,
    },
    blockBadgeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs + 2,
    },
    blockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.sm,
    },
    blockBadgeText: {
      ...Typography.labelSmall,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    cardTimeText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    blockTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    blockMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
    },
    blockMetaText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      fontSize: 12,
    },
    deleteIconBtn: {
      padding: Spacing.xs,
      borderRadius: Radius.full,
    },

    // ─── Modal ───────────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: isDark ? 'rgba(18, 22, 38, 0.98)' : theme.surface.container,
      borderTopLeftRadius: Radius.xl + 4,
      borderTopRightRadius: Radius.xl + 4,
      padding: Spacing.lg,
      paddingBottom: 40,
      maxHeight: '90%',
      borderTopWidth: 1,
      borderColor: isDark ? 'rgba(208, 188, 255, 0.20)' : theme.outline.variant,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    modalTitle: { ...Typography.titleLarge, color: theme.onSurface.primary },
    modalBody: {},
    label: { ...Typography.labelMedium, color: theme.onSurface.variant, marginBottom: Spacing.xs },

    // ─── Champs de saisie ────────────────────────────────────────────────────
    input: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.surface.base,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    inputError: {
      borderColor: theme.error.default,
      borderWidth: 1.5,
    },
    fieldHint: {
      ...Typography.bodySmall,
      color: theme.onSurface.disabled,
      fontSize: 11,
      marginTop: 4,
      marginBottom: 2,
    },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    timeSep: { ...Typography.bodyMedium, color: theme.onSurface.variant },

    // ─── Pills de type d'activité ─────────────────────────────────────────────
    typeRow: { flexDirection: 'row', paddingVertical: Spacing.xs },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      marginRight: Spacing.xs,
      gap: 4,
    },
    typePillText: { ...Typography.labelSmall, color: theme.onSurface.primary },

    // ─── Vue Grille 7 jours ───────────────────────────────────────────────────
    gridContainer: {
      padding: Spacing.lg,
    },
    gridHeaderRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    gridDayHeader: {
      alignItems: 'center',
      gap: 3,
    },
    gridDayLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontSize: 10,
    },
    gridDayBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridDayBadgeText: {
      ...Typography.labelSmall,
      fontSize: 8,
      color: '#FFFFFF',
      fontWeight: '800',
    },
    gridBody: {
      flexDirection: 'row',
      gap: Spacing.xs,
      alignItems: 'flex-start',
    },
    gridCol: {
      gap: Spacing.xs,
      alignItems: 'stretch',
    },
    gridBlock: {
      borderRadius: Radius.sm + 2,
      padding: Spacing.xs + 2,
      borderLeftWidth: 3,
      minHeight: 56,
      gap: 2,
      ...Platform.select({
        android: { elevation: 1 },
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
        },
      }),
    },
    gridBlockTime: {
      fontSize: 8,
      fontWeight: '700',
      fontVariant: ['tabular-nums'] as any,
    },
    gridBlockLabel: {
      ...Typography.labelSmall,
      fontSize: 9,
      color: theme.onSurface.primary,
      fontWeight: '600',
      lineHeight: 12,
    },
    gridEmptyCell: {
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    gridAddBtn: {
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
      height: 24,
    },
    gridHint: {
      ...Typography.bodySmall,
      fontSize: 10,
      color: theme.onSurface.disabled,
      textAlign: 'center',
      marginTop: Spacing.lg,
    },
  });
}

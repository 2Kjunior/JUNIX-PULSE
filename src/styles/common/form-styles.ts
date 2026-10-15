/**
 * Styles universels pour tous les formulaires de Junix Pulse.
 * Garantit une cohérence visuelle 100% harmonisée entre :
 * - Création de rappel (reminders/new)
 * - Création de tâche (tasks/new)
 * - Création d'événement (events/new)
 * - Création d'habitude (habits/new)
 * - Création d'objectif (goals/new)
 * - Écran Sanctum (sanctum)
 *
 * Migration P5 :
 * - Converti en fabrique `makeFormStyles(theme: ThemePalette)`
 * - Supporte le mode sombre Midnight Glow et le mode clair crème chaleureuse
 * - Maintient l'export statique `formStyles` pour compatibilité descendante.
 */
import { StyleSheet, Platform } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';
import { darkPalette, type ThemePalette } from '@/constants/palettes';

export function makeFormStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.07)' : theme.outline.variant,
      backgroundColor: isDark ? 'rgba(14, 16, 23, 0.95)' : theme.glass.nav.backgroundColor,
    },
    toolbarBtn: {
      minWidth: 70,
    },
    toolbarCenter: {
      alignItems: 'center',
    },
    toolbarTitle: {
      ...Typography.titleLarge,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      color: theme.onSurface.primary,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    toolbarSubtitle: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontSize: 9,
      fontFamily: FontFamily?.medium,
    },
    toolbarCancel: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      fontFamily: FontFamily?.medium,
    },
    toolbarSave: {
      ...Typography.labelLarge,
      color: theme.primary.default,
      fontWeight: '700',
      fontFamily: FontFamily?.bold,
      textAlign: 'right',
    },
    toolbarSaveDisabled: {
      opacity: 0.35,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: Spacing.xs,
      marginBottom: 4,
      paddingHorizontal: 4,
    },
    sectionHeaderIconBadge: {
      width: 24,
      height: 24,
      borderRadius: Radius.full,
      backgroundColor: isDark ? 'rgba(208, 188, 255, 0.12)' : 'rgba(107, 70, 193, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeaderTitle: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontSize: 11,
      fontWeight: '600',
      fontFamily: FontFamily?.medium,
    },
    cardGroup: {
      backgroundColor: isDark ? 'rgba(24, 28, 42, 0.82)' : theme.glass.card.backgroundColor,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(208, 188, 255, 0.16)' : theme.glass.card.borderColor,
      gap: Spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.shadow.smOpacity,
          shadowRadius: 10,
        },
        android: {
          elevation: 3,
        },
        default: {
          boxShadow: isDark
            ? '0 4px 14px -2px rgba(0, 0, 0, 0.35)'
            : '0 4px 14px -2px rgba(107, 70, 193, 0.08)',
        },
      }),
    },
    titleInput: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      paddingVertical: Spacing.xs,
    },
    notesRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      paddingTop: Spacing.sm,
    },
    notesIcon: {
      marginTop: 2,
    },
    notesInput: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontFamily: FontFamily?.regular,
      flex: 1,
      minHeight: 56,
      textAlignVertical: 'top',
    },
    inputBox: {
      backgroundColor: isDark ? 'rgba(15, 18, 28, 0.75)' : theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontFamily: FontFamily?.regular,
    },
    inputBoxError: {
      borderColor: theme.error.default,
    },
    errorText: {
      ...Typography.bodySmall,
      color: theme.error.default,
      marginTop: 2,
    },
    selectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(15, 18, 28, 0.80)' : theme.surface.container,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(208, 188, 255, 0.18)' : theme.outline.variant,
    },
    selectorLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    selectorIconBadge: {
      width: 32,
      height: 32,
      borderRadius: Radius.md,
      backgroundColor: isDark ? 'rgba(208, 188, 255, 0.12)' : 'rgba(107, 70, 193, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectorLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
    },
    selectorValue: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(18, 22, 34, 0.85)' : theme.surface.container,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : theme.outline.variant,
      gap: 6,
    },
    chipActive: {
      backgroundColor: isDark ? 'rgba(208, 188, 255, 0.18)' : 'rgba(107, 70, 193, 0.15)',
      borderColor: theme.primary.default,
    },
    chipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    chipText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontFamily: FontFamily?.medium,
      fontWeight: '500',
    },
    chipTextActive: {
      color: theme.primary.default,
      fontWeight: '700',
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    actionTile: {
      flexBasis: '31%',
      flexGrow: 1,
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(18, 22, 34, 0.75)' : theme.surface.container,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      gap: 4,
    },
    actionTileActive: {
      backgroundColor: isDark ? 'rgba(208, 188, 255, 0.16)' : 'rgba(107, 70, 193, 0.15)',
      borderColor: theme.primary.default,
    },
    actionTileText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    actionTileTextActive: {
      color: theme.primary.default,
      fontWeight: '700',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldLabel: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    fieldSub: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
  });
}

/** Export pour rétro-compatibilité avec les formulaires non encore migrés */
export const formStyles = makeFormStyles(darkPalette);

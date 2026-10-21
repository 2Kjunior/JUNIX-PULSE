/**
 * Styles extraits de sanctum.tsx.
 * Fabrique dynamique supportant les palettes sombre et claire avec contrastes soignés.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makeSanctumStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },

    // ─── Lock screen Glass Card ─────────────────────────────────────────────
    glassLockCard: {
      alignItems: 'center',
      width: '100%',
      maxWidth: 360,
      backgroundColor: isLight ? theme.surface.container : 'rgba(24, 28, 42, 0.88)',
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.18)',
      gap: Spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme.shadow.mdOpacity,
          shadowRadius: 18,
        },
        android: {
          elevation: 8,
        },
        default: {
          boxShadow: isLight
            ? '0 8px 24px -4px rgba(107, 70, 193, 0.14)'
            : '0 8px 32px -4px rgba(0, 0, 0, 0.40)',
        },
      }),
    },
    pinIconBadge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockIconBadge: {
      width: 32,
      height: 32,
      borderRadius: Radius.md,
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockTitle: {
      ...Typography.headlineLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
      marginTop: Spacing.xs,
    },
    lockSubtitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
      lineHeight: 22,
    },
    unlockBtn: {
      width: '100%',
      marginTop: Spacing.md,
    },
    altAuthLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: Spacing.sm,
      marginTop: Spacing.xs,
    },
    altAuthText: {
      ...Typography.labelMedium,
      color: theme.primary.default,
      fontWeight: '600',
    },
    errorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isLight ? theme.error.container : 'rgba(255, 82, 82, 0.12)',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: isLight ? theme.error.default + '40' : 'rgba(255, 82, 82, 0.30)',
    },
    errorText: {
      ...Typography.labelSmall,
      color: theme.error.default,
    },
    backLink: {
      padding: Spacing.sm,
      marginTop: Spacing.xs,
    },
    backLinkText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },

    // ─── PIN ────────────────────────────────────────────────────────────────
    pinInput: {
      width: '100%',
      backgroundColor: isLight ? theme.surface.high : 'rgba(15, 18, 28, 0.90)',
      borderRadius: Radius.md,
      padding: Spacing.md,
      ...Typography.headlineLarge,
      color: theme.onSurface.primary,
      textAlign: 'center',
      letterSpacing: 12,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.22)',
      marginTop: Spacing.xs,
    },
    pinFormGroup: {
      width: '100%',
      gap: 4,
      marginTop: Spacing.xs,
    },
    pinFieldLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontWeight: '600',
    },
    pinFieldInput: {
      width: '100%',
      backgroundColor: isLight ? theme.surface.high : 'rgba(15, 18, 28, 0.90)',
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: theme.onSurface.primary,
      textAlign: 'center',
      letterSpacing: 8,
      fontSize: 18,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.22)',
    },

    // ─── Security badge ────────────────────────────────────────────────────
    secureBadgeCentered: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: Spacing.xs,
      backgroundColor: isLight ? theme.success.container : 'rgba(109, 213, 140, 0.10)',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: isLight ? theme.success.default + '40' : 'rgba(109, 213, 140, 0.25)',
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    secureBadgeText: {
      ...Typography.labelSmall,
      color: isLight ? theme.success.onContainer : theme.success.default,
      fontWeight: '600',
    },

    // ─── Search ─────────────────────────────────────────────────────────────
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isLight ? theme.surface.container : 'rgba(18, 22, 34, 0.85)',
      borderRadius: Radius.md,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.14)',
    },
    searchInput: {
      flex: 1,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      padding: 0,
    },

    // ─── Folder chips ──────────────────────────────────────────────────────
    folderChipsScroll: {
      maxHeight: 48,
      marginTop: Spacing.sm,
    },
    folderChipsContent: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
    },

    // ─── Note cards ────────────────────────────────────────────────────────
    listContent: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
    noteCard: {
      backgroundColor: isLight ? theme.surface.container : 'rgba(24, 28, 42, 0.82)',
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.16)',
      gap: Spacing.xs,
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
          boxShadow: isLight
            ? '0 4px 14px -2px rgba(107, 70, 193, 0.08)'
            : '0 4px 14px -2px rgba(0, 0, 0, 0.3)',
        },
      }),
    },
    noteCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    noteCardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    noteCardTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
      flex: 1,
    },
    noteCardSnippet: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
      lineHeight: 18,
    },
    noteCardDate: {
      ...Typography.labelSmall,
      color: theme.onSurface.disabled,
      marginTop: Spacing.xs,
      fontSize: 11,
    },
    folderTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isLight ? theme.tertiary.container : 'rgba(123, 208, 255, 0.12)',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: isLight ? theme.tertiary.default + '40' : 'rgba(123, 208, 255, 0.25)',
    },
    folderTagText: {
      ...Typography.labelSmall,
      color: isLight ? theme.tertiary.onContainer : theme.tertiary.default,
      fontWeight: '600',
    },

    // ─── Empty state ───────────────────────────────────────────────────────
    emptyState: {
      alignItems: 'center',
      paddingVertical: Spacing.xxxl,
      gap: Spacing.sm,
    },
    emptyIconBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isLight ? theme.surface.high : 'rgba(255, 255, 255, 0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    emptyTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    emptySubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.disabled,
      textAlign: 'center',
    },

    // ─── Editor Elements ───────────────────────────────────────────────────
    folderSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: isLight ? theme.surface.container : 'rgba(15, 18, 28, 0.80)',
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.18)',
      marginTop: Spacing.xs,
    },
    folderBadgeSmall: {
      width: 28,
      height: 28,
      borderRadius: Radius.sm,
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderLabelSmall: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 9,
      letterSpacing: 0.5,
    },
    folderSelectorText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    folderPickerList: {
      backgroundColor: isLight ? theme.surface.container : 'rgba(18, 22, 34, 0.95)',
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.18)',
      overflow: 'hidden',
      marginTop: 4,
    },
    folderPickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.06)',
    },
    folderPickerItemActive: {
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.16)',
    },
    folderPickerItemText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    folderPickerItemTextActive: {
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    editorTextRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      minHeight: 220,
    },
    editorTextInput: {
      flex: 1,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      minHeight: 220,
      lineHeight: 22,
    },
  });
}

/** Rétrocompatibilité */
export const styles = makeSanctumStyles(darkPalette);

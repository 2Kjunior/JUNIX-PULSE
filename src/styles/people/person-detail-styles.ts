/**
 * Styles extraits de [id].tsx (Détail d'une personne).
 * Fabrique dynamique supportant les palettes sombre et claire avec contrastes adaptés.
 */

import { StyleSheet } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makePersonDetailStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
    },
    headerBtn: {
      padding: Spacing.xs,
    },
    headerTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      flex: 1,
      textAlign: 'center',
      fontWeight: '600',
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.xl,
    },
    profileCardInner: {
      gap: Spacing.md,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.high,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.outline.variant,
    },
    avatarForgotten: {
      borderColor: theme.priority.HIGH,
    },
    avatarText: {
      ...Typography.headlineMedium,
      color: theme.primary.default,
      fontWeight: '700',
    },
    profileInfo: {
      flex: 1,
      gap: 4,
    },
    displayName: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    relationshipBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surface.high,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    relationshipText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 11,
    },
    importedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: isLight ? theme.tertiary.container : 'rgba(123, 208, 255, 0.08)',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: isLight ? theme.tertiary.default + '40' : 'rgba(123, 208, 255, 0.25)',
    },
    importedText: {
      ...Typography.labelSmall,
      color: isLight ? theme.tertiary.onContainer : theme.tertiary.default,
      fontSize: 11,
      fontWeight: '600',
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      gap: Spacing.sm,
    },
    statusBannerOk: {
      backgroundColor: isLight ? theme.success.container : 'rgba(109, 213, 140, 0.08)',
      borderColor: isLight ? theme.success.default + '40' : 'rgba(109, 213, 140, 0.2)',
    },
    statusBannerAlert: {
      backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.08)',
      borderColor: isLight ? '#F59E0B60' : 'rgba(245, 158, 11, 0.25)',
    },
    statusBannerText: {
      ...Typography.labelMedium,
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    quickActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.high,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: 6,
    },
    quickActionText: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    detailText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    notesBox: {
      backgroundColor: isLight ? theme.surface.container : theme.surface.high,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    notesTitle: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      marginBottom: 2,
    },
    notesText: {
      ...Typography.bodySmall,
      color: theme.onSurface.primary,
    },
    section: {
      gap: Spacing.md,
    },
    sectionTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    logCardInner: {
      gap: Spacing.md,
    },
    typeScroll: {
      flexGrow: 0,
    },
    typeRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.high,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: 6,
    },
    typeChipActive: {
      backgroundColor: isLight ? theme.primary.container : theme.primary.container,
      borderColor: theme.primary.default,
    },
    typeChipText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    typeChipTextActive: {
      color: isLight ? theme.primary.onContainer : theme.primary.onContainer,
      fontWeight: '600',
    },
    logInput: {
      backgroundColor: theme.surface.high,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: theme.onSurface.primary,
      ...Typography.bodySmall,
      minHeight: 64,
    },
    emptyBoxInner: {
      alignItems: 'center',
      gap: Spacing.xs,
    },
    emptyTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginTop: Spacing.xs,
    },
    emptyText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: Spacing.xs,
      gap: Spacing.md,
    },
    timelineIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.high,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    timelineBody: {
      flex: 1,
      gap: 2,
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timelineType: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    timelineDate: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
    },
    timelineNotes: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
    timelineDelete: {
      padding: 4,
    },
  });
}

/** Rétrocompatibilité */
export const styles = makePersonDetailStyles(darkPalette);

/**
 * Styles du formulaire de création de rappel (new.tsx).
 * Converti en fabrique thématique makeNewReminderStyles(theme).
 */

import { StyleSheet } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { darkPalette, type ThemePalette } from '@/constants/palettes';

export function makeNewReminderStyles(theme: ThemePalette) {
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
      borderBottomColor: theme.outline.variant,
    },
    toolbarBtn: {
      minWidth: 64,
    },
    toolbarCenter: {
      alignItems: 'center',
    },
    toolbarTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    toolbarSubtitle: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontSize: 9,
    },
    toolbarCancel: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    toolbarSave: {
      ...Typography.labelLarge,
      color: theme.primary.default,
      fontWeight: '700',
      textAlign: 'right',
    },
    toolbarSaveDisabled: {
      opacity: 0.4,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    cardGroup: {
      backgroundColor: isDark ? 'rgba(26, 30, 46, 0.82)' : theme.glass.card.backgroundColor,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(208, 188, 255, 0.16)' : theme.glass.card.borderColor,
      gap: Spacing.sm,
      shadowColor: theme.shadow.color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.shadow.smOpacity,
      shadowRadius: 10,
      elevation: 3,
    },
    titleInput: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
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
      flex: 1,
      minHeight: 50,
      textAlignVertical: 'top',
    },
    inputError: {
      borderBottomWidth: 1,
      borderBottomColor: theme.error.default,
    },
    errorText: {
      ...Typography.bodySmall,
      color: theme.error.default,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: Spacing.sm,
    },
    sectionHeaderTitle: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    quickTimesRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    quickTimeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(18, 22, 34, 0.90)' : theme.surface.container,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.outline.variant,
      gap: 5,
    },
    quickTimeText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    dateSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(16, 20, 32, 0.85)' : theme.surface.container,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(208, 188, 255, 0.22)' : theme.outline.variant,
    },
    dateSelectorLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    dateValue: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      textTransform: 'capitalize',
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
      borderRadius: Radius.lg,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      gap: 4,
    },
    actionTileSelected: {
      backgroundColor: isDark ? 'rgba(208, 188, 255, 0.16)' : 'rgba(107, 70, 193, 0.15)',
      borderColor: theme.primary.default,
    },
    actionTileLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    actionTileLabelSelected: {
      color: theme.primary.default,
      fontWeight: '700',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    priorityTile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(18, 22, 34, 0.75)' : theme.surface.container,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      gap: 6,
    },
    priorityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    priorityLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldLabel: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    fieldHelper: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    recurrenceOptionsRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    recurrenceChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    recurrenceChipSelected: {
      borderColor: theme.tertiary.default,
      backgroundColor: theme.surface.high,
    },
    recurrenceText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    recurrenceTextSelected: {
      color: theme.tertiary.default,
      fontWeight: '700',
    },
    ctaContainer: {
      marginTop: Spacing.md,
      gap: Spacing.sm,
    },
    gradientBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      borderRadius: Radius.full,
      gap: Spacing.xs,
    },
    gradientBtnText: {
      ...Typography.labelLarge,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    footerNoteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    footerNote: {
      ...Typography.bodySmall,
      color: theme.onSurface.disabled,
      fontSize: 11,
    },
  });
}

/** Export pour rétro-compatibilité */
export const styles = makeNewReminderStyles(darkPalette);

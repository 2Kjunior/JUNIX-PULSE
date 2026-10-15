/**
 * Styles de l'écran d'édition d'un rappel (reminders/edit/[id].tsx).
 * Fabrique thématique adaptant les surfaces, textes, bordures et sélections au mode actif.
 */

import { StyleSheet } from 'react-native';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { darkPalette, type ThemePalette } from '@/constants/palettes';

export function makeEditReminderStyles(theme: ThemePalette) {
  return StyleSheet.create({
    keyboardContainer: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.outline.variant,
    },
    cancelBtn: {
      paddingVertical: Spacing.xs,
      paddingRight: Spacing.sm,
    },
    cancelText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    screenTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    saveBtn: {
      paddingVertical: Spacing.xs,
      paddingLeft: Spacing.sm,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveText: {
      ...Typography.bodyMedium,
      color: theme.primary.default,
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.lg,
      gap: Spacing.xl,
    },
    fieldGroup: {
      gap: Spacing.xs,
    },
    label: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: theme.onSurface.primary,
      ...Typography.bodyLarge,
    },
    inputError: {
      borderColor: theme.error.default,
    },
    textArea: {
      minHeight: 90,
    },
    errorText: {
      ...Typography.bodySmall,
      color: theme.error.default,
      marginTop: 2,
    },
    datePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    datePickerText: {
      flex: 1,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      textTransform: 'capitalize',
    },
    chipsRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      flexWrap: 'wrap',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      gap: 6,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    chipText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    actionOption: {
      flexBasis: '31%',
      flexGrow: 1,
      alignItems: 'center',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      gap: 4,
    },
    actionOptionSelected: {
      backgroundColor: theme.primary.container,
      borderColor: theme.primary.default,
    },
    actionIcon: {
      fontSize: 18,
    },
    actionLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
    actionLabelSelected: {
      color: theme.primary.default,
      fontWeight: '700',
    },
    footerBtn: {
      marginTop: Spacing.md,
    },
  });
}

export const styles = makeEditReminderStyles(darkPalette);

/**
 * Styles extraits de [id].tsx (Détail de tâche).
 * Fabrique dynamique supportant les palettes sombre et claire avec contrastes adaptés.
 */

import { StyleSheet } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makeTaskDetailStyles(theme: ThemePalette) {
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
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.xl,
    },
    statusRowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      gap: 6,
    },
    statusText: {
      ...Typography.labelMedium,
    },
    field: {
      gap: Spacing.xs,
    },
    label: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      marginBottom: 4,
    },
    input: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      color: theme.onSurface.primary,
      ...Typography.bodyMedium,
      borderWidth: isLight ? 1 : 0,
      borderColor: isLight ? theme.outline.variant : 'transparent',
    },
    multilineInput: {
      minHeight: 90,
    },
    chipRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    chipRowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chipActive: {
      backgroundColor: isLight ? theme.primary.container : theme.primary.container,
      borderColor: theme.primary.default,
    },
    chipText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    chipTextActive: {
      color: isLight ? theme.primary.onContainer : theme.primary.onContainer,
    },
    subtasksHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    subtaskCounter: {
      ...Typography.labelSmall,
      color: theme.primary.default,
    },
    subtaskRowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      gap: Spacing.sm,
    },
    subtaskWrapper: {
      marginBottom: Spacing.xs,
    },
    subtaskCheck: {
      padding: 2,
    },
    subtaskTitle: {
      flex: 1,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    subtaskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.onSurface.disabled,
    },
    subtaskDelete: {
      padding: 4,
    },
    addSubtaskContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 4,
    },
    subtaskInput: {
      flex: 1,
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: theme.onSurface.primary,
      ...Typography.bodyMedium,
      borderWidth: isLight ? 1 : 0,
      borderColor: isLight ? theme.outline.variant : 'transparent',
    },
    subtaskAddBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtn: {
      marginTop: Spacing.md,
    },
  });
}

/** Rétrocompatibilité */
export const styles = makeTaskDetailStyles(darkPalette);

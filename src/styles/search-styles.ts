/**
 * Styles extraits de search.tsx.
 * Fabrique dynamique supportant les palettes sombre et claire avec contrastes adaptés.
 */

import { StyleSheet } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makeSearchStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBarBorder: {
      flex: 1,
      borderRadius: Radius.md,
      padding: 1,
    },
    searchBarInner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isLight ? theme.surface.container : theme.surface.container,
      borderRadius: Radius.md - 1,
      paddingHorizontal: Spacing.md,
      height: 46,
      borderWidth: isLight ? 1 : 0,
      borderColor: isLight ? theme.outline.variant : 'transparent',
    },
    searchIcon: {
      marginRight: Spacing.xs,
    },
    input: {
      flex: 1,
      color: theme.onSurface.primary,
      ...Typography.bodyMedium,
      height: '100%',
    },
    clearButton: {
      padding: Spacing.xs,
    },
    filtersContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
      paddingBottom: Spacing.sm,
    },
    filtersList: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.xs,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.container : theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    filterChipActive: {
      backgroundColor: isLight ? theme.primary.container : theme.surface.high,
      borderColor: theme.primary.default,
    },
    filterText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    filterTextActive: {
      color: isLight ? theme.primary.onContainer : theme.onSurface.primary,
      fontWeight: '600',
    },
    body: {
      flex: 1,
    },
    bodyContent: {
      padding: Spacing.lg,
    },
    recentSection: {
      marginBottom: Spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.variant,
    },
    clearText: {
      ...Typography.bodySmall,
      color: theme.primary.default,
    },
    recentChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.container : theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    recentChipText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    infoCardInner: {
      alignItems: 'center',
    },
    infoCardTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    infoCardText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      textAlign: 'center',
      lineHeight: 20,
    },
    resultsList: {
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    typeIconContainer: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultInfo: {
      flex: 1,
    },
    resultMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: 2,
    },
    typeBadge: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    resultSubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.disabled,
    },
    resultTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isLight ? theme.surface.container : theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    emptyTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginBottom: Spacing.xs,
    },
    emptySubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}

/** Rétrocompatibilité */
export const styles = makeSearchStyles(darkPalette);

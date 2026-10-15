/**
 * Styles extraits de events/[id].tsx (Détail d'un événement).
 * Fabrique dynamique supportant les palettes sombre et claire avec contrastes adaptés.
 */

import { StyleSheet } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makeEventDetailStyles(theme: ThemePalette) {
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
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.xl,
    },
    cardInner: {
      gap: Spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    eventTitle: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
      flex: 1,
    },
    typeBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    typeBadgeBusy: {
      backgroundColor: isLight ? theme.primary.container : theme.primary.container,
    },
    typeBadgeFree: {
      backgroundColor: theme.surface.high,
    },
    typeText: {
      ...Typography.labelSmall,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.surface.high,
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: isLight ? 1 : 0,
      borderColor: isLight ? theme.outline.variant : 'transparent',
    },
    infoTitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    infoSub: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
    linkSub: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      marginTop: 2,
    },
    notesBox: {
      backgroundColor: theme.surface.high,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: isLight ? 1 : 0,
      borderColor: isLight ? theme.outline.variant : 'transparent',
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
    },
    personRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      padding: Spacing.md,
      gap: Spacing.md,
      marginBottom: Spacing.xs,
      borderWidth: isLight ? 1 : 0,
      borderColor: isLight ? theme.outline.variant : 'transparent',
    },
    personAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isLight ? theme.primary.container : theme.primary.container,
      alignItems: 'center',
      justifyContent: 'center',
    },
    personAvatarText: {
      ...Typography.titleMedium,
      color: isLight ? theme.primary.onContainer : theme.primary.onContainer,
    },
    personName: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    personRelation: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
  });
}

/** Rétrocompatibilité */
export const styles = makeEventDetailStyles(darkPalette);

/**
 * Styles extraits de people.tsx.
 * Fabrique dynamique supportant les palettes sombre et claire.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makePeopleStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    title: {
      ...Typography.headlineLarge,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      color: theme.onSurface.primary,
      fontWeight: '700',
      letterSpacing: -0.5,
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

    list: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.high,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    avatarForgotten: {
      borderColor: theme.priority.HIGH + '60',
    },
    avatarText: {
      ...Typography.titleMedium,
      color: theme.primary.default,
      fontWeight: '700',
    },
    cardContent: {
      flex: 1,
      gap: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    displayName: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    relationshipBadge: {
      backgroundColor: isLight ? theme.surface.container : theme.surface.base,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 1,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    relationshipText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
    },
    lastContactText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    forgottenBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    forgottenText: {
      ...Typography.labelSmall,
      color: theme.priority.HIGH,
      fontWeight: '600',
    },
    actionsCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    quickActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionIconBtn: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.high : theme.surface.base,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    floatingCtaContainer: {
      position: 'absolute',
      right: Spacing.lg,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isLight ? 0.25 : 0.45,
          shadowRadius: 18,
        },
        android: {
          elevation: 8,
        },
        default: {
          boxShadow: isLight
            ? '0 8px 32px -4px rgba(107, 70, 193, 0.35)'
            : '0 8px 32px -4px rgba(124, 58, 237, 0.40)',
        },
      }),
    },
    floatingCta: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: Radius.full,
      gap: 6,
    },
    floatingCtaText: {
      ...Typography.labelLarge,
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}

/** Rétrocompatibilité */
export const styles = makePeopleStyles(darkPalette);

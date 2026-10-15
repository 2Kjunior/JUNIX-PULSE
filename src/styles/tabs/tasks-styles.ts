/**
 * Styles de l'onglet Tâches (R-08).
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

export function makeTasksStyles(theme: ThemePalette) {
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
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    taskRowCompleted: {
      opacity: 0.55,
    },
    checkBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
      gap: 6,
    },
    taskTitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
      fontSize: 15,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.onSurface.disabled,
    },
    // ─── Mini-jauge de progression des sous-tâches ─────────────────────────────
    progressTrack: {
      height: 3,
      backgroundColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.08)',
      borderRadius: Radius.full,
      overflow: 'hidden',
      marginTop: 2,
      marginBottom: 2,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary.default,
      borderRadius: Radius.full,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isLight ? theme.surface.container : 'rgba(255, 255, 255, 0.05)',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.09)',
      gap: 4,
    },
    metaPillOverdue: {
      backgroundColor: isLight ? theme.error.container : 'rgba(147, 0, 10, 0.22)',
      borderColor: theme.error.default + '55',
    },
    metaPillText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 11,
    },
    metaPillTextOverdue: {
      color: theme.error.default,
      fontWeight: '600',
    },
    priorityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
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
            ? '0 8px 24px -4px rgba(107, 70, 193, 0.35)'
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
export const styles = makeTasksStyles(darkPalette);

/**
 * Styles extraits de calendar.tsx.
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

export function makeCalendarStyles(theme: ThemePalette) {
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
    headerTitleCol: {
      gap: 2,
    },
    title: {
      ...Typography.headlineLarge,
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
      color: theme.onSurface.primary,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    subtitle: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      textTransform: 'capitalize',
      fontFamily: FontFamily?.medium,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    todayBtn: {
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: Spacing.xs + 1,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.high : theme.glass.card.backgroundColor,
      borderWidth: 1,
      borderColor: isLight ? theme.primary.default + '55' : theme.primary.default + '66',
      marginRight: 4,
    },
    todayBtnDisabled: {
      backgroundColor: isLight ? theme.surface.container : theme.surface.container,
      borderColor: theme.outline.default,
      opacity: 0.75,
    },
    todayBtnText: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      fontWeight: '700',
      fontFamily: FontFamily?.bold,
    },
    todayBtnTextDisabled: {
      color: theme.onSurface.disabled,
    },
    navArrowBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.high : 'rgba(26, 30, 44, 0.75)',
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.sm,
      backgroundColor: isLight ? theme.surface.container : 'rgba(20, 24, 36, 0.82)',
      borderRadius: Radius.xl,
      marginHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.08)',
      marginBottom: Spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.shadow.smOpacity,
          shadowRadius: 8,
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
    dayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xs + 2,
      paddingHorizontal: 1,
      borderRadius: Radius.md,
      maxWidth: 48,
      height: 60,
    },
    dayCellSelected: {
      backgroundColor: theme.primary.default,
      ...Platform.select({
        ios: {
          shadowColor: theme.primary.default,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isLight ? 0.30 : 0.45,
          shadowRadius: 10,
        },
        android: {
          elevation: 5,
        },
        default: {
          boxShadow: isLight
            ? '0 4px 14px 0 rgba(107, 70, 193, 0.35)'
            : '0 4px 14px 0 rgba(139, 92, 246, 0.45)',
        },
      }),
    },
    dayCellToday: {
      backgroundColor: isLight ? theme.surface.high : 'rgba(26, 30, 44, 0.85)',
      borderWidth: 1,
      borderColor: isLight ? theme.primary.default + '60' : 'rgba(139, 92, 246, 0.50)',
    },
    dayName: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
      fontWeight: '600',
      fontFamily: FontFamily?.medium,
    },
    dayNumber: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginTop: 2,
      fontWeight: '700',
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    },
    dayTextSelected: {
      color: theme.primary.on,
      fontWeight: '700',
    },
    dayTextToday: {
      color: theme.primary.default,
      fontWeight: '700',
    },
    list: {
      paddingHorizontal: Spacing.lg,
      flexGrow: 1,
      gap: Spacing.lg,
    },
    section: {
      gap: Spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: 2,
    },
    sectionTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
      fontFamily: FontFamily?.semiBold,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    eventTimeCol: {
      alignItems: 'center',
      minWidth: 46,
    },
    eventTimeText: {
      ...Typography.titleMedium,
      color: theme.primary.default,
      fontWeight: '700',
      fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    },
    eventDurationText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 11,
    },
    eventBody: {
      flex: 1,
      gap: 4,
    },
    eventTitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    eventLocation: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    eventBufferText: {
      ...Typography.labelSmall,
      color: theme.tertiary.default,
      fontSize: 11,
    },
    typeBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    typeBadgeBusy: {
      backgroundColor: isLight ? theme.primary.container : 'rgba(139, 92, 246, 0.20)',
      borderColor: isLight ? theme.primary.default + '40' : 'rgba(139, 92, 246, 0.35)',
    },
    typeBadgeFree: {
      backgroundColor: isLight ? theme.surface.high : 'rgba(255, 255, 255, 0.06)',
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.10)',
    },
    typeBadgeText: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      fontSize: 10,
      fontWeight: '600',
    },
    reminderIconCircle: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskIconCircle: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.high : 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemBody: {
      flex: 1,
      gap: 2,
    },
    itemTitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    itemTime: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    emptyCard: {
      backgroundColor: isLight ? theme.surface.container : 'rgba(22, 26, 38, 0.75)',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.10)',
      padding: Spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.xxl,
      gap: Spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.shadow.smOpacity,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
        default: {
          boxShadow: isLight
            ? '0 6px 20px -4px rgba(107, 70, 193, 0.10)'
            : '0 6px 20px -4px rgba(0, 0, 0, 0.35)',
        },
      }),
    },
    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.primary.container : 'rgba(255, 255, 255, 0.06)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    emptyTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    emptyDescription: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
    fabContainer: {
      position: 'absolute',
      right: Spacing.lg,
      borderRadius: Radius.full,
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
    fabGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.full,
      gap: 6,
    },
    fabText: {
      ...Typography.titleMedium,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    viewModeSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isLight ? theme.surface.container : 'rgba(20, 24, 36, 0.85)',
      borderRadius: Radius.lg,
      padding: 3,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.08)',
    },
    viewModeTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: Radius.md,
      gap: 6,
    },
    viewModeTabActive: {
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.16)',
      borderWidth: 1,
      borderColor: isLight ? theme.primary.default + '40' : 'rgba(208, 188, 255, 0.35)',
    },
    viewModeTabText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      fontWeight: '600',
    },
    viewModeTabTextActive: {
      color: theme.primary.default,
      fontWeight: '700',
    },
  });
}

/** Rétrocompatibilité */
export const styles = makeCalendarStyles(darkPalette);

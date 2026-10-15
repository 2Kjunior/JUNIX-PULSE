/**
 * Styles pour l'écran Aujourd'hui (TodayScreen).
 * Converti en fabrique thématique makeTodayStyles(theme) pour supporter les modes sombre et clair.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { darkPalette, type ThemePalette } from '@/constants/palettes';

export function makeTodayStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      // Transparent : AnimatedBackgroundGlow est visible derrière cet écran
      backgroundColor: 'transparent',
    },
    content: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerInfo: {
      flex: 1,
    },
    greeting: {
      ...Typography.headlineLarge,
      color: theme.onSurface.primary,
    },
    date: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textTransform: 'capitalize',
      marginTop: 2,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: isDark ? 'rgba(20, 24, 36, 0.82)' : theme.surface.container,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.shadow.smOpacity,
          shadowRadius: 6,
        },
        android: {
          elevation: 3,
        },
        default: {
          boxShadow: isDark
            ? '0 2px 10px -2px rgba(0, 0, 0, 0.35)'
            : '0 2px 10px -2px rgba(107, 70, 193, 0.08)',
        },
      }),
    },
    summaryRow: {
      flexDirection: 'row',
    },
    summaryRowContent: {
      paddingRight: Spacing.lg,
      gap: Spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(20, 24, 36, 0.82)' : theme.surface.container,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md + 2,
      paddingVertical: Spacing.xs + 2,
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : theme.outline.variant,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.shadow.smOpacity,
          shadowRadius: 6,
        },
        android: {
          elevation: 2,
        },
        default: {
          boxShadow: isDark
            ? '0 2px 8px -2px rgba(0, 0, 0, 0.30)'
            : '0 2px 8px -2px rgba(107, 70, 193, 0.06)',
        },
      }),
    },
    chipCount: {
      ...Typography.labelLarge,
      fontWeight: '700',
    },
    chipLabel: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    sectionBlock: {
      gap: Spacing.sm,
    },
    blockTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    nowIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.error.default,
    },
    blockTitle: {
      ...Typography.labelLarge,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    urgentContent: {
      gap: Spacing.xs,
    },
    urgentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    urgentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    urgentBadgeText: {
      ...Typography.labelSmall,
      color: theme.error.default,
      fontWeight: '700',
    },
    urgentTime: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    urgentTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    urgentSubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    zenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    zenText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    nextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    nextTimeCol: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 54,
    },
    nextTimeText: {
      ...Typography.titleMedium,
      color: theme.primary.default,
      fontWeight: '700',
    },
    nextTypeLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    nextDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.outline.variant,
    },
    nextBody: {
      flex: 1,
      gap: 2,
    },
    nextTitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    nextSubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    suggestionCard: {
      backgroundColor: isDark ? 'rgba(24, 28, 42, 0.82)' : theme.glass.card.backgroundColor,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(107, 70, 193, 0.35)',
      gap: Spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.shadow.smOpacity,
          shadowRadius: 16,
        },
        android: {
          elevation: 4,
        },
        default: {
          boxShadow: isDark
            ? '0 8px 24px -4px rgba(139, 92, 246, 0.22)'
            : '0 8px 24px -4px rgba(107, 70, 193, 0.12)',
        },
      }),
    },
    suggHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    aiOrb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggBadge: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    suggTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
    },
    suggExplanation: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      lineHeight: 18,
    },
    suggActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    suggRefuseBtn: {
      paddingHorizontal: Spacing.md + 2,
      paddingVertical: Spacing.xs + 4,
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : theme.surface.container,
    },
    suggRefuseText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      fontWeight: '600',
    },
    suggAcceptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary.default,
      paddingHorizontal: Spacing.md + 4,
      paddingVertical: Spacing.xs + 4,
      minHeight: 38,
      borderRadius: Radius.full,
      gap: 6,
    },
    suggAcceptText: {
      ...Typography.labelMedium,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    progressCard: {
      backgroundColor: isDark ? 'rgba(22, 26, 38, 0.75)' : theme.glass.card.backgroundColor,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : theme.glass.card.borderColor,
      gap: Spacing.sm,
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
          boxShadow: isDark
            ? '0 6px 18px -4px rgba(0, 0, 0, 0.35)'
            : '0 6px 18px -4px rgba(107, 70, 193, 0.08)',
        },
      }),
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressLabel: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
    },
    progressValue: {
      ...Typography.labelMedium,
      color: theme.tertiary.default,
      fontWeight: '700',
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.surface.high,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.tertiary.default,
      borderRadius: 3,
    },
    subBlock: {
      gap: Spacing.xs,
      marginTop: Spacing.sm,
    },
    subHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    subTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
    },
    subAction: {
      ...Typography.labelMedium,
      color: theme.primary.default,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    checkBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    cardBody: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    cardTitleStrikethrough: {
      textDecorationLine: 'line-through',
      opacity: 0.5,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardSubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    inlineMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    emptyContent: {
      alignItems: 'center',
      gap: 4,
    },
    emptyText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    emptyAction: {
      ...Typography.labelSmall,
      color: theme.primary.default,
    },
    goalContent: {
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    goalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    goalCardTitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
      flex: 1,
    },
    goalCardPercent: {
      ...Typography.labelSmall,
      color: theme.success.default,
      fontWeight: '700',
    },
    demoCardWrapper: {
      borderRadius: Radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(208, 188, 255, 0.3)' : 'rgba(107, 70, 193, 0.3)',
      marginBottom: Spacing.sm,
    },
    demoCard: {
      padding: Spacing.lg,
      gap: Spacing.xs,
    },
    demoHeader: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    demoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(208, 188, 255, 0.15)' : 'rgba(107, 70, 193, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    demoBadgeText: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    demoTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    demoSubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      lineHeight: 18,
      marginBottom: Spacing.xs,
    },
    demoBtn: {
      borderRadius: Radius.full,
      overflow: 'hidden',
      marginTop: 4,
    },
    demoBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: Spacing.lg,
      gap: 8,
    },
    demoBtnText: {
      ...Typography.labelMedium,
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}

/** Export pour rétro-compatibilité */
export const styles = makeTodayStyles(darkPalette);

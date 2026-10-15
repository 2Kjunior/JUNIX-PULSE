/**
 * Styles extraits de index.tsx.
 */

import { StyleSheet } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { darkPalette } from '@/constants/palettes';

export function makeRemindersStyles(theme: ThemePalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleCol: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    title: {
      ...Typography.headlineLarge,
      color: theme.onSurface.primary,
    },
    countBadge: {
      backgroundColor: theme.surface.high,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    countBadgeText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontWeight: '600',
    },
    subtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
    actionIconBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filtersWrapper: {
      paddingVertical: Spacing.xs,
    },
    filtersContainer: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.xs,
    },
    filterChip: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    filterChipActive: {
      backgroundColor: theme.surface.high,
      borderColor: theme.primary.default,
    },
    filterChipText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    filterChipTextActive: {
      color: theme.primary.default,
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      gap: Spacing.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionHeaderTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    sectionHeaderSubtitle: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    cardWrapper: {
      marginBottom: Spacing.xs,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    checkCircle: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
      gap: 6,
    },
    cardTitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
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
      backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: 4,
    },
    metaPillText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 11,
    },
    priorityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    quickSnoozeBtn: {
      backgroundColor: theme.tertiary.container,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: theme.tertiary.default + '40',
    },
    quickSnoozeText: {
      ...Typography.labelSmall,
      color: theme.tertiary.default,
      fontWeight: '700',
    },
    moreBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nightModeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginTop: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: Spacing.md,
    },
    nightModeTextCol: {
      flex: 1,
      gap: 2,
    },
    nightModeTitle: {
      ...Typography.labelLarge,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    nightModeDesc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      lineHeight: 16,
    },
    floatingCtaContainer: {
      position: 'absolute',
      right: Spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.mode === 'dark' ? 0.35 : 0.15,
      shadowRadius: 8,
      elevation: 6,
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

export const styles = makeRemindersStyles(darkPalette);


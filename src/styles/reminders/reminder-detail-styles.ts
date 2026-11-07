/**
 * Styles extraits de reminders/[id].tsx (Détail d'un rappel).
 * Fabrique dynamique supportant les palettes sombre et claire avec contrastes adaptés.
 */

import { StyleSheet } from 'react-native';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { ThemePalette, darkPalette } from '@/constants/palettes';

export function makeReminderDetailStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
    },
    navBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    editBtn: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },
    editLabel: {
      ...Typography.labelLarge,
      color: theme.primary.default,
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    mainCardInner: {
      gap: Spacing.sm,
    },
    badgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.base,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderWidth: 1,
      gap: 4,
    },
    priorityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    priorityBadgeText: {
      ...Typography.labelSmall,
      fontWeight: '700',
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
    metaPillText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
    title: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    timeText: {
      ...Typography.bodyMedium,
      color: theme.primary.default,
      textTransform: 'capitalize',
    },
    actionSection: {
      marginTop: 2,
    },
    peopleList: {
      gap: Spacing.md,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
    },
    actionCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    actionIconBox: {
      width: 38,
      height: 38,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionCardLabel: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    actionCardTarget: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    actionExecuteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.glass.controlActive,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.primary.default + '66',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      gap: 4,
    },
    actionExecuteText: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      fontWeight: '700',
    },
    notesCardInner: {
      gap: Spacing.xs,
    },
    notesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    sectionTitle: {
      ...Typography.labelLarge,
      color: theme.onSurface.variant,
    },
    notesText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      lineHeight: 22,
    },
    checklistCardInner: {
      gap: Spacing.xs,
    },
    checklistItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      gap: Spacing.sm,
    },
    checklistItemText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      flex: 1,
    },
    checklistItemDone: {
      textDecorationLine: 'line-through',
      opacity: 0.5,
      color: theme.onSurface.disabled,
    },
    bottomBar: {
      position: 'absolute',
      left: Spacing.md,
      right: Spacing.md,
      flexDirection: 'row',
      backgroundColor: theme.glass.nav.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
      borderRadius: Radius.xl,
      overflow: 'hidden',
      padding: Spacing.xs,
      gap: Spacing.xs,
    },
    bottomBarOpaque: {
      backgroundColor: theme.surface.container,
      borderColor: theme.outline.variant,
    },
    bottomBtn: {
      flex: 1,
    },
    snoozeOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'flex-end',
      zIndex: 1000,
    },
    snoozeBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    snoozeSheet: {
      backgroundColor: theme.glass.nav.backgroundColor,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.onSurface.disabled,
      alignSelf: 'center',
      marginBottom: Spacing.xs,
    },
    snoozeTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
      textAlign: 'center',
    },
    snoozeSubtitle: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    snoozeGrid: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    snoozeTile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.glass.control.backgroundColor,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
      gap: 4,
    },
    snoozeTileText: {
      ...Typography.labelMedium,
      color: theme.tertiary.default,
      fontWeight: '700',
    },
    snoozeFullOptions: {
      gap: Spacing.xs,
    },
    snoozeFullOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.glass.control.backgroundColor,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    snoozeOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    snoozeOptionLabel: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    snoozeOptionHint: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
      textTransform: 'capitalize',
    },
  });
}

/** Rétrocompatibilité */
export const styles = makeReminderDetailStyles(darkPalette);

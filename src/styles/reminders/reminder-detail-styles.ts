/**
 * Styles extraits de [id].tsx.
 */

import { StyleSheet } from 'react-native';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
  Success,
  Error as ErrorColors,
} from '@/constants/theme';

export const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  editBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  editLabel: {
    ...Typography.labelLarge,
    color: Primary.default,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  // mainCard -> GlowCard tone="attention" size="hero" ; mainCardInner = layout interne.
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
    backgroundColor: Surface.base,
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
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 4,
  },
  metaPillText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  title: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timeText: {
    ...Typography.bodyMedium,
    color: Primary.default,
    textTransform: 'capitalize',
  },
  actionSection: {
    marginTop: 2,
  },
  // actionCard -> GlowCard tone="neutral" ; actionCardRow = layout interne.
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
    color: OnSurface.primary,
    fontWeight: '600',
  },
  actionCardTarget: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  actionExecuteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Primary.default,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  actionExecuteText: {
    ...Typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // notesCard -> GlowCard tone="neutral" ; notesCardInner = layout interne.
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
    color: OnSurface.variant,
  },
  notesText: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    lineHeight: 22,
  },
  // checklistCard -> GlowCard tone="neutral" ; checklistCardInner = layout interne.
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
    color: OnSurface.primary,
    flex: 1,
  },
  checklistItemDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Surface.container,
    borderTopWidth: 1,
    borderTopColor: Outline.variant,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  snoozeBtn: {
    backgroundColor: Tertiary.container,
    borderColor: Tertiary.default + '40',
  },
  snoozeBtnText: {
    ...Typography.labelMedium,
    color: Tertiary.default,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: Success.container,
    borderColor: Success.default + '40',
  },
  completeBtnText: {
    ...Typography.labelMedium,
    color: Success.default,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: ErrorColors.container,
    borderColor: ErrorColors.default + '40',
  },
  deleteBtnText: {
    ...Typography.labelMedium,
    color: ErrorColors.default,
    fontWeight: '700',
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
    backgroundColor: Surface.container,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: OnSurface.disabled,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  snoozeTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  snoozeSubtitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
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
    backgroundColor: Surface.base,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 4,
  },
  snoozeTileText: {
    ...Typography.labelMedium,
    color: Tertiary.default,
    fontWeight: '700',
  },
  snoozeFullOptions: {
    gap: Spacing.xs,
  },
  snoozeFullOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Surface.base,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  snoozeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  snoozeOptionLabel: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  snoozeOptionHint: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  snoozeConfirmBtn: {
    backgroundColor: Primary.default,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  snoozeConfirmLabel: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

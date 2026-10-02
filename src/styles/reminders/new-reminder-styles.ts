/**
 * Styles extraits de new.tsx.
 */

import { StyleSheet } from 'react-native';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  toolbarBtn: {
    minWidth: 64,
  },
  toolbarCenter: {
    alignItems: 'center',
  },
  toolbarTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  toolbarSubtitle: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 9,
  },
  toolbarCancel: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  toolbarSave: {
    ...Typography.labelLarge,
    color: Primary.default,
    fontWeight: '700',
    textAlign: 'right',
  },
  toolbarSaveDisabled: {
    opacity: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardGroup: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.sm,
  },
  titleInput: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
    paddingVertical: Spacing.xs,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Outline.variant,
    paddingTop: Spacing.sm,
  },
  notesIcon: {
    marginTop: 2,
  },
  notesInput: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    flex: 1,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  inputError: {
    borderBottomWidth: 1,
    borderBottomColor: ErrorColors.default,
  },
  errorText: {
    ...Typography.bodySmall,
    color: ErrorColors.default,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  sectionHeaderTitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickTimesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 4,
  },
  quickTimeText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Surface.base,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  dateValue: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    textTransform: 'capitalize',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  actionTile: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 4,
  },
  actionTileSelected: {
    backgroundColor: Surface.high,
    borderColor: Primary.default,
  },
  actionTileLabel: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  actionTileLabelSelected: {
    color: Primary.default,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  priorityTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityLabel: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  fieldHelper: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  recurrenceOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  recurrenceChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Surface.base,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  recurrenceChipSelected: {
    borderColor: Tertiary.default,
    backgroundColor: Surface.high,
  },
  recurrenceText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  recurrenceTextSelected: {
    color: Tertiary.default,
    fontWeight: '700',
  },
  ctaContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  gradientBtnText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerNote: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
    fontSize: 11,
  },
});

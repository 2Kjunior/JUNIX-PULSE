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
} from '@/constants/theme';

export const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  // profileCard -> GlowCard tone="attention"|"neutral" size="hero" ;
  // profileCardInner = layout interne.
  profileCardInner: {
    gap: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Outline.variant,
  },
  avatarForgotten: {
    borderColor: '#F59E0B',
  },
  avatarText: {
    ...Typography.headlineMedium,
    color: Primary.default,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  relationshipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Surface.high,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  relationshipText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 11,
  },
  importedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(123, 208, 255, 0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(123, 208, 255, 0.25)',
  },
  importedText: {
    ...Typography.labelSmall,
    color: Tertiary.default,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  statusBannerOk: {
    backgroundColor: 'rgba(109, 213, 140, 0.08)',
    borderColor: 'rgba(109, 213, 140, 0.2)',
  },
  statusBannerAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusBannerText: {
    ...Typography.labelMedium,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Surface.high,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 6,
  },
  quickActionText: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  notesBox: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  notesTitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    marginBottom: 2,
  },
  notesText: {
    ...Typography.bodySmall,
    color: OnSurface.primary,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  // logCard -> GlowCard tone="neutral" ; logCardInner = layout interne.
  logCardInner: {
    gap: Spacing.md,
  },
  typeScroll: {
    flexGrow: 0,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: Primary.container,
    borderColor: Primary.default,
  },
  typeChipText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  typeChipTextActive: {
    color: Primary.onContainer,
    fontWeight: '600',
  },
  logInput: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: OnSurface.primary,
    ...Typography.bodySmall,
    minHeight: 64,
  },
  // emptyBox -> GlowCard tone="neutral" ; emptyBoxInner = layout interne.
  emptyBoxInner: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginTop: Spacing.xs,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
  },
  // timelineItem -> GlowCard tone="neutral" ; timelineRow = layout interne.
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineType: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  timelineDate: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
  },
  timelineNotes: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  timelineDelete: {
    padding: 4,
  },
});

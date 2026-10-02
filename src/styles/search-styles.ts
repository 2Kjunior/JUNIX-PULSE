/**
 * Styles extraits de search.tsx.
 */

import { StyleSheet } from 'react-native';
import {
  Surface,
  Primary,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarBorder: {
    flex: 1,
    borderRadius: Radius.md,
    padding: 1,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md - 1,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
    height: '100%',
  },
  clearButton: {
    padding: Spacing.xs,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
    paddingBottom: Spacing.sm,
  },
  filtersList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  filterChipActive: {
    backgroundColor: Surface.high,
    borderColor: Primary.default,
  },
  filterText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  filterTextActive: {
    color: OnSurface.primary,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.lg,
  },
  recentSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: OnSurface.variant,
  },
  clearText: {
    ...Typography.bodySmall,
    color: Primary.default,
  },
  recentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  recentChipText: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  infoCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  infoCardTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  infoCardText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsList: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
  },
  resultTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 20,
  },
});

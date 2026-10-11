/**
 * Styles extraits de calendar.tsx.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Primary,
  Tertiary,
  OnSurface,
  Spacing,
  Radius,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';

export const styles = StyleSheet.create({
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
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
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
    backgroundColor: 'rgba(26, 30, 44, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.40)',
    marginRight: 4,
  },
  todayBtnDisabled: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.45,
  },
  todayBtnText: {
    ...Typography.labelSmall,
    color: Primary.default,
    fontWeight: '700',
    fontFamily: FontFamily?.bold,
  },
  todayBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(26, 30, 44, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(20, 24, 36, 0.82)',
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.3)',
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
    backgroundColor: Primary.default,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      default: {
        boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.45)',
      },
    }),
  },
  dayCellToday: {
    backgroundColor: 'rgba(26, 30, 44, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.50)',
  },
  dayName: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: FontFamily?.medium,
  },
  dayNumber: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    marginTop: 2,
    fontWeight: '700',
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
  },
  dayTextSelected: {
    color: '#141317',
    fontWeight: '700',
  },
  dayTextToday: {
    color: Primary.default,
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
    color: '#FFFFFF',
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
    color: Primary.default,
    fontWeight: '700',
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
  },
  eventDurationText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 11,
  },
  eventBody: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    ...Typography.bodyLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  eventBufferText: {
    ...Typography.labelSmall,
    color: Tertiary.default,
    fontSize: 11,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  typeBadgeBusy: {
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  typeBadgeFree: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  typeBadgeText: {
    ...Typography.labelSmall,
    color: Primary.default,
    fontSize: 10,
    fontWeight: '600',
  },
  reminderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  itemTime: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  emptyCard: {
    backgroundColor: 'rgba(22, 26, 38, 0.75)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.35)',
      },
    }),
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyDescription: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    borderRadius: Radius.full,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 8px 32px -4px rgba(124, 58, 237, 0.40)',
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
});


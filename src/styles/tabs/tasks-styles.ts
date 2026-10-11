/**
 * Styles extraits de tasks.tsx.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Primary,
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
  title: {
    ...Typography.headlineLarge,
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(26, 30, 44, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 24, 36, 0.82)',
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
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
        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  tabLabel: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    fontFamily: FontFamily?.medium,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FontFamily?.bold,
  },
  tabBadge: {
    backgroundColor: 'rgba(11, 13, 20, 0.65)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  tabBadgeActive: {
    borderColor: Primary.default,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
  },
  tabBadgeText: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: OnSurface.variant,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  taskRowCompleted: {
    opacity: 0.65,
  },
  checkBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    gap: 4,
  },
  metaPillText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 11,
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


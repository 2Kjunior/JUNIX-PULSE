/**
 * Styles extraits de tasks.tsx.
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
    // Transparent : AnimatedBackgroundGlow (monte a la racine de l'app)
    // doit etre visible derriere cet ecran.
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
    color: OnSurface.primary,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Surface.container,
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 5,
  },
  tabItemActive: {
    backgroundColor: Surface.high,
  },
  tabLabel: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  tabLabelActive: {
    color: OnSurface.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  tabBadgeActive: {
    borderColor: Primary.default,
  },
  tabBadgeText: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: OnSurface.variant,
  },
  tabBadgeTextActive: {
    color: Primary.default,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.sm,
  },
  taskCardCompleted: {
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
    color: OnSurface.primary,
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
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Outline.variant,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
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

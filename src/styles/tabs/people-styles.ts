/**
 * Styles extraits de people.tsx.
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
    gap: 6,
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
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  // card / cardForgotten : remplacés par <GlowCard tone="attention"|"neutral">.
  // cardRow reprend l'agencement interne (avatar + contenu + actions) sans le
  // fond/la bordure, désormais gérés par GlowCard lui-même.
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  avatarForgotten: {
    borderColor: '#F59E0B' + '50',
  },
  avatarText: {
    ...Typography.titleMedium,
    color: Primary.default,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  displayName: {
    ...Typography.bodyLarge,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  relationshipBadge: {
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  relationshipText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
  },
  lastContactText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  forgottenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  forgottenText: {
    ...Typography.labelSmall,
    color: '#F59E0B',
    fontWeight: '600',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
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

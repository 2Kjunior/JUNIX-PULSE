/**
 * Styles pour l'écran Aujourd'hui (TodayScreen).
 * Extraits de (tabs)/index.tsx pour lisibilité.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Success,
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
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    ...Typography.headlineLarge,
    color: OnSurface.primary,
  },
  date: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(20, 24, 36, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.35)',
      },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryRowContent: {
    paddingRight: Spacing.lg,
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 24, 36, 0.82)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.xs + 2,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.20,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.30)',
      },
    }),
  },
  chipCount: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
  chipLabel: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  sectionBlock: {
    gap: Spacing.sm,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  nowIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ErrorColors.default,
  },
  blockTitle: {
    ...Typography.labelLarge,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // urgentCard -> GlowCard tone="urgent" ; urgentContent reprend le layout interne.
  urgentContent: {
    gap: Spacing.xs,
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentBadgeText: {
    ...Typography.labelSmall,
    color: ErrorColors.default,
    fontWeight: '700',
  },
  urgentTime: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  urgentTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  urgentSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  // zenCard -> GlowCard tone="success" intensity="soft" ; zenRow = layout interne.
  zenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  zenText: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  // nextCard -> GlowCard tone="info" ; nextRow = layout interne.
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  nextTimeCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  nextTimeText: {
    ...Typography.titleMedium,
    color: Primary.default,
    fontWeight: '700',
  },
  nextTypeLabel: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  nextDivider: {
    width: 1,
    height: 32,
    backgroundColor: Outline.variant,
  },
  nextBody: {
    flex: 1,
    gap: 2,
  },
  nextTitle: {
    ...Typography.bodyLarge,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  nextSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  suggestionCard: {
    backgroundColor: 'rgba(24, 28, 42, 0.82)',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: '0 8px 24px -4px rgba(139, 92, 246, 0.22)',
      },
    }),
  },
  suggHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aiOrb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggBadge: {
    ...Typography.labelSmall,
    color: Primary.default,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
  },
  suggExplanation: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 18,
  },
  suggActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  suggRefuseBtn: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.xs + 4,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  suggRefuseText: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    fontWeight: '600',
  },
  suggAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Primary.default,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.xs + 4,
    minHeight: 38,
    borderRadius: Radius.full,
    gap: 6,
  },
  suggAcceptText: {
    ...Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: 'rgba(22, 26, 38, 0.75)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0 6px 18px -4px rgba(0, 0, 0, 0.35)',
      },
    }),
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
  },
  progressValue: {
    ...Typography.labelMedium,
    color: Tertiary.default,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Surface.high,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Tertiary.default,
    borderRadius: 3,
  },
  subBlock: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
  },
  subAction: {
    ...Typography.labelMedium,
    color: Primary.default,
  },
  // taskCard -> GlowCard tone="neutral" (pas de priorite affichee ici) ;
  // taskRow = layout interne.
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // habitCard/habitCardCompleted -> GlowCard tone="neutral"|"success" (soft).
  // habitRow = layout interne.
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  cardTitleStrikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // emptyCard -> GlowCard tone="neutral" ; emptyContent = layout interne.
  emptyContent: {
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  emptyAction: {
    ...Typography.labelSmall,
    color: Primary.default,
  },
  // goalRowCard -> GlowCard tone="neutral" ; goalContent = layout interne.
  goalContent: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalCardTitle: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    fontWeight: '600',
    flex: 1,
  },
  goalCardPercent: {
    ...Typography.labelSmall,
    color: '#6DD58C',
    fontWeight: '700',
  },
  demoCardWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.3)',
    marginBottom: Spacing.sm,
  },
  demoCard: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  demoHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(208, 188, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  demoBadgeText: {
    ...Typography.labelSmall,
    color: Primary.default,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  demoTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  demoSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  demoBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  demoBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  demoBtnText: {
    ...Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

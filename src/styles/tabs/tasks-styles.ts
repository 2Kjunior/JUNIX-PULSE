/**
 * Styles extraits de tasks.tsx.
 */

import { StyleSheet, Platform } from 'react-native';
import {
  Primary,
  OnSurface,
  Error as ErrorColors,
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

  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  taskRowCompleted: {
    opacity: 0.55,
  },
  checkBtn: {
    width: 44,
    height: 44,
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
    fontSize: 15,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  // ─── Mini-jauge de progression des sous-tâches ─────────────────────────────
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Primary.default,
    borderRadius: Radius.full,
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
  metaPillOverdue: {
    backgroundColor: 'rgba(147, 0, 10, 0.22)',
    borderColor: 'rgba(255, 180, 171, 0.35)',
  },
  metaPillText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 11,
  },
  metaPillTextOverdue: {
    color: ErrorColors.default,
    fontWeight: '600',
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
        shadowColor: Primary.default,
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


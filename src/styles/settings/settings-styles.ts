/**
 * Styles Paramètres — Midnight Glassmorphism Junix Pulse.
 */

import { StyleSheet, Platform } from 'react-native';
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    padding: Spacing.xs,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.titleLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.labelMedium,
    color: Primary.default,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(24, 28, 42, 0.80)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  rowCol: {
    backgroundColor: 'rgba(24, 28, 42, 0.80)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.12)',
  },
  rowLabel: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rowSub: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  rowValCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowValue: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  hourPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(15, 18, 28, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  hourPillActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.18)',
    borderColor: Primary.default,
  },
  hourPillText: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  hourPillTextActive: {
    color: Primary.default,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: 'rgba(20, 24, 38, 0.75)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.14)',
  },
  infoText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    flex: 1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'rgba(24, 28, 42, 0.98)',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.22)',
  },
  modalTitle: {
    ...Typography.titleLarge,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(15, 18, 28, 0.90)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.18)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: '#FFFFFF',
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  version: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

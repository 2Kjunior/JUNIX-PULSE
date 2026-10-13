/**
 * Styles universels pour tous les formulaires de Junix Pulse.
 * Garantit une cohérence visuelle 100% harmonisée entre :
 * - Création de rappel (reminders/new)
 * - Création de tâche (tasks/new)
 * - Création d'événement (events/new)
 * - Création d'habitude (habits/new)
 * - Création d'objectif (goals/new)
 * - Écran Paramètres (settings/index)
 *
 * Principes Midnight Glow :
 * - Fond sombre uniforme avec cartes en verre satiné (Glassmorphic CardGroup)
 * - Liseré lumineux violet signature rgba(208, 188, 255, 0.16)
 * - Sélecteurs & Chips avec état actif éclatant et réactif
 */
import { StyleSheet, Platform } from 'react-native';
import {
  Primary,
  Tertiary,
  OnSurface,
  Surface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
  FontFamily,
  TitleFontFamily,
} from '@/constants/theme';

export const formStyles = StyleSheet.create({
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
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    backgroundColor: 'rgba(14, 16, 23, 0.95)',
  },
  toolbarBtn: {
    minWidth: 70,
  },
  toolbarCenter: {
    alignItems: 'center',
  },
  toolbarTitle: {
    ...Typography.titleLarge,
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  toolbarSubtitle: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 9,
    fontFamily: FontFamily?.medium,
  },
  toolbarCancel: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    fontFamily: FontFamily?.medium,
  },
  toolbarSave: {
    ...Typography.labelLarge,
    color: Primary.default,
    fontWeight: '700',
    fontFamily: FontFamily?.bold,
    textAlign: 'right',
  },
  toolbarSaveDisabled: {
    opacity: 0.35,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xs,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionHeaderIconBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FontFamily?.medium,
  },
  cardGroup: {
    backgroundColor: 'rgba(24, 28, 42, 0.82)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.16)',
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.35)',
      },
    }),
  },
  titleInput: {
    ...Typography.headlineMedium,
    color: '#FFFFFF',
    fontFamily: TitleFontFamily?.bold ?? FontFamily?.bold,
    paddingVertical: Spacing.xs,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Spacing.sm,
  },
  notesIcon: {
    marginTop: 2,
  },
  notesInput: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    fontFamily: FontFamily?.regular,
    flex: 1,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  inputBox: {
    backgroundColor: 'rgba(15, 18, 28, 0.75)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontFamily: FontFamily?.regular,
  },
  inputBoxError: {
    borderColor: ErrorColors.default,
  },
  errorText: {
    ...Typography.bodySmall,
    color: ErrorColors.default,
    marginTop: 2,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 18, 28, 0.80)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.18)',
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  selectorIconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorLabel: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
  },
  selectorValue: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 22, 34, 0.85)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    gap: 6,
  },
  chipActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.18)',
    borderColor: Primary.default,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontFamily: FontFamily?.medium,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Primary.default,
    fontWeight: '700',
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
    backgroundColor: 'rgba(18, 22, 34, 0.75)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  actionTileActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.16)',
    borderColor: Primary.default,
  },
  actionTileText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  actionTileTextActive: {
    color: Primary.default,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  fieldSub: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
});

/**
 * Styles Paramètres — Fabrique thématique Junix Pulse.
 *
 * Utilise le pattern `makeStyles(theme)` pour générer des styles dynamiques
 * selon la palette active (sombre ou claire).
 *
 * CONTRAT PÉDAGOGIQUE :
 * - Aucun hex en dur : toutes les couleurs proviennent de `ThemePalette`.
 * - Les opacités rgba sont construites via `hexToRgba` pour rester lisibles.
 * - Les valeurs de layout (Spacing, Radius, Typography) restent statiques
 *   car elles ne changent pas entre les modes.
 */

import { StyleSheet, Platform } from 'react-native';
import { ThemePalette } from '@/constants/palettes';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { hexToRgba } from '@/utils/color';

export const makeSettingsStyles = (t: ThemePalette) => {
  // Couleurs dérivées selon le mode
  const isDark = t.mode === 'dark';

  // Fond des rangées (glass effect adapté)
  const rowBg = t.glass.card.backgroundColor;

  // Bordure des rangées
  const rowBorder = t.glass.control.borderColor;

  // Fond du bouton retour
  const backBtnBg = t.glass.control.backgroundColor;

  // Fond des pilules d'heure (inactive)
  const hourPillBg = t.glass.control.backgroundColor;

  // Bordure des pilules d'heure (inactive)
  const hourPillBorder = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : hexToRgba(t.outline.variant, 0.40);

  // Fond du segmented control
  const segmentBg = t.glass.control.backgroundColor;

  // Bordure du segmented control
  const segmentBorder = isDark
    ? hexToRgba(t.primary.default, 0.12)
    : hexToRgba(t.outline.variant, 0.40);

  // Fond modal
  const modalBg = t.glass.nav.backgroundColor;

  // Bordure modal
  const modalBorder = isDark
    ? hexToRgba(t.primary.default, 0.22)
    : hexToRgba(t.outline.variant, 0.50);

  // Fond input
  const inputBg = t.glass.control.backgroundColor;

  // Bordure input
  const inputBorder = isDark
    ? hexToRgba(t.primary.default, 0.18)
    : hexToRgba(t.outline.variant, 0.50);

  // Fond info box
  const infoBg = t.glass.card.backgroundColor;

  // Bordure info box
  const infoBorder = isDark
    ? hexToRgba(t.primary.default, 0.14)
    : hexToRgba(t.outline.variant, 0.40);

  // Pilule active
  const hourPillActiveBg = isDark
    ? hexToRgba(t.primary.default, 0.18)
    : hexToRgba(t.primary.default, 0.12);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.surface.base,
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
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: backBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...Typography.titleLarge,
      color: t.onSurface.primary,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    section: {
      marginBottom: Spacing.xl,
    },
    sectionLabel: {
      ...Typography.labelMedium,
      color: t.primary.default,
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
      backgroundColor: rowBg,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: rowBorder,
      ...Platform.select({
        ios: {
          shadowColor: t.shadow.color,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: t.shadow.smOpacity,
          shadowRadius: 8,
        },
        default: {},
      }),
    },
    hapticHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    // ─── Summary page: the profile, then one row per page ───────────────
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.xs,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.primary.default,
    },
    avatarText: {
      ...Typography.titleLarge,
      color: isDark ? '#FFFFFF' : t.primary.on,
      fontWeight: '700',
    },
    profileName: {
      ...Typography.titleMedium,
      color: t.onSurface.primary,
      fontWeight: '700',
    },
    hubGroup: {
      marginTop: Spacing.lg,
      marginBottom: Spacing.lg,
      backgroundColor: rowBg,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: rowBorder,
      overflow: 'hidden',
    },
    hubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      minHeight: 64,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    hubRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: rowBorder,
    },
    hubIcon: {
      width: 38,
      height: 38,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footnote: {
      ...Typography.bodySmall,
      color: t.onSurface.variant,
      marginTop: Spacing.xs,
      marginHorizontal: Spacing.xs,
    },
    inlineAction: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: Spacing.xs,
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      marginTop: -Spacing.xs,
    },
    inlineActionText: {
      ...Typography.labelMedium,
      color: t.primary.default,
      fontWeight: '600',
    },
    dangerLabel: {
      color: t.error.default,
      marginTop: Spacing.lg,
    },
    lockDelayLabel: {
      marginTop: Spacing.md,
    },
    hapticRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
    },
    hapticButton: {
      minHeight: 64,
    },
    rowTextFill: {
      flex: 1,
      paddingRight: Spacing.sm,
    },
    rowCol: {
      backgroundColor: rowBg,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: rowBorder,
    },
    rowLabel: {
      ...Typography.titleMedium,
      color: t.onSurface.primary,
      fontWeight: '600',
    },
    rowSub: {
      ...Typography.bodySmall,
      color: t.onSurface.variant,
      marginTop: 2,
    },
    rowValCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    rowValue: {
      ...Typography.bodyMedium,
      color: t.onSurface.variant,
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
      backgroundColor: hourPillBg,
      borderWidth: 1,
      borderColor: hourPillBorder,
      alignItems: 'center',
    },
    hourPillActive: {
      backgroundColor: hourPillActiveBg,
      borderColor: t.primary.default,
    },
    hourPillText: {
      ...Typography.labelMedium,
      color: t.onSurface.variant,
    },
    hourPillTextActive: {
      color: t.primary.default,
      fontWeight: '700',
    },
    infoBox: {
      flexDirection: 'row',
      gap: Spacing.sm,
      backgroundColor: infoBg,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      alignItems: 'flex-start',
      marginTop: Spacing.sm,
      borderWidth: 1,
      borderColor: infoBorder,
    },
    infoText: {
      ...Typography.bodySmall,
      color: t.onSurface.variant,
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
      backgroundColor: modalBg,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: modalBorder,
    },
    modalTitle: {
      ...Typography.titleLarge,
      color: t.onSurface.primary,
      marginBottom: Spacing.md,
      fontWeight: '700',
    },
    input: {
      backgroundColor: inputBg,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: inputBorder,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      ...Typography.bodyLarge,
      color: t.onSurface.primary,
      marginBottom: Spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.md,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: segmentBg,
      borderRadius: Radius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: segmentBorder,
      marginBottom: Spacing.xs,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      minHeight: 44,
      borderRadius: Radius.sm,
      backgroundColor: 'transparent',
    },
    segmentBtnActive: {
      backgroundColor: t.primary.default,
    },
    segmentText: {
      ...Typography.labelMedium,
      color: t.onSurface.variant,
      fontWeight: '500',
    },
    segmentTextActive: {
      color: isDark ? '#FFFFFF' : t.primary.on,
      fontWeight: '700',
    },
    appearanceHelp: {
      ...Typography.bodySmall,
      color: t.onSurface.variant,
      marginTop: Spacing.xs,
      marginBottom: Spacing.md,
      lineHeight: 18,
    },
    previewContainer: {
      marginTop: Spacing.xs,
    },
    previewCardInner: {
      padding: Spacing.sm,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: 4,
    },
    previewTitle: {
      ...Typography.titleMedium,
      color: t.onSurface.primary,
      fontWeight: '600',
    },
    previewDesc: {
      ...Typography.bodySmall,
      color: t.onSurface.variant,
    },
    version: {
      ...Typography.labelSmall,
      color: t.onSurface.disabled,
      textAlign: 'center',
      marginTop: Spacing.lg,
    },
  });
};

/**
 * The automatic backup, in one card at the top of "Sauvegarde et données". Off, it says in
 * three lines what it does and turns on in one tap. On, it shows when the last backup was made,
 * when the next one comes and in which folder, warns when the last try failed, and keeps its
 * actions in view: back up now, ask for the fingerprint, turn off.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { autoBackupFolderLabel, nextAutoBackupAt } from '@/domain/rules/auto-backup-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useT, type MessageKey } from '@/i18n';
import type { AutoBackupConfig } from '@/services/auto-backup-service';
import { hexToRgba } from '@/utils/color';

interface AutoBackupCardProps {
  /** null while the automatic backup is off. */
  config: AutoBackupConfig | null;
  /** A backup is being made right now. */
  running: boolean;
  onEnable: () => void;
  onRunNow: () => void;
  onDisable: () => void;
  onToggleBiometric: (value: boolean) => void;
}

/** What the automatic backup does, said before it is turned on. */
const POINTS: readonly { icon: keyof typeof Ionicons.glyphMap; key: MessageKey }[] = [
  { icon: 'calendar-outline', key: 'autoBackup.pointWeekly' },
  { icon: 'lock-closed-outline', key: 'autoBackup.pointEncrypted' },
  { icon: 'folder-open-outline', key: 'autoBackup.pointFolder' },
];

export function AutoBackupCard({ config, running, onEnable, onRunNow, onDisable, onToggleBiometric }: AutoBackupCardProps) {
  const t = useT();
  const locale = useDateLocale();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeAutoBackupCardStyles);
  // The moment the card appeared: a drawing never reads the clock itself
  const [shownAt] = useState(Date.now);

  // ─── Off: what it does, and one button to turn it on ─────────────────────
  if (!config) {
    return (
      <GlowCard tone="neutral" testID="auto-backup-card">
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: hexToRgba(palette.primary.default, 0.16) }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={palette.primary.default} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {t('autoBackup.title')}
          </Text>
          <Text style={[styles.badge, { color: palette.onSurface.variant, backgroundColor: palette.surface.high }]}>
            {t('autoBackup.badgeOff')}
          </Text>
        </View>

        <View style={styles.points}>
          {POINTS.map(point => (
            <View key={point.key} style={styles.point}>
              <Ionicons name={point.icon} size={16} color={palette.onSurface.variant} />
              <Text style={styles.pointText}>{t(point.key)}</Text>
            </View>
          ))}
        </View>

        <Button label={t('autoBackup.turnOn')} onPress={onEnable} size="md" testID="auto-backup-enable" />
      </GlowCard>
    );
  }

  // ─── On: where it stands, and its actions in view ────────────────────────
  const failed = config.lastFailedAt !== null && (config.lastSuccessAt ?? 0) < config.lastFailedAt;
  const accent = failed ? palette.priority.HIGH : palette.success.default;
  const next = nextAutoBackupAt(config.lastSuccessAt);
  const details: readonly { label: MessageKey; value: string }[] = [
    {
      label: 'autoBackup.last',
      value: config.lastSuccessAt
        ? format(config.lastSuccessAt, 'EEEE d MMMM, HH:mm', { locale })
        : t('autoBackup.lastNone'),
    },
    {
      label: 'autoBackup.next',
      value:
        next === null || next <= shownAt
          ? t('autoBackup.nextSoon')
          : t('autoBackup.nextAround', { date: format(next, 'EEEE d MMMM', { locale }) }),
    },
    { label: 'autoBackup.folder', value: autoBackupFolderLabel(config.directoryUri) ?? t('autoBackup.folderUnknown') },
  ];

  return (
    <GlowCard tone={failed ? 'attention' : 'success'} testID="auto-backup-card">
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: hexToRgba(accent, 0.16) }]}>
          <Ionicons name={failed ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={20} color={accent} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t('autoBackup.title')}
        </Text>
        <Text style={[styles.badge, { color: accent, backgroundColor: hexToRgba(accent, 0.16) }]}>
          {t(failed ? 'autoBackup.badgeCheck' : 'autoBackup.badgeOn')}
        </Text>
      </View>

      <View style={styles.details}>
        {details.map(detail => (
          <View key={detail.label} style={styles.detail}>
            <Text style={styles.detailLabel}>{t(detail.label)}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {detail.value}
            </Text>
          </View>
        ))}
      </View>

      {failed && (
        <View style={[styles.warning, { backgroundColor: hexToRgba(accent, 0.12) }]} accessibilityLiveRegion="polite">
          <Ionicons name="warning-outline" size={16} color={accent} />
          <Text style={styles.warningText}>{t('autoBackup.failedBanner')}</Text>
        </View>
      )}

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.switchLabel}>{t('autoBackup.biometricLabel')}</Text>
          <Text style={styles.switchHint}>{t('autoBackup.biometricHint')}</Text>
        </View>
        <Switch
          value={!!config.requireBiometric}
          onValueChange={onToggleBiometric}
          trackColor={{ false: palette.outline.variant, true: palette.primary.container }}
          thumbColor={config.requireBiometric ? palette.primary.default : palette.onSurface.disabled}
          accessibilityLabel={t('autoBackup.biometricLabel')}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label={t('autoBackup.now')}
          onPress={onRunNow}
          variant="secondary"
          size="sm"
          loading={running}
          testID="auto-backup-run"
        />
        <TouchableOpacity
          style={styles.disable}
          onPress={onDisable}
          accessibilityRole="button"
          accessibilityLabel={t('autoBackup.disable')}
          testID="auto-backup-disable"
        >
          <Text style={[styles.disableText, { color: palette.error.default }]}>{t('autoBackup.disable')}</Text>
        </TouchableOpacity>
      </View>
    </GlowCard>
  );
}

const makeAutoBackupCardStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
      flex: 1,
    },
    badge: {
      ...Typography.labelSmall,
      fontWeight: '700',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    points: {
      gap: Spacing.sm,
      marginVertical: Spacing.md,
    },
    point: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    pointText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      flex: 1,
    },
    details: {
      gap: Spacing.xs,
      marginTop: Spacing.md,
    },
    detail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    detailLabel: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    detailValue: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
      flexShrink: 1,
      textAlign: 'right',
    },
    warning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      marginTop: Spacing.md,
    },
    warningText: {
      ...Typography.bodySmall,
      color: theme.onSurface.primary,
      flex: 1,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.glass.control.borderColor,
    },
    switchText: {
      flex: 1,
    },
    switchLabel: {
      ...Typography.labelLarge,
      color: theme.onSurface.primary,
    },
    switchHint: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.md,
    },
    disable: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    disableText: {
      ...Typography.labelLarge,
      fontWeight: '600',
    },
  });

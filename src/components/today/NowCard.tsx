/**
 * "Maintenant" on the home screen: the first item of the day's feed, put forward. The next
 * thing to do with its two gestures, Fait and Plus tard; on a heavy day, Alléger. Touching the
 * header opens the full screen, one thing at a time. No gradient: the home screen already has
 * its own (rule A.2).
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DeadlineBadge } from '@/components/tasks/DeadlineBadge';
import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { NowItem } from '@/domain/rules/now-rules';
import { useNowSubtitle } from '@/features/now/use-now-actions';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { hexToRgba } from '@/utils/color';

interface NowCardProps {
  item: NowItem;
  /** Everything left to do now, this one included. */
  total: number;
  overloaded: boolean;
  lightenCount: number;
  onDone: () => void;
  onLater: () => void;
  onLighten: () => void;
  /** The full screen, one thing at a time. */
  onOpenNow: () => void;
  /** The reminder or the task itself. */
  onOpenItem: () => void;
}

export function NowCard({ item, total, overloaded, lightenCount, onDone, onLater, onLighten, onOpenNow, onOpenItem }: NowCardProps) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNowCardStyles);
  const subtitle = useNowSubtitle()(item);
  const late = item.kind === 'reminder' && item.overdue;

  return (
    <GlowCard tone={item.priority === 'URGENT' || late ? 'attention' : 'primary'} testID="now-card">
      <TouchableOpacity
        style={styles.header}
        onPress={onOpenNow}
        accessibilityRole="button"
        accessibilityLabel={t('now.openA11y')}
        testID="now-open"
      >
        <Ionicons name="flash-outline" size={14} color={palette.primary.default} />
        <Text style={styles.label}>{t('now.label')}</Text>
        <Text style={styles.count}>{t('now.count', { count: total })}</Text>
        <Ionicons name="expand-outline" size={16} color={palette.onSurface.variant} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenItem} accessibilityRole="button" accessibilityLabel={`${item.title}, ${subtitle}`}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.subRow}>
          <Ionicons
            name={item.kind === 'reminder' ? 'notifications-outline' : 'checkbox-outline'}
            size={14}
            color={late ? palette.priority.HIGH : palette.onSurface.variant}
          />
          <Text style={[styles.sub, late && { color: palette.priority.HIGH }]}>{subtitle}</Text>
          {item.kind === 'task' && <DeadlineBadge dueDate={item.dueDate} />}
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.action, styles.actionDone]}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={`${t('now.done')} : ${item.title}`}
          testID="now-done"
        >
          <Ionicons name="checkmark" size={18} color={palette.success.default} />
          <Text style={[styles.actionText, { color: palette.success.default }]}>{t('now.done')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={onLater}
          accessibilityRole="button"
          accessibilityLabel={t(item.kind === 'reminder' ? 'now.laterReminderA11y' : 'now.laterTaskA11y')}
          testID="now-later"
        >
          <Ionicons name="time-outline" size={18} color={palette.onSurface.primary} />
          <Text style={styles.actionText}>{t('now.later')}</Text>
        </TouchableOpacity>
      </View>

      {overloaded && lightenCount > 0 && (
        <View style={styles.lightenRow}>
          <View style={styles.lightenText}>
            <Text style={styles.lightenTitle}>{t('now.heavy')}</Text>
            <Text style={styles.sub}>
              {t(lightenCount === 1 ? 'now.lightenOne' : 'now.lightenMany', { count: lightenCount })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.lightenBtn}
            onPress={onLighten}
            accessibilityRole="button"
            accessibilityLabel={`${t('now.lighten')} : ${t(lightenCount === 1 ? 'now.lightenOne' : 'now.lightenMany', { count: lightenCount })}`}
            testID="now-lighten"
          >
            <Ionicons name="leaf-outline" size={16} color={palette.primary.default} />
            <Text style={[styles.actionText, { color: palette.primary.default }]}>{t('now.lighten')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </GlowCard>
  );
}

const makeNowCardStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      minHeight: 32,
      marginBottom: Spacing.xs,
    },
    label: {
      ...Typography.labelLarge,
      color: theme.primary.default,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '700',
      flex: 1,
    },
    count: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: 4,
    },
    sub: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    action: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      minHeight: 44,
      borderRadius: Radius.full,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    actionDone: {
      backgroundColor: hexToRgba(theme.success.default, theme.mode === 'light' ? 0.12 : 0.16),
      borderColor: hexToRgba(theme.success.default, 0.45),
    },
    actionText: {
      ...Typography.labelLarge,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    lightenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.glass.control.borderColor,
    },
    lightenText: {
      flex: 1,
    },
    lightenTitle: {
      ...Typography.labelLarge,
      color: theme.onSurface.primary,
    },
    lightenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      backgroundColor: theme.glass.controlActive,
    },
  });

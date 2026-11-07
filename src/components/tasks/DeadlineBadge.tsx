/**
 * The deadline of a task on its card: "J-3", "Demain", "Aujourd'hui", "En retard".
 * Quiet while far, orange from the day before: never the red of an error.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { deadlineInfo } from '@/domain/rules/deadline-rules';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { hexToRgba } from '@/utils/color';

export function deadlineLabel(t: ReturnType<typeof useT>, daysLeft: number): string {
  if (daysLeft < 0) return t('deadline.late');
  if (daysLeft === 0) return t('deadline.today');
  if (daysLeft === 1) return t('deadline.tomorrow');
  return t('deadline.days', { count: daysLeft });
}

export function DeadlineBadge({ dueDate, now = new Date() }: { dueDate?: string; now?: Date }) {
  const t = useT();
  const { palette } = useTheme();
  const info = deadlineInfo(dueDate, now);
  if (!info) return null;

  const urgent = info.tone !== 'calm';
  const color = urgent ? palette.priority.HIGH : palette.onSurface.variant;
  const label = deadlineLabel(t, info.daysLeft);
  return (
    <View
      style={[styles.badge, { backgroundColor: hexToRgba(urgent ? palette.priority.HIGH : palette.outline.default, 0.14) }]}
      accessibilityLabel={t('deadline.a11y', { label })}
      testID="deadline-badge"
    >
      <Ionicons name="hourglass-outline" size={11} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.labelSmall,
    fontWeight: '700',
  },
});

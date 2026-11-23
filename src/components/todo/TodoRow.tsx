/**
 * One card for everything to do (sheet 015): the cyan box of the family, the title, and below
 * it the hour with a bell for what rings, or the day for what does not; a dot for a high or urgent
 * priority, and the tags.
 */

import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';

import { TagSummary } from '@/components/tags/TagChip';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { Tag } from '@/domain/entities';
import type { TodoEntry } from '@/domain/rules/todo-list-rules';
import { useTheme } from '@/hooks/use-theme';
import { useDateLocale, useT } from '@/i18n';

export function TodoRow({
  entry,
  tags,
  onPress,
  onToggle,
}: {
  entry: TodoEntry;
  tags: readonly Tag[];
  onPress: () => void;
  onToggle: () => void;
}) {
  const t = useT();
  const locale = useDateLocale();
  const { palette } = useTheme();
  const accent = itemFamilyColor(palette, 'todo');
  const rings = entry.kind === 'reminder';
  // A reminder done cannot be reopened from here: its box is greyed
  const canToggle = !(rings && entry.done);

  const when = entry.when;
  const dayLabel = !when
    ? t('todoTab.noDate')
    : isToday(when)
      ? t('common.today')
      : isTomorrow(when)
        ? t('reminders.section.tomorrow')
        : format(when, 'EEE d MMM', { locale });
  const whenLabel = rings && when ? (isToday(when) ? format(when, 'HH:mm') : `${dayLabel} · ${format(when, 'HH:mm')}`) : dayLabel;
  const dot = entry.priority === 'URGENT' ? palette.priority.URGENT : entry.priority === 'HIGH' ? palette.priority.HIGH : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}. ${whenLabel}${rings ? `. ${t('todoTab.ringsA11y')}` : ''}`}
      testID={`todo-row-${entry.id}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: 60,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: palette.outline.variant,
        backgroundColor: palette.surface.container,
        opacity: entry.done ? 0.6 : 1,
      }}
    >
      <TouchableOpacity
        onPress={onToggle}
        disabled={!canToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: entry.done, disabled: !canToggle }}
        accessibilityLabel={t(entry.done ? 'todoTab.reopenA11y' : 'todoTab.doneA11y', { title: entry.title })}
        testID={`todo-toggle-${entry.id}`}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: Radius.sm,
            borderWidth: 2,
            borderColor: canToggle ? accent : palette.onSurface.disabled,
            backgroundColor: entry.done ? accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {entry.done ? <Ionicons name="checkmark" size={16} color={palette.mode === 'light' ? '#FFFFFF' : '#141317'} /> : null}
        </View>
      </TouchableOpacity>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            ...Typography.bodyLarge,
            color: palette.onSurface.primary,
            textDecorationLine: entry.done ? 'line-through' : 'none',
          }}
        >
          {entry.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Ionicons name={rings ? 'notifications' : 'calendar-outline'} size={13} color={rings ? accent : palette.onSurface.variant} />
          <Text style={{ ...Typography.labelMedium, color: palette.onSurface.variant }} numberOfLines={1}>
            {whenLabel}
          </Text>
          {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
          <TagSummary tags={tags} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * One card for everything to do (sheet 015): the cyan box of the family, the title, and below
 * it the hour with a bell for what rings, or the day for what does not; a dot for a high or urgent
 * priority, and the tags.
 */

import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View, Platform } from 'react-native';

import { TagSummary } from '@/components/tags/TagChip';
import { CardMenuButton, useCardMenu } from '@/components/ui/CardMenu';
import { tourTargetIf } from '@/features/mascot/TourTarget';
import { useDurationLabel } from '@/components/create/form/DurationField';
import { openFocusForTask } from '@/features/focus/open-focus';
import { useSwipeAccessibilityProps } from '@/components/ui/swipe-accessibility';
import { itemColorOf } from '@/constants/item-kinds';
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
  menuTour = false,
}: {
  entry: TodoEntry;
  tags: readonly Tag[];
  onPress: () => void;
  onToggle: () => void;
  /** The first card: the tour of À faire points at its ⋯ (sheet 045). */
  menuTour?: boolean;
}) {
  const t = useT();
  const locale = useDateLocale();
  const { palette } = useTheme();
  // The colour chosen for its card, or the colour of « À faire » (sheet 043)
  const accent = itemColorOf(palette, entry.color, 'todo');
  // The actions of the swipe, also by a long press, "⋯" and the screen reader (sheet 024)
  const openMenu = useCardMenu(entry.title);
  const swipeAccessibility = useSwipeAccessibilityProps();
  const rings = entry.kind === 'reminder';
  const durationLabel = useDurationLabel();
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
      onLongPress={openMenu}
      {...swipeAccessibility}
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
          {/* An Alarm shows its alarm clock (sheet 031) */}
          <Ionicons name={rings ? (entry.alarm ? 'alarm' : 'notifications') : 'calendar-outline'} size={13} color={rings ? accent : palette.onSurface.variant} />
          <Text style={{ ...Typography.labelMedium, color: palette.onSurface.variant }} numberOfLines={1}>
            {whenLabel}
          </Text>
          {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
          <TagSummary tags={tags} />
          {/* A task with a time to do it: Focus from the card, in sessions (sheet 033) */}
          {!rings && !entry.done && entry.estimatedMinutes ? (
            <TouchableOpacity
              onPress={() => openFocusForTask({ ...entry, title: entry.title })}
              hitSlop={8}
              // On the web a <button> may not sit inside the card, itself a <button> (as "⋯")
              accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
              accessibilityLabel={t('todoTab.focusFor', { title: entry.title })}
              testID={`todo-focus-${entry.id}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: `${accent}1F`,
              }}
            >
              <Ionicons name="play" size={11} color={accent} />
              <Text style={{ ...Typography.labelMedium, color: accent }}>
                {t('todoTab.focus')} · {durationLabel(entry.estimatedMinutes)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {tourTargetIf(menuTour, 'todoMore', <CardMenuButton title={entry.title} testID={`todo-menu-${entry.id}`} />)}
    </Pressable>
  );
}

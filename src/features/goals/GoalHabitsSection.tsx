/**
 * "Linked habits" on the page of a goal (sheet 018): a goal moves forward with its tasks and with
 * its habits. Link a habit, unlink it, and see how its week goes.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import type { Habit } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { HabitRepository } from '@/repositories/habit-repository';
import { GoalUseCases, type GoalHabitLink } from '@/use-cases/goal-use-cases';

export function GoalHabitsSection({
  goalId,
  linked,
  onChange,
}: {
  goalId: string;
  linked: readonly GoalHabitLink[];
  onChange: () => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const [picking, setPicking] = useState(false);
  const [available, setAvailable] = useState<Habit[]>([]);

  const togglePicker = async () => {
    if (picking) {
      setPicking(false);
      return;
    }
    const all = await HabitRepository.findAllActive();
    setAvailable(all.filter(habit => !linked.some(link => link.habit.id === habit.id)));
    setPicking(true);
  };

  const link = async (habit: Habit) => {
    await GoalUseCases.linkHabit(goalId, habit.id);
    setPicking(false);
    onChange();
  };

  const unlink = async (habit: Habit) => {
    await GoalUseCases.unlinkHabit(goalId, habit.id);
    onChange();
  };

  const card = {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: palette.outline.variant,
    backgroundColor: palette.surface.container,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  };

  return (
    <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }} testID="goal-habits">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Ionicons name="repeat-outline" size={18} color={palette.primary.default} />
        <Text style={{ ...Typography.titleMedium, color: palette.onSurface.primary, flex: 1 }}>{t('goalHabits.title')}</Text>
        <TouchableOpacity
          onPress={() => void togglePicker()}
          accessibilityRole="button"
          accessibilityLabel={t('goalHabits.link')}
          testID="goal-habits-link"
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name={picking ? 'close' : 'add'} size={18} color={palette.primary.default} />
          <Text style={{ ...Typography.labelLarge, color: palette.primary.default }}>{t('goalHabits.link')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('goalHabits.hint')}</Text>

      {picking ? (
        available.length === 0 ? (
          <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{t('goalHabits.none')}</Text>
        ) : (
          available.map(habit => (
            <TouchableOpacity
              key={habit.id}
              onPress={() => void link(habit)}
              accessibilityRole="button"
              accessibilityLabel={t('goalHabits.linkA11y', { title: habit.title })}
              style={card}
            >
              <Ionicons name="add-circle-outline" size={20} color={palette.primary.default} />
              <Text style={{ ...Typography.bodyLarge, color: palette.onSurface.primary, flex: 1 }} numberOfLines={1}>
                {habit.title}
              </Text>
            </TouchableOpacity>
          ))
        )
      ) : null}

      {linked.map(link => (
        <View key={link.habit.id} style={card}>
          <Ionicons
            name={link.share >= 1 ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={link.share >= 1 ? palette.success.default : palette.onSurface.variant}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...Typography.bodyLarge, color: palette.onSurface.primary }} numberOfLines={1}>
              {link.habit.title}
            </Text>
            <Text style={{ ...Typography.labelMedium, color: palette.onSurface.variant }}>
              {t('goalHabits.week', { done: link.doneThisWeek, target: link.target })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => void unlink(link.habit)}
            accessibilityRole="button"
            accessibilityLabel={t('goalHabits.unlinkA11y', { title: link.habit.title })}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close-circle" size={20} color={palette.onSurface.variant} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

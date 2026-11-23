/**
 * The home card "Habits and goals" (study 001, 15.2; sheet 018): where the habits of today and the
 * goals in progress stand, always visible, and explained in one sentence when there is none yet.
 * It opens the Progrès page.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { HabitRepository } from '@/repositories/habit-repository';
import { GoalUseCases } from '@/use-cases/goal-use-cases';

interface Summary {
  habitsDone: number;
  habitsTotal: number;
  goals: number;
  percent: number | null;
}

export function ProgressCard() {
  const t = useT();
  const { palette } = useTheme();
  const [summary, setSummary] = useState<Summary | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const habits = await HabitRepository.findAllActive();
          const today = format(new Date(), 'yyyy-MM-dd');
          let habitsDone = 0;
          for (const habit of habits) if (await HabitRepository.isCompletedOn(habit.id, today)) habitsDone += 1;
          const goals = (await GoalUseCases.getAllGoalsWithDetails()).filter(details => details.goal.status === 'ACTIVE');
          const measured = goals.filter(details => details.progress !== null);
          const percent = measured.length
            ? Math.round(measured.reduce((sum, details) => sum + (details.progress ?? 0), 0) / measured.length)
            : null;
          if (alive) setSummary({ habitsDone, habitsTotal: habits.length, goals: goals.length, percent });
        } catch {
          // The card never keeps the home screen from showing
          if (alive) setSummary({ habitsDone: 0, habitsTotal: 0, goals: 0, percent: null });
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const empty = summary !== null && summary.habitsTotal === 0 && summary.goals === 0;
  const habitsLine =
    summary && summary.habitsTotal > 0
      ? t('progressCard.habits', { done: summary.habitsDone, total: summary.habitsTotal })
      : t('progressCard.noHabits');
  const goalsLine =
    summary && summary.goals > 0
      ? t('progressCard.goals', { count: summary.goals, percent: summary.percent ?? 0 })
      : t('progressCard.noGoals');

  return (
    <Pressable
      onPress={() => router.push('/progress' as never)}
      accessibilityRole="button"
      accessibilityLabel={`${t('progressCard.title')}. ${empty ? t('progressCard.empty') : `${habitsLine}. ${goalsLine}`}`}
      testID="progress-card"
      style={{
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: palette.outline.variant,
        backgroundColor: palette.surface.container,
        padding: Spacing.md,
        gap: Spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Ionicons name="trending-up-outline" size={20} color={palette.primary.default} />
        <Text style={{ ...Typography.titleMedium, color: palette.onSurface.primary, flex: 1 }}>{t('progressCard.title')}</Text>
        <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
      </View>
      {empty ? (
        <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{t('progressCard.empty')}</Text>
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="repeat-outline" size={16} color={palette.onSurface.variant} />
            <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary }}>{habitsLine}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="flag-outline" size={16} color={palette.onSurface.variant} />
            <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary }}>{goalsLine}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Bilan : the review of today or of this week. Tasks done, reminders done and missed, habits
 * kept, the best day; Pulse sums it up in one sentence. The daily recap notification opens it
 * on the day, so the recap can always be read again.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import {
  buildReviewStats,
  ReviewPeriod,
  ReviewStats,
  ReviewTone,
  reviewDays,
  reviewTone,
} from '@/domain/rules/review-rules';
import { PulseMascot } from '@/features/mascot/PulseMascot';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { MessageKey, useDateLocale, useT } from '@/i18n';
import { HabitRepository } from '@/repositories/habit-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';

const TONE_MOOD: Record<ReviewTone, MascotMood> = { great: 'party', good: 'happy', light: 'calm', empty: 'calm' };
const TONE_TEXT: Record<ReviewPeriod, Record<ReviewTone, MessageKey>> = {
  day: { great: 'review.day.great', good: 'review.day.good', light: 'review.day.light', empty: 'review.day.empty' },
  week: { great: 'review.week.great', good: 'review.week.good', light: 'review.week.light', empty: 'review.week.empty' },
};

async function loadStats(period: ReviewPeriod): Promise<ReviewStats> {
  const days = reviewDays(period, new Date());
  const [tasks, reminders, habits] = await Promise.all([
    // All of them: a task done today from the Inbox, or planned for another day, counts today
    TaskRepository.findAll(),
    ReminderRepository.findAll(),
    HabitRepository.findAllActive(),
  ]);
  const completions = await Promise.all(habits.map(habit => HabitRepository.getCompletions(habit.id)));
  return buildReviewStats({
    days,
    tasks,
    reminders,
    habits: habits.map((habit, index) => ({
      id: habit.id,
      title: habit.title,
      completedDates: completions[index].map(completion => completion.completedDate),
    })),
  });
}

export default function ReviewScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeReviewStyles);
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<ReviewPeriod>(params.period === 'week' ? 'week' : 'day');
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setStats(await loadStats(period));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
    }
  }, [period, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const tone = stats ? reviewTone(stats) : 'empty';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {t('review.title')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(['day', 'week'] as const).map(value => {
          const active = period === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => {
                setStats(null);
                setPeriod(value);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`review-period-${value}`}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {t(value === 'day' ? 'review.today' : 'review.thisWeek')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !stats ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}>
          <View style={styles.hero}>
            <PulseMascot mood={TONE_MOOD[tone]} size={72} />
            <Text style={styles.heroText}>{t(TONE_TEXT[period][tone])}</Text>
          </View>

          <GlowCard index={0} tone="primary" intensity="soft" accessibilityLabel={t('review.tasks')}>
            <View style={styles.cardRow}>
              <Ionicons name="checkbox-outline" size={22} color={palette.primary.default} />
              <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>{t('review.tasks')}</Text>
                <Text style={styles.cardValue}>
                  {t('review.tasksValue', { done: stats.tasksDone, total: stats.tasksTotal })}
                </Text>
                {stats.completionRate !== null && (
                  <View style={styles.bar} accessibilityLabel={t('review.rate', { rate: stats.completionRate })}>
                    <View style={[styles.barFill, { width: `${stats.completionRate}%` }]} />
                  </View>
                )}
              </View>
            </View>
          </GlowCard>

          <GlowCard index={1} tone="attention" intensity="soft" accessibilityLabel={t('review.reminders')}>
            <View style={styles.cardRow}>
              <Ionicons name="notifications-outline" size={22} color={palette.priority.HIGH} />
              <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>{t('review.reminders')}</Text>
                <Text style={styles.cardValue}>
                  {t('review.remindersValue', { done: stats.remindersDone, missed: stats.remindersMissed })}
                </Text>
              </View>
            </View>
          </GlowCard>

          <GlowCard index={2} tone="success" intensity="soft" accessibilityLabel={t('review.habits')}>
            <View style={styles.cardRow}>
              <Ionicons name="repeat-outline" size={22} color={palette.success.default} />
              <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>{t('review.habits')}</Text>
                <Text style={styles.cardValue}>{t('review.habitsValue', { count: stats.habitChecks })}</Text>
                {stats.bestHabit && (
                  <Text style={styles.cardHint}>
                    {t('review.bestHabit', { title: stats.bestHabit.title, count: stats.bestHabit.count })}
                  </Text>
                )}
              </View>
            </View>
          </GlowCard>

          {period === 'week' && stats.bestDay && (
            <GlowCard index={3} tone="info" intensity="soft" accessibilityLabel={t('review.bestDayLabel')}>
              <View style={styles.cardRow}>
                <Ionicons name="trophy-outline" size={22} color={palette.tertiary.default} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>{t('review.bestDayLabel')}</Text>
                  <Text style={styles.cardValue}>
                    {t('review.bestDay', {
                      day: format(stats.bestDay.date, 'EEEE', { locale: dateLocale }),
                      count: stats.bestDay.done,
                    })}
                  </Text>
                </View>
              </View>
            </GlowCard>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const makeReviewStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.surface.base },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    backBtn: { padding: Spacing.xs, minWidth: 44, minHeight: 44, justifyContent: 'center' },
    headerTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      flex: 1,
      textAlign: 'center',
    },
    segment: {
      flexDirection: 'row',
      marginHorizontal: Spacing.lg,
      padding: 4,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    segmentBtn: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.sm,
    },
    segmentBtnActive: { backgroundColor: theme.primary.default },
    segmentText: { ...Typography.labelMedium, color: theme.onSurface.variant },
    segmentTextActive: { color: theme.primary.on, fontWeight: '700' },
    content: { padding: Spacing.lg, gap: Spacing.md },
    hero: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    heroText: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      textAlign: 'center',
    },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    cardBody: { flex: 1, gap: 4 },
    cardLabel: { ...Typography.labelMedium, color: theme.onSurface.variant },
    cardValue: { ...Typography.titleMedium, color: theme.onSurface.primary },
    cardHint: { ...Typography.bodySmall, color: theme.onSurface.variant },
    bar: {
      height: 6,
      borderRadius: Radius.full,
      backgroundColor: theme.outline.variant,
      overflow: 'hidden',
      marginTop: 6,
    },
    barFill: { height: '100%', borderRadius: Radius.full, backgroundColor: theme.primary.default },
  });

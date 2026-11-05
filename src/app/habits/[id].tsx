/**
 * Écran de Détail d'une Habitude.
 * Affiche le streak courant, le meilleur streak, l'historique récent (14 jours),
 * permet de mettre l'habitude en pause ou d'annuler une pause, et de la supprimer.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, isSameDay } from 'date-fns';

import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
import { useAppStore } from '@/store/app-store';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { useDateLocale, useT } from '@/i18n';

export default function HabitDetailScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeHabitDetailStyles);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<HabitStats | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await HabitUseCases.getHabitWithStats(id);
      if (!data) {
        setError(t('habitDetail.notFound'));
        return;
      }
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('habitDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleDay = async (dateStr: string) => {
    if (!id) return;
    try {
      await HabitUseCases.toggleHabitCompletion(id, dateStr);
      loadData();
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handlePause = async () => {
    if (!id || !stats) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    GlassAlert.alert(
      t('habitDetail.pause'),
      t('habitDetail.pauseBody'),
      [
        { text: t('form.cancel'), style: 'cancel' },
        {
          text: t('habitDetail.pause'),
          style: 'default',
          onPress: async () => {
            await HabitUseCases.pauseHabit(id, todayStr, undefined, 'Pause utilisateur');
            showSnackbar(t('habitDetail.paused'));
            loadData();
          },
        },
      ]
    );
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      await HabitUseCases.resumeHabit(id);
      showSnackbar(t('habitDetail.resumed'));
      loadData();
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleDelete = async () => {
    if (!id || !stats) return;
    const result = await HabitUseCases.deleteHabit(id);
    showSnackbar(t('habitDetail.deleted'), {
      actionLabel: t('common.undo30'),
      onAction: async () => {
        await result.undo();
        loadData();
      },
      durationMs: 30000,
    });
    router.back();
  };

  if (loading) {
    return <LoadingState message={t('habitDetail.loading')} />;
  }

  if (error || !stats) {
    return <ErrorState message={error || t('habitDetail.missing')} onRetry={loadData} />;
  }

  // Générer les 14 derniers jours pour le calendrier
  const last14Days = Array.from({ length: 14 }).map((_, idx) => {
    const day = subDays(new Date(), 13 - idx);
    const dateStr = format(day, 'yyyy-MM-dd');
    const isCompleted = stats.completions.some(c => c.completedDate === dateStr);
    return {
      date: day,
      dateStr,
      dayLabel: format(day, 'dd', { locale: dateLocale }),
      weekDayLabel: format(day, 'EEEEEE', { locale: dateLocale }),
      isToday: isSameDay(day, new Date()),
      isCompleted,
    };
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {stats.habit.title}
        </Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={palette.error.default} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* En-tête statut */}
        <View style={styles.topCardSpacing}>
        <GlowCard tone="neutral" size="hero">
          <Text style={styles.title}>{stats.habit.title}</Text>
          {stats.habit.description ? (
            <Text style={styles.desc}>{stats.habit.description}</Text>
          ) : null}

          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {stats.habit.status === 'PAUSED' ? t('habitDetail.statusPaused') : t('habitDetail.statusActive')}
              </Text>
            </View>
            <Text style={styles.freqTag}>
              {stats.habit.frequency === 'DAILY' ? t('habitDetail.daily') : t('habitNew.weekly')}
            </Text>
          </View>
        </GlowCard>
        </View>

        {/* Statistiques Streaks */}
        <View style={styles.streakGrid}>
          <GlowCard tone="neutral" style={{ flex: 1 }}>
            <View style={styles.streakBoxInner}>
              <Ionicons name="flame" size={28} color="#FF9800" />
              <Text style={styles.streakVal}>{stats.currentStreak}</Text>
              <Text style={styles.streakLabel}>{t('habitDetail.currentStreak')}</Text>
            </View>
          </GlowCard>

          <GlowCard tone="neutral" style={{ flex: 1 }}>
            <View style={styles.streakBoxInner}>
              <Ionicons name="trophy" size={28} color={palette.primary.default} />
              <Text style={styles.streakVal}>{stats.bestStreak}</Text>
              <Text style={styles.streakLabel}>{t('habitDetail.bestStreak')}</Text>
            </View>
          </GlowCard>
        </View>

        {/* Historique 14 derniers jours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('habitDetail.history')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyRow}>
            {last14Days.map(d => (
              <TouchableOpacity
                key={d.dateStr}
                style={[
                  styles.dayCard,
                  d.isToday && styles.dayCardToday,
                  d.isCompleted && styles.dayCardCompleted,
                ]}
                onPress={() => handleToggleDay(d.dateStr)}
              >
                <Text style={[styles.dayWeek, d.isCompleted && { color: palette.surface.base }]}>
                  {d.weekDayLabel}
                </Text>
                <Text style={[styles.dayNum, d.isCompleted && { color: palette.surface.base }]}>
                  {d.dayLabel}
                </Text>
                <Ionicons
                  name={d.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={d.isCompleted ? palette.surface.base : palette.onSurface.disabled}
                  style={{ marginTop: 4 }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Actions (Pause / Reprise) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('habitDetail.manage')}</Text>
          {stats.habit.status === 'PAUSED' ? (
            <GlowCard tone="neutral" onPress={handleResume}>
              <View style={styles.actionRowInner}>
                <Ionicons name="play" size={22} color={palette.primary.default} />
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>{t('habitDetail.resume')}</Text>
                  <Text style={styles.actionDesc}>{t('habitDetail.resumeDesc')}</Text>
                </View>
              </View>
            </GlowCard>
          ) : (
            <GlowCard tone="neutral" onPress={handlePause}>
              <View style={styles.actionRowInner}>
                <Ionicons name="pause" size={22} color="#FF9800" />
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>{t('habitDetail.pause')}</Text>
                  <Text style={styles.actionDesc}>{t('habitDetail.pauseDesc')}</Text>
                </View>
              </View>
            </GlowCard>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeHabitDetailStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.surface.base },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      backgroundColor: theme.surface.container,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
    },
    backBtn: { padding: Spacing.xs },
    headerTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: Spacing.sm,
    },
    deleteBtn: { padding: Spacing.xs, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    content: { padding: Spacing.lg, paddingBottom: 60 },
    topCardSpacing: {
      marginBottom: Spacing.lg,
    },
    title: { ...Typography.headlineMedium, color: theme.onSurface.primary },
    desc: { ...Typography.bodyMedium, color: theme.onSurface.variant, marginTop: Spacing.xs },
    badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    statusBadge: {
      backgroundColor: theme.surface.high,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Radius.full,
    },
    statusText: { ...Typography.labelMedium, color: theme.onSurface.primary },
    freqTag: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    streakGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
    streakBoxInner: {
      alignItems: 'center',
    },
    streakVal: { ...Typography.headlineLarge, color: theme.onSurface.primary, marginTop: 4 },
    streakLabel: { ...Typography.bodySmall, color: theme.onSurface.variant, marginTop: 2, textAlign: 'center' },
    section: { marginBottom: Spacing.xl },
    sectionTitle: { ...Typography.titleMedium, color: theme.onSurface.primary, marginBottom: Spacing.md },
    historyRow: { flexDirection: 'row', paddingVertical: Spacing.xs },
    dayCard: {
      width: 48,
      height: 76,
      borderRadius: Radius.md,
      backgroundColor: theme.surface.container,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.xs,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    dayCardToday: { borderColor: theme.primary.default, borderWidth: 2 },
    dayCardCompleted: { backgroundColor: theme.primary.default, borderColor: theme.primary.default },
    dayWeek: { ...Typography.labelSmall, color: theme.onSurface.variant, textTransform: 'uppercase' },
    dayNum: { ...Typography.titleMedium, color: theme.onSurface.primary, marginTop: 2 },
    actionRowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    actionTextCol: { flex: 1 },
    actionTitle: { ...Typography.titleMedium, color: theme.onSurface.primary },
    actionDesc: { ...Typography.bodySmall, color: theme.onSurface.variant, marginTop: 2 },
  });

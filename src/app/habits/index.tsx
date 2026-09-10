/**
 * Liste des Habitudes — Suivi quotidien & Streaks.
 * Permet de valider rapidement une habitude aujourd'hui,
 * de voir les séries en cours (streaks) et de gérer les pauses.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { LoadingState, EmptyState, ErrorState } from '@/components/feedback/States';

const COLOR_PRESETS: Record<string, string> = {
  primary: Primary.default,
  tertiary: Tertiary.default,
  green: '#4CAF50',
  orange: '#FF9800',
  purple: '#9C27B0',
  cyan: '#00BCD4',
};

export default function HabitsListScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statsList, setStatsList] = useState<HabitStats[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const data = await HabitUseCases.getAllHabitsWithStats();
      setStatsList(data);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement des habitudes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleToday = async (item: HabitStats) => {
    try {
      const nowCompleted = await HabitUseCases.toggleHabitCompletion(item.habit.id);
      showSnackbar(
        nowCompleted
          ? `Habitude "${item.habit.title}" validée ! 🔥`
          : `Validation retirée pour "${item.habit.title}".`
      );
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de mettre à jour l\'habitude');
    }
  };

  const handleResume = async (habitId: string, title: string) => {
    try {
      await HabitUseCases.resumeHabit(habitId);
      showSnackbar(`Habitude "${title}" reprise !`);
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  if (loading) {
    return <LoadingState message="Chargement de vos habitudes..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const activeHabits = statsList.filter(s => s.habit.status === 'ACTIVE');
  const pausedHabits = statsList.filter(s => s.habit.status === 'PAUSED');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Habitudes & Streaks</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/habits/new')}
        >
          <Ionicons name="add" size={24} color={Surface.base} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={Primary.default}
          />
        }
      >
        {/* Résumé rapide */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCard}>
            <Ionicons name="flame" size={24} color="#FF9800" />
            <Text style={styles.summaryVal}>
              {statsList.reduce((acc, curr) => acc + curr.currentStreak, 0)}
            </Text>
            <Text style={styles.summarySub}>Jours cumulés</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-circle" size={24} color={Primary.default} />
            <Text style={styles.summaryVal}>
              {activeHabits.filter(s => s.completedToday).length} / {activeHabits.length}
            </Text>
            <Text style={styles.summarySub}>Validées aujourd'hui</Text>
          </View>
        </View>

        {/* Section Habitudes Actives */}
        <Text style={styles.sectionTitle}>
          Habitudes en cours ({activeHabits.length})
        </Text>

        {activeHabits.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title="Aucune habitude active"
            description="Créez des habitudes quotidiennes pour suivre vos routines et séries !"
            actionLabel="Créer une habitude"
            onAction={() => router.push('/habits/new')}
          />
        ) : (
          activeHabits.map(item => {
            const habitColor = item.habit.color ? (COLOR_PRESETS[item.habit.color] || item.habit.color) : Tertiary.default;
            return (
              <TouchableOpacity
                key={item.habit.id}
                style={[
                  styles.habitCard,
                  item.completedToday && { borderColor: habitColor + '80', borderWidth: 1.5 },
                ]}
                onPress={() => router.push(`/habits/${item.habit.id}`)}
                activeOpacity={0.8}
              >
                <TouchableOpacity
                  style={[
                    styles.checkCircle,
                    { borderColor: habitColor },
                    item.completedToday && { backgroundColor: habitColor },
                  ]}
                  onPress={() => handleToggleToday(item)}
                >
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={item.completedToday ? Surface.base : 'transparent'}
                  />
                </TouchableOpacity>

                <View style={styles.habitInfo}>
                  <Text style={styles.habitTitle}>{item.habit.title}</Text>
                  {item.habit.description ? (
                    <Text style={styles.habitDesc} numberOfLines={1}>
                      {item.habit.description}
                    </Text>
                  ) : null}
                  <Text style={styles.habitFreq}>
                    {item.habit.frequency === 'DAILY'
                      ? 'Tous les jours'
                      : `${item.habit.targetDaysPerWeek || 1}x par semaine`}
                  </Text>
                </View>

                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={18} color="#FF9800" />
                  <Text style={styles.streakText}>{item.currentStreak} j</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Section Habitudes en Pause */}
        {pausedHabits.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
              En pause ({pausedHabits.length})
            </Text>
            {pausedHabits.map(item => (
              <View key={item.habit.id} style={styles.pausedCard}>
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitTitle, { color: OnSurface.variant }]}>
                    {item.habit.title}
                  </Text>
                  <Text style={styles.pausedSub}>Streak conservé ({item.currentStreak} j)</Text>
                </View>
                <TouchableOpacity
                  style={styles.resumeBtn}
                  onPress={() => handleResume(item.habit.id, item.habit.title)}
                >
                  <Ionicons name="play" size={16} color={Primary.default} />
                  <Text style={styles.resumeText}>Reprendre</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Surface.container,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.titleLarge, color: OnSurface.primary },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  summaryBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  summaryVal: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
    marginTop: Spacing.xs,
  },
  summarySub: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.md,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitInfo: { flex: 1 },
  habitTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  habitDesc: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  habitFreq: { ...Typography.labelSmall, color: OnSurface.disabled, marginTop: 4 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.high,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 4,
  },
  streakText: { ...Typography.labelLarge, color: OnSurface.primary, fontWeight: '700' },
  pausedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  pausedSub: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Primary.default + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  resumeText: { ...Typography.labelMedium, color: Primary.default, fontWeight: '600' },
});

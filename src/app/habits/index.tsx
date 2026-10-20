/**
 * Liste des Habitudes — Suivi quotidien & Streaks.
 * Permet de valider rapidement une habitude aujourd'hui,
 * de voir les séries en cours (streaks) et de gérer les pauses.
 * Respect strict du design Midnight, zéro emoji, dégradé unique sur le FAB.
 */

import { useState, useCallback } from 'react';
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


import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
import { useAppStore } from '@/store/app-store';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';

const COLOR_PRESETS: Record<string, string> = {
  green: '#4CAF50',
  orange: '#FF9800',
  purple: '#9C27B0',
  cyan: '#00BCD4',
};

function resolveHabitColor(colorKey: string | undefined | null, palette: ThemePalette): string {
  if (!colorKey) return palette.tertiary.default;
  if (colorKey === 'primary') return palette.primary.default;
  if (colorKey === 'tertiary') return palette.tertiary.default;
  return COLOR_PRESETS[colorKey] || colorKey;
}

export default function HabitsListScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeHabitsStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statsList, setStatsList] = useState<HabitStats[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const data = await HabitUseCases.getAllHabitsWithStats();
      setStatsList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement des habitudes');
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
          ? `Habitude "${item.habit.title}" validée`
          : `Validation retirée pour "${item.habit.title}"`
      );
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de mettre à jour l\'habitude');
    }
  };

  const handleResume = async (habitId: string, title: string) => {
    try {
      await HabitUseCases.resumeHabit(habitId);
      showSnackbar(`Habitude "${title}" reprise`);
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue');
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Habitudes & Streaks</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 88 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={palette.primary.default}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Résumé rapide */}
        <View style={styles.summaryBar}>
          <GlowCard tone="neutral" style={{ flex: 1 }}>
            <View style={styles.summaryCardInner}>
              <Ionicons name="flame" size={24} color="#FF9800" />
              <Text style={styles.summaryVal}>
                {statsList.reduce((acc, curr) => acc + curr.currentStreak, 0)}
              </Text>
              <Text style={styles.summarySub}>Jours cumulés</Text>
            </View>
          </GlowCard>
          <GlowCard tone="neutral" style={{ flex: 1 }}>
            <View style={styles.summaryCardInner}>
              <Ionicons name="checkmark-circle" size={24} color={palette.primary.default} />
              <Text style={styles.summaryVal}>
                {activeHabits.filter(s => s.completedToday).length} / {activeHabits.length}
              </Text>
              <Text style={styles.summarySub}>Validées aujourd'hui</Text>
            </View>
          </GlowCard>
        </View>

        {/* Section Habitudes Actives */}
        <Text style={styles.sectionTitle}>
          Habitudes en cours ({activeHabits.length})
        </Text>

        {activeHabits.length === 0 ? (
          <GlowCard tone="neutral">
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="repeat-outline" size={32} color={palette.primary.default} />
              </View>
              <Text style={styles.emptyTitle}>Aucune habitude active</Text>
              <Text style={styles.emptyDescription}>
                Créez des habitudes quotidiennes pour suivre vos routines et séries.
              </Text>
            </View>
          </GlowCard>
        ) : (
          activeHabits.map(item => {
            const habitColor = resolveHabitColor(item.habit.color, palette);
            return (
              // tone="success" (soft) une fois cochée, sinon neutral — règle du spec.
              // La couleur personnalisée de l'habitude (habitColor) reste sur le
              // cercle de coche uniquement, pas sur la lueur de la carte.
              <GlowCard
                key={item.habit.id}
                tone={item.completedToday ? 'success' : 'neutral'}
                intensity="soft"
                onPress={() => router.push(`/habits/${item.habit.id}`)}
                accessibilityLabel={`${item.habit.title}${item.completedToday ? ', validée aujourd’hui' : ''}`}
              >
              <View style={styles.habitRow}>
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
                    color={item.completedToday ? palette.surface.base : 'transparent'}
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
              </View>
              </GlowCard>
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
              <GlowCard key={item.habit.id} tone="neutral">
                <View style={styles.pausedRow}>
                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitTitle, { color: palette.onSurface.variant }]}>
                      {item.habit.title}
                    </Text>
                    <Text style={styles.pausedSub}>Streak conservé ({item.currentStreak} j)</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.resumeBtn}
                    onPress={() => handleResume(item.habit.id, item.habit.title)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play" size={16} color={palette.primary.default} />
                    <Text style={styles.resumeText}>Reprendre</Text>
                  </TouchableOpacity>
                </View>
              </GlowCard>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB 3D Glassmorphism */}
      <GlassFloatingActionButton
        label="Habitude"
        icon="repeat-outline"
        bottomOffset={insets.bottom + 16}
        onPress={() => router.push('/habits/new')}
      />
    </View>
  );
}

const makeHabitsStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
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
    backBtn: {
      padding: Spacing.xs,
    },
    headerTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    scrollContent: {
      padding: Spacing.lg,
    },
    summaryBar: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
    summaryCardInner: {
      alignItems: 'center',
    },
    summaryVal: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
      marginTop: Spacing.xs,
      fontWeight: '700',
    },
    summarySub: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
    sectionTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginBottom: Spacing.md,
      fontWeight: '600',
    },
    emptyContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
    },
    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.high,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    emptyTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    emptyDescription: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
    habitRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    habitInfo: {
      flex: 1,
    },
    habitTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    habitDesc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
    habitFreq: {
      ...Typography.labelSmall,
      color: theme.onSurface.disabled,
      marginTop: 4,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.high,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: 4,
    },
    streakText: {
      ...Typography.labelLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    pausedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      opacity: 0.8,
    },
    pausedSub: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
    resumeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary.container,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      gap: 4,
    },
    resumeText: {
      ...Typography.labelMedium,
      color: theme.primary.onContainer,
      fontWeight: '600',
    },
  });

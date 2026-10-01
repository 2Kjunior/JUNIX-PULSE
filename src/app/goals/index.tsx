/**
 * Écran Liste des Objectifs — Suivi de progression.
 * BR-012 : Affiche les objectifs et calcule la progression en fonction des tâches associées.
 * Design Midnight, dégradé unique sur le FAB, zéro emoji.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { GoalUseCases, GoalDetails } from '@/use-cases/goal-use-cases';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
  Gradient,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';

export default function GoalsListScreen() {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [goalsList, setGoalsList] = useState<GoalDetails[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const data = await GoalUseCases.getAllGoalsWithDetails();
      setGoalsList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement des objectifs.');
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

  if (loading) {
    return <LoadingState message="Chargement de vos objectifs..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const activeGoals = goalsList.filter(g => g.goal.status === 'ACTIVE');
  const completedGoals = goalsList.filter(g => g.goal.status === 'COMPLETED');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Objectifs</Text>
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
            tintColor={Primary.default}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Résumé */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCard}>
            <Ionicons name="flag" size={24} color={Primary.default} />
            <Text style={styles.summaryVal}>{activeGoals.length}</Text>
            <Text style={styles.summarySub}>Objectifs actifs</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="trophy" size={24} color="#6DD58C" />
            <Text style={styles.summaryVal}>{completedGoals.length}</Text>
            <Text style={styles.summarySub}>Atteints</Text>
          </View>
        </View>

        {/* Section En Cours */}
        <Text style={styles.sectionTitle}>En cours ({activeGoals.length})</Text>

        {activeGoals.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="flag-outline" size={32} color={Primary.default} />
            </View>
            <Text style={styles.emptyTitle}>Aucun objectif en cours</Text>
            <Text style={styles.emptyDescription}>
              Définissez de grands objectifs et associez-y vos tâches quotidiennes pour mesurer votre progression.
            </Text>
          </View>
        ) : (
          activeGoals.map(item => (
            <TouchableOpacity
              key={item.goal.id}
              style={styles.goalCard}
              onPress={() => router.push(`/goals/${item.goal.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.goalTitle}>{item.goal.title}</Text>
                {item.isOverdue && (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueText}>Échu</Text>
                  </View>
                )}
              </View>

              {item.goal.description ? (
                <Text style={styles.goalDesc} numberOfLines={2}>
                  {item.goal.description}
                </Text>
              ) : null}

              {/* Barre de progression */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    {item.progress !== null
                      ? `${item.progress}% (${item.associatedTasks.filter(t => t.status === 'COMPLETED').length}/${item.associatedTasks.length} tâches)`
                      : 'Aucune tâche liée'}
                  </Text>
                  {item.daysLeft !== null && (
                    <Text
                      style={[
                        styles.deadlineText,
                        item.isOverdue && { color: ErrorColors.default },
                      ]}
                    >
                      {item.daysLeft < 0
                        ? `Retard de ${Math.abs(item.daysLeft)} j`
                        : `${item.daysLeft} j restants`}
                    </Text>
                  )}
                </View>

                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${item.progress ?? 0}%`,
                        backgroundColor: item.isOverdue
                          ? ErrorColors.default
                          : Primary.default,
                      },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Section Objectifs Atteints */}
        {completedGoals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
              Objectifs atteints ({completedGoals.length})
            </Text>
            {completedGoals.map(item => (
              <TouchableOpacity
                key={item.goal.id}
                style={[styles.goalCard, { opacity: 0.85 }]}
                onPress={() => router.push(`/goals/${item.goal.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.goalTitle}>{item.goal.title}</Text>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#6DD58C" />
                    <Text style={styles.completedText}>Atteint</Text>
                  </View>
                </View>

                {item.goal.description ? (
                  <Text style={styles.goalDesc} numberOfLines={1}>
                    {item.goal.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB avec dégradé unique */}
      <TouchableOpacity
        style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}
        onPress={() => router.push('/goals/new')}
        activeOpacity={0.85}
        accessibilityLabel="Nouvel objectif"
      >
        <LinearGradient
          colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color="#141317" />
          <Text style={styles.fabText}>Objectif</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
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
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
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
    fontWeight: '700',
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
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  emptyDescription: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
  },
  goalCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '600',
    flex: 1,
  },
  overdueBadge: {
    backgroundColor: ErrorColors.default + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  overdueText: {
    ...Typography.labelSmall,
    color: ErrorColors.default,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(109, 213, 140, 0.12)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  completedText: {
    ...Typography.labelSmall,
    color: '#6DD58C',
    fontWeight: '600',
  },
  goalDesc: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  progressSection: {
    marginTop: Spacing.xs,
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  deadlineText: {
    ...Typography.labelSmall,
    color: Tertiary.default,
  },
  track: {
    height: 8,
    backgroundColor: Surface.high,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    gap: 6,
  },
  fabText: {
    ...Typography.titleMedium,
    color: '#141317',
    fontWeight: '700',
  },
});

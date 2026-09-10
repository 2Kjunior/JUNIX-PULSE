/**
 * Écran Liste des Objectifs — Suivi de progression.
 * BR-012 : Affiche les objectifs et calcule la progression en fonction des tâches associées.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
} from '@/constants/theme';
import { LoadingState, EmptyState, ErrorState } from '@/components/feedback/States';

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
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement des objectifs.');
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Objectifs</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/goals/new')}
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
        {/* Résumé */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCard}>
            <Ionicons name="flag" size={24} color={Primary.default} />
            <Text style={styles.summaryVal}>{activeGoals.length}</Text>
            <Text style={styles.summarySub}>Objectifs actifs</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="trophy" size={24} color="#4CAF50" />
            <Text style={styles.summaryVal}>{completedGoals.length}</Text>
            <Text style={styles.summarySub}>Atteints</Text>
          </View>
        </View>

        {/* Section En Cours */}
        <Text style={styles.sectionTitle}>En cours ({activeGoals.length})</Text>

        {activeGoals.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="Aucun objectif en cours"
            message="Définissez de grands objectifs et associez-y vos tâches quotidiennes pour mesurer votre progression !"
            actionLabel="Créer un objectif"
            onAction={() => router.push('/goals/new')}
          />
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
                style={[styles.goalCard, { opacity: 0.8 }]}
                onPress={() => router.push(`/goals/${item.goal.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.goalTitle, { textDecorationLine: 'line-through' }]}>
                    {item.goal.title}
                  </Text>
                  <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                </View>
              </TouchableOpacity>
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
  summaryBar: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  summaryCard: {
    flex: 1,
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  summaryVal: { ...Typography.headlineMedium, color: OnSurface.primary, marginTop: Spacing.xs },
  summarySub: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  sectionTitle: { ...Typography.titleMedium, color: OnSurface.primary, marginBottom: Spacing.md },
  goalCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { ...Typography.titleMedium, color: OnSurface.primary, flex: 1 },
  overdueBadge: {
    backgroundColor: ErrorColors.default + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  overdueText: { ...Typography.labelSmall, color: ErrorColors.default, fontWeight: '700' },
  goalDesc: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 4 },
  progressSection: { marginTop: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { ...Typography.bodySmall, color: OnSurface.variant },
  deadlineText: { ...Typography.labelSmall, color: Primary.default },
  track: {
    height: 8,
    backgroundColor: Surface.elevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.full },
});

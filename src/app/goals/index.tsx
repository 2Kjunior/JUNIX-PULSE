/**
 * Écran Liste des Objectifs — Suivi de progression.
 * BR-012 : Affiche les objectifs et calcule la progression en fonction des tâches associées.
 * Design Midnight, dégradé unique sur le FAB, zéro emoji.
 *
 * Swipe gauche sur une carte active → boutons Modifier / Supprimer (LiquidGlass).
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

import { GoalUseCases, GoalDetails } from '@/use-cases/goal-use-cases';
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
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { SwipeableItem, makeStandardRightActions } from '@/components/ui/SwipeableItem';
import { useT } from '@/i18n';

export default function GoalsListScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeGoalsStyles);

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
      setError(e instanceof Error ? e.message : t('goals.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (goalId: string, title: string) => {
    Alert.alert(
      t('goals.deleteTitle'),
      t('goals.deleteBody', { title }),
      [
        { text: t('form.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await GoalUseCases.deleteGoal(goalId);
              setGoalsList(prev => prev.filter(g => g.goal.id !== goalId));
              showSnackbar(t('goals.deletedNamed', { title }), {
                actionLabel: t('taskDetail.undo'),
                onAction: async () => {
                  await result.undo();
                  loadData();
                },
                durationMs: 5_000,
              });
            } catch (e) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('habits.deleteError'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingState message={t('goals.loading')} />;
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
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('goals.title')}</Text>
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
        {/* Résumé */}
        <View style={styles.summaryBar}>
          <GlowCard tone="neutral" style={{ flex: 1 }}>
            <View style={styles.summaryCardInner}>
              <Ionicons name="flag" size={24} color={palette.primary.default} />
              <Text style={styles.summaryVal}>{activeGoals.length}</Text>
              <Text style={styles.summarySub}>{t('goals.activeLabel')}</Text>
            </View>
          </GlowCard>
          <GlowCard tone="neutral" style={{ flex: 1 }}>
            <View style={styles.summaryCardInner}>
              <Ionicons name="trophy" size={24} color={palette.success.default} />
              <Text style={styles.summaryVal}>{completedGoals.length}</Text>
              <Text style={styles.summarySub}>{t('goals.reachedLabel')}</Text>
            </View>
          </GlowCard>
        </View>

        {/* Section En Cours */}
        <Text style={styles.sectionTitle}>{t('goals.inProgress', { count: activeGoals.length })}</Text>

        {activeGoals.length === 0 ? (
          <GlowCard tone="neutral">
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="flag-outline" size={32} color={palette.primary.default} />
              </View>
              <Text style={styles.emptyTitle}>{t('goals.emptyTitle')}</Text>
              <Text style={styles.emptyDescription}>
                {t('goals.emptyDesc')}
              </Text>
            </View>
          </GlowCard>
        ) : (
          activeGoals.map(item => (
            /* SwipeableItem : swipe gauche → Modifier + Supprimer (LiquidGlass) */
            <SwipeableItem
              key={item.goal.id}
              containerStyle={styles.swipeableContainer}
              rightActions={makeStandardRightActions({
                palette,
                onDelete: () => handleDelete(item.goal.id, item.goal.title),
                onEdit: () => router.push(`/goals/${item.goal.id}`),
              })}
            >
              <GlowCard
                tone={item.isOverdue ? 'urgent' : 'neutral'}
                intensity="soft"
                onPress={() => router.push(`/goals/${item.goal.id}`)}
                accessibilityLabel={`${item.goal.title}${item.isOverdue ? t('goals.overdueA11y') : ''}`}
              >
                <View style={styles.goalContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.goalTitle}>{item.goal.title}</Text>
                    {item.isOverdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueText}>{t('goals.overdueBadge')}</Text>
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
                          ? t('goals.progressTasks', { percent: item.progress, done: item.associatedTasks.filter(task => task.status === 'COMPLETED').length, total: item.associatedTasks.length })
                          : t('goals.noTasks')}
                      </Text>
                      {item.daysLeft !== null && (
                        <Text
                          style={[
                            styles.deadlineText,
                            item.isOverdue && { color: palette.error.default },
                          ]}
                        >
                          {item.daysLeft < 0
                            ? t('goals.late', { days: Math.abs(item.daysLeft) })
                            : t('goals.daysLeft', { days: item.daysLeft })}
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
                              ? palette.error.default
                              : palette.primary.default,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </GlowCard>
            </SwipeableItem>
          ))
        )}

        {/* Section Objectifs Atteints */}
        {completedGoals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
              {t('goals.reachedCount', { count: completedGoals.length })}
            </Text>
            {completedGoals.map(item => (
              <GlowCard
                key={item.goal.id}
                tone="success"
                intensity="soft"
                style={{ opacity: 0.85, marginBottom: Spacing.sm }}
                onPress={() => router.push(`/goals/${item.goal.id}`)}
                accessibilityLabel={`${item.goal.title}${t('goals.reachedA11y')}`}
              >
                <View style={styles.goalContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.goalTitle}>{item.goal.title}</Text>
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={palette.success.default} />
                      <Text style={styles.completedText}>{t('goals.reachedBadge')}</Text>
                    </View>
                  </View>

                  {item.goal.description ? (
                    <Text style={styles.goalDesc} numberOfLines={1}>
                      {item.goal.description}
                    </Text>
                  ) : null}
                </View>
              </GlowCard>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB 3D Glassmorphism */}
      <GlassFloatingActionButton
        label={t('goals.fab')}
        icon="flag-outline"
        bottomOffset={insets.bottom + 16}
        onPress={() => router.push('/goals/new')}
      />
    </View>
  );
}

const makeGoalsStyles = (theme: ThemePalette) =>
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
    /** Wrapper du SwipeableItem — fournit l'espacement vertical entre cartes */
    swipeableContainer: {
      marginBottom: Spacing.sm,
    },
    goalContent: {
      gap: Spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    goalTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
      flex: 1,
    },
    overdueBadge: {
      backgroundColor: theme.error.container,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    overdueText: {
      ...Typography.labelSmall,
      color: theme.error.default,
      fontWeight: '600',
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.success.container,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    completedText: {
      ...Typography.labelSmall,
      color: theme.success.default,
      fontWeight: '600',
    },
    goalDesc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
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
      color: theme.onSurface.variant,
    },
    deadlineText: {
      ...Typography.labelSmall,
      color: theme.tertiary.default,
    },
    track: {
      height: 8,
      backgroundColor: theme.surface.high,
      borderRadius: Radius.full,
      overflow: 'hidden',
      marginTop: 4,
    },
    fill: {
      height: '100%',
      borderRadius: Radius.full,
    },
  });

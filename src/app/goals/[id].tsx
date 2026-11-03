/**
 * Détail d'un Objectif.
 * Affiche la progression, la liste des tâches associées et permet d'en lier de nouvelles.
 * BR-012 : progression calculée en temps réel d'après les tâches associées.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { GoalUseCases, GoalDetails } from '@/use-cases/goal-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { TaskRepository } from '@/repositories/task-repository';
import { Task } from '@/domain/entities';
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

export default function GoalDetailScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeGoalDetailStyles);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<GoalDetails | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await GoalUseCases.getGoalWithDetails(id);
      if (!data) {
        setError(t('goalDetail.notFound'));
        return;
      }
      setDetails(data);

      // Charger toutes les tâches actives pour la liaison
      const allTasks = await TaskRepository.findAllActive();
      const linkedIds = new Set(data.associatedTasks.map(task => task.id));
      setAvailableTasks(allTasks.filter(task => !linkedIds.has(task.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('goalDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLinkTask = async (taskId: string) => {
    if (!id) return;
    try {
      await GoalUseCases.linkTask(id, taskId);
      showSnackbar(t('goalDetail.linked'));
      setShowTaskPicker(false);
      loadData();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleUnlinkTask = async (taskId: string, title: string) => {
    if (!id) return;
    try {
      await GoalUseCases.unlinkTask(id, taskId);
      showSnackbar(t('goalDetail.unlinked', { title }));
      loadData();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const newStatus = await TaskUseCases.toggleComplete(taskId);
      showSnackbar(newStatus === 'COMPLETED' ? t('goalDetail.taskDone') : t('tasks.reopened'));
      loadData();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleDelete = async () => {
    if (!id || !details) return;
    const result = await GoalUseCases.deleteGoal(id);
    showSnackbar(t('goalDetail.deleted'), {
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
    return <LoadingState message={t('goalDetail.loading')} />;
  }

  if (error || !details) {
    return <ErrorState message={error || t('habitDetail.missing')} onRetry={loadData} />;
  }

  const { goal, associatedTasks, progress, isOverdue, daysLeft } = details;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.backA11y')}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {goal.title}
        </Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.deleteA11y')}
        >
          <Ionicons name="trash-outline" size={22} color={palette.error.default} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Top Card */}
        <View style={styles.topCardSpacing}>
        <GlowCard tone={isOverdue ? 'urgent' : 'neutral'} size="hero">
          <Text style={styles.title}>{goal.title}</Text>
          {goal.description ? (
            <Text style={styles.desc}>{goal.description}</Text>
          ) : null}

          {/* Statut & Deadline */}
          <View style={styles.metaRow}>
            {goal.deadline && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={palette.onSurface.variant} />
                <Text style={styles.metaText}>
                  {format(new Date(goal.deadline), 'd MMMM yyyy', { locale: dateLocale })}
                </Text>
              </View>
            )}
            {daysLeft !== null && (
              <Text
                style={[
                  styles.daysBadge,
                  isOverdue && { color: palette.error.default },
                ]}
              >
                {isOverdue
                  ? t('goalDetail.overdue', { days: Math.abs(daysLeft) })
                  : t('goalDetail.daysLeft', { days: daysLeft })}
              </Text>
            )}
          </View>
        </GlowCard>
        </View>

        {/* Progression */}
        <View style={styles.progressCardSpacing}>
        <GlowCard tone={progress === 100 ? 'success' : 'neutral'}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>{t('goalDetail.progress')}</Text>
            <Text style={styles.progressPercent}>
              {progress !== null ? `${progress}%` : '—'}
            </Text>
          </View>

          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${progress ?? 0}%`,
                  backgroundColor: progress === 100 ? palette.success.default : palette.primary.default,
                },
              ]}
            />
          </View>

          {progress === 100 && (
            <View style={styles.completedBadge}>
              <Ionicons name="trophy-outline" size={16} color={palette.success.default} />
              <Text style={styles.completedBadgeText}>{t('goalDetail.complete')}</Text>
            </View>
          )}

          <Text style={styles.progressSub}>
            {associatedTasks.length > 0
              ? t('goalDetail.tasksDone', { done: associatedTasks.filter(task => task.status === 'COMPLETED').length, total: associatedTasks.length })
              : t('goalDetail.noTasks')}
          </Text>
        </GlowCard>
        </View>

        {/* Section Tâches Associées */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('goalDetail.tasksLinked', { count: associatedTasks.length })}
            </Text>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => setShowTaskPicker(!showTaskPicker)}
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.linkA11y')}
            >
              <Ionicons name="add" size={18} color={palette.primary.default} />
              <Text style={styles.linkBtnText}>{t('goalDetail.link')}</Text>
            </TouchableOpacity>
          </View>

          {/* Picker de tâches à lier */}
          {showTaskPicker && (
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>{t('goalDetail.pick')}</Text>
              {availableTasks.length === 0 ? (
                <Text style={styles.pickerEmpty}>
                  {t('goalDetail.pickEmpty')}
                </Text>
              ) : (
                availableTasks.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.pickerItem}
                    onPress={() => handleLinkTask(task.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('goalDetail.linkTaskA11y', { title: task.title })}
                  >
                    <Text style={styles.pickerItemText}>{task.title}</Text>
                    <Ionicons name="link" size={18} color={palette.primary.default} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Liste des tâches liées */}
          {associatedTasks.length === 0 ? (
            <Text style={styles.emptyText}>
              {t('goalDetail.emptyTasks')}
            </Text>
          ) : (
            associatedTasks.map(task => (
              <View key={task.id} style={styles.taskCardSpacing}>
              <GlowCard tone="neutral">
                <View style={styles.taskRow}>
                  <TouchableOpacity
                    onPress={() => handleToggleTask(task.id)}
                    style={styles.taskCheckBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: task.status === 'COMPLETED' }}
                    accessibilityLabel={task.status === 'COMPLETED' ? t('goalDetail.markUndoneA11y', { title: task.title }) : t('goalDetail.markDoneA11y', { title: task.title })}
                  >
                    <Ionicons
                      name={
                        task.status === 'COMPLETED'
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={22}
                      color={task.status === 'COMPLETED' ? palette.success.default : palette.onSurface.disabled}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.status === 'COMPLETED' && { textDecorationLine: 'line-through', opacity: 0.7 },
                    ]}
                    onPress={() => handleToggleTask(task.id)}
                  >
                    {task.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleUnlinkTask(task.id, task.title)}
                    accessibilityRole="button"
                    accessibilityLabel={t('goalDetail.unlinkA11y', { title: task.title })}
                  >
                    <Ionicons name="unlink-outline" size={20} color={palette.onSurface.disabled} />
                  </TouchableOpacity>
                </View>
              </GlowCard>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeGoalDetailStyles = (theme: ThemePalette) =>
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
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { ...Typography.bodySmall, color: theme.onSurface.variant },
    daysBadge: { ...Typography.labelMedium, color: theme.primary.default, fontWeight: '600' },
    progressCardSpacing: {
      marginBottom: Spacing.xl,
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    progressTitle: { ...Typography.titleMedium, color: theme.onSurface.primary },
    progressPercent: { ...Typography.titleLarge, color: theme.primary.default },
    track: { height: 10, backgroundColor: theme.surface.high, borderRadius: Radius.full, overflow: 'hidden', marginVertical: Spacing.xs },
    fill: { height: '100%', borderRadius: Radius.full },
    progressSub: { ...Typography.bodySmall, color: theme.onSurface.variant, marginTop: Spacing.xs },
    section: { marginBottom: Spacing.xl },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { ...Typography.titleMedium, color: theme.onSurface.primary },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    linkBtnText: { ...Typography.labelMedium, color: theme.primary.default, fontWeight: '600' },
    pickerBox: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: theme.primary.default + '40',
    },
    pickerTitle: { ...Typography.labelMedium, color: theme.onSurface.primary, marginBottom: Spacing.xs },
    pickerEmpty: { ...Typography.bodySmall, color: theme.onSurface.variant },
    pickerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
    },
    pickerItemText: { ...Typography.bodyMedium, color: theme.onSurface.primary },
    emptyText: { ...Typography.bodySmall, color: theme.onSurface.variant, fontStyle: 'italic' },
    taskCardSpacing: {
      marginBottom: Spacing.xs,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    taskCheckBtn: {
      padding: 2,
    },
    taskTitle: { flex: 1, ...Typography.bodyMedium, color: theme.onSurface.primary },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.success.container,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.full,
      alignSelf: 'flex-start',
      marginTop: 6,
      borderWidth: 1,
      borderColor: theme.success.default + '4D',
    },
    completedBadgeText: {
      ...Typography.labelSmall,
      color: theme.success.default,
      fontWeight: '700',
    },
  });

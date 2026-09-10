/**
 * Onglet Tâches — Vue principale avec filtres Inbox, Aujourd'hui et Toutes.
 * Implémentation complète V1.0 avec complétion instantanée (Undo 30s)
 * et sous-tâches.
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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { TaskRepository } from '@/repositories/task-repository';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { Task, Subtask } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Success,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

type FilterTab = 'inbox' | 'today' | 'all';
type ScreenState = 'loading' | 'content' | 'error';

interface TaskWithSubtasks {
  task: Task;
  subtasks: Subtask[];
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [activeTab, setActiveTab] = useState<FilterTab>('inbox');
  const [items, setItems] = useState<TaskWithSubtasks[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    try {
      let rawTasks: Task[] = [];
      if (activeTab === 'inbox') {
        rawTasks = await TaskRepository.findInbox();
      } else if (activeTab === 'today') {
        rawTasks = await TaskRepository.findForDate(todayStr);
      } else {
        rawTasks = await TaskRepository.findAll();
      }

      // Chargement des sous-tâches pour chaque tâche
      const tasksWithSubs = await Promise.all(
        rawTasks.map(async t => {
          const subs = await TaskRepository.findSubtasks(t.id);
          return { task: t, subtasks: subs };
        })
      );

      setItems(tasksWithSubs);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setScreenState('error');
    }
  }, [activeTab, todayStr]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ─── Complétion Rapide ──────────────────────────────────────────────────────

  async function handleToggleComplete(task: Task) {
    try {
      const newStatus = await TaskUseCases.toggleComplete(task.id);
      const isCompleted = newStatus === 'COMPLETED';

      // Mise à jour optimiste de l'UI
      setItems(prev =>
        prev.map(item =>
          item.task.id === task.id
            ? { ...item, task: { ...item.task, status: newStatus } }
            : item
        )
      );

      showSnackbar(isCompleted ? 'Tâche terminée ✓' : 'Tâche réouverte', {
        actionLabel: 'Annuler (30s)',
        onAction: async () => {
          await TaskUseCases.toggleComplete(task.id);
          load();
        },
      });
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur');
      load();
    }
  }

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Tâches</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/tasks/new')}
          accessibilityLabel="Nouvelle tâche"
        >
          <Ionicons name="add" size={24} color={Primary.on} />
        </TouchableOpacity>
      </View>

      {/* Tabs Inbox / Aujourd'hui / Toutes */}
      <View style={styles.tabBar}>
        {[
          { key: 'inbox', label: 'Inbox' },
          { key: 'today', label: "Aujourd'hui" },
          { key: 'all', label: 'Toutes' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key as FilterTab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste principale */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Primary.default} />
        }
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <EmptyState
            icon={activeTab === 'inbox' ? '📥' : activeTab === 'today' ? '📅' : '✓'}
            title={
              activeTab === 'inbox'
                ? 'Votre Inbox est vide'
                : activeTab === 'today'
                ? 'Aucune tâche planifiée aujourd’hui'
                : 'Aucune tâche pour le moment'
            }
            description={
              activeTab === 'inbox'
                ? 'Créez une tâche sans date pour la stocker ici avant de la planifier.'
                : 'Planifiez vos journées pour rester concentré sur l’essentiel.'
            }
            actionLabel="+ Nouvelle tâche"
            onAction={() => router.push('/tasks/new')}
          />
        ) : (
          items.map(({ task, subtasks }) => (
            <TaskCard
              key={task.id}
              task={task}
              subtasks={subtasks}
              onToggleComplete={() => handleToggleComplete(task)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TaskCard({
  task,
  subtasks,
  onToggleComplete,
}: {
  task: Task;
  subtasks: Subtask[];
  onToggleComplete: () => void;
}) {
  const isCompleted = task.status === 'COMPLETED';
  const completedSubsCount = subtasks.filter(s => s.isCompleted).length;

  const priorityColors: Record<string, string> = {
    URGENT: '#FF5252',
    HIGH: '#FFB74D',
    NORMAL: Primary.default,
    LOW: OnSurface.disabled,
  };
  const accentColor = priorityColors[task.priority] ?? Primary.default;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tasks/${task.id}` as any)}
      activeOpacity={0.8}
    >
      {/* Barre verticale de priorité */}
      <View style={[styles.priorityIndicator, { backgroundColor: accentColor }]} />

      {/* Checkbox */}
      <TouchableOpacity
        style={styles.checkBtn}
        onPress={onToggleComplete}
        accessibilityLabel={isCompleted ? 'Marquer non terminée' : 'Marquer terminée'}
      >
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isCompleted ? Success.default : OnSurface.disabled}
        />
      </TouchableOpacity>

      {/* Contenu principal */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, isCompleted && styles.cardTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>

        {!!task.description && (
          <Text style={styles.cardDesc} numberOfLines={1}>
            {task.description}
          </Text>
        )}

        {/* Badges (Date, Sous-tâches, Durée) */}
        <View style={styles.metaRow}>
          {task.scheduledDate && (
            <View style={styles.metaBadge}>
              <Ionicons name="calendar-outline" size={12} color={OnSurface.variant} />
              <Text style={styles.metaText}>
                {format(new Date(task.scheduledDate + 'T12:00:00'), 'd MMM', { locale: fr })}
              </Text>
            </View>
          )}

          {subtasks.length > 0 && (
            <View style={styles.metaBadge}>
              <Ionicons name="checkbox-outline" size={12} color={Primary.default} />
              <Text style={[styles.metaText, { color: Primary.default }]}>
                {completedSubsCount}/{subtasks.length}
              </Text>
            </View>
          )}

          {task.estimatedMinutes && (
            <View style={styles.metaBadge}>
              <Ionicons name="time-outline" size={12} color={Tertiary.default} />
              <Text style={[styles.metaText, { color: Tertiary.default }]}>
                {task.estimatedMinutes >= 60
                  ? `${Math.floor(task.estimatedMinutes / 60)}h`
                  : `${task.estimatedMinutes}m`}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  title: { ...Typography.headlineLarge, color: OnSurface.primary },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
  },
  tabItemActive: { backgroundColor: Primary.container },
  tabLabel: { ...Typography.labelMedium, color: OnSurface.variant },
  tabLabelActive: { color: Primary.onContainer },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  checkBtn: { paddingRight: Spacing.sm, paddingLeft: Spacing.xs },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  cardTitleDone: { textDecorationLine: 'line-through', color: OnSurface.disabled },
  cardDesc: { ...Typography.bodySmall, color: OnSurface.variant },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Surface.high,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  metaText: { ...Typography.labelSmall, color: OnSurface.variant, fontSize: 10 },
});

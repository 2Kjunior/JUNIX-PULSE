/**
 * Onglet Tâches — Référence R-08 du Master Prompt Junix Pulse.
 * Séparation claire : Inbox (sans date) → Aujourd'hui → Toutes.
 * Cartes action-first avec case à cocher, sous-tâches, durée estimée et tags.
 * Bouton flottant CTA dégradé : + Nouvelle tâche.
 *
 * Règle A.1 : Zéro emoji dans tout le composant.
 * Règle A.2 : Cartes rayon 16px (Radius.lg), 1 seul dégradé CTA, palette theme.ts.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { isTaskOverdue, calculateTaskProgress } from '@/domain/rules/task-rules';
import { useAppStore } from '@/store/app-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import {
  TAB_BAR_TOTAL_HEIGHT,
  type GlowTone,
} from '@/constants/theme';
import { ThemePalette } from '@/constants/palettes';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { GlowCard } from '@/components/ui/GlowCard';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { SwipeableItem } from '@/components/ui/SwipeableItem';
import { makeTasksStyles } from '@/styles/tabs/tasks-styles';

type FilterTab = 'inbox' | 'today' | 'all';
type ScreenState = 'loading' | 'content' | 'error';

interface TaskWithSubtasks {
  task: Task;
  subtasks: Subtask[];
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeTasksStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [activeTab, setActiveTab] = useState<FilterTab>('inbox');
  const [items, setItems] = useState<TaskWithSubtasks[]>([]);
  const [counts, setCounts] = useState({ inbox: 0, today: 0, all: 0 });
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    try {
      const [inboxTasks, todayTasks, allTasks] = await Promise.all([
        TaskRepository.findInbox(),
        TaskRepository.findForDate(todayStr),
        TaskRepository.findAll(),
      ]);

      setCounts({
        inbox: inboxTasks.filter(t => t.status !== 'COMPLETED').length,
        today: todayTasks.filter(t => t.status !== 'COMPLETED').length,
        all: allTasks.filter(t => t.status !== 'COMPLETED').length,
      });

      let selectedTasks: Task[] = [];
      if (activeTab === 'inbox') {
        selectedTasks = inboxTasks;
      } else if (activeTab === 'today') {
        selectedTasks = todayTasks;
      } else {
        selectedTasks = allTasks;
      }

      const tasksWithSubs = await Promise.all(
        selectedTasks.map(async t => {
          const subs = await TaskRepository.findSubtasks(t.id);
          return { task: t, subtasks: subs };
        })
      );

      // Tri ergonomique : Tâches non terminées d'abord (triées par priorité), puis tâches terminées
      const priorityWeights: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      const sorted = [...tasksWithSubs].sort((a, b) => {
        const aCompleted = a.task.status === 'COMPLETED';
        const bCompleted = b.task.status === 'COMPLETED';
        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1;
        }
        return (priorityWeights[a.task.priority] ?? 2) - (priorityWeights[b.task.priority] ?? 2);
      });

      setItems(sorted);
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

  async function handleToggleComplete(task: Task) {
    try {
      const newStatus = await TaskUseCases.toggleComplete(task.id);
      const isCompleted = newStatus === 'COMPLETED';

      // Mise à jour optimiste
      setItems(prev =>
        prev.map(item =>
          item.task.id === task.id
            ? { ...item, task: { ...item.task, status: newStatus } }
            : item
        )
      );

      showSnackbar(isCompleted ? 'Tâche terminée.' : 'Tâche réouverte.', {
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

  async function handleDeleteTask(task: Task) {
    try {
      // Retrait optimiste de la liste
      setItems(prev => prev.filter(item => item.task.id !== task.id));
      const result = await TaskUseCases.deleteTask(task.id);
      showSnackbar('Tâche supprimée.', {
        actionLabel: 'Annuler (30s)',
        onAction: async () => {
          await result.undo();
          load();
        },
        durationMs: 30000,
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
      {/* ─── En-tête R-08 ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tâches</Text>
          <Text style={styles.subtitle}>Gestion d'action • Focus</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="options-outline" size={20} color={theme.onSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* ─── Segmented Control R-08 ────────────────────────────────────────────── */}
      <PillTopBar
        tabs={[
          { key: 'inbox', label: 'Inbox', count: counts.inbox, icon: 'file-tray-outline' },
          { key: 'today', label: "Aujourd'hui", count: counts.today, icon: 'today-outline' },
          { key: 'all', label: 'Toutes', count: counts.all, icon: 'list-outline' },
        ]}
        activeTab={activeTab}
        onTabChange={(k) => setActiveTab(k as FilterTab)}
      />

      {/* ─── Liste principale ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 104 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary.default} />
        }
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <EmptyState
            iconName="checkmark-circle-outline"
            title={
              activeTab === 'inbox'
                ? 'Votre Inbox est vide'
                : activeTab === 'today'
                ? 'Aucune tâche pour aujourd’hui'
                : 'Aucune tâche active'
            }
            description={
              activeTab === 'inbox'
                ? 'Capturez rapidement vos intentions sans contrainte de date.'
                : 'Concentrez-vous sur ce qui compte maintenant ou planifiez depuis l’Inbox.'
            }
            actionLabel="+ Nouvelle tâche"
            onAction={() => router.push('/tasks/new')}
          />
        ) : (
          items.map(({ task, subtasks }) => (
            <SwipeableItem
              key={task.id}
              onDelete={() => handleDeleteTask(task)}
              onComplete={() => handleToggleComplete(task)}
              completeLabel={task.status === 'COMPLETED' ? 'Réouvrir' : 'Terminer'}
              deleteLabel="Supprimer"
            >
              <TaskCardR08
                task={task}
                subtasks={subtasks}
                theme={theme}
                styles={styles}
                onToggleComplete={() => handleToggleComplete(task)}
              />
            </SwipeableItem>
          ))
        )}
      </ScrollView>

      {/* ─── Bouton Flottant 3D Glassmorphism (Unique CTA R-08) ─────────────── */}
      <GlassFloatingActionButton
        label="Nouvelle tâche"
        icon="add"
        onPress={() => router.push('/tasks/new')}
      />
    </View>
  );
}

// ─── Composants locaux ─────────────────────────────────────────────────────────

function TaskCardR08({
  task,
  subtasks,
  theme,
  styles,
  onToggleComplete,
}: {
  task: Task;
  subtasks: Subtask[];
  theme: ThemePalette;
  styles: ReturnType<typeof makeTasksStyles>;
  onToggleComplete: () => void;
}) {
  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = !isCompleted && isTaskOverdue(task);
  const progress = calculateTaskProgress(task, subtasks);
  const totalSubs = subtasks.length;
  const completedSubs = progress.completed;
  const priorityColor = theme.priority[task.priority] ?? theme.primary.default;

  // La lueur suit la priorité ou le retard et disparaît sur une tâche terminée
  const glowTone: GlowTone = isCompleted
    ? 'neutral'
    : isOverdue
      ? 'urgent'
      : task.priority === 'URGENT'
        ? 'urgent'
        : task.priority === 'HIGH'
          ? 'attention'
          : task.priority === 'NORMAL'
            ? 'info'
            : 'neutral';

  return (
    <GlowCard
      tone={glowTone}
      intensity="soft"
      onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
      accessibilityLabel={`${task.title}${isCompleted ? ', terminée' : ''}${isOverdue ? ', en retard' : ''}`}
    >
      <View style={[styles.taskRow, isCompleted && styles.taskRowCompleted]}>
        {/* Case à cocher tactile isolée (44x44px accessible) */}
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.65}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={isCompleted ? 'Marquer non terminée' : 'Marquer terminée'}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isCompleted ? theme.success.default : theme.outline.default}
          />
        </TouchableOpacity>

        {/* Corps de la tâche */}
        <View style={styles.cardContent}>
          <Text
            style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {/* Mini-jauge de progression des sous-tâches (3px) */}
          {totalSubs > 0 ? (
            <View
              style={styles.progressTrack}
              accessibilityLabel={`Progression : ${progress.percentage}%`}
            >
              <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
            </View>
          ) : null}

          {/* Ligne des badges d'information (Action-first) */}
          <View style={styles.metaRow}>
            {/* Tag de statut/date ou alerte de retard */}
            {task.scheduledDate ? (
              <View style={[styles.metaPill, isOverdue && styles.metaPillOverdue]}>
                <Ionicons
                  name={isOverdue ? 'alert-circle-outline' : 'calendar-outline'}
                  size={11}
                  color={isOverdue ? theme.error.default : theme.tertiary.default}
                />
                <Text style={[styles.metaPillText, isOverdue && styles.metaPillTextOverdue]}>
                  {isOverdue
                    ? `En retard (${format(new Date(task.scheduledDate), 'd MMM', { locale: fr })})`
                    : format(new Date(task.scheduledDate), 'd MMM', { locale: fr })}
                </Text>
              </View>
            ) : (
              <View style={styles.metaPill}>
                <Ionicons name="file-tray-outline" size={11} color={theme.onSurface.variant} />
                <Text style={styles.metaPillText}>Inbox</Text>
              </View>
            )}

            {/* Sous-tâches */}
            {totalSubs > 0 && (
              <View style={styles.metaPill}>
                <Ionicons name="checkbox-outline" size={11} color={theme.primary.default} />
                <Text style={styles.metaPillText}>
                  {completedSubs}/{totalSubs}
                </Text>
              </View>
            )}

            {/* Durée estimée */}
            {task.estimatedMinutes ? (
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={11} color={theme.onSurface.variant} />
                <Text style={styles.metaPillText}>{task.estimatedMinutes} min</Text>
              </View>
            ) : null}

            {/* Priorité : chip + libellé toujours visibles pour Urgent/Haute/Normale */}
            {task.priority !== 'LOW' ? (
              <View style={[styles.metaPill, { borderColor: priorityColor + '40' }]}>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                <Text style={[styles.metaPillText, { color: priorityColor }]}>
                  {task.priority === 'URGENT' ? 'Urgent' : task.priority === 'HIGH' ? 'Haute' : 'Normale'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={theme.onSurface.disabled} />
      </View>
    </GlowCard>
  );
}

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
import { LinearGradient } from 'expo-linear-gradient';

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
  Priority as PriorityColors,
  Gradient,
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';
import { styles } from './tasks-styles';

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
          <Ionicons name="options-outline" size={20} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* ─── Segmented Control R-08 ────────────────────────────────────────────── */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBar}>
          {[
            { key: 'inbox', label: 'Inbox', count: counts.inbox, icon: 'file-tray-outline' as const },
            { key: 'today', label: "Aujourd'hui", count: counts.today, icon: 'today-outline' as const },
            { key: 'all', label: 'Toutes', count: counts.all, icon: 'list-outline' as const },
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key as FilterTab)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? Primary.default : OnSurface.variant}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── Liste principale ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 72 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Primary.default} />
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
            <TaskCardR08
              key={task.id}
              task={task}
              subtasks={subtasks}
              onToggleComplete={() => handleToggleComplete(task)}
            />
          ))
        )}
      </ScrollView>

      {/* ─── Bouton Flottant Dégradé (Unique CTA R-08) ─────────────────────────── */}
      <View style={[styles.floatingCtaContainer, { bottom: TAB_BAR_TOTAL_HEIGHT + 16 }]}>
        <TouchableOpacity
          onPress={() => router.push('/tasks/new')}
          activeOpacity={0.85}
          accessibilityLabel="Créer une nouvelle tâche"
        >
          <LinearGradient
            colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingCta}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.floatingCtaText}>Nouvelle tâche</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Composants locaux ─────────────────────────────────────────────────────────

function TaskCardR08({
  task,
  subtasks,
  onToggleComplete,
}: {
  task: Task;
  subtasks: Subtask[];
  onToggleComplete: () => void;
}) {
  const isCompleted = task.status === 'COMPLETED';
  const completedSubs = subtasks.filter(s => s.isCompleted).length;
  const totalSubs = subtasks.length;
  const priorityColor = PriorityColors[task.priority] ?? Primary.default;

  return (
    <TouchableOpacity
      style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
      onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
      activeOpacity={0.8}
    >
      {/* Case à cocher tactile */}
      <TouchableOpacity
        style={styles.checkBtn}
        onPress={onToggleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={isCompleted ? 'Marquer non terminée' : 'Marquer terminée'}
      >
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isCompleted ? Success.default : OnSurface.variant}
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

        {/* Ligne des badges d'information (Action-first) */}
        <View style={styles.metaRow}>
          {/* Tag de statut/date */}
          {task.scheduledDate ? (
            <View style={styles.metaPill}>
              <Ionicons name="calendar-outline" size={11} color={Tertiary.default} />
              <Text style={styles.metaPillText}>
                {format(new Date(task.scheduledDate), 'd MMM', { locale: fr })}
              </Text>
            </View>
          ) : (
            <View style={styles.metaPill}>
              <Ionicons name="file-tray-outline" size={11} color={OnSurface.variant} />
              <Text style={styles.metaPillText}>Inbox</Text>
            </View>
          )}

          {/* Sous-tâches */}
          {totalSubs > 0 && (
            <View style={styles.metaPill}>
              <Ionicons name="checkbox-outline" size={11} color={Primary.default} />
              <Text style={styles.metaPillText}>
                {completedSubs}/{totalSubs}
              </Text>
            </View>
          )}

          {/* Durée estimée */}
          {task.estimatedMinutes ? (
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={11} color={OnSurface.variant} />
              <Text style={styles.metaPillText}>{task.estimatedMinutes} min</Text>
            </View>
          ) : null}

          {/* Priorité haute/urgente */}
          {task.priority === 'URGENT' || task.priority === 'HIGH' ? (
            <View style={[styles.metaPill, { borderColor: priorityColor + '40' }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.metaPillText, { color: priorityColor }]}>
                {task.priority === 'URGENT' ? 'Urgent' : 'Haute'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </TouchableOpacity>
  );
}

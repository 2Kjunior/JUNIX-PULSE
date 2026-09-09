/**
 * Onglet Tâches — Vue principale avec Inbox et tâches planifiées.
 * Étape 6 viendra étoffer cet écran avec la création, le détail et les sous-tâches.
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
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { TaskRepository } from '@/repositories/task-repository';
import { Task } from '@/domain/entities';
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
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>('loading');
  const [inbox, setInbox] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'planned'>('inbox');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    try {
      const [inboxTasks, planned] = await Promise.all([
        TaskRepository.findInbox(),
        TaskRepository.findForDate(todayStr),
      ]);
      setInbox(inboxTasks);
      setTodayTasks(planned);
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setState('error');
    }
  }, [todayStr]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const currentList = activeTab === 'inbox' ? inbox : todayTasks;

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

      {/* Tabs Inbox / Planifiées */}
      <View style={styles.tabBar}>
        {[
          { key: 'inbox', label: `Inbox (${inbox.length})` },
          { key: 'planned', label: `Aujourd'hui (${todayTasks.length})` },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key as 'inbox' | 'planned')}
          >
            <Text
              style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Primary.default} />
        }
        showsVerticalScrollIndicator={false}
      >
        {currentList.length === 0 ? (
          <EmptyState
            icon={activeTab === 'inbox' ? '✓' : '📅'}
            title={activeTab === 'inbox' ? 'Inbox vide' : 'Aucune tâche planifiée aujourd\'hui'}
            description={
              activeTab === 'inbox'
                ? "Créez une tâche sans date. Elle apparaîtra ici jusqu'à ce que vous la planifiiez."
                : "Planifiez une tâche depuis l'Inbox ou créez-en une nouvelle."
            }
            actionLabel="+ Nouvelle tâche"
            onAction={() => router.push('/tasks/new')}
          />
        ) : (
          currentList.map(task => (
            <TaskRow key={task.id} task={task} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <TouchableOpacity
      style={styles.taskRow}
      onPress={() => router.push(`/tasks/${task.id}` as any)}
      activeOpacity={0.8}
    >
      <Ionicons
        name={task.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={task.status === 'COMPLETED' ? Tertiary.default : OnSurface.disabled}
        style={styles.taskCheck}
      />
      <View style={styles.taskBody}>
        <Text
          style={[styles.taskTitle, task.status === 'COMPLETED' && styles.taskTitleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.scheduledDate && (
          <Text style={styles.taskDate}>
            {format(new Date(task.scheduledDate), 'd MMM', { locale: fr })}
          </Text>
        )}
      </View>
      {task.status === 'IN_PROGRESS' && (
        <View style={styles.inProgressBadge}>
          <Text style={styles.inProgressText}>En cours</Text>
        </View>
      )}
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
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  taskCheck: { paddingHorizontal: 2 },
  taskBody: { flex: 1 },
  taskTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  taskTitleDone: { textDecorationLine: 'line-through', color: OnSurface.disabled },
  taskDate: { ...Typography.labelSmall, color: OnSurface.variant, marginTop: 2 },
  inProgressBadge: {
    backgroundColor: 'rgba(123, 208, 255, 0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  inProgressText: { ...Typography.labelSmall, color: Tertiary.default, fontSize: 10 },
});

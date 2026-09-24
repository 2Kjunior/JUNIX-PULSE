/**
 * Écran Aujourd'hui — Centre opérationnel de Junix Pulse.
 * Agrège les 4 pôles du jour : Rappels, Tâches, Événements, Habitudes.
 *
 * Utilise useFocusEffect pour mettre à jour instantanément les statistiques
 * et les compteurs à chaque fois que l'écran devient actif.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { EventRepository } from '@/repositories/event-repository';
import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { SettingsRepository } from '@/repositories/settings-repository';
import { Reminder, Task, Event } from '@/domain/entities';
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
import { LoadingState, ErrorState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [state, setState] = useState<ScreenState>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [habits, setHabits] = useState<HabitStats[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const greeting = getGreeting(today.getHours());

  const load = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const [rems, tks, evts, habStats, settings] = await Promise.all([
        ReminderRepository.findForDate(todayStr),
        TaskRepository.findForDate(todayStr),
        EventRepository.findForDate(todayStr),
        HabitUseCases.getAllHabitsWithStats(),
        SettingsRepository.get(),
      ]);
      setReminders(rems.filter(r => r.status !== 'DELETED' && r.status !== 'COMPLETED'));
      setTasks(tks);
      setEvents(evts);
      setHabits(habStats.filter(h => h.habit.status === 'ACTIVE'));
      setDisplayName(settings.displayName ?? '');
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setState('error');
    }
  }, []);

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

  const handleToggleHabit = async (habitItem: HabitStats) => {
    try {
      const isDone = await HabitUseCases.toggleHabitCompletion(habitItem.habit.id);
      showSnackbar(
        isDone
          ? `Habitude "${habitItem.habit.title}" validée ! 🔥`
          : `Validation retirée pour "${habitItem.habit.title}".`
      );
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await TaskUseCases.toggleComplete(task.id);
      showSnackbar(`Tâche "${task.title}" mise à jour !`);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  if (state === 'loading') return <LoadingState message="Préparation de votre journée..." />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const dateLabel = format(today, 'EEEE d MMMM', { locale: fr });
  const upcomingReminders = reminders.filter(
    r => r.status === 'UPCOMING' || r.status === 'TRIGGERED' || r.status === 'SNOOZED'
  );
  const missedReminders = reminders.filter(r => r.status === 'MISSED');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Primary.default}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête avec message de bienvenue */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting}{displayName ? `, ${displayName}` : ''}
          </Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="settings-outline" size={22} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* Chips Résumé du Jour */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryRow}>
        <SummaryChip
          count={upcomingReminders.length}
          label="rappels"
          color={Primary.default}
          icon="notifications-outline"
          onPress={() => router.push('/reminders')}
        />
        <SummaryChip
          count={tasks.length}
          label="tâches"
          color={Tertiary.default}
          icon="checkmark-circle-outline"
          onPress={() => router.push('/(tabs)/tasks')}
        />
        <SummaryChip
          count={events.length}
          label="événements"
          color="#4CAF50"
          icon="calendar-outline"
          onPress={() => router.push('/(tabs)/calendar')}
        />
        <SummaryChip
          count={habits.filter(h => h.completedToday).length}
          label={`/ ${habits.length} habitudes`}
          color="#FF9800"
          icon="flame-outline"
          onPress={() => router.push('/habits/index')}
        />
      </ScrollView>

      {/* Rappels manqués (Alertes prioritaires) */}
      {missedReminders.length > 0 && (
        <Section
          title="À rattraper"
          icon="alert-circle"
          iconColor="#FFB4AB"
          action={{ label: 'Voir tout', onPress: () => router.push('/reminders') }}
        >
          {missedReminders.map(r => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </Section>
      )}

      {/* Habitudes du Jour (Check-off direct 1-tap) */}
      {habits.length > 0 && (
        <Section
          title="Habitudes du jour"
          icon="repeat-outline"
          iconColor="#FF9800"
          action={{ label: 'Streaks', onPress: () => router.push('/habits/index') }}
        >
          {habits.map(item => (
            <TouchableOpacity
              key={item.habit.id}
              style={[
                styles.card,
                item.completedToday && { borderColor: Tertiary.default + '60', borderWidth: 1 },
              ]}
              onPress={() => handleToggleHabit(item)}
            >
              <Ionicons
                name={item.completedToday ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={item.completedToday ? Tertiary.default : OnSurface.disabled}
              />
              <View style={styles.cardBody}>
                <Text
                  style={[
                    styles.cardTitle,
                    item.completedToday && { textDecorationLine: 'line-through', opacity: 0.7 },
                  ]}
                >
                  {item.habit.title}
                </Text>
                <Text style={styles.cardSubtitle}>
                  Série actuelle : 🔥 {item.currentStreak} jours
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </Section>
      )}

      {/* Événements d'aujourd'hui */}
      {events.length > 0 && (
        <Section
          title="Agenda & Événements"
          icon="calendar-outline"
          iconColor="#4CAF50"
          action={{ label: 'Calendrier', onPress: () => router.push('/(tabs)/calendar') }}
        >
          {events.map(evt => (
            <TouchableOpacity
              key={evt.id}
              style={styles.card}
              onPress={() => router.push(`/events/${evt.id}`)}
            >
              <View style={[styles.cardTime, { backgroundColor: '#4CAF5020' }]}>
                <Text style={[styles.timeText, { color: '#4CAF50' }]}>
                  {format(new Date(evt.startAt), 'HH:mm')}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{evt.title}</Text>
                {evt.location && <Text style={styles.cardSubtitle}>📍 {evt.location}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </Section>
      )}

      {/* Rappels du jour */}
      <Section
        title="Rappels"
        icon="notifications-outline"
        iconColor={Primary.default}
        action={{ label: '+ Nouveau', onPress: () => router.push('/reminders/new') }}
      >
        {upcomingReminders.length > 0 ? (
          upcomingReminders.map(r => <ReminderCard key={r.id} reminder={r} />)
        ) : (
          <EmptySection
            text="Aucun rappel prévu pour aujourd'hui"
            action="Créer un rappel"
            onAction={() => router.push('/reminders/new')}
          />
        )}
      </Section>

      {/* Tâches planifiées */}
      <Section
        title="Tâches du jour"
        icon="checkmark-circle-outline"
        iconColor={Tertiary.default}
        action={{ label: '+ Nouvelle', onPress: () => router.push('/tasks/new') }}
      >
        {tasks.length > 0 ? (
          tasks.map(t => (
            <TaskCard key={t.id} task={t} onComplete={() => handleCompleteTask(t)} />
          ))
        ) : (
          <EmptySection
            text="Aucune tâche planifiée aujourd'hui"
            action="Voir l'Inbox"
            onAction={() => router.push('/(tabs)/tasks')}
          />
        )}
      </Section>
    </ScrollView>
  );
}

// ─── Composants locaux ─────────────────────────────────────────────────────────

function getGreeting(hour: number): string {
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function SummaryChip({
  count,
  label,
  color,
  icon,
  onPress,
}: {
  count: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: color + '40' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  icon,
  iconColor,
  action,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon} size={18} color={iconColor} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && (
          <TouchableOpacity onPress={action.onPress}>
            <Text style={styles.sectionAction}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function EmptySection({
  text,
  action,
  onAction,
}: {
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptyText}>{text}</Text>
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.emptyAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const time = format(new Date(reminder.scheduledAt), 'HH:mm');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/reminders/${reminder.id}` as any)}
    >
      <View style={styles.cardTime}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {reminder.title}
        </Text>
        {reminder.notes && (
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {reminder.notes}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </TouchableOpacity>
  );
}

function TaskCard({ task, onComplete }: { task: Task; onComplete: () => void }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onComplete}>
        <Ionicons
          name={task.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={task.status === 'COMPLETED' ? Tertiary.default : OnSurface.disabled}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => router.push(`/tasks/${task.id}` as any)}
      >
        <Text
          style={[
            styles.cardTitle,
            task.status === 'COMPLETED' && { textDecorationLine: 'line-through', opacity: 0.6 },
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.estimatedMinutes && (
          <Text style={styles.cardSubtitle}>⏱️ {task.estimatedMinutes} min</Text>
        )}
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { ...Typography.headlineLarge, color: OnSurface.primary },
  date: { ...Typography.bodyMedium, color: OnSurface.variant, textTransform: 'capitalize' },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.xs,
    gap: 6,
    borderWidth: 1,
  },
  chipCount: { ...Typography.titleMedium, fontWeight: '700' },
  chipLabel: { ...Typography.bodySmall, color: OnSurface.variant },
  section: { gap: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { ...Typography.titleLarge, color: OnSurface.primary },
  sectionAction: { ...Typography.labelMedium, color: Primary.default },
  sectionContent: { gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardTime: {
    backgroundColor: Surface.high,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  timeText: { ...Typography.labelMedium, color: Primary.default },
  cardBody: { flex: 1 },
  cardTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  cardSubtitle: { ...Typography.bodySmall, color: OnSurface.variant },
  emptySection: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.bodyMedium, color: OnSurface.variant },
  emptyAction: { ...Typography.labelMedium, color: Primary.default },
});

/**
 * Écran Aujourd'hui — Référence R-03 du Master Prompt Junix Pulse.
 * Centre de commande quotidien :
 * 1. MAINTENANT : Rappel urgent / manqué ou focus immédiat avec accent color sémantique
 * 2. ENSUITE : Prochain événement / rappel planifié
 * 3. AUJOURD'HUI : Jauge de progression des tâches + Habitudes du jour
 * 4. SUGGESTION IA : 1 seule suggestion proactive avec orbe distinctif et validation humaine
 *
 * Règle A.1 : Zéro emoji dans tout le composant.
 * Règle A.2 : Cartes rayon 16px (Radius.lg), 1 seul gradient CTA, palette theme.ts.
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
import { LinearGradient } from 'expo-linear-gradient';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { EventRepository } from '@/repositories/event-repository';
import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { SuggestionUseCases } from '@/use-cases/suggestion-use-cases';
import { SettingsRepository } from '@/repositories/settings-repository';
import { Reminder, Task, Event, Suggestion } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Success,
  Spacing,
  Radius,
  Typography,
  Gradient,
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
  const [topSuggestion, setTopSuggestion] = useState<Suggestion | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const greeting = getGreeting(today.getHours());

  const load = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const [rems, tks, evts, habStats, suggs, settings] = await Promise.all([
        ReminderRepository.findForDate(todayStr),
        TaskRepository.findForDate(todayStr),
        EventRepository.findForDate(todayStr),
        HabitUseCases.getAllHabitsWithStats(),
        SuggestionUseCases.generateSuggestions(),
        SettingsRepository.get(),
      ]);

      setReminders(rems.filter(r => r.status !== 'DELETED' && r.status !== 'COMPLETED'));
      setTasks(tks);
      setEvents(evts);
      setHabits(habStats.filter(h => h.habit.status === 'ACTIVE'));
      setTopSuggestion(suggs.length > 0 ? suggs[0] : null);
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
          ? `Habitude "${habitItem.habit.title}" validée.`
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
      showSnackbar(`Tâche "${task.title}" mise à jour.`);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleAcceptSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.acceptSuggestion(sugg.id);
      showSnackbar(`Action appliquée : ${sugg.title}`);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleRefuseSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.refuseSuggestion(sugg.id);
      showSnackbar('Suggestion ignorée.');
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  if (state === 'loading') return <LoadingState message="Préparation de votre rythme..." />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const dateLabel = format(today, 'EEEE d MMMM', { locale: fr });
  const urgentReminders = reminders.filter(r => r.priority === 'URGENT' || r.status === 'MISSED');
  const normalReminders = reminders.filter(r => r.priority !== 'URGENT' && r.status !== 'MISSED');

  // Calcul du taux de complétion des tâches
  const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasksCount = tasks.length;
  const taskProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Prochain événement ou rappel ("Ensuite")
  const nextEvent = events.length > 0 ? events[0] : null;
  const nextReminder = !urgentReminders.length && normalReminders.length > 0 ? normalReminders[0] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: 110 },
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
      {/* ─── En-tête R-03 ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.greeting}>
            {greeting}{displayName ? `, ${displayName}` : ''}
          </Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="settings-outline" size={20} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* ─── Synthèse rapide (Pill Counters) ─────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryRow}>
        <SummaryChip
          count={reminders.length}
          label="rappels"
          color={Primary.default}
          icon="notifications-outline"
          onPress={() => router.push('/reminders')}
        />
        <SummaryChip
          count={totalTasksCount}
          label="tâches"
          color={Tertiary.default}
          icon="checkmark-circle-outline"
          onPress={() => router.push('/(tabs)/tasks')}
        />
        <SummaryChip
          count={events.length}
          label="événements"
          color="#38BDF8"
          icon="calendar-outline"
          onPress={() => router.push('/(tabs)/calendar')}
        />
        <SummaryChip
          count={habits.filter(h => h.completedToday).length}
          label={`/ ${habits.length} habitudes`}
          color="#F59E0B"
          icon="flame-outline"
          onPress={() => router.push('/habits/index')}
        />
      </ScrollView>

      {/* ─── 1. MAINTENANT (Carte Urgent / Prioritaire) ───────────────────────── */}
      <View style={styles.sectionBlock}>
        <View style={styles.blockTitleRow}>
          <View style={styles.nowIndicator} />
          <Text style={styles.blockTitle}>Maintenant</Text>
        </View>

        {urgentReminders.length > 0 ? (
          urgentReminders.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.urgentCard}
              onPress={() => router.push(`/reminders/${r.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.urgentHeader}>
                <View style={styles.urgentBadge}>
                  <Ionicons name="alert-circle" size={14} color={ErrorColors.default} />
                  <Text style={styles.urgentBadgeText}>
                    {r.status === 'MISSED' ? 'En retard' : 'Priorité haute'}
                  </Text>
                </View>
                <Text style={styles.urgentTime}>
                  {format(new Date(r.scheduledAt), 'HH:mm')}
                </Text>
              </View>
              <Text style={styles.urgentTitle} numberOfLines={1}>{r.title}</Text>
              {r.notes ? (
                <Text style={styles.urgentSubtitle} numberOfLines={2}>{r.notes}</Text>
              ) : null}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.zenCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Tertiary.default} />
            <Text style={styles.zenText}>Tout est sous contrôle pour le moment.</Text>
          </View>
        )}
      </View>

      {/* ─── 2. ENSUITE (Prochain jalon temporel) ─────────────────────────────── */}
      {(nextEvent || nextReminder) && (
        <View style={styles.sectionBlock}>
          <View style={styles.blockTitleRow}>
            <Ionicons name="time-outline" size={16} color={OnSurface.variant} />
            <Text style={styles.blockTitle}>Ensuite</Text>
          </View>

          {nextEvent ? (
            <TouchableOpacity
              style={styles.nextCard}
              onPress={() => router.push(`/events/${nextEvent.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.nextTimeCol}>
                <Text style={styles.nextTimeText}>
                  {format(new Date(nextEvent.startAt), 'HH:mm')}
                </Text>
                <Text style={styles.nextTypeLabel}>Agenda</Text>
              </View>
              <View style={styles.nextDivider} />
              <View style={styles.nextBody}>
                <Text style={styles.nextTitle} numberOfLines={1}>{nextEvent.title}</Text>
                {nextEvent.location && (
                  <View style={styles.inlineMeta}>
                    <Ionicons name="location-outline" size={13} color={OnSurface.variant} />
                    <Text style={styles.nextSubtitle}>{nextEvent.location}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : nextReminder ? (
            <TouchableOpacity
              style={styles.nextCard}
              onPress={() => router.push(`/reminders/${nextReminder.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.nextTimeCol}>
                <Text style={styles.nextTimeText}>
                  {format(new Date(nextReminder.scheduledAt), 'HH:mm')}
                </Text>
                <Text style={styles.nextTypeLabel}>Rappel</Text>
              </View>
              <View style={styles.nextDivider} />
              <View style={styles.nextBody}>
                <Text style={styles.nextTitle} numberOfLines={1}>{nextReminder.title}</Text>
                {nextReminder.notes && (
                  <Text style={styles.nextSubtitle} numberOfLines={1}>{nextReminder.notes}</Text>
                )}
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* ─── 3. SUGGESTION IA (Une seule, avec orbe et validation) ────────────── */}
      {topSuggestion && (
        <View style={styles.sectionBlock}>
          <View style={styles.suggestionCard}>
            <View style={styles.suggHeaderRow}>
              {/* Orbe IA distinctif avec halo */}
              <LinearGradient
                colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiOrb}
              >
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.suggBadge}>Suggestion intelligente</Text>
            </View>

            <Text style={styles.suggTitle}>{topSuggestion.title}</Text>
            <Text style={styles.suggExplanation}>{topSuggestion.explanation}</Text>

            <View style={styles.suggActions}>
              <TouchableOpacity
                style={styles.suggRefuseBtn}
                onPress={() => handleRefuseSuggestion(topSuggestion)}
              >
                <Text style={styles.suggRefuseText}>Ignorer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.suggAcceptBtn}
                onPress={() => handleAcceptSuggestion(topSuggestion)}
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.suggAcceptText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ─── 4. AUJOURD'HUI (Progression des tâches & Habitudes) ──────────────── */}
      <View style={styles.sectionBlock}>
        <View style={styles.blockTitleRow}>
          <Ionicons name="calendar-outline" size={16} color={OnSurface.variant} />
          <Text style={styles.blockTitle}>Aujourd'hui</Text>
        </View>

        {/* Barre de progression des tâches */}
        {totalTasksCount > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progression des tâches</Text>
              <Text style={styles.progressValue}>
                {completedTasksCount}/{totalTasksCount} ({taskProgressPercent}%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${taskProgressPercent}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Liste des tâches du jour */}
        <View style={styles.subBlock}>
          <View style={styles.subHeader}>
            <Text style={styles.subTitle}>Tâches ({tasks.length})</Text>
            <TouchableOpacity onPress={() => router.push('/tasks/new')}>
              <Text style={styles.subAction}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {tasks.length > 0 ? (
            tasks.map(t => (
              <TaskCard key={t.id} task={t} onComplete={() => handleCompleteTask(t)} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucune tâche planifiée aujourd'hui</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                <Text style={styles.emptyAction}>Ouvrir l'Inbox</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Habitudes du jour (1-tap completion) */}
        {habits.length > 0 && (
          <View style={styles.subBlock}>
            <View style={styles.subHeader}>
              <Text style={styles.subTitle}>Habitudes & Streaks</Text>
              <TouchableOpacity onPress={() => router.push('/habits/index')}>
                <Text style={styles.subAction}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {habits.map(item => (
              <TouchableOpacity
                key={item.habit.id}
                style={[
                  styles.habitCard,
                  item.completedToday && styles.habitCardCompleted,
                ]}
                onPress={() => handleToggleHabit(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.completedToday ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.completedToday ? Success.default : OnSurface.variant}
                />
                <View style={styles.cardBody}>
                  <Text
                    style={[
                      styles.cardTitle,
                      item.completedToday && styles.cardTitleStrikethrough,
                    ]}
                  >
                    {item.habit.title}
                  </Text>
                  <View style={styles.streakRow}>
                    <Ionicons name="flame" size={13} color="#F59E0B" />
                    <Text style={styles.cardSubtitle}>
                      {item.currentStreak} jour{item.currentStreak > 1 ? 's' : ''} consécutif{item.currentStreak > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
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
      style={[styles.chip, { borderColor: color + '30' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TaskCard({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const isCompleted = task.status === 'COMPLETED';

  return (
    <View style={styles.taskCard}>
      <TouchableOpacity
        onPress={onComplete}
        style={styles.checkBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isCompleted ? Success.default : OnSurface.variant}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => router.push(`/tasks/${task.id}` as any)}
      >
        <Text
          style={[
            styles.cardTitle,
            isCompleted && styles.cardTitleStrikethrough,
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.estimatedMinutes ? (
          <View style={styles.inlineMeta}>
            <Ionicons name="time-outline" size={12} color={OnSurface.variant} />
            <Text style={styles.cardSubtitle}>{task.estimatedMinutes} min</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    ...Typography.headlineLarge,
    color: OnSurface.primary,
  },
  date: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
    gap: 6,
    borderWidth: 1,
  },
  chipCount: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
  chipLabel: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  sectionBlock: {
    gap: Spacing.sm,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  nowIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ErrorColors.default,
  },
  blockTitle: {
    ...Typography.labelLarge,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgentCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: ErrorColors.default,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.xs,
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentBadgeText: {
    ...Typography.labelSmall,
    color: ErrorColors.default,
    fontWeight: '700',
  },
  urgentTime: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  urgentTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  urgentSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  zenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  zenText: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  nextTimeCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  nextTimeText: {
    ...Typography.titleMedium,
    color: Primary.default,
    fontWeight: '700',
  },
  nextTypeLabel: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  nextDivider: {
    width: 1,
    height: 32,
    backgroundColor: Outline.variant,
  },
  nextBody: {
    flex: 1,
    gap: 2,
  },
  nextTitle: {
    ...Typography.bodyLarge,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  nextSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  suggestionCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Primary.default + '40',
    gap: Spacing.sm,
  },
  suggHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aiOrb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggBadge: {
    ...Typography.labelSmall,
    color: Primary.default,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
  },
  suggExplanation: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 18,
  },
  suggActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  suggRefuseBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  suggRefuseText: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  suggAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Primary.default,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 4,
  },
  suggAcceptText: {
    ...Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
  },
  progressValue: {
    ...Typography.labelMedium,
    color: Tertiary.default,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Surface.high,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Tertiary.default,
    borderRadius: 3,
  },
  subBlock: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
  },
  subAction: {
    ...Typography.labelMedium,
    color: Primary.default,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  checkBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  habitCardCompleted: {
    borderColor: Success.default + '40',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  cardTitleStrikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  emptyAction: {
    ...Typography.labelSmall,
    color: Primary.default,
  },
});

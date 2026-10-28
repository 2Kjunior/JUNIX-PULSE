/**
 * Écran Accueil — Hub Central de Junix Pulse (Inspiré de l'ergonomie Wave).
 *
 * 1. En-tête statut clair : salutation + bilan immédiat ("X rappels et Y tâches aujourd'hui").
 * 2. Grille des 4 Piliers Wave : Rappels | Tâches | Planning | Proches.
 * 3. Barre d'ajout rapide universelle : "+ Nouveau rappel, tâche ou note".
 * 4. Mon Fil d'Aujourd'hui : Timeline unifiée et chronologique (événements, rappels et tâches).
 * 5. Suggestion proactive intelligente (IA locale).
 * 6. Habitudes & Streaks quotidiennes (validation en 1 tap).
 *
 * Conforme WCAG 2.2 AA, responsive pour mobile et tablettes.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format, isToday, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { EventRepository } from '@/repositories/event-repository';
import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
import { GoalUseCases, GoalDetails } from '@/use-cases/goal-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { SuggestionUseCases } from '@/use-cases/suggestion-use-cases';
import { SettingsRepository } from '@/repositories/settings-repository';
import { seedDatabase } from '@/database/seed';
import { Reminder, Task, Event, Suggestion } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing, TAB_BAR_TOTAL_HEIGHT } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { makeTodayStyles } from '@/styles/tabs/today-styles';

type ScreenState = 'loading' | 'content' | 'error';

interface TimelineItem {
  id: string;
  type: 'reminder' | 'event' | 'task';
  time: string;
  title: string;
  subtitle?: string;
  isCompleted?: boolean;
  priority?: string;
  raw: Reminder | Event | Task;
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeTodayStyles);

  const [state, setState] = useState<ScreenState>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [totalActiveReminders, setTotalActiveReminders] = useState(0);
  const [dueTodayReminders, setDueTodayReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [habits, setHabits] = useState<HabitStats[]>([]);
  const [goals, setGoals] = useState<GoalDetails[]>([]);
  const [topSuggestion, setTopSuggestion] = useState<Suggestion | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const greeting = getGreeting(today.getHours());

  const load = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const [allRems, tks, evts, habStats, suggs, settings, goalsData] = await Promise.all([
        ReminderRepository.findAll(),
        TaskRepository.findForDate(todayStr),
        EventRepository.findForDate(todayStr),
        HabitUseCases.getAllHabitsWithStats(),
        SuggestionUseCases.generateSuggestions(),
        SettingsRepository.get(),
        GoalUseCases.getAllGoalsWithDetails(),
      ]);

      const activeReminders = allRems.filter(r => r.status !== 'DELETED' && r.status !== 'COMPLETED');
      const dueTodayOrPast = activeReminders.filter(r => {
        try {
          const d = new Date(r.scheduledAt);
          return isToday(d) || isPast(d);
        } catch {
          return true;
        }
      });

      setReminders(activeReminders);
      setTotalActiveReminders(activeReminders.length);
      setDueTodayReminders(dueTodayOrPast);
      setTasks(tks);
      setEvents(evts);
      setHabits(habStats.filter(h => h.habit.status === 'ACTIVE'));
      setGoals(goalsData.filter(g => g.goal.status === 'ACTIVE'));
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
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Impossible de mettre à jour l’habitude.');
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await TaskUseCases.toggleComplete(task.id);
      showSnackbar(`Tâche "${task.title}" mise à jour.`);
      load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Impossible de mettre à jour la tâche.');
    }
  };

  const handleAcceptSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.acceptSuggestion(sugg.id);
      showSnackbar(`Action appliquée : ${sugg.title}`);
      load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Impossible d’accepter la suggestion.');
    }
  };

  const handleRefuseSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.refuseSuggestion(sugg.id);
      showSnackbar('Suggestion ignorée.');
      load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Impossible d’ignorer la suggestion.');
    }
  };

  const handleLoadDemo = async () => {
    try {
      await seedDatabase();
      showSnackbar('Données de démo chargées avec succès !');
      await load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Impossible de charger les données de démonstration.');
    }
  };

  // Construction chronologique du fil du jour
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = [];

    // 1. Événements de la journée
    for (const ev of events) {
      list.push({
        id: `event-${ev.id}`,
        type: 'event',
        time: format(new Date(ev.startAt), 'HH:mm'),
        title: ev.title,
        subtitle: ev.location || ev.notes,
        raw: ev,
      });
    }

    // 2. Rappels de la journée
    for (const rem of dueTodayReminders) {
      let t = '';
      try {
        t = format(new Date(rem.scheduledAt), 'HH:mm');
      } catch {}
      list.push({
        id: `rem-${rem.id}`,
        type: 'reminder',
        time: t,
        title: rem.title,
        subtitle: rem.notes,
        isCompleted: rem.status === 'COMPLETED',
        priority: rem.priority,
        raw: rem,
      });
    }

    // 3. Tâches de la journée
    for (const tk of tasks) {
      list.push({
        id: `task-${tk.id}`,
        type: 'task',
        time: '',
        title: tk.title,
        subtitle: tk.description,
        isCompleted: tk.status === 'COMPLETED',
        priority: tk.priority,
        raw: tk,
      });
    }

    // Tri : complétées à la fin, puis par heure
    return list.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }, [events, dueTodayReminders, tasks]);

  if (state === 'loading') return <LoadingState message="Préparation de votre journée..." />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const dateLabel = format(today, 'EEEE d MMMM', { locale: fr });
  const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasksCount = tasks.length;
  const urgentReminders = dueTodayReminders.filter(r => r.priority === 'URGENT' || r.status === 'MISSED');
  const nextEvent = events.length > 0 ? events[0] : null;

  const isEmptyState =
    tasks.length === 0 &&
    habits.length === 0 &&
    goals.length === 0 &&
    reminders.length === 0 &&
    events.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: TAB_BAR_TOTAL_HEIGHT + 80 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={palette.primary.default}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.responsiveContainer}>
        {/* ─── 1. En-tête convivial & Statut immédiat ───────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.greeting}>
              {greeting}{displayName ? `, ${displayName}` : ''}
            </Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/sanctum')}
              accessibilityLabel="Sanctuaire coffre-fort"
            >
              <Ionicons name="lock-closed-outline" size={19} color={palette.onSurface.variant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/search')}
              accessibilityLabel="Recherche"
            >
              <Ionicons name="search-outline" size={20} color={palette.onSurface.variant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Paramètres"
            >
              <Ionicons name="settings-outline" size={20} color={palette.onSurface.variant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. Les 4 Piliers Wave (Action Grid 2x2) ──────────────────────── */}
        <View style={styles.waveGrid}>
          {/* Pilier 1 : Rappels */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/reminders' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Rappels : ${dueTodayReminders.length} pour aujourd'hui`}
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: palette.primary.container }]}>
                <Ionicons name="notifications" size={18} color={palette.primary.default} />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={styles.waveCardNumber}>{dueTodayReminders.length}</Text>
            <Text style={styles.waveCardLabel}>Rappels</Text>
            <Text style={styles.waveCardSub}>
              {urgentReminders.length > 0 ? `${urgentReminders.length} urgent(s)` : `${totalActiveReminders} au total`}
            </Text>
          </TouchableOpacity>

          {/* Pilier 2 : Tâches */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/tasks' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Tâches : ${tasks.length} pour aujourd'hui`}
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: palette.tertiary.container }]}>
                <Ionicons name="checkmark-done" size={18} color={palette.tertiary.default} />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={styles.waveCardNumber}>{tasks.length}</Text>
            <Text style={styles.waveCardLabel}>Tâches</Text>
            <Text style={styles.waveCardSub}>
              {completedTasksCount}/{totalTasksCount} faites
            </Text>
          </TouchableOpacity>

          {/* Pilier 3 : Planning */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/calendar' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Planning : ${events.length} événements`}
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="calendar" size={18} color="#F59E0B" />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={styles.waveCardNumber}>{events.length}</Text>
            <Text style={styles.waveCardLabel}>Planning</Text>
            <Text style={styles.waveCardSub}>
              {nextEvent ? `Prochain à ${format(new Date(nextEvent.startAt), 'HH:mm')}` : 'Journée libre'}
            </Text>
          </TouchableOpacity>

          {/* Pilier 4 : Proches */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/people' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Proches et sanctuaire relationnel"
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: palette.success.container }]}>
                <Ionicons name="people" size={18} color={palette.success.default} />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={[styles.waveCardNumber, { fontSize: 18, marginTop: Spacing.sm }]}>Proches</Text>
            <Text style={styles.waveCardLabel}>Sanctuaire</Text>
            <Text style={styles.waveCardSub}>
              {topSuggestion && topSuggestion.type === 'FORGOTTEN_CONTACT' ? '1 à contacter' : 'Garder le lien'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── 3. Bouton Universel d'Ajout Rapide ──────────────────────────── */}
        <TouchableOpacity
          style={styles.quickAddBar}
          onPress={() => router.push('/capture')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Créer un rappel ou une tâche"
        >
          <View style={styles.quickAddLeft}>
            <Ionicons name="add-circle" size={24} color={palette.primary.default} />
            <Text style={styles.quickAddText}>+ Nouveau rappel, tâche ou note</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={palette.primary.default} />
        </TouchableOpacity>

        {/* ─── Mode Découverte (si base vide) ─────────────────────────────── */}
        {isEmptyState && (
          <View style={styles.demoCardWrapper}>
            <LinearGradient
              colors={['rgba(208, 188, 255, 0.15)', 'rgba(123, 208, 255, 0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.demoCard}
            >
              <View style={styles.demoHeader}>
                <View style={styles.demoBadge}>
                  <Ionicons name="sparkles" size={13} color={palette.primary.default} />
                  <Text style={styles.demoBadgeText}>MODE DÉCOUVERTE</Text>
                </View>
              </View>
              <Text style={styles.demoTitle}>Prêt à explorer Junix Pulse ?</Text>
              <Text style={styles.demoSubtitle}>
                Chargez un jeu de test complet (contacts, rappels, habitudes, objectifs) pour découvrir immédiatement la puissance du rythme quotidien.
              </Text>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={handleLoadDemo}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={palette.gradient.primary as unknown as readonly [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.demoBtnGradient}
                >
                  <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.demoBtnText}>Charger les données de démo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* ─── 4. Suggestion Proactive Unique (IA locale) ─────────────────── */}
        {topSuggestion && (
          <View style={styles.sectionBlock}>
            <View style={styles.suggestionCard}>
              <View style={styles.suggHeaderRow}>
                <LinearGradient
                  colors={palette.gradient.primary as unknown as readonly [string, string, ...string[]]}
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
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => handleRefuseSuggestion(topSuggestion)}
                >
                  <Text style={styles.suggRefuseText}>Ignorer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggAcceptBtn}
                  activeOpacity={0.8}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => handleAcceptSuggestion(topSuggestion)}
                >
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  <Text style={styles.suggAcceptText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ─── 5. Mon Fil d'Aujourd'hui (Timeline Unifiée) ─────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.blockTitleRow}>
            <Ionicons name="time-outline" size={16} color={palette.onSurface.variant} />
            <Text style={styles.blockTitle}>Mon Fil d'Aujourd'hui ({timelineItems.length})</Text>
          </View>

          {timelineItems.length > 0 ? (
            timelineItems.map((item, idx) => (
              <GlowCard
                key={item.id}
                index={idx}
                tone={
                  item.priority === 'URGENT'
                    ? 'urgent'
                    : item.type === 'reminder'
                    ? 'attention'
                    : item.type === 'event'
                    ? 'info'
                    : 'neutral'
                }
                intensity="soft"
                onPress={() => {
                  if (item.type === 'reminder') {
                    router.push({ pathname: '/reminders/[id]', params: { id: (item.raw as Reminder).id } });
                  } else if (item.type === 'event') {
                    router.push(`/events/${(item.raw as Event).id}`);
                  } else {
                    router.push(`/tasks/${(item.raw as Task).id}`);
                  }
                }}
                accessibilityLabel={`${item.title}, ${item.type}`}
              >
                <View style={styles.timelineCard}>
                  <View style={styles.timelineTimeCol}>
                    <Text
                      style={[
                        styles.timelineTimeText,
                        {
                          color:
                            item.type === 'event'
                              ? '#F59E0B'
                              : item.type === 'reminder'
                              ? palette.primary.default
                              : palette.onSurface.variant,
                        },
                      ]}
                    >
                      {item.time || 'Auj.'}
                    </Text>
                    <Text style={styles.timelineTypeTag}>
                      {item.type === 'reminder' ? 'Rappel' : item.type === 'event' ? 'Agenda' : 'Tâche'}
                    </Text>
                  </View>

                  <View style={styles.timelineDivider} />

                  <View style={styles.timelineBody}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        item.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.timelineDesc} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>

                  {/* Coche rapide pour tâche */}
                  {item.type === 'task' && (
                    <TouchableOpacity
                      style={styles.timelineActionBtn}
                      onPress={() => handleCompleteTask(item.raw as Task)}
                      accessibilityLabel="Terminer la tâche"
                    >
                      <Ionicons
                        name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={item.isCompleted ? palette.success.default : palette.onSurface.variant}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Flèche de détail pour rappels et agenda */}
                  {item.type !== 'task' && (
                    <Ionicons name="chevron-forward" size={16} color={palette.onSurface.variant} />
                  )}
                </View>
              </GlowCard>
            ))
          ) : (
            <GlowCard tone="neutral">
              <View style={styles.emptyContent}>
                <Text style={styles.emptyText}>Aucun événement ni rappel prévu pour aujourd'hui</Text>
                <TouchableOpacity onPress={() => router.push('/capture')}>
                  <Text style={styles.emptyAction}>+ Planifier quelque chose</Text>
                </TouchableOpacity>
              </View>
            </GlowCard>
          )}
        </View>

        {/* ─── 6. Habitudes du jour (Routines & Streaks) ───────────────────── */}
        {habits.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.subHeader}>
              <Text style={styles.subTitle}>Mes Routines & Habitudes ({habits.length})</Text>
              <TouchableOpacity onPress={() => router.push('/habits')}>
                <Text style={styles.subAction}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {habits.map((item, idx) => (
              <GlowCard
                key={item.habit.id}
                index={idx}
                tone={item.completedToday ? 'success' : 'neutral'}
                intensity="soft"
                onPress={() => handleToggleHabit(item)}
                accessibilityLabel={`${item.habit.title}${item.completedToday ? ', complétée' : ''}`}
              >
                <View style={styles.habitRow}>
                  <Ionicons
                    name={item.completedToday ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={item.completedToday ? palette.success.default : palette.onSurface.variant}
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
                      <Ionicons name="flame" size={13} color={palette.priority.HIGH} />
                      <Text style={styles.cardSubtitle}>
                        {item.currentStreak} jour{item.currentStreak > 1 ? 's' : ''} consécutif{item.currentStreak > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlowCard>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

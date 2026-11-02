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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format, isToday, isPast } from 'date-fns';
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
import { MascotBubble } from '@/features/mascot/MascotBubble';
import { MascotProposalBubble } from '@/features/mascot/MascotProposalBubble';
import { CompanionAnchor } from '@/features/mascot/CompanionAnchor';
import { TourTarget } from '@/features/mascot/TourTarget';
import { MessageKey, useDateLocale, useT } from '@/i18n';
import { useMascotPreferences } from '@/features/mascot/use-mascot-preferences';
import { useMascotTimeTrigger } from '@/features/mascot/use-mascot-time-trigger';
import { useVisibleProposal } from '@/features/mascot/use-mascot-visible-proposal';
import { suggestionDestination } from '@/domain/rules/mascot-suggestion-rules';
import { useMascotDayMood } from '@/features/mascot/use-mascot-day-mood';
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
  const t = useT();
  const dateLocale = useDateLocale();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeTodayStyles);
  const { width: windowWidth } = useWindowDimensions();
  const { urgentReminderId } = useMascotDayMood();

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
  const { message: timeMessage, dismiss: dismissTimeMessage } = useMascotTimeTrigger(displayName);
  const { preferences: mascotPreferences, settings: mascotSettings } = useMascotPreferences();
  // La proposition n'est montrée que si le budget d'attention de la mascotte le permet
  const { proposal, noteRefusal } = useVisibleProposal(topSuggestion);
  const mascotPresent = mascotSettings.presence !== 'off';

  const today = new Date();
  const greeting = t(getGreetingKey(today.getHours()));

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
      setError(e instanceof Error ? e.message : t('home.loadError'));
      setState('error');
    }
  }, [t]);

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
          ? t('home.habits.checked', { title: habitItem.habit.title })
          : t('home.habits.unchecked', { title: habitItem.habit.title })
      );
      load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : t('home.habits.error'));
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await TaskUseCases.toggleComplete(task.id);
      showSnackbar(t('home.task.updated', { title: task.title }));
      load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : t('home.task.error'));
    }
  };

  const handleAcceptSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.acceptSuggestion(sugg.id);
      showSnackbar(t('home.suggestion.applied', { title: sugg.title }));
      load();
      // Certaines propositions mènent à l'écran où l'utilisateur décide (planning, objectif, rappels)
      const destination = suggestionDestination(sugg);
      if (destination) router.push(destination as never);
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : t('home.suggestion.acceptError'));
    }
  };

  const handleRefuseSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.refuseSuggestion(sugg.id);
      await noteRefusal(sugg);
      showSnackbar(t('home.suggestion.ignored'));
      load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : t('home.suggestion.ignoreError'));
    }
  };

  const handleLoadDemo = async () => {
    try {
      await seedDatabase();
      showSnackbar(t('home.demo.done'));
      await load();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : t('home.demo.error'));
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

  if (state === 'loading') return <LoadingState message={t('home.loading')} />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const dateLabel = format(today, 'EEEE d MMMM', { locale: dateLocale });
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
          {/* Compagne : un appui ouvre ce qui compte, le rappel urgent sinon l'onglet Pulse.
              Absente quand l'utilisateur a désactivé la mascotte. */}
          {mascotPresent && (
          <TourTarget id="mascot">
          <TouchableOpacity
            style={styles.mascotButton}
            onPress={() =>
              urgentReminderId
                ? router.push(`/reminders/${urgentReminderId}` as never)
                : router.push('/(tabs)/pulse' as never)
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={urgentReminderId ? t('home.a11y.openUrgent') : t('home.a11y.openPulse')}
          >
            <CompanionAnchor screen="home" size={56} />
          </TouchableOpacity>
          </TourTarget>
          )}
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
              accessibilityLabel={t('home.a11y.sanctum')}
            >
              <Ionicons name="lock-closed-outline" size={19} color={palette.onSurface.variant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/search')}
              accessibilityLabel={t('home.a11y.search')}
            >
              <Ionicons name="search-outline" size={20} color={palette.onSurface.variant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/settings')}
              accessibilityLabel={t('home.a11y.settings')}
            >
              <Ionicons name="settings-outline" size={20} color={palette.onSurface.variant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. Les 4 Piliers Wave (Action Grid 2x2) ──────────────────────── */}
        <TourTarget id="pillars">
        <View style={styles.waveGrid}>
          {/* Pilier 1 : Rappels */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/reminders' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('home.remindersA11y', { count: dueTodayReminders.length })}
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: palette.primary.container }]}>
                <Ionicons name="notifications" size={18} color={palette.primary.default} />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={styles.waveCardNumber}>{dueTodayReminders.length}</Text>
            <Text style={styles.waveCardLabel}>{t('home.reminders')}</Text>
            <Text style={styles.waveCardSub}>
              {urgentReminders.length > 0
                ? t('home.remindersUrgent', { count: urgentReminders.length })
                : t('home.remindersTotal', { count: totalActiveReminders })}
            </Text>
          </TouchableOpacity>

          {/* Pilier 2 : Tâches */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/tasks' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('home.tasksA11y', { count: tasks.length })}
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: palette.tertiary.container }]}>
                <Ionicons name="checkmark-done" size={18} color={palette.tertiary.default} />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={styles.waveCardNumber}>{tasks.length}</Text>
            <Text style={styles.waveCardLabel}>{t('home.tasks')}</Text>
            <Text style={styles.waveCardSub}>
              {t('home.tasksDone', { done: completedTasksCount, total: totalTasksCount })}
            </Text>
          </TouchableOpacity>

          {/* Pilier 3 : Planning */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/calendar' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('home.calendarA11y', { count: events.length })}
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="calendar" size={18} color="#F59E0B" />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={styles.waveCardNumber}>{events.length}</Text>
            <Text style={styles.waveCardLabel}>{t('home.calendar')}</Text>
            <Text style={styles.waveCardSub}>
              {nextEvent
                ? t('home.calendarNext', { time: format(new Date(nextEvent.startAt), 'HH:mm') })
                : t('home.calendarFree')}
            </Text>
          </TouchableOpacity>

          {/* Pilier 4 : Proches */}
          <TouchableOpacity
            style={styles.waveCard}
            onPress={() => router.push('/(tabs)/people' as any)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('home.peopleA11y')}
          >
            <View style={styles.waveCardHeader}>
              <View style={[styles.waveIconCircle, { backgroundColor: palette.success.container }]}>
                <Ionicons name="people" size={18} color={palette.success.default} />
              </View>
              <Ionicons name="chevron-forward" size={14} color={palette.onSurface.variant} />
            </View>
            <Text style={[styles.waveCardNumber, { fontSize: 18, marginTop: Spacing.sm }]}>
              {t('home.people')}
            </Text>
            <Text style={styles.waveCardLabel}>{t('home.sanctuary')}</Text>
            <Text style={styles.waveCardSub}>
              {topSuggestion && topSuggestion.type === 'FORGOTTEN_CONTACT'
                ? t('home.peopleToContact')
                : t('home.peopleKeepTouch')}
            </Text>
          </TouchableOpacity>
        </View>
        </TourTarget>

        {/* ─── 3. Bouton Universel d'Ajout Rapide ──────────────────────────── */}
        <TourTarget id="quickAdd">
        <TouchableOpacity
          style={styles.quickAddBar}
          onPress={() => router.push('/capture')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('home.quickAddA11y')}
        >
          <View style={styles.quickAddLeft}>
            <Ionicons name="add-circle" size={24} color={palette.primary.default} />
            <Text style={styles.quickAddText}>{t('home.quickAdd')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={palette.primary.default} />
        </TouchableOpacity>
        </TourTarget>

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
                  <Text style={styles.demoBadgeText}>{t('home.demo.badge')}</Text>
                </View>
              </View>
              <Text style={styles.demoTitle}>{t('home.demo.title')}</Text>
              <Text style={styles.demoSubtitle}>{t('home.demo.subtitle')}</Text>
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
                  <Text style={styles.demoBtnText}>{t('home.demo.button')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* ─── 4. Suggestion Proactive Unique (IA locale) ─────────────────── */}
        {/* Une seule bulle à la fois : le message du moment d'abord, sinon la proposition */}
        {timeMessage && (
          <View style={styles.sectionBlock}>
            <MascotBubble
              text={timeMessage.text}
              maxWidth={Math.min(windowWidth - Spacing.lg * 2, 560)}
              tailSide="top"
              actions={[{ label: t('common.close'), onPress: dismissTimeMessage, primary: true }]}
            />
          </View>
        )}
        {mascotPresent && !timeMessage && proposal && (
          <View style={styles.sectionBlock}>
            <MascotProposalBubble
              suggestion={proposal}
              displayName={displayName}
              preferences={mascotPreferences}
              maxWidth={Math.min(windowWidth - Spacing.lg * 2, 560)}
              tailSide="top"
              onAccept={() => handleAcceptSuggestion(proposal)}
              onRefuse={() => handleRefuseSuggestion(proposal)}
            />
          </View>
        )}

        {/* ─── 5. Mon Fil d'Aujourd'hui (Timeline Unifiée) ─────────────────── */}
        <View style={styles.sectionBlock}>
          <TourTarget id="timeline">
          <View style={styles.blockTitleRow}>
            <Ionicons name="time-outline" size={16} color={palette.onSurface.variant} />
            <Text style={styles.blockTitle}>{t('home.timeline.title', { count: timelineItems.length })}</Text>
          </View>
          </TourTarget>

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
                      {item.time || t('home.timeline.today')}
                    </Text>
                    <Text style={styles.timelineTypeTag}>
                      {item.type === 'reminder'
                        ? t('home.timeline.reminder')
                        : item.type === 'event'
                        ? t('home.timeline.event')
                        : t('home.timeline.task')}
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
                      accessibilityLabel={t('home.timeline.completeA11y')}
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
                <Text style={styles.emptyText}>{t('home.timeline.empty')}</Text>
                <TouchableOpacity onPress={() => router.push('/capture')}>
                  <Text style={styles.emptyAction}>{t('home.timeline.plan')}</Text>
                </TouchableOpacity>
              </View>
            </GlowCard>
          )}
        </View>

        {/* ─── 6. Habitudes du jour (Routines & Streaks) ───────────────────── */}
        {habits.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.subHeader}>
              <Text style={styles.subTitle}>{t('home.habits.title', { count: habits.length })}</Text>
              <TouchableOpacity onPress={() => router.push('/habits')}>
                <Text style={styles.subAction}>{t('home.habits.seeAll')}</Text>
              </TouchableOpacity>
            </View>

            {habits.map((item, idx) => (
              <GlowCard
                key={item.habit.id}
                index={idx}
                tone={item.completedToday ? 'success' : 'neutral'}
                intensity="soft"
                onPress={() => handleToggleHabit(item)}
                accessibilityLabel={`${item.habit.title}${item.completedToday ? t('home.habits.doneA11y') : ''}`}
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
                        {t(item.currentStreak > 1 ? 'home.habits.streakMany' : 'home.habits.streakOne', {
                          count: item.currentStreak,
                        })}
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

function getGreetingKey(hour: number): MessageKey {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

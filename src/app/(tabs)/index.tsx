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
  RefreshControl,
  TouchableOpacity,
  Alert,
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
import {
  Primary,
  Tertiary,
  OnSurface,
  Error as ErrorColors,
  Success,
  Spacing,
  Gradient,
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { SummaryChip } from '@/components/today/SummaryChip';
import { TaskCard } from '@/components/today/TaskCard';
import { RecoveryAndHrvMetricCard } from '@/components/today/RecoveryAndHrvMetricCard';
import { GlowCard } from '@/components/ui/GlowCard';
import { styles } from '@/styles/tabs/today-styles';

type ScreenState = 'loading' | 'content' | 'error';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [state, setState] = useState<ScreenState>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [totalActiveReminders, setTotalActiveReminders] = useState(0);
  const [todayRemindersCount, setTodayRemindersCount] = useState(0);
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

      // Affiche les rappels du jour/en retard, ou s'il n'y en a pas, les prochains rappels actifs
      setReminders(dueTodayOrPast.length > 0 ? dueTodayOrPast : activeReminders);
      setTotalActiveReminders(activeReminders.length);
      setTodayRemindersCount(dueTodayOrPast.length);

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
    } catch (error: unknown) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de mettre à jour l’habitude.');
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await TaskUseCases.toggleComplete(task.id);
      showSnackbar(`Tâche "${task.title}" mise à jour.`);
      load();
    } catch (error: unknown) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de mettre à jour la tâche.');
    }
  };

  const handleAcceptSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.acceptSuggestion(sugg.id);
      showSnackbar(`Action appliquée : ${sugg.title}`);
      load();
    } catch (error: unknown) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible d’accepter la suggestion.');
    }
  };

  const handleRefuseSuggestion = async (sugg: Suggestion) => {
    try {
      await SuggestionUseCases.refuseSuggestion(sugg.id);
      showSnackbar('Suggestion ignorée.');
      load();
    } catch (error: unknown) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible d’ignorer la suggestion.');
    }
  };

  const handleLoadDemo = async () => {
    try {
      await seedDatabase();
      showSnackbar('Données de démo chargées avec succès !');
      await load();
    } catch (error: unknown) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de charger les données de démonstration.');
    }
  };

  if (state === 'loading') return <LoadingState message="Préparation de votre rythme..." />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const dateLabel = format(today, 'EEEE d MMMM', { locale: fr });
  const urgentReminders = reminders.filter(r => r.priority === 'URGENT' || r.status === 'MISSED');
  const normalReminders = reminders.filter(r => r.priority !== 'URGENT' && r.status !== 'MISSED');

  // État vide complet : proposer la démo
  const isEmptyState =
    tasks.length === 0 &&
    habits.length === 0 &&
    goals.length === 0 &&
    reminders.length === 0 &&
    events.length === 0;

  // Calcul du taux de complétion des tâches et des habitudes du jour (Rythme Réel)
  const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasksCount = tasks.length;
  const taskProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const completedHabitsCount = habits.filter(h => h.completedToday).length;
  const totalHabitsCount = habits.length;

  const totalActions = totalTasksCount + totalHabitsCount;
  const completedActions = completedTasksCount + completedHabitsCount;
  const rhythmScore = totalActions > 0
    ? Math.round((completedActions / totalActions) * 100)
    : 100;
  const rhythmStatus = rhythmScore >= 80 ? 'Optimal' : rhythmScore >= 50 ? 'En cours' : 'Démarrage';

  // Prochain événement ou rappel ("Ensuite")
  const nextEvent = events.length > 0 ? events[0] : null;
  const nextReminder = !urgentReminders.length && normalReminders.length > 0 ? normalReminders[0] : null;

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
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/capture')}
            accessibilityLabel="Capture rapide"
          >
            <Ionicons name="flash-outline" size={20} color={Primary.default} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/search')}
            accessibilityLabel="Recherche globale"
          >
            <Ionicons name="search-outline" size={20} color={OnSurface.variant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Paramètres"
          >
            <Ionicons name="settings-outline" size={20} color={OnSurface.variant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Synthèse rapide (Pill Counters) ─────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryRow} contentContainerStyle={styles.summaryRowContent}>
        <SummaryChip
          count={todayRemindersCount > 0 ? todayRemindersCount : totalActiveReminders}
          label={todayRemindersCount > 0 ? 'rappels (auj.)' : 'rappels'}
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
          onPress={() => router.push('/habits')}
        />
        <SummaryChip
          count={goals.length}
          label="objectifs"
          color="#6DD58C"
          icon="flag-outline"
          onPress={() => router.push('/goals')}
        />
      </ScrollView>

      {/* ─── CARTE DÉCOUVERTE / DONNÉES DE DÉMO (si base vide) ────────────────── */}
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
                <Ionicons name="sparkles" size={13} color={Primary.default} />
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
                colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
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

      {/* ─── 1. MAINTENANT (Carte Urgent / Prioritaire) ───────────────────────── */}
      <View style={styles.sectionBlock}>
        <View style={styles.blockTitleRow}>
          <View style={styles.nowIndicator} />
          <Text style={styles.blockTitle}>Maintenant</Text>
        </View>

        {urgentReminders.length > 0 ? (
          urgentReminders.map(r => (
            <GlowCard
              key={r.id}
              tone="urgent"
              intensity="soft"
              onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: r.id } })}
              accessibilityLabel={`${r.title}, ${r.status === 'MISSED' ? 'en retard' : 'priorité haute'}`}
            >
              <View style={styles.urgentContent}>
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
              </View>
            </GlowCard>
          ))
        ) : (
          <RecoveryAndHrvMetricCard
            score={rhythmScore}
            scoreLabel="RYTHME"
            statusLabel={rhythmStatus}
            title="Rythme Quotidien"
            subtitle={
              totalActions > 0
                ? `${completedActions}/${totalActions} actions complétées aujourd’hui`
                : 'Aucun rappel urgent • Journée sereine'
            }
            metricLabel="FOCUS"
            metricValue={totalTasksCount > 0 ? `${completedTasksCount}/${totalTasksCount}` : `${completedActions}`}
            metricUnit={totalTasksCount > 0 ? 'tâches' : 'actions'}
          />
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
            <GlowCard
              tone="info"
              onPress={() => router.push(`/events/${nextEvent.id}`)}
              accessibilityLabel={nextEvent.title}
            >
              <View style={styles.nextRow}>
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
              </View>
            </GlowCard>
          ) : nextReminder ? (
            <GlowCard
              tone="info"
              onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: nextReminder.id } })}
              accessibilityLabel={nextReminder.title}
            >
              <View style={styles.nextRow}>
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
              </View>
            </GlowCard>
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
            <GlowCard tone="neutral">
              <View style={styles.emptyContent}>
                <Text style={styles.emptyText}>Aucune tâche planifiée aujourd'hui</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                  <Text style={styles.emptyAction}>Ouvrir l'Inbox</Text>
                </TouchableOpacity>
              </View>
            </GlowCard>
          )}
        </View>

        {/* Habitudes du jour (1-tap completion) */}
        <View style={styles.subBlock}>
          <View style={styles.subHeader}>
            <Text style={styles.subTitle}>Habitudes & Streaks ({habits.length})</Text>
            <TouchableOpacity onPress={() => router.push('/habits')}>
              <Text style={styles.subAction}>Gérer</Text>
            </TouchableOpacity>
          </View>

          {habits.length > 0 ? (
            habits.map(item => (
              <GlowCard
                key={item.habit.id}
                tone={item.completedToday ? 'success' : 'neutral'}
                intensity="soft"
                onPress={() => handleToggleHabit(item)}
                accessibilityLabel={`${item.habit.title}${item.completedToday ? ', complétée aujourd’hui' : ''}`}
              >
                <View style={styles.habitRow}>
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
                </View>
              </GlowCard>
            ))
          ) : (
            <GlowCard tone="neutral">
              <View style={styles.emptyContent}>
                <Text style={styles.emptyText}>Aucune habitude active pour le moment</Text>
                <TouchableOpacity onPress={() => router.push('/habits/new')}>
                  <Text style={styles.emptyAction}>+ Créer une habitude</Text>
                </TouchableOpacity>
              </View>
            </GlowCard>
          )}
        </View>

        {/* Objectifs & Progression */}
        <View style={styles.subBlock}>
          <View style={styles.subHeader}>
            <Text style={styles.subTitle}>Objectifs & Progression ({goals.length})</Text>
            <TouchableOpacity onPress={() => router.push('/goals')}>
              <Text style={styles.subAction}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {goals.length > 0 ? (
            goals.map(item => (
              <GlowCard
                key={item.goal.id}
                tone="neutral"
                onPress={() => router.push({ pathname: '/goals/[id]', params: { id: item.goal.id } })}
                accessibilityLabel={item.goal.title}
              >
                <View style={styles.goalContent}>
                  <View style={styles.goalHeaderRow}>
                    <Text style={styles.goalCardTitle} numberOfLines={1}>{item.goal.title}</Text>
                    <Text style={styles.goalCardPercent}>
                      {item.progress !== null ? `${item.progress}%` : '0%'}
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${item.progress ?? 0}%`,
                          backgroundColor: '#6DD58C',
                        },
                      ]}
                    />
                  </View>
                </View>
              </GlowCard>
            ))
          ) : (
            <GlowCard tone="neutral">
              <View style={styles.emptyContent}>
                <Text style={styles.emptyText}>Aucun objectif défini</Text>
                <TouchableOpacity onPress={() => router.push('/goals/new')}>
                  <Text style={styles.emptyAction}>+ Définir un objectif</Text>
                </TouchableOpacity>
              </View>
            </GlowCard>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getGreeting(hour: number): string {
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}


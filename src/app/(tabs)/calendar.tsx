/**
 * Onglet Calendrier — R-07 Agenda synthétique quotidien et hebdomadaire.
 * Combine événements, rappels et tâches planifiées pour le jour sélectionné.
 * Respect strict du design system Junix Pulse, zéro emoji, dégradé unique sur le FAB.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  addDays,
  subDays,
  addMinutes,
  startOfWeek,
  isSameDay,
  isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import { EventRepository } from '@/repositories/event-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { Event, Reminder, Task, PlanningBlock } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import {
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { GlowCard } from '@/components/ui/GlowCard';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { CalendarTimetable } from '@/components/calendar/CalendarTimetable';
import { CalendarActionModal } from '@/components/calendar/CalendarActionModal';
import { WeeklyTimetableGrid } from '@/components/schedule/WeeklyTimetableGrid';
import { makeCalendarStyles } from '@/styles/tabs/calendar-styles';

type ScreenState = 'loading' | 'content' | 'error';
type CalendarViewMode = 'agenda' | 'timetable' | 'week';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeCalendarStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('agenda');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotHour, setSelectedSlotHour] = useState<number | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allWeeklyBlocks, setAllWeeklyBlocks] = useState<PlanningBlock[]>([]);
  const [tasksCountByDay, setTasksCountByDay] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Semaine courante basée sur la date sélectionnée
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dateYmd = format(selectedDate, 'yyyy-MM-dd');

  const load = useCallback(async () => {
    try {
      const weekDatesYmd = weekDays.map(d => format(d, 'yyyy-MM-dd'));
      const [
        evts,
        rems,
        tsks,
        weekEvts,
        weekRems,
        weekTsks,
      ] = await Promise.all([
        EventRepository.findForDate(dateYmd),
        ReminderRepository.findForDate(dateYmd),
        TaskRepository.findForDate(dateYmd),
        Promise.all(weekDatesYmd.map(d => EventRepository.findForDate(d))),
        Promise.all(weekDatesYmd.map(d => ReminderRepository.findForDate(d))),
        Promise.all(weekDatesYmd.map(d => TaskRepository.findForDate(d))),
      ]);

      setEvents(evts);
      setReminders(rems);
      setTasks(tsks);

      // Conversion des événements réels de la semaine en créneaux (dédoublonnés par ID)
      const eventBlocksMap = new Map<string, PlanningBlock>();
      weekEvts.flat().forEach(e => {
        if (!eventBlocksMap.has(e.id)) {
          const s = new Date(e.startAt);
          const end = new Date(e.endAt);
          eventBlocksMap.set(e.id, {
            id: e.id,
            scheduleId: 'event',
            label: e.title,
            type: 'WORK',
            dayOfWeek: s.getDay(),
            startTime: format(s, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            color: theme.primary.default,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          });
        }
      });
      const eventBlocks = Array.from(eventBlocksMap.values());

      // Conversion des rappels ponctuels de la semaine en créneaux (dédoublonnés par ID)
      const reminderBlocksMap = new Map<string, PlanningBlock>();
      weekRems.flat().forEach(r => {
        if (!reminderBlocksMap.has(r.id)) {
          const s = new Date(r.scheduledAt);
          const end = addMinutes(s, 30);
          reminderBlocksMap.set(r.id, {
            id: r.id,
            scheduleId: 'reminder',
            label: r.title,
            type: 'OTHER',
            dayOfWeek: s.getDay(),
            startTime: format(s, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            color: r.priority === 'HIGH' || r.priority === 'URGENT' ? theme.priority.HIGH : theme.tertiary.default,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          });
        }
      });
      const reminderBlocks = Array.from(reminderBlocksMap.values());

      // Décompte précis des tâches non terminées par jour pour le bandeau supérieur All-Day
      const taskCounts: Record<number, number> = {};
      weekDays.forEach((d, idx) => {
        const dayTasks = weekTsks[idx] || [];
        taskCounts[d.getDay()] = dayTasks.filter(t => t.status !== 'COMPLETED').length;
      });
      setTasksCountByDay(taskCounts);

      // 100% vraies données : uniquement les événements réels et rappels de la semaine
      setAllWeeklyBlocks([...eventBlocks, ...reminderBlocks]);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setScreenState('error');
    }
  }, [dateYmd, theme, weekDays]);

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

  const handlePrevWeek = () => {
    setSelectedDate(prev => subDays(prev, 7));
  };

  const handleNextWeek = () => {
    setSelectedDate(prev => addDays(prev, 7));
  };

  const handleGoToday = () => {
    setSelectedDate(new Date());
  };

  const handleDeleteWeeklyBlock = useCallback((blockId: string, label: string) => {
    Alert.alert(
      label,
      'Cet élément est synchronisé avec vos événements réels ou rappels. Modifiez-le ou supprimez-le directement depuis sa fiche détaillée.',
      [{ text: 'Compris' }]
    );
  }, []);

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error') return <ErrorState message={error} onRetry={load} />;

  const hasItems = events.length > 0 || reminders.length > 0 || tasks.length > 0;
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `Semaine du ${format(weekStart, 'd MMM', { locale: fr })} au ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête avec navigation de date */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.title}>Planning</Text>
          <Text style={styles.subtitle}>
            {viewMode === 'week'
              ? weekLabel
              : format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.todayBtn,
              isToday(selectedDate) && styles.todayBtnDisabled,
            ]}
            onPress={handleGoToday}
            disabled={isToday(selectedDate)}
            activeOpacity={0.7}
            accessibilityLabel="Revenir à aujourd'hui"
          >
            <Text
              style={[
                styles.todayBtnText,
                isToday(selectedDate) && styles.todayBtnTextDisabled,
              ]}
            >
              Aujourd'hui
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={handlePrevWeek}
            accessibilityRole="button"
            accessibilityLabel="Semaine précédente"
          >
            <Ionicons name="chevron-back" size={18} color={theme.onSurface.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={handleNextWeek}
            accessibilityRole="button"
            accessibilityLabel="Semaine suivante"
          >
            <Ionicons name="chevron-forward" size={18} color={theme.onSurface.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
          >
            <Ionicons name="settings-outline" size={20} color={theme.onSurface.variant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Segmented Control PillTopBar (Modèle Personnes) ─────────────────── */}
      <PillTopBar
        tabs={[
          {
            key: 'agenda',
            label: 'Agenda',
            count: events.length + reminders.length + tasks.length,
            icon: 'list-outline',
          },
          {
            key: 'timetable',
            label: 'Journée',
            icon: 'time-outline',
          },
          {
            key: 'week',
            label: 'Semaine (7J)',
            icon: 'grid-outline',
          },
        ]}
        activeTab={viewMode}
        onTabChange={(tab) => setViewMode(tab as CalendarViewMode)}
      />

      {/* Bandeau des 7 jours (affiché pour les vues quotidiennes) */}
      {viewMode !== 'week' && (
        <View style={styles.weekStrip}>
          {weekDays.map((d, index) => {
            const isSelected = isSameDay(d, selectedDate);
            const isCurrentDay = isToday(d);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isCurrentDay && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayName,
                    isSelected && styles.dayTextSelected,
                    isCurrentDay && !isSelected && styles.dayTextToday,
                  ]}
                >
                  {format(d, 'EEE', { locale: fr }).toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayTextSelected,
                    isCurrentDay && !isSelected && styles.dayTextToday,
                  ]}
                >
                  {format(d, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Rendu conditionnel selon le mode choisi */}
      {viewMode === 'week' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: TAB_BAR_TOTAL_HEIGHT + 104 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary.default} />
          }
          showsVerticalScrollIndicator={false}
        >
          <WeeklyTimetableGrid
            blocks={allWeeklyBlocks}
            weekDays={weekDays}
            tasksCountByDay={tasksCountByDay}
            onPressTasksDay={(dayNum) => {
              const targetDate = weekDays.find(d => d.getDay() === dayNum) || selectedDate;
              setSelectedDate(targetDate);
              setViewMode('agenda');
            }}
            onAddBlock={(dayNum, defaultTime) => {
              const targetDate = weekDays.find(d => d.getDay() === dayNum) || selectedDate;
              setSelectedDate(targetDate);
              if (defaultTime) {
                const hour = parseInt(defaultTime.split(':')[0], 10);
                setSelectedSlotHour(isNaN(hour) ? null : hour);
              } else {
                setSelectedSlotHour(null);
              }
              setShowActionModal(true);
            }}
            onDeleteBlock={(id, label) => handleDeleteWeeklyBlock(id, label)}
            onSelectBlock={(block) => {
              if (block.scheduleId === 'event') {
                router.push({ pathname: '/events/[id]', params: { id: block.id } });
              } else if (block.scheduleId === 'reminder') {
                router.push({ pathname: '/reminders/[id]', params: { id: block.id } });
              } else if (block.scheduleId === 'task') {
                router.push({ pathname: '/tasks/[id]', params: { id: block.id } });
              } else {
                handleDeleteWeeklyBlock(block.id, block.label);
              }
            }}
          />
        </ScrollView>
      ) : viewMode === 'timetable' ? (
        <CalendarTimetable
          selectedDate={selectedDate}
          events={events}
          reminders={reminders}
          tasks={tasks}
          onRefresh={load}
        />
      ) : (
        /* Agenda synthétique */
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 104 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary.default} />
          }
          showsVerticalScrollIndicator={false}
        >
        {!hasItems ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={32} color={theme.primary.default} />
            </View>
            <Text style={styles.emptyTitle}>Journée libre</Text>
            <Text style={styles.emptyDescription}>
              Aucun événement, rappel ou tâche planifié pour cette date.
            </Text>
          </View>
        ) : (
          <>
            {/* Événements */}
            {events.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={16} color={theme.primary.default} />
                  <Text style={styles.sectionTitle}>
                    Événements ({events.length})
                  </Text>
                </View>
                {events.map((e, idx) => (
                  <GlowCard
                    key={`agenda-event-${e.id}-${idx}`}
                    index={idx}
                    tone="primary"
                    intensity="soft"
                    onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })}
                    accessibilityLabel={e.title}
                  >
                  <View style={styles.itemRow}>
                    <View style={styles.eventTimeCol}>
                      <Text style={styles.eventTimeText}>
                        {format(new Date(e.startAt), 'HH:mm')}
                      </Text>
                      <Text style={styles.eventDurationText}>
                        {format(new Date(e.endAt), 'HH:mm')}
                      </Text>
                    </View>

                    <View style={styles.eventBody}>
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      {!!e.location && (
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={13} color={theme.onSurface.variant} />
                          <Text style={styles.eventLocation} numberOfLines={1}>
                            {e.location}
                          </Text>
                        </View>
                      )}
                      {!!e.travelBufferMinutes && e.travelBufferMinutes > 0 && (
                        <View style={styles.metaRow}>
                          <Ionicons name="car-outline" size={13} color={theme.tertiary.default} />
                          <Text style={styles.eventBufferText}>
                            Trajet : {e.travelBufferMinutes} min avant
                          </Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.typeBadge,
                        e.type === 'BUSY' ? styles.typeBadgeBusy : styles.typeBadgeFree,
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>
                        {e.type === 'BUSY' ? 'Occupé' : 'Libre'}
                      </Text>
                    </View>
                  </View>
                  </GlowCard>
                ))}
              </View>
            )}

            {/* Rappels */}
            {reminders.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="notifications-outline" size={16} color={theme.priority.HIGH} />
                  <Text style={styles.sectionTitle}>
                    Rappels ({reminders.length})
                  </Text>
                </View>
                {reminders.map((r, idx) => (
                  <GlowCard
                    key={`agenda-reminder-${r.id}-${idx}`}
                    index={idx}
                    tone="attention"
                    intensity="soft"
                    onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: r.id } })}
                    accessibilityLabel={r.title}
                  >
                  <View style={styles.itemRow}>
                    <View style={styles.reminderIconCircle}>
                      <Ionicons name="notifications" size={16} color={theme.priority.HIGH} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{r.title}</Text>
                      <Text style={styles.itemTime}>
                        {format(new Date(r.scheduledAt), 'HH:mm')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.onSurface.disabled} />
                  </View>
                  </GlowCard>
                ))}
              </View>
            )}

            {/* Tâches */}
            {tasks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkbox-outline" size={16} color={theme.tertiary.default} />
                  <Text style={styles.sectionTitle}>
                    Tâches planifiées ({tasks.length})
                  </Text>
                </View>
                {tasks.map((t, idx) => (
                  <GlowCard
                    key={`agenda-task-${t.id}-${idx}`}
                    index={idx}
                    tone="neutral"
                    onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: t.id } })}
                    accessibilityLabel={t.title}
                  >
                  <View style={styles.itemRow}>
                    <View style={styles.taskIconCircle}>
                      <Ionicons name="checkbox-outline" size={16} color={theme.tertiary.default} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{t.title}</Text>
                      {t.estimatedMinutes && (
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={13} color={theme.onSurface.variant} />
                          <Text style={styles.itemTime}>{t.estimatedMinutes} min</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.onSurface.disabled} />
                  </View>
                  </GlowCard>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      )}

      {/* Bouton Flottant 3D (FAB) — Choix universel d'ajout */}
      <GlassFloatingActionButton
        label="Ajouter"
        icon="add"
        onPress={() => {
          setSelectedSlotHour(null);
          setShowActionModal(true);
        }}
      />

      {/* Modal / Action Sheet de sélection du type d'action */}
      <CalendarActionModal
        visible={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedSlotHour(null);
        }}
        selectedDate={selectedDate}
        slotHour={selectedSlotHour}
      />
    </View>
  );
}

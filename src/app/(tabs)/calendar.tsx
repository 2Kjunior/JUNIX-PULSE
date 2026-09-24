/**
 * Onglet Calendrier — R-07 Agenda synthétique quotidien et hebdomadaire.
 * Combine événements, rappels et tâches planifiées pour le jour sélectionné.
 * Respect strict du design system Midnight, zéro emoji, dégradé unique sur le FAB.
 */

import { useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  isSameDay,
  isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import { EventRepository } from '@/repositories/event-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { Event, Reminder, Task } from '@/domain/entities';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
  Gradient,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Semaine courante basée sur la date sélectionnée
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dateYmd = format(selectedDate, 'yyyy-MM-dd');

  const load = useCallback(async () => {
    try {
      const [evts, rems, tsks] = await Promise.all([
        EventRepository.findForDate(dateYmd),
        ReminderRepository.findForDate(dateYmd),
        TaskRepository.findForDate(dateYmd),
      ]);

      setEvents(evts);
      setReminders(rems);
      setTasks(tsks);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setScreenState('error');
    }
  }, [dateYmd]);

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

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error') return <ErrorState message={error} onRetry={load} />;

  const hasItems = events.length > 0 || reminders.length > 0 || tasks.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête avec navigation de date */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.title}>Calendrier</Text>
          <Text style={styles.subtitle}>
            {format(selectedDate, 'MMMM yyyy', { locale: fr })}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {!isToday(selectedDate) && (
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={handleGoToday}
              activeOpacity={0.7}
            >
              <Text style={styles.todayBtnText}>Aujourd'hui</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={handlePrevWeek}
            accessibilityLabel="Semaine précédente"
          >
            <Ionicons name="chevron-back" size={18} color={OnSurface.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={handleNextWeek}
            accessibilityLabel="Semaine suivante"
          >
            <Ionicons name="chevron-forward" size={18} color={OnSurface.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bandeau des 7 jours */}
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

      {/* Agenda synthétique */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 88 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Primary.default} />
        }
        showsVerticalScrollIndicator={false}
      >
        {!hasItems ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={32} color={Primary.default} />
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
                  <Ionicons name="calendar-outline" size={16} color={Primary.default} />
                  <Text style={styles.sectionTitle}>
                    Événements ({events.length})
                  </Text>
                </View>
                {events.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.eventCard}
                    onPress={() => router.push(`/events/${e.id}` as any)}
                    activeOpacity={0.7}
                  >
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
                          <Ionicons name="location-outline" size={13} color={OnSurface.variant} />
                          <Text style={styles.eventLocation} numberOfLines={1}>
                            {e.location}
                          </Text>
                        </View>
                      )}
                      {!!e.travelBufferMinutes && e.travelBufferMinutes > 0 && (
                        <View style={styles.metaRow}>
                          <Ionicons name="car-outline" size={13} color={Tertiary.default} />
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
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Rappels */}
            {reminders.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="notifications-outline" size={16} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>
                    Rappels ({reminders.length})
                  </Text>
                </View>
                {reminders.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.reminderCard}
                    onPress={() => router.push(`/reminders/${r.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reminderIconCircle}>
                      <Ionicons name="notifications" size={16} color="#F59E0B" />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{r.title}</Text>
                      <Text style={styles.itemTime}>
                        {format(new Date(r.scheduledAt), 'HH:mm')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tâches */}
            {tasks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkbox-outline" size={16} color={Tertiary.default} />
                  <Text style={styles.sectionTitle}>
                    Tâches planifiées ({tasks.length})
                  </Text>
                </View>
                {tasks.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.taskCard}
                    onPress={() => router.push(`/tasks/${t.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.taskIconCircle}>
                      <Ionicons name="checkbox-outline" size={16} color={Tertiary.default} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{t.title}</Text>
                      {t.estimatedMinutes && (
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={13} color={OnSurface.variant} />
                          <Text style={styles.itemTime}>{t.estimatedMinutes} min</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bouton Flottant (FAB) — Élément dégradé unique de l'écran */}
      <TouchableOpacity
        style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}
        onPress={() => router.push('/events/new')}
        activeOpacity={0.85}
        accessibilityLabel="Nouvel événement"
      >
        <LinearGradient
          colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color="#141317" />
          <Text style={styles.fabText}>Événement</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitleCol: {
    gap: 2,
  },
  title: {
    ...Typography.headlineLarge,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  todayBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    borderWidth: 1,
    borderColor: Outline.variant,
    marginRight: 4,
  },
  todayBtnText: {
    ...Typography.labelSmall,
    color: Primary.default,
    fontWeight: '600',
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Surface.container,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Outline.variant,
    marginBottom: Spacing.md,
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: 2,
    borderRadius: Radius.md,
    width: 44,
  },
  dayCellSelected: {
    backgroundColor: Primary.default,
  },
  dayCellToday: {
    backgroundColor: Surface.high,
    borderWidth: 1,
    borderColor: Primary.default,
  },
  dayName: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
    fontWeight: '600',
  },
  dayNumber: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginTop: 2,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#141317',
    fontWeight: '700',
  },
  dayTextToday: {
    color: Primary.default,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    borderLeftWidth: 4,
    borderLeftColor: Primary.default,
    gap: Spacing.md,
  },
  eventTimeCol: {
    alignItems: 'center',
    minWidth: 46,
  },
  eventTimeText: {
    ...Typography.titleMedium,
    color: Primary.default,
    fontWeight: '700',
  },
  eventDurationText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 11,
  },
  eventBody: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    ...Typography.bodyLarge,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  eventBufferText: {
    ...Typography.labelSmall,
    color: Tertiary.default,
    fontSize: 11,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  typeBadgeBusy: {
    backgroundColor: Primary.container,
  },
  typeBadgeFree: {
    backgroundColor: Surface.high,
  },
  typeBadgeText: {
    ...Typography.labelSmall,
    color: Primary.onContainer,
    fontSize: 10,
    fontWeight: '600',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    gap: Spacing.md,
  },
  reminderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    borderLeftWidth: 4,
    borderLeftColor: Tertiary.default,
    gap: Spacing.md,
  },
  taskIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  itemTime: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  emptyCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  emptyDescription: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    gap: 6,
  },
  fabText: {
    ...Typography.titleMedium,
    color: '#141317',
    fontWeight: '700',
  },
});

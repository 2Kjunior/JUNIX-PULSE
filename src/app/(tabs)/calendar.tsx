/**
 * Onglet Calendrier — Agenda synthétique quotidien et hebdomadaire.
 * Combine événements, rappels et tâches planifiées pour le jour sélectionné.
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  addDays,
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
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

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

  // Génération des 7 jours de la semaine courante
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

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error') return <ErrorState message={error} onRetry={load} />;

  const hasItems = events.length > 0 || reminders.length > 0 || tasks.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête avec Mois/Année */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Calendrier</Text>
          <Text style={styles.subtitle}>
            {format(selectedDate, 'MMMM yyyy', { locale: fr })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/events/new')}
          accessibilityLabel="Nouvel événement"
        >
          <Ionicons name="calendar-number-outline" size={20} color={Primary.on} />
        </TouchableOpacity>
      </View>

      {/* Bandeau des jours de la semaine */}
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
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {format(d, 'EEE', { locale: fr }).toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayTextSelected,
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
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Primary.default} />
        }
        showsVerticalScrollIndicator={false}
      >
        {!hasItems ? (
          <EmptyState
            icon="📅"
            title="Journée libre"
            description="Aucun événement, rappel ou tâche planifié pour cette date."
            actionLabel="+ Nouvel événement"
            onAction={() => router.push('/events/new')}
          />
        ) : (
          <>
            {/* Événements */}
            {events.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Événements ({events.length})
                </Text>
                {events.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.eventCard}
                    onPress={() => router.push(`/events/${e.id}` as any)}
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
                        <Text style={styles.eventLocation} numberOfLines={1}>
                          📍 {e.location}
                        </Text>
                      )}
                      {!!e.travelBufferMinutes && e.travelBufferMinutes > 0 && (
                        <Text style={styles.eventBufferText}>
                          🚗 Trajet : {e.travelBufferMinutes}m avant
                        </Text>
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
                <Text style={styles.sectionTitle}>
                  Rappels ({reminders.length})
                </Text>
                {reminders.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.itemCard}
                    onPress={() => router.push(`/reminders/${r.id}` as any)}
                  >
                    <Ionicons name="notifications" size={18} color={Primary.default} />
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
                <Text style={styles.sectionTitle}>
                  Tâches planifiées ({tasks.length})
                </Text>
                {tasks.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.itemCard}
                    onPress={() => router.push(`/tasks/${t.id}` as any)}
                  >
                    <Ionicons name="checkbox-outline" size={18} color={Tertiary.default} />
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{t.title}</Text>
                      {t.estimatedMinutes && (
                        <Text style={styles.itemTime}>⏱️ {t.estimatedMinutes} min</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { ...Typography.headlineLarge, color: OnSurface.primary },
  subtitle: { ...Typography.labelMedium, color: OnSurface.variant, textTransform: 'capitalize' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Surface.container,
    marginBottom: Spacing.md,
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    width: 44,
  },
  dayCellSelected: { backgroundColor: Primary.default },
  dayCellToday: { backgroundColor: Surface.high, borderWidth: 1, borderColor: Primary.default },
  dayName: { ...Typography.labelSmall, color: OnSurface.variant, fontSize: 10 },
  dayNumber: { ...Typography.titleMedium, color: OnSurface.primary, marginTop: 2 },
  dayTextSelected: { color: Primary.on },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    flexGrow: 1,
    gap: Spacing.lg,
  },
  section: { gap: Spacing.xs },
  sectionTitle: { ...Typography.titleMedium, color: OnSurface.primary, marginBottom: 4 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  eventTimeCol: { alignItems: 'center', minWidth: 44 },
  eventTimeText: { ...Typography.titleMedium, color: Primary.default },
  eventDurationText: { ...Typography.labelSmall, color: OnSurface.disabled, fontSize: 10 },
  eventBody: { flex: 1, gap: 2 },
  eventTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  eventLocation: { ...Typography.labelSmall, color: OnSurface.variant },
  eventBufferText: { ...Typography.labelSmall, color: Tertiary.default, fontSize: 10 },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeBadgeBusy: { backgroundColor: Primary.container },
  typeBadgeFree: { backgroundColor: Surface.high },
  typeBadgeText: { ...Typography.labelSmall, color: OnSurface.variant, fontSize: 10 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  itemBody: { flex: 1 },
  itemTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  itemTime: { ...Typography.labelSmall, color: OnSurface.variant, marginTop: 2 },
});

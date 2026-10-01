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
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { styles } from './calendar-styles';

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
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 72 }]}
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
                    onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })}
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
                    onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: r.id } })}
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
                    onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: t.id } })}
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
        style={[styles.fabContainer, { bottom: TAB_BAR_TOTAL_HEIGHT + 16 }]}
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

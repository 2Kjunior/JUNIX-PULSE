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
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SettingsButton } from '@/components/ui/HeaderIconButton';
import {
  format,
  addDays,
  subDays,
  addMinutes,
  addMonths,
  subMonths,
  startOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';

import { EventRepository } from '@/repositories/event-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { loadDeviceEvents } from '@/services/device-calendar-service';
import { DeviceEvent, deviceEventsForDay } from '@/domain/rules/device-calendar-rules';
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
import { DayTimeGrid } from '@/components/planning/DayTimeGrid';
import { MonthView, type MonthItem } from '@/components/planning/MonthView';
import { usePlanningMove } from '@/features/planning/use-planning-move';
import { useGestureTip } from '@/features/mascot/GestureTip';
import { dayFromKey, dayKey, monthGridRange, sameDayInMonth } from '@/domain/rules/planning-move-rules';
import { NewItemChooser } from '@/components/create/NewItemChooser';
import { WeeklyTimetableGrid } from '@/components/schedule/WeeklyTimetableGrid';
import { makeCalendarStyles } from '@/styles/tabs/calendar-styles';
import { momentKindColor } from '@/constants/moment-kinds';
import { planningLook } from '@/constants/planning-look';
import { useDateLocale, useT } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';
type CalendarViewMode = 'agenda' | 'timetable' | 'week' | 'month';

export default function CalendarScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeCalendarStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('agenda');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotHour, setSelectedSlotHour] = useState<number | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [deviceEvents, setDeviceEvents] = useState<DeviceEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allWeeklyBlocks, setAllWeeklyBlocks] = useState<PlanningBlock[]>([]);
  const [tasksCountByDay, setTasksCountByDay] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // The moments and reminders of the week, to move them from the Week view (sheet 026)
  const [weekEventsById, setWeekEventsById] = useState<Map<string, Event>>(new Map());
  const [weekRemindersById, setWeekRemindersById] = useState<Map<string, Reminder>>(new Map());
  // The Month view: the things of the month shown, and that month, apart from the chosen day (sheet 027)
  const [monthItems, setMonthItems] = useState<MonthItem[]>([]);
  const [shownMonth, setShownMonth] = useState<Date>(() => new Date());
  const [weekLifted, setWeekLifted] = useState(false);

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
        weekDeviceEvts,
      ] = await Promise.all([
        EventRepository.findForDate(dateYmd),
        ReminderRepository.findForDate(dateYmd),
        TaskRepository.findForDate(dateYmd),
        Promise.all(weekDatesYmd.map(d => EventRepository.findForDate(d))),
        Promise.all(weekDatesYmd.map(d => ReminderRepository.findForDate(d))),
        Promise.all(weekDatesYmd.map(d => TaskRepository.findForDate(d))),
        // L'agenda du téléphone, si l'utilisateur l'a activé : lu, jamais modifié
        SettingsRepository.get().then(settings =>
          settings.deviceCalendarEnabled ? loadDeviceEvents(weekDays[0], addDays(weekDays[0], 7)) : []
        ),
      ]);

      setEvents(evts);
      setWeekEventsById(new Map(weekEvts.flat().map(e => [e.id, e])));
      setWeekRemindersById(new Map(weekRems.flat().map(r => [r.id, r])));
      setDeviceEvents(deviceEventsForDay(weekDeviceEvts, selectedDate));
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
            // The colour of its type (sheet 023); "Autre" keeps the amber of the moments
            color: momentKindColor(theme, e.momentKind),
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

      // Les rendez-vous de l'agenda du téléphone, à leur place dans la semaine (hors journées entières)
      const deviceBlocks: PlanningBlock[] = weekDeviceEvts
        .filter(e => !e.allDay)
        .map(e => ({
          id: `device-${e.id}`,
          scheduleId: 'device',
          label: e.title,
          type: 'OTHER',
          dayOfWeek: e.startAt.getDay(),
          startTime: format(e.startAt, 'HH:mm'),
          endTime: format(e.endAt, 'HH:mm'),
          color: theme.success.default,
          createdAt: e.startAt.toISOString(),
          updatedAt: e.startAt.toISOString(),
        }));

      // Décompte précis des tâches non terminées par jour pour le bandeau supérieur All-Day
      const taskCounts: Record<number, number> = {};
      weekDays.forEach((d, idx) => {
        const dayTasks = weekTsks[idx] || [];
        taskCounts[d.getDay()] = dayTasks.filter(t => t.status !== 'COMPLETED').length;
      });
      setTasksCountByDay(taskCounts);

      // 100% vraies données : uniquement les événements réels et rappels de la semaine
      setAllWeeklyBlocks([...eventBlocks, ...reminderBlocks, ...deviceBlocks]);

      // The month, only when it is shown: its moments, reminders and tasks (sheets 026 and 027)
      if (viewMode === 'month') {
        const range = monthGridRange(shownMonth);
        const from = dayFromKey(range.from);
        const to = addDays(dayFromKey(range.to), 1);
        const inRange = (at: Date) => at >= from && at < to;
        const [monthEvents, allReminders, activeTasks, monthDevice] = await Promise.all([
          EventRepository.findForRange(subDays(from, 1).toISOString(), addDays(to, 1).toISOString()),
          ReminderRepository.findAll(),
          TaskRepository.findAllActive(),
          SettingsRepository.get().then(settings => (settings.deviceCalendarEnabled ? loadDeviceEvents(from, to) : [])),
        ]);
        // Each thing keeps its look (the colours of the Day view) and itself, to be moved later
        const items: MonthItem[] = [];
        for (const e of monthEvents) {
          const at = new Date(e.startAt);
          if (!inRange(at)) continue;
          items.push({
            key: `e-${e.id}`,
            kind: 'event',
            title: e.title,
            time: `${format(at, 'HH:mm')} – ${format(new Date(e.endAt), 'HH:mm')}`,
            look: planningLook(theme, 'event', { momentKind: e.momentKind }),
            place: e.location,
            day: dayKey(at),
            event: e,
          });
        }
        for (const r of allReminders) {
          const at = new Date(r.scheduledAt);
          if (r.status === 'COMPLETED' || r.status === 'DELETED' || !inRange(at)) continue;
          items.push({
            key: `r-${r.id}`,
            kind: 'reminder',
            title: r.title,
            time: format(at, 'HH:mm'),
            look: planningLook(theme, 'reminder', { priority: r.priority }),
            day: dayKey(at),
            reminder: r,
          });
        }
        for (const task of activeTasks) {
          if (!task.scheduledDate || task.status === 'COMPLETED' || task.scheduledDate < range.from || task.scheduledDate > range.to) continue;
          items.push({ key: `t-${task.id}`, kind: 'task', title: task.title, time: null, look: planningLook(theme, 'task'), day: task.scheduledDate, task });
        }
        for (const d of monthDevice) {
          items.push({
            key: `d-${d.id}`,
            kind: 'device',
            title: d.title,
            time: d.allDay ? null : format(d.startAt, 'HH:mm'),
            look: planningLook(theme, 'device'),
            place: d.location,
            day: dayKey(d.startAt),
          });
        }
        items.sort((a, b) => a.day.localeCompare(b.day) || (a.time ?? '').localeCompare(b.time ?? ''));
        setMonthItems(items);
      }
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setScreenState('error');
    }
  }, [dateYmd, theme, weekDays, t, selectedDate, viewMode, shownMonth]);

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

  // The arrows go a month at a time in the Month view, a week otherwise
  /** Another month by the arrows or the strip: the chosen day follows (the same day in that month). */
  const showMonth = (m: Date) => {
    setShownMonth(m);
    setSelectedDate(prev => sameDayInMonth(prev, m));
  };

  const handlePrevWeek = () => {
    if (viewMode === 'month') showMonth(subMonths(shownMonth, 1));
    else setSelectedDate(prev => subDays(prev, 7));
  };

  const handleNextWeek = () => {
    if (viewMode === 'month') showMonth(addMonths(shownMonth, 1));
    else setSelectedDate(prev => addDays(prev, 7));
  };

  // Moving a card (sheet 026): saved at once, "Annuler" in the banner
  const { moveEventBy, moveReminderBy, moveTaskTo } = usePlanningMove(load);
  const movableCount = viewMode === 'timetable' ? events.length + reminders.length : viewMode === 'week' ? weekEventsById.size + weekRemindersById.size : viewMode === 'month' ? monthItems.filter(i => i.kind !== 'device').length : 0;
  const dragTip = useGestureTip('planDrag', movableCount);

  const openMonthItem = (item: MonthItem) => {
    const id = item.key.slice(2);
    if (item.kind === 'event') router.push({ pathname: '/events/[id]', params: { id } });
    else if (item.kind === 'reminder') router.push({ pathname: '/reminders/[id]', params: { id } });
    else if (item.kind === 'task') router.push({ pathname: '/tasks/[id]', params: { id } });
  };

  // The thing travels with its item: it can be let go in another month than the one it came from
  const moveMonthItem = (item: MonthItem, toDay: Date) => {
    const days = Math.round((toDay.getTime() - dayFromKey(item.day).getTime()) / 86400000);
    if (item.event) moveEventBy(item.event, 0, days);
    else if (item.reminder) moveReminderBy(item.reminder, 0, days);
    else if (item.task) moveTaskTo(item.task, toDay);
    // The day it went to becomes the chosen day: the card is seen there at once
    setSelectedDate(toDay);
  };

  const handleGoToday = () => {
    setSelectedDate(new Date());
    setShownMonth(new Date());
  };

  const handleDeleteWeeklyBlock = useCallback((blockId: string, label: string) => {
    GlassAlert.alert(
      label,
      t('calendar.syncedBody'),
      [{ text: t('common.gotIt') }]
    );
  }, [t]);

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error') return <ErrorState message={error} onRetry={load} />;

  // "Aujourd'hui" is useful when the day, or in the Month view the month, is not the current one
  const atToday = isToday(selectedDate) && (viewMode !== 'month' || isSameMonth(shownMonth, new Date()));
  const hasItems = events.length > 0 || reminders.length > 0 || tasks.length > 0 || deviceEvents.length > 0;
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = t('calendar.weekLabel', {
    from: format(weekStart, 'd MMM', { locale: dateLocale }),
    to: format(weekEnd, 'd MMM yyyy', { locale: dateLocale }),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête avec navigation de date */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.title}>{t('tab.calendar')}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {viewMode === 'week'
              ? weekLabel
              : viewMode === 'month'
                ? format(shownMonth, 'MMMM yyyy', { locale: dateLocale })
                : format(selectedDate, 'EEEE d MMMM yyyy', { locale: dateLocale })}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.todayBtn,
              atToday && styles.todayBtnDisabled,
            ]}
            onPress={handleGoToday}
            disabled={atToday}
            activeOpacity={0.7}
            accessibilityLabel={t('calendar.todayA11y')}
          >
            <Text
              style={[
                styles.todayBtnText,
                atToday && styles.todayBtnTextDisabled,
              ]}
            >
              {t('common.today')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={handlePrevWeek}
            accessibilityRole="button"
            accessibilityLabel={t(viewMode === 'month' ? 'planning.prevMonthA11y' : 'calendar.prevWeekA11y')}
          >
            <Ionicons name="chevron-back" size={18} color={theme.onSurface.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={handleNextWeek}
            accessibilityRole="button"
            accessibilityLabel={t(viewMode === 'month' ? 'planning.nextMonthA11y' : 'calendar.nextWeekA11y')}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.onSurface.primary} />
          </TouchableOpacity>

          <SettingsButton />
        </View>
      </View>

      {/* ─── Segmented Control PillTopBar (Modèle Personnes) ─────────────────── */}
      <PillTopBar
        tabs={[
          {
            key: 'agenda',
            label: t('calendar.view.agenda'),
            count: events.length + reminders.length + tasks.length,
          },
          {
            key: 'timetable',
            label: t('calendar.view.day'),
          },
          {
            key: 'week',
            label: t('calendar.view.week'),
          },
          {
            key: 'month',
            label: t('planning.view.month'),
          },
        ]}
        activeTab={viewMode}
        onTabChange={(tab) => {
          // The Month view opens on the month of the chosen day
          if (tab === 'month') setShownMonth(selectedDate);
          setViewMode(tab as CalendarViewMode);
        }}
      />

      {/* Bandeau des 7 jours (affiché pour les vues quotidiennes) */}
      {viewMode !== 'week' && viewMode !== 'month' && (
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
                  {format(d, 'EEE', { locale: dateLocale }).toUpperCase()}
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
          scrollEnabled={!weekLifted}
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
            onLift={setWeekLifted}
            onMoveBlock={(block, minutes, days) => {
              const event = weekEventsById.get(block.id);
              const reminder = weekRemindersById.get(block.id);
              if (block.scheduleId === 'event' && event) moveEventBy(event, minutes, days);
              else if (block.scheduleId === 'reminder' && reminder) moveReminderBy(reminder, minutes, days);
            }}
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
      ) : viewMode === 'month' ? (
        <MonthView
          month={shownMonth}
          selected={selectedDate}
          items={monthItems}
          onSelectDay={day => {
            setSelectedDate(day);
            if (!isSameMonth(day, shownMonth)) setShownMonth(day);
          }}
          onShowMonth={(m, by) => (by === 'edge' ? setShownMonth(m) : showMonth(m))}
          onOpenDay={day => {
            setSelectedDate(day);
            setViewMode('timetable');
          }}
          onOpenItem={openMonthItem}
          onMoveItem={moveMonthItem}
          onDeviceTouched={title => handleDeleteWeeklyBlock('', title)}
        />
      ) : viewMode === 'timetable' ? (
        <DayTimeGrid
          date={selectedDate}
          events={events}
          reminders={reminders}
          tasks={tasks}
          deviceEvents={deviceEvents}
          onOpenEvent={e => router.push({ pathname: '/events/[id]', params: { id: e.id } })}
          onOpenReminder={r => router.push({ pathname: '/reminders/[id]', params: { id: r.id } })}
          onOpenTask={task => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
          onMoveEvent={moveEventBy}
          onMoveReminder={moveReminderBy}
          onAddAt={hour => {
            setSelectedSlotHour(hour);
            setShowActionModal(true);
          }}
          onDeviceTouched={title => handleDeleteWeeklyBlock('', title)}
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
            <Text style={styles.emptyTitle}>{t('calendar.empty.title')}</Text>
            <Text style={styles.emptyDescription}>{t('calendar.empty.desc')}</Text>
          </View>
        ) : (
          <>
            {/* Événements */}
            {events.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={16} color={theme.primary.default} />
                  <Text style={styles.sectionTitle}>{t('calendar.events', { count: events.length })}</Text>
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
                            {t('calendar.travel', { minutes: e.travelBufferMinutes })}
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
                        {e.type === 'BUSY' ? t('calendar.busy') : t('calendar.free')}
                      </Text>
                    </View>
                  </View>
                  </GlowCard>
                ))}
              </View>
            )}

            {/* Agenda du téléphone, en lecture seule */}
            {deviceEvents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="phone-portrait-outline" size={16} color={theme.success.default} />
                  <Text style={styles.sectionTitle}>{t('deviceCalendar.section', { count: deviceEvents.length })}</Text>
                </View>
                {deviceEvents.map((e, idx) => (
                  <GlowCard
                    key={`agenda-device-${e.id}`}
                    index={idx}
                    tone="info"
                    intensity="soft"
                    accessibilityLabel={`${e.title}, ${t('deviceCalendar.readOnly')}`}
                  >
                    <View style={styles.itemRow}>
                      <View style={styles.eventTimeCol}>
                        <Text style={styles.eventTimeText}>
                          {e.allDay ? t('deviceCalendar.allDay') : format(e.startAt, 'HH:mm')}
                        </Text>
                        {!e.allDay && <Text style={styles.eventDurationText}>{format(e.endAt, 'HH:mm')}</Text>}
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
                  <Text style={styles.sectionTitle}>{t('calendar.reminders', { count: reminders.length })}</Text>
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
                  <Text style={styles.sectionTitle}>{t('calendar.tasks', { count: tasks.length })}</Text>
                </View>
                {tasks.map((task, idx) => (
                  <GlowCard
                    key={`agenda-task-${task.id}-${idx}`}
                    index={idx}
                    tone="neutral"
                    onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
                    accessibilityLabel={task.title}
                  >
                  <View style={styles.itemRow}>
                    <View style={styles.taskIconCircle}>
                      <Ionicons name="checkbox-outline" size={16} color={theme.tertiary.default} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{task.title}</Text>
                      {task.estimatedMinutes && (
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={13} color={theme.onSurface.variant} />
                          <Text style={styles.itemTime}>{t('tasks.minutes', { minutes: task.estimatedMinutes })}</Text>
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
        label={t('calendar.add')}
        icon="add"
        onPress={() => {
          setSelectedSlotHour(null);
          setShowActionModal(true);
        }}
      />

      {/* Que voulez-vous ajouter ? Le même choix qu'à l'accueil, sur le jour et le créneau touchés */}
      <NewItemChooser
        visible={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedSlotHour(null);
        }}
        date={selectedDate}
        hour={selectedSlotHour}
      />

      {/* Pulse shows the long press once (sheet 026) */}
      {dragTip.element}
    </View>
  );
}

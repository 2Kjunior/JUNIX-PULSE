/**
 * The Day view of the Planning (study 001, 12.4; sheets 026 and 027), with the design of the
 * earlier Day view: the summary and its legend, the tasks of the day in small GlowCards, the free
 * hours in dashed lines ("Créneau disponible"), the "MAINTENANT" badge, and every moment and
 * reminder as a GlowCard in the colours of its kind. What is new is the scale: each card is at
 * its exact time, its height follows its length, and cards that meet share the width side by side.
 * A long press on a moment or a reminder lifts it; it moves by quarters of an hour.
 */
import { Ionicons } from '@expo/vector-icons';
import { format, isToday } from 'date-fns';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// The ScrollView of the gestures: a scroll cancels the tap of a card under the finger (sheet 031)
import { ScrollView } from 'react-native-gesture-handler';

import { GlowCard } from '@/components/ui/GlowCard';
import { planningLook, taskAccent, eventAccent } from '@/constants/planning-look';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, TAB_BAR_TOTAL_HEIGHT, Typography } from '@/constants/theme';
import type { Event, Reminder, Task } from '@/domain/entities';
import type { DeviceEvent } from '@/domain/rules/device-calendar-rules';
import {
  DAY_HOUR_HEIGHT,
  dayHours,
  freeHours,
  layoutDay,
  minutesForOffset,
  minutesOfDay,
  SNAP_MINUTES,
} from '@/domain/rules/planning-move-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

import { DraggableBlock } from './DraggableBlock';
import { PlanningCard } from './PlanningCard';

const HOURS_WIDTH = 52;
/** Under this width a card shows its badge as an icon and its time under the title. */
const NARROW_CARD_WIDTH = 150;

export interface DayTimeGridProps {
  date: Date;
  events: Event[];
  reminders: Reminder[];
  tasks: Task[];
  deviceEvents: DeviceEvent[];
  onOpenEvent: (event: Event) => void;
  onOpenReminder: (reminder: Reminder) => void;
  onOpenTask: (task: Task) => void;
  onMoveEvent: (event: Event, minutes: number, days: number) => void;
  onMoveReminder: (reminder: Reminder, minutes: number, days: number) => void;
  onAddAt: (hour: number) => void;
  onDeviceTouched: (title: string) => void;
  /** The step of a move, in minutes (Planning settings, sheet 028); a quarter of an hour by default. */
  step?: number;
}

type DayCard =
  | { key: string; kind: 'event'; event: Event; startMin: number; endMin: number }
  | { key: string; kind: 'reminder'; reminder: Reminder; startMin: number; endMin: number }
  | { key: string; kind: 'device'; device: DeviceEvent; startMin: number; endMin: number };

/** Minutes since the start of the day shown, kept inside the day for a card that starts or ends on another. */
function minutesWithin(date: Date, day: Date): number {
  const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const diff = Math.round((date.getTime() - startOfDay.getTime()) / 60000);
  return Math.min(24 * 60, Math.max(0, diff));
}

export const DayTimeGrid = memo(function DayTimeGrid({
  date,
  events,
  reminders,
  tasks,
  deviceEvents,
  onOpenEvent,
  onOpenReminder,
  onOpenTask,
  onMoveEvent,
  onMoveReminder,
  onAddAt,
  onDeviceTouched,
  step = SNAP_MINUTES,
}: DayTimeGridProps) {
  const t = useT();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeDayGridStyles);
  const [width, setWidth] = useState(0);
  const [lifted, setLifted] = useState(false);

  const cards = useMemo<DayCard[]>(() => {
    const list: DayCard[] = [];
    for (const event of events) {
      list.push({
        key: `e-${event.id}`,
        kind: 'event',
        event,
        startMin: minutesWithin(new Date(event.startAt), date),
        endMin: minutesWithin(new Date(event.endAt), date),
      });
    }
    for (const reminder of reminders) {
      const startMin = minutesOfDay(new Date(reminder.scheduledAt));
      list.push({ key: `r-${reminder.id}`, kind: 'reminder', reminder, startMin, endMin: startMin });
    }
    for (const device of deviceEvents.filter(d => !d.allDay)) {
      list.push({
        key: `d-${device.id}`,
        kind: 'device',
        device,
        startMin: minutesWithin(device.startAt, date),
        endMin: minutesWithin(device.endAt, date),
      });
    }
    return list;
  }, [events, reminders, deviceEvents, date]);

  const { first, last } = dayHours(cards);
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const boxes = useMemo(
    () => new Map(layoutDay(cards.map(c => ({ id: c.key, startMin: c.startMin, endMin: c.endMin })), first, DAY_HOUR_HEIGHT).map(b => [b.id, b])),
    [cards, first]
  );
  const free = freeHours(cards, first, last, DAY_HOUR_HEIGHT);
  const occupied = hours.length - free.length;
  const allDay = deviceEvents.filter(d => d.allDay);
  const now = new Date();
  const nowTop = isToday(date) ? ((minutesOfDay(now) - first * 60) / 60) * DAY_HOUR_HEIGHT : null;
  const quarter = (DAY_HOUR_HEIGHT * step) / 60;
  const taskColor = taskAccent(theme);

  return (
    <ScrollView
      scrollEnabled={!lifted}
      contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* The summary and the legend, as on the earlier Day view */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryTitle}>
            {t(occupied > 1 ? 'timetable.occupiedMany' : 'timetable.occupiedOne', { count: occupied })}
          </Text>
          <Text style={styles.summarySub}>
            {t('timetable.counts', { events: events.length, reminders: reminders.length, tasks: tasks.length })}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: eventAccent(theme) }]} />
            <Text style={styles.legendText}>{t('search.type.event')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary.default }]} />
            <Text style={styles.legendText}>{t('search.type.reminder')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: taskColor }]} />
            <Text style={styles.legendText}>{t('search.type.task')}</Text>
          </View>
        </View>
      </View>

      {/* Without a time: the tasks of the day, and the whole-day events of the phone */}
      {(tasks.length > 0 || allDay.length > 0) && (
        <View style={styles.tasksSection}>
          <View style={styles.tasksHeader}>
            <Ionicons name="checkbox-outline" size={16} color={taskColor} />
            <Text style={[styles.tasksTitle, { color: taskColor }]}>{t('planning.noTimeCount', { count: tasks.length + allDay.length })}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tasksRow}>
            {tasks.map((task, index) => (
              <GlowCard
                key={task.id}
                index={index}
                tone="success"
                intensity="soft"
                style={styles.taskMiniCard}
                contentStyle={styles.taskMiniInner}
                onPress={() => onOpenTask(task)}
                accessibilityLabel={t('timetable.taskA11y', { title: task.title, done: task.status === 'COMPLETED' ? t('timetable.doneSuffix') : '' })}
              >
                <View style={styles.taskMiniContent}>
                  <Ionicons name={task.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={taskColor} />
                  <Text style={styles.taskMiniTitle} numberOfLines={1}>{task.title}</Text>
                  {task.estimatedMinutes ? (
                    <Text style={[styles.taskMiniDuration, { color: taskColor }]}>{task.estimatedMinutes}m</Text>
                  ) : null}
                </View>
              </GlowCard>
            ))}
            {allDay.map(device => (
              <GlowCard
                key={device.id}
                tone="neutral"
                style={styles.taskMiniCard}
                contentStyle={styles.taskMiniInner}
                onPress={() => onDeviceTouched(device.title)}
                accessibilityLabel={device.title}
              >
                <View style={styles.taskMiniContent}>
                  <Ionicons name="phone-portrait-outline" size={16} color={theme.success.default} />
                  <Text style={styles.taskMiniTitle} numberOfLines={1}>{device.title}</Text>
                </View>
              </GlowCard>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.grid}>
        <View style={{ width: HOURS_WIDTH }}>
          {hours.map(hour => {
            const current = isToday(date) && now.getHours() === hour;
            return (
              <View key={hour} style={{ height: DAY_HOUR_HEIGHT }}>
                <Text style={[styles.hourText, current && styles.hourTextCurrent]}>{String(hour).padStart(2, '0')}:00</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.area, { height: hours.length * DAY_HOUR_HEIGHT }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          {hours.map((hour, index) => (
            <View key={hour} pointerEvents="none" style={[styles.hourLine, { top: index * DAY_HOUR_HEIGHT }]} />
          ))}

          {/* A free hour: "Créneau disponible", touch it to add something at that hour */}
          {free.map(hour => (
            <TouchableOpacity
              key={`free-${hour}`}
              style={[styles.freeSlot, { top: (hour - first) * DAY_HOUR_HEIGHT + 6 }]}
              onPress={() => onAddAt(hour)}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel={t('timetable.freeA11y', { hour })}
            >
              <Text style={styles.freeSlotText} numberOfLines={1}>{t('timetable.free')}</Text>
              <Ionicons name="add" size={14} color={theme.primary.default} />
            </TouchableOpacity>
          ))}

          {width > 0 &&
            cards.map((card, index) => {
              const box = boxes.get(card.key);
              if (!box) return null;
              const columnWidth = (width - 2) / box.columns;
              const look =
                card.kind === 'event'
                  ? planningLook(theme, 'event', { momentKind: card.event.momentKind })
                  : card.kind === 'reminder'
                    ? planningLook(theme, 'reminder', { priority: card.reminder.priority })
                    : planningLook(theme, 'device');
              const title = card.kind === 'event' ? card.event.title : card.kind === 'reminder' ? card.reminder.title : card.device.title;
              const time =
                card.kind === 'event'
                  ? `${format(new Date(card.event.startAt), 'HH:mm')} – ${format(new Date(card.event.endAt), 'HH:mm')}`
                  : card.kind === 'reminder'
                    ? format(new Date(card.reminder.scheduledAt), 'HH:mm')
                    : `${format(card.device.startAt, 'HH:mm')} – ${format(card.device.endAt, 'HH:mm')}`;
              return (
                <DraggableBlock
                  key={card.key}
                  style={[
                    styles.cardBox,
                    { top: box.top + 1, height: box.height, left: box.column * columnWidth, width: columnWidth - 4 },
                  ]}
                  stepY={quarter}
                  movable={card.kind !== 'device'}
                  onLift={setLifted}
                  accessibilityLabel={t('planning.cardA11y', { title, time })}
                  onPress={() => {
                    if (card.kind === 'event') onOpenEvent(card.event);
                    else if (card.kind === 'reminder') onOpenReminder(card.reminder);
                    else onDeviceTouched(card.device.title);
                  }}
                  onDrop={drop => {
                    const minutes = minutesForOffset(drop.dy, DAY_HOUR_HEIGHT, step);
                    if (minutes === 0) return;
                    if (card.kind === 'event') onMoveEvent(card.event, minutes, 0);
                    else if (card.kind === 'reminder') onMoveReminder(card.reminder, minutes, 0);
                  }}
                  onMoveBy={(minutes, days) => {
                    // With a screen reader, a move is one step
                    const by = Math.sign(minutes) * step;
                    if (card.kind === 'event') onMoveEvent(card.event, by, days);
                    else if (card.kind === 'reminder') onMoveReminder(card.reminder, by, days);
                  }}
                >
                  <PlanningCard
                    look={look}
                    title={title}
                    time={time}
                    index={index}
                    height={box.height}
                    place={card.kind === 'event' ? card.event.location : card.kind === 'device' ? card.device.location : null}
                    note={card.kind === 'reminder' ? card.reminder.notes : null}
                    showOptions={card.kind === 'reminder' && box.columns <= 2}
                    narrow={columnWidth < NARROW_CARD_WIDTH}
                    alarm={(card.kind === 'reminder' ? card.reminder.alertLevel : card.kind === 'event' ? card.event.alertLevel : undefined) === 'alarm'}
                  />
                </DraggableBlock>
              );
            })}

          {/* "MAINTENANT", over the cards */}
          {nowTop !== null && nowTop >= 0 && (
            <View pointerEvents="none" style={[styles.nowLineContainer, { top: nowTop - 8 }]}>
              <View style={styles.nowBadge}>
                <View style={styles.nowPulseDot} />
                <Text style={styles.nowBadgeText}>{t('timetable.now', { time: format(now, 'HH:mm') })}</Text>
              </View>
              <View style={styles.nowLine} />
            </View>
          )}
        </View>
      </View>
      <Text style={styles.hint}>{t('planning.dragHint')}</Text>
    </ScrollView>
  );
});

function makeDayGridStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';
  return StyleSheet.create({
    content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      backgroundColor: isLight ? theme.surface.container : 'rgba(26, 30, 46, 0.85)',
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.16)',
      marginBottom: Spacing.md,
    },
    summaryInfo: { gap: 2 },
    summaryTitle: { ...Typography.titleMedium, color: theme.onSurface.primary, fontWeight: '700' },
    summarySub: { ...Typography.labelSmall, color: theme.onSurface.variant, fontSize: 10 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendText: { ...Typography.labelSmall, color: theme.onSurface.variant, fontSize: 10 },
    tasksSection: { marginBottom: Spacing.md, gap: Spacing.xs },
    tasksHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
    tasksTitle: { ...Typography.labelMedium, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    tasksRow: { paddingVertical: 4, gap: Spacing.sm },
    taskMiniCard: { minWidth: 140, maxWidth: 220 },
    taskMiniInner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    taskMiniContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    taskMiniTitle: { ...Typography.bodySmall, color: theme.onSurface.primary, fontWeight: '600', flexShrink: 1 },
    taskMiniDuration: { ...Typography.labelSmall, fontSize: 10, fontWeight: '600' },
    grid: { flexDirection: 'row' },
    hourText: { ...Typography.labelMedium, color: theme.onSurface.variant, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: -2 },
    hourTextCurrent: { color: theme.primary.default, fontWeight: '800' },
    area: { flex: 1, position: 'relative' },
    hourLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.08)',
    },
    freeSlot: {
      position: 'absolute',
      left: 0,
      right: 2,
      height: DAY_HOUR_HEIGHT - 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.08)',
      backgroundColor: isLight ? theme.surface.high : 'rgba(255, 255, 255, 0.015)',
    },
    freeSlotText: { ...Typography.labelSmall, color: theme.onSurface.disabled, fontSize: 11, flexShrink: 1 },
    cardBox: { position: 'absolute' },
    nowLineContainer: { position: 'absolute', left: 0, right: 0, zIndex: 60, flexDirection: 'row', alignItems: 'center' },
    nowBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.primary.default,
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 4,
    },
    nowPulseDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' },
    nowBadgeText: { ...Typography.labelSmall, color: '#FFFFFF', fontWeight: '800', fontSize: 9 },
    nowLine: { flex: 1, height: 2, backgroundColor: theme.primary.default },
    hint: { ...Typography.labelSmall, color: theme.onSurface.variant, textAlign: 'center', marginTop: Spacing.md },
  });
}

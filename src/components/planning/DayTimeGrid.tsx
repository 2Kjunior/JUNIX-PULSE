/**
 * The Day view of the Planning (study 001, 12.4; sheet 026): a grid of hours at a fixed scale,
 * the things without a time in a band at the top, and each card at its exact time and length.
 * A long press on a moment or a reminder lifts it; it moves by quarters of an hour.
 * Touching a free place offers to add something at that hour.
 */
import { Ionicons } from '@expo/vector-icons';
import { format, isToday } from 'date-fns';
import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TAB_BAR_TOTAL_HEIGHT, Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { momentKindColor, momentKindLook } from '@/constants/moment-kinds';
import type { Event, Reminder, Task } from '@/domain/entities';
import type { DeviceEvent } from '@/domain/rules/device-calendar-rules';
import { DAY_HOUR_HEIGHT, dayHours, layoutDay, minutesForOffset, minutesOfDay, SNAP_MINUTES } from '@/domain/rules/planning-move-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

import { DraggableBlock } from './DraggableBlock';

const HOURS_WIDTH = 48;

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
}: DayTimeGridProps) {
  const t = useT();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeDayGridStyles);
  const [width, setWidth] = useState(0);
  const [lifted, setLifted] = useState(false);

  const cards = useMemo<DayCard[]>(() => {
    const list: DayCard[] = [];
    for (const event of events) {
      const startMin = minutesWithin(new Date(event.startAt), date);
      list.push({ key: `e-${event.id}`, kind: 'event', event, startMin, endMin: minutesWithin(new Date(event.endAt), date) });
    }
    for (const reminder of reminders) {
      const startMin = minutesOfDay(new Date(reminder.scheduledAt));
      list.push({ key: `r-${reminder.id}`, kind: 'reminder', reminder, startMin, endMin: startMin + 30 });
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
  const allDay = deviceEvents.filter(d => d.allDay);
  const now = new Date();
  const nowTop = isToday(date) ? ((minutesOfDay(now) - first * 60) / 60) * DAY_HOUR_HEIGHT : null;
  const quarter = (DAY_HOUR_HEIGHT * SNAP_MINUTES) / 60;

  const colorOf = (card: DayCard) =>
    card.kind === 'event'
      ? momentKindColor(theme, card.event.momentKind)
      : card.kind === 'reminder'
        ? card.reminder.priority === 'URGENT' ? theme.error.default : theme.primary.default
        : theme.success.default;

  return (
    <ScrollView
      scrollEnabled={!lifted}
      contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Without a time: the tasks of the day and the whole-day events of the phone */}
      {(tasks.length > 0 || allDay.length > 0) && (
        <View style={styles.band}>
          <Text style={styles.bandTitle}>{t('planning.noTime')}</Text>
          <View style={styles.bandRow}>
            {tasks.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.chip, { borderColor: theme.tertiary.default }]}
                onPress={() => onOpenTask(task)}
                accessibilityRole="button"
                accessibilityLabel={task.title}
              >
                <Ionicons name={task.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={theme.tertiary.default} />
                <Text style={styles.chipText} numberOfLines={1}>{task.title}</Text>
              </TouchableOpacity>
            ))}
            {allDay.map(device => (
              <TouchableOpacity
                key={device.id}
                style={[styles.chip, { borderColor: theme.success.default }]}
                onPress={() => onDeviceTouched(device.title)}
                accessibilityRole="button"
                accessibilityLabel={device.title}
              >
                <Ionicons name="phone-portrait-outline" size={14} color={theme.success.default} />
                <Text style={styles.chipText} numberOfLines={1}>{device.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.grid}>
        <View style={{ width: HOURS_WIDTH }}>
          {hours.map(hour => (
            <View key={hour} style={{ height: DAY_HOUR_HEIGHT }}>
              <Text style={styles.hourText}>{String(hour).padStart(2, '0')}:00</Text>
            </View>
          ))}
        </View>

        <View
          style={[styles.area, { height: hours.length * DAY_HOUR_HEIGHT }]}
          onLayout={event => setWidth(event.nativeEvent.layout.width)}
        >
          {hours.map((hour, index) => (
            <View key={hour} pointerEvents="none" style={[styles.hourLine, { top: index * DAY_HOUR_HEIGHT }]} />
          ))}

          {/* A free place: add something at that hour */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={event => {
              // The phone gives locationY; a web browser gives offsetY instead
              const native = event.nativeEvent as { locationY?: number; offsetY?: number };
              const y = Number.isFinite(native.locationY) ? Number(native.locationY) : Number(native.offsetY ?? 0);
              onAddAt(Math.min(23, first + Math.max(0, Math.floor(y / DAY_HOUR_HEIGHT))));
            }}
            accessibilityRole="button"
            accessibilityLabel={t('planning.addHere')}
          />

          {nowTop !== null && nowTop >= 0 && (
            <View pointerEvents="none" style={[styles.nowLine, { top: nowTop }]}>
              <View style={styles.nowDot} />
            </View>
          )}

          {width > 0 &&
            cards.map(card => {
              const box = boxes.get(card.key);
              if (!box) return null;
              const columnWidth = (width - 4) / box.columns;
              const color = colorOf(card);
              const title = card.kind === 'event' ? card.event.title : card.kind === 'reminder' ? card.reminder.title : card.device.title;
              const time =
                card.kind === 'event'
                  ? `${format(new Date(card.event.startAt), 'HH:mm')} – ${format(new Date(card.event.endAt), 'HH:mm')}`
                  : card.kind === 'reminder'
                    ? format(new Date(card.reminder.scheduledAt), 'HH:mm')
                    : `${format(card.device.startAt, 'HH:mm')} – ${format(card.device.endAt, 'HH:mm')}`;
              const icon =
                card.kind === 'event'
                  ? momentKindLook(card.event.momentKind).icon
                  : card.kind === 'reminder' ? 'notifications' : 'phone-portrait-outline';
              return (
                <DraggableBlock
                  key={card.key}
                  style={[
                    styles.card,
                    {
                      top: box.top + 1,
                      height: box.height,
                      left: 2 + box.column * columnWidth,
                      width: columnWidth - 3,
                      borderLeftColor: color,
                      backgroundColor: color + (theme.mode === 'light' ? '1F' : '2E'),
                    },
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
                    const minutes = minutesForOffset(drop.dy, DAY_HOUR_HEIGHT);
                    if (minutes === 0) return;
                    if (card.kind === 'event') onMoveEvent(card.event, minutes, 0);
                    else if (card.kind === 'reminder') onMoveReminder(card.reminder, minutes, 0);
                  }}
                  onMoveBy={(minutes, days) => {
                    if (card.kind === 'event') onMoveEvent(card.event, minutes, days);
                    else if (card.kind === 'reminder') onMoveReminder(card.reminder, minutes, days);
                  }}
                >
                  <View style={styles.cardHead}>
                    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={11} color={color} />
                    <Text style={[styles.cardTime, { color }]} numberOfLines={1}>{time}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={box.height > 52 ? 2 : 1}>{title}</Text>
                </DraggableBlock>
              );
            })}
        </View>
      </View>
      <Text style={styles.hint}>{t('planning.dragHint')}</Text>
    </ScrollView>
  );
});

function makeDayGridStyles(theme: ThemePalette) {
  const light = theme.mode === 'light';
  const line = light ? 'rgba(76, 52, 120, 0.12)' : 'rgba(255, 255, 255, 0.08)';
  return StyleSheet.create({
    content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
    band: {
      backgroundColor: theme.glass.card.backgroundColor,
      borderColor: theme.glass.card.borderColor,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.sm,
      marginBottom: Spacing.md,
      gap: Spacing.xs,
    },
    bandTitle: { ...Typography.labelMedium, color: theme.onSurface.variant, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    bandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      maxWidth: '100%',
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.full,
      borderWidth: 1,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    chipText: { ...Typography.bodySmall, color: theme.onSurface.primary, fontWeight: '600', flexShrink: 1 },
    grid: { flexDirection: 'row' },
    hourText: { ...Typography.labelSmall, color: theme.onSurface.variant, fontVariant: ['tabular-nums'], marginTop: -6 },
    area: { flex: 1, position: 'relative' },
    hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: line },
    nowLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: theme.primary.default, zIndex: 20 },
    nowDot: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary.default },
    card: {
      position: 'absolute',
      borderRadius: Radius.md,
      borderLeftWidth: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardTime: { fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 1 },
    cardTitle: { ...Typography.bodySmall, color: theme.onSurface.primary, fontWeight: '700' },
    hint: { ...Typography.labelSmall, color: theme.onSurface.variant, textAlign: 'center', marginTop: Spacing.md },
  });
}

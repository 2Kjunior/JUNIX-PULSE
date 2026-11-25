/**
 * The Month view of the Planning (study 001, 12.4; sheets 026 and 027).
 *  - a strip of months at the top, as the strip of days of the Day view: touch one to go there;
 *  - six weeks, Monday first, a dot of colour per thing in the colours of the Day view
 *    (three at most, then "+2"); today circled, the chosen day filled;
 *  - the things of the chosen day below, as GlowCards; "Voir la journée" opens the Day view;
 *  - a long press lifts one: let it go on another day; brought to the left or right edge of the
 *    grid, the page turns to the month before or after (once each time the finger enters the
 *    edge: to go further, leave it and come back), and it can be let go on a day there.
 */
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { PlanningKind, PlanningLook } from '@/constants/planning-look';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, TAB_BAR_TOTAL_HEIGHT, Typography } from '@/constants/theme';
import type { Event, Reminder, Task } from '@/domain/entities';
import { dayDots, dayKey, monthGrid, monthStrip, type WeekStart } from '@/domain/rules/planning-move-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useT } from '@/i18n';

import { DraggableBlock, type DropPoint } from './DraggableBlock';
import { PlanningCard } from './PlanningCard';

export interface MonthItem {
  key: string;
  kind: PlanningKind;
  title: string;
  /** HH:mm (or HH:mm – HH:mm), or null for a thing without a time. */
  time: string | null;
  look: PlanningLook;
  place?: string | null;
  done?: boolean;
  /** Its day, YYYY-MM-DD. */
  day: string;
  /** The thing itself, so it can still be moved once the page has turned to another month. */
  event?: Event;
  reminder?: Reminder;
  task?: Task;
}

export interface MonthViewProps {
  /** The month shown. */
  month: Date;
  /** The chosen day (its things are listed below the grid). */
  selected: Date;
  items: MonthItem[];
  onSelectDay: (day: Date) => void;
  onOpenDay: (day: Date) => void;
  onOpenItem: (item: MonthItem) => void;
  onMoveItem: (item: MonthItem, toDay: Date) => void;
  /** Go to a month: by the strip ('strip'), or by the edge of the grid during a move ('edge'). */
  onShowMonth: (month: Date, by: 'strip' | 'edge') => void;
  onDeviceTouched: (title: string) => void;
  /** Monday (1) or Sunday (0), from the Planning settings (sheet 028). */
  weekStart?: WeekStart;
}

const CELL_HEIGHT = 54;
/** How close to the edge of the grid the finger turns the page, and how long it waits there. */
const EDGE_WIDTH = 30;
const EDGE_WAIT_MS = 700;

export const MonthView = memo(function MonthView({
  month,
  selected,
  items,
  onSelectDay,
  onOpenDay,
  onOpenItem,
  onMoveItem,
  onShowMonth,
  onDeviceTouched,
  weekStart = 1,
}: MonthViewProps) {
  const t = useT();
  const dateLocale = useDateLocale();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeMonthStyles);
  const gridRef = useRef<React.ComponentRef<typeof View>>(null);
  const stripRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const gridFrame = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const edgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownRef = useRef(month);
  const [lifted, setLifted] = useState(false);
  const [edge, setEdge] = useState<-1 | 0 | 1>(0);
  // Read during the move, where the state of the last drawing may be late
  const edgeRef = useRef<-1 | 0 | 1>(0);
  const [frozen, setFrozen] = useState<MonthItem[] | null>(null);
  shownRef.current = month;

  const days = useMemo(() => monthGrid(month, weekStart), [month, weekStart]);
  const strip = useMemo(() => monthStrip(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, MonthItem[]>();
    for (const item of items) map.set(item.day, [...(map.get(item.day) ?? []), item]);
    return map;
  }, [items]);
  const ofSelected = frozen ?? byDay.get(dayKey(selected)) ?? [];
  const weekdayNames = days.slice(0, 7).map(d => format(d, 'EEEEE', { locale: dateLocale }).toUpperCase());

  // The strip keeps the month shown in view (it is the 7th of the strip)
  useEffect(() => {
    stripRef.current?.scrollTo({ x: Math.max(0, 6 * 84 - 120), animated: false });
  }, [month]);

  useEffect(() => () => {
    if (edgeTimer.current) clearTimeout(edgeTimer.current);
  }, []);

  const measureGrid = () =>
    gridRef.current?.measureInWindow((x, y, width, height) => {
      gridFrame.current = { x, y, width, height };
    });

  const stopEdge = () => {
    if (edgeTimer.current) clearTimeout(edgeTimer.current);
    edgeTimer.current = null;
    edgeRef.current = 0;
    setEdge(0);
  };

  /**
   * Held a moment at an edge, the page turns once. It never turns again by itself: a move lost
   * on the way can never leave the months running.
   */
  const turnPage = (side: -1 | 1) => {
    edgeTimer.current = setTimeout(() => {
      edgeTimer.current = null;
      const current = shownRef.current;
      onShowMonth(new Date(current.getFullYear(), current.getMonth() + side, 1), 'edge');
    }, EDGE_WAIT_MS);
  };

  const onLift = (value: boolean, item: MonthItem | null) => {
    setLifted(value);
    if (value) {
      setFrozen(byDay.get(dayKey(selected)) ?? (item ? [item] : []));
      measureGrid();
    } else {
      stopEdge();
      setFrozen(null);
    }
  };

  const onDragMove = (x: number) => {
    const frame = gridFrame.current;
    if (!frame) return;
    const side: -1 | 0 | 1 = x < frame.x + EDGE_WIDTH ? -1 : x > frame.x + frame.width - EDGE_WIDTH ? 1 : 0;
    if (side === edgeRef.current) return;
    stopEdge();
    edgeRef.current = side;
    setEdge(side);
    if (side !== 0) turnPage(side);
  };

  /** The day under the finger when it lets go, in the month shown at that moment, or nothing outside the grid. */
  const dropOn = (item: MonthItem, drop: DropPoint) => {
    stopEdge();
    gridRef.current?.measureInWindow((x, y, width, height) => {
      const column = Math.floor(((drop.x - x) / width) * 7);
      const row = Math.floor(((drop.y - y) / height) * 6);
      if (column < 0 || column > 6 || row < 0 || row > 5) return;
      const target = monthGrid(shownRef.current, weekStart)[row * 7 + column];
      if (dayKey(target) !== item.day) onMoveItem(item, target);
    });
  };

  return (
    <ScrollView
      scrollEnabled={!lifted}
      contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* The strip of months, as the strip of days of the Day view */}
      <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {strip.map(m => {
          const current = isSameMonth(m, month);
          const label = format(m, m.getFullYear() === new Date().getFullYear() ? 'MMM' : 'MMM yy', { locale: dateLocale }).toUpperCase();
          return (
            <TouchableOpacity
              key={dayKey(m)}
              style={[styles.monthPill, current && styles.monthPillActive, isSameMonth(m, new Date()) && !current && styles.monthPillToday]}
              onPress={() => onShowMonth(m, 'strip')}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
              accessibilityLabel={format(m, 'MMMM yyyy', { locale: dateLocale })}
            >
              <Text style={[styles.monthPillText, current && styles.monthPillTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.card}>
        <View style={styles.weekRow}>
          {weekdayNames.map((name, index) => (
            <Text key={index} style={styles.weekday}>{name}</Text>
          ))}
        </View>
        <View ref={gridRef} collapsable={false} style={styles.grid}>
          {days.map(day => {
            const key = dayKey(day);
            const things = byDay.get(key) ?? [];
            const { dots, more } = dayDots(things.map(thing => thing.look.color));
            const inMonth = isSameMonth(day, month);
            const isSelected = isSameDay(day, selected);
            const today = isToday(day);
            return (
              <TouchableOpacity
                key={key}
                style={styles.cell}
                onPress={() => (isSelected ? onOpenDay(day) : onSelectDay(day))}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={t('planning.monthDayA11y', { day: format(day, 'EEEE d MMMM', { locale: dateLocale }), count: things.length })}
              >
                <View style={[styles.dayCircle, today && styles.dayCircleToday, isSelected && styles.dayCircleSelected]}>
                  <Text style={[styles.dayNumber, !inMonth && styles.dayOutside, today && styles.dayToday, isSelected && styles.daySelectedText]}>
                    {format(day, 'd')}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {dots.map((color, index) => (
                    <View key={index} style={[styles.dot, { backgroundColor: color }, !inMonth && styles.dotOutside]} />
                  ))}
                  {more > 0 && <Text style={styles.more}>+{more}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* While a card is lifted: the two edges that turn the page */}
          {lifted && (
            <>
              <View pointerEvents="none" style={[styles.edge, styles.edgeLeft, edge === -1 && styles.edgeActive]}>
                <Ionicons name="chevron-back" size={16} color={edge === -1 ? theme.primary.default : theme.onSurface.variant} />
              </View>
              <View pointerEvents="none" style={[styles.edge, styles.edgeRight, edge === 1 && styles.edgeActive]}>
                <Ionicons name="chevron-forward" size={16} color={edge === 1 ? theme.primary.default : theme.onSurface.variant} />
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle} numberOfLines={1}>{format(selected, 'EEEE d MMMM', { locale: dateLocale })}</Text>
        <TouchableOpacity style={styles.openDay} onPress={() => onOpenDay(selected)} accessibilityRole="button" accessibilityLabel={t('planning.openDay')}>
          <Text style={styles.openDayText}>{t('planning.openDay')}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.primary.default} />
        </TouchableOpacity>
      </View>

      {ofSelected.length === 0 ? (
        <Text style={styles.empty}>{t('planning.monthEmptyDay')}</Text>
      ) : (
        <View style={styles.list}>
          {ofSelected.map((item, index) => (
            <DraggableBlock
              key={item.key}
              movable={item.kind !== 'device'}
              onLift={value => onLift(value, item)}
              onDragMove={onDragMove}
              accessibilityLabel={t('planning.cardA11y', { title: item.title, time: item.time ?? t('planning.noTime') })}
              onPress={() => (item.kind === 'device' ? onDeviceTouched(item.title) : onOpenItem(item))}
              onDrop={drop => dropOn(item, drop)}
              onMoveBy={(_minutes, shift) => {
                if (shift === 0) return;
                onMoveItem(item, new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + shift));
              }}
            >
              <PlanningCard
                look={item.look}
                title={item.title}
                time={item.time ?? t('planning.noTime')}
                place={item.place}
                done={item.done}
                index={index}
              />
            </DraggableBlock>
          ))}
          <Text style={styles.hint}>{t('planning.monthHint')}</Text>
        </View>
      )}
    </ScrollView>
  );
});

function makeMonthStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';
  return StyleSheet.create({
    content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
    strip: { gap: Spacing.xs, paddingBottom: Spacing.sm },
    monthPill: {
      minWidth: 76,
      minHeight: 44,
      paddingHorizontal: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.glass.card.borderColor,
      backgroundColor: theme.glass.card.backgroundColor,
    },
    monthPillActive: { backgroundColor: theme.primary.default, borderColor: theme.primary.default },
    monthPillToday: { borderColor: theme.primary.default },
    monthPillText: { ...Typography.labelMedium, color: theme.onSurface.variant, fontWeight: '700', letterSpacing: 0.5 },
    monthPillTextActive: { color: isLight ? '#FFFFFF' : '#141317' },
    card: {
      backgroundColor: theme.glass.card.backgroundColor,
      borderColor: theme.glass.card.borderColor,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.xs,
    },
    weekRow: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', ...Typography.labelSmall, color: theme.onSurface.variant, fontWeight: '700', paddingVertical: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', position: 'relative' },
    cell: { width: `${100 / 7}%`, height: CELL_HEIGHT, alignItems: 'center', paddingTop: 3 },
    dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    dayCircleToday: { borderWidth: 1.5, borderColor: theme.primary.default },
    dayCircleSelected: { backgroundColor: theme.primary.default, borderColor: theme.primary.default },
    dayNumber: { ...Typography.bodySmall, color: theme.onSurface.primary, fontWeight: '600', fontVariant: ['tabular-nums'] },
    dayOutside: { color: theme.onSurface.disabled },
    dayToday: { color: theme.primary.default, fontWeight: '800' },
    daySelectedText: { color: isLight ? '#FFFFFF' : '#141317', fontWeight: '800' },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4, height: 10 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    dotOutside: { opacity: 0.4 },
    more: { fontSize: 8, fontWeight: '700', color: theme.onSurface.variant },
    edge: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: EDGE_WIDTH - 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.outline.variant,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    edgeLeft: { left: 0 },
    edgeRight: { right: 0 },
    edgeActive: { borderColor: theme.primary.default, backgroundColor: theme.glass.controlActive },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, gap: Spacing.sm },
    dayTitle: { ...Typography.titleMedium, color: theme.onSurface.primary, fontWeight: '700', flexShrink: 1 },
    openDay: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: Spacing.xs },
    openDayText: { ...Typography.labelMedium, color: theme.primary.default, fontWeight: '700' },
    empty: { ...Typography.bodySmall, color: theme.onSurface.variant, marginTop: Spacing.sm },
    list: { gap: Spacing.sm, marginTop: Spacing.xs },
    hint: { ...Typography.labelSmall, color: theme.onSurface.variant, textAlign: 'center', marginTop: Spacing.sm },
  });
}

/**
 * The Month view of the Planning (study 001, 12.4; sheet 026): six weeks, Monday first, a dot of
 * colour per thing (three at most, then "+2"). Touching a day shows its things below the grid;
 * "Voir la journée" opens the Day view. A long press on one of them lifts it: let it go on
 * another day of the grid and it moves to that day, at the same time.
 */
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import React, { memo, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TAB_BAR_TOTAL_HEIGHT, Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { dayDots, dayKey, monthGrid } from '@/domain/rules/planning-move-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useT } from '@/i18n';

import { DraggableBlock, type DropPoint } from './DraggableBlock';

export interface MonthItem {
  key: string;
  kind: 'event' | 'reminder' | 'task' | 'device';
  title: string;
  /** HH:mm, or null for a thing without a time. */
  time: string | null;
  color: string;
  /** Its day, YYYY-MM-DD. */
  day: string;
}

export interface MonthViewProps {
  month: Date;
  selected: Date;
  items: MonthItem[];
  onSelectDay: (day: Date) => void;
  onOpenDay: (day: Date) => void;
  onOpenItem: (item: MonthItem) => void;
  onMoveItem: (item: MonthItem, toDay: Date) => void;
  onDeviceTouched: (title: string) => void;
}

const CELL_HEIGHT = 52;

export const MonthView = memo(function MonthView({
  month,
  selected,
  items,
  onSelectDay,
  onOpenDay,
  onOpenItem,
  onMoveItem,
  onDeviceTouched,
}: MonthViewProps) {
  const t = useT();
  const dateLocale = useDateLocale();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeMonthStyles);
  const gridRef = useRef<React.ComponentRef<typeof View>>(null);
  const [lifted, setLifted] = useState(false);

  const days = useMemo(() => monthGrid(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, MonthItem[]>();
    for (const item of items) map.set(item.day, [...(map.get(item.day) ?? []), item]);
    return map;
  }, [items]);
  const ofSelected = byDay.get(dayKey(selected)) ?? [];
  const weekdayNames = days.slice(0, 7).map(d => format(d, 'EEEEE', { locale: dateLocale }).toUpperCase());

  /** The day under the finger when it lets go, or null outside the grid. */
  const dropOn = (item: MonthItem, drop: DropPoint) => {
    gridRef.current?.measureInWindow((x, y, width, height) => {
      const column = Math.floor(((drop.x - x) / width) * 7);
      const row = Math.floor(((drop.y - y) / height) * 6);
      if (column < 0 || column > 6 || row < 0 || row > 5) return;
      const target = days[row * 7 + column];
      if (dayKey(target) !== item.day) onMoveItem(item, target);
    });
  };

  return (
    <ScrollView
      scrollEnabled={!lifted}
      contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 110 }]}
      showsVerticalScrollIndicator={false}
    >
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
            const { dots, more } = dayDots(things.map(thing => thing.color));
            const inMonth = isSameMonth(day, month);
            const isSelected = isSameDay(day, selected);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.cell, isSelected && styles.cellSelected]}
                onPress={() => (isSelected ? onOpenDay(day) : onSelectDay(day))}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={t('planning.monthDayA11y', {
                  day: format(day, 'EEEE d MMMM', { locale: dateLocale }),
                  count: things.length,
                })}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    !inMonth && styles.dayOutside,
                    isToday(day) && styles.dayToday,
                    isSelected && styles.daySelectedText,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
                <View style={styles.dots}>
                  {dots.map((color, index) => (
                    <View key={index} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                  {more > 0 && <Text style={styles.more}>+{more}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle} numberOfLines={1}>
          {format(selected, 'EEEE d MMMM', { locale: dateLocale })}
        </Text>
        <TouchableOpacity
          style={styles.openDay}
          onPress={() => onOpenDay(selected)}
          accessibilityRole="button"
          accessibilityLabel={t('planning.openDay')}
        >
          <Text style={styles.openDayText}>{t('planning.openDay')}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.primary.default} />
        </TouchableOpacity>
      </View>

      {ofSelected.length === 0 ? (
        <Text style={styles.empty}>{t('planning.monthEmptyDay')}</Text>
      ) : (
        <View style={styles.list}>
          {ofSelected.map(item => (
            <DraggableBlock
              key={item.key}
              style={[styles.item, { borderLeftColor: item.color }]}
              movable={item.kind !== 'device'}
              onLift={setLifted}
              accessibilityLabel={t('planning.cardA11y', { title: item.title, time: item.time ?? t('planning.noTime') })}
              onPress={() => (item.kind === 'device' ? onDeviceTouched(item.title) : onOpenItem(item))}
              onDrop={drop => dropOn(item, drop)}
              onMoveBy={(_minutes, days) => {
                if (days === 0) return;
                const target = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + days);
                onMoveItem(item, target);
              }}
            >
              <Text style={[styles.itemTime, { color: item.color }]}>{item.time ?? '—'}</Text>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            </DraggableBlock>
          ))}
          <Text style={styles.hint}>{t('planning.monthHint')}</Text>
        </View>
      )}
    </ScrollView>
  );
});

function makeMonthStyles(theme: ThemePalette) {
  return StyleSheet.create({
    content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
    card: {
      backgroundColor: theme.glass.card.backgroundColor,
      borderColor: theme.glass.card.borderColor,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.xs,
    },
    weekRow: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', ...Typography.labelSmall, color: theme.onSurface.variant, fontWeight: '700', paddingVertical: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      height: CELL_HEIGHT,
      alignItems: 'center',
      paddingTop: 4,
      borderRadius: Radius.md,
    },
    cellSelected: { backgroundColor: theme.glass.controlActive },
    dayNumber: { ...Typography.bodySmall, color: theme.onSurface.primary, fontWeight: '600', fontVariant: ['tabular-nums'] },
    dayOutside: { color: theme.onSurface.disabled },
    dayToday: { color: theme.primary.default, fontWeight: '800' },
    daySelectedText: { fontWeight: '800' },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4, height: 10 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    more: { fontSize: 8, fontWeight: '700', color: theme.onSurface.variant },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, gap: Spacing.sm },
    dayTitle: { ...Typography.titleMedium, color: theme.onSurface.primary, fontWeight: '700', flexShrink: 1 },
    openDay: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: Spacing.xs },
    openDayText: { ...Typography.labelMedium, color: theme.primary.default, fontWeight: '700' },
    empty: { ...Typography.bodySmall, color: theme.onSurface.variant, marginTop: Spacing.sm },
    list: { gap: Spacing.xs, marginTop: Spacing.xs },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 48,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      borderLeftWidth: 4,
      backgroundColor: theme.glass.card.backgroundColor,
      borderColor: theme.glass.card.borderColor,
    },
    itemTime: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], width: 44 },
    itemTitle: { ...Typography.bodyMedium, color: theme.onSurface.primary, fontWeight: '600', flex: 1 },
    hint: { ...Typography.labelSmall, color: theme.onSurface.variant, textAlign: 'center', marginTop: Spacing.sm },
  });
}

/**
 * Onglet Calendrier — Vue mensuelle par défaut.
 * Étape 10 construira les vues jour/semaine/mois complètes.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { Surface, Primary, Tertiary, OnSurface, Outline, Spacing, Radius, Typography } from '@/constants/theme';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // jours vides au début (0=dim)

  const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-back" size={20} color={OnSurface.variant} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-forward" size={20} color={OnSurface.variant} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/events/new' as any)}
          accessibilityLabel="Nouvel événement"
        >
          <Ionicons name="add" size={22} color={Primary.on} />
        </TouchableOpacity>
      </View>

      {/* Jours de la semaine */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map(d => (
          <Text key={d} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* Grille */}
      <View style={styles.grid}>
        {/* Cases vides pour aligner le premier jour */}
        {Array.from({ length: startPad }).map((_, i) => (
          <View key={`pad-${i}`} style={styles.dayCell} />
        ))}

        {days.map(day => {
          const isSelected = isSameDay(day, selected);
          const isT = isToday(day);
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isT && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => setSelected(day)}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isT && !isSelected && styles.dayNumberToday,
                ]}
              >
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Journée sélectionnée */}
      <View style={styles.selectedDay}>
        <Text style={styles.selectedDayTitle}>
          {format(selected, 'EEEE d MMMM', { locale: fr })}
        </Text>
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>Aucun événement</Text>
          <TouchableOpacity onPress={() => router.push('/events/new' as any)}>
            <Text style={styles.emptyDayAction}>+ Créer un événement</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Surface.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    textTransform: 'capitalize',
    minWidth: 140,
    textAlign: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabels: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Primary.default,
    borderRadius: Radius.full,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Primary.default,
    borderRadius: Radius.full,
  },
  dayNumber: { ...Typography.bodyMedium, color: OnSurface.primary },
  dayNumberSelected: { color: Primary.on, fontWeight: '700' },
  dayNumberToday: { color: Primary.default },
  selectedDay: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  selectedDayTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.md,
    textTransform: 'capitalize',
  },
  emptyDay: {
    flex: 1,
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyDayText: { ...Typography.bodySmall, color: OnSurface.disabled },
  emptyDayAction: { ...Typography.labelMedium, color: Primary.default },
});

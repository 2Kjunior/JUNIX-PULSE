/**
 * Emploi du temps visuel (Grille Horaire & Timeline) avec GlowCards.
 * Affiche la journée sous forme de planning chronologique de 07h à 22h.
 * Chaque événement, rappel et tâche y est positionné à son heure exacte
 * avec sa carte lumineuse GlowCard personnalisée.
 */
import { memo, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { format, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Event, Reminder, Task } from '@/domain/entities';
import {
  Spacing,
  Radius,
  Typography,
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import { GlowCard } from '@/components/ui/GlowCard';
import { CalendarActionModal } from './CalendarActionModal';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { ThemePalette } from '@/constants/palettes';

interface CalendarTimetableProps {
  selectedDate: Date;
  events: Event[];
  reminders: Reminder[];
  tasks: Task[];
  onRefresh?: () => void;
}

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;

export const CalendarTimetable = memo(function CalendarTimetable({
  selectedDate,
  events,
  reminders,
  tasks,
}: CalendarTimetableProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeTimetableStyles);
  const isLight = theme.mode === 'light';

  // Couleurs d'accent adaptées pour contraste texte/badge
  const eventAccentColor = isLight ? '#0284C7' : '#38BDF8';
  const taskAccentColor = isLight ? '#059669' : '#34D399';

  const isSelectedToday = isToday(selectedDate);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const [selectedSlotHour, setSelectedSlotHour] = useState<number | null>(null);

  // Calcul de la plage horaire adaptative (Smart Range)
  // S'étend automatiquement si une action a lieu tôt le matin ou tard le soir
  const hours = useMemo(() => {
    let minH = DEFAULT_START_HOUR;
    let maxH = DEFAULT_END_HOUR;

    // Si on est aujourd'hui et qu'il est plus tôt que 07h00 (ex: 6h), inclure l'heure courante
    if (isSelectedToday && currentHour < minH) {
      minH = Math.max(0, currentHour);
    }

    events.forEach(e => {
      try {
        const s = parseISO(e.startAt).getHours();
        const endD = parseISO(e.endAt);
        const endH = Math.min(23, Math.ceil(endD.getHours() + (endD.getMinutes() > 0 ? 1 : 0)));
        if (s < minH) minH = s;
        if (endH > maxH) maxH = endH;
      } catch {
        // Ignorer date invalide
      }
    });

    reminders.forEach(r => {
      try {
        const h = parseISO(r.scheduledAt).getHours();
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      } catch {
        // Ignorer date invalide
      }
    });

    return Array.from({ length: maxH - minH + 1 }, (_, i) => i + minH);
  }, [events, reminders, isSelectedToday, currentHour]);

  // Indexation des items par heure
  const { hourEventsMap, hourRemindersMap, totalOccupiedSlots } = useMemo(() => {
    const eMap: Record<number, Event[]> = {};
    const rMap: Record<number, Reminder[]> = {};
    let occupiedCount = 0;

    events.forEach(e => {
      try {
        const d = parseISO(e.startAt);
        const h = d.getHours();
        if (!eMap[h]) eMap[h] = [];
        eMap[h].push(e);
      } catch {
        // Ignorer date invalide
      }
    });

    reminders.forEach(r => {
      try {
        const d = parseISO(r.scheduledAt);
        const h = d.getHours();
        if (!rMap[h]) rMap[h] = [];
        rMap[h].push(r);
      } catch {
        // Ignorer date invalide
      }
    });

    hours.forEach(h => {
      if ((eMap[h]?.length ?? 0) > 0 || (rMap[h]?.length ?? 0) > 0) {
        occupiedCount++;
      }
    });

    return {
      hourEventsMap: eMap,
      hourRemindersMap: rMap,
      totalOccupiedSlots: occupiedCount,
    };
  }, [events, reminders, hours]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Légende & Résumé synthétique du planning ────────────────────── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryTitle}>
            {totalOccupiedSlots} créneau{totalOccupiedSlots > 1 ? 'x' : ''} occupé{totalOccupiedSlots > 1 ? 's' : ''}
          </Text>
          <Text style={styles.summarySub}>
            {events.length} évt • {reminders.length} rappel • {tasks.length} tâche
          </Text>
        </View>

        {/* Badges de légende */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: eventAccentColor }]} />
            <Text style={styles.legendText}>Événement</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary.default }]} />
            <Text style={styles.legendText}>Rappel</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: taskAccentColor }]} />
            <Text style={styles.legendText}>Tâche</Text>
          </View>
        </View>
      </View>

      {/* ─── Tâches de la journée (en en-tête d'emploi du temps) ─────────────── */}
      {tasks.length > 0 && (
        <View style={styles.tasksSection}>
          <View style={styles.tasksHeader}>
            <Ionicons name="checkbox-outline" size={16} color={taskAccentColor} />
            <Text style={[styles.tasksTitle, { color: taskAccentColor }]}>
              Objectifs & Tâches du jour ({tasks.length})
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tasksScroll}>
            {tasks.map((t, idx) => (
              <GlowCard
                key={t.id}
                index={idx}
                tone="success"
                intensity="soft"
                style={styles.taskMiniCard}
                onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: t.id } })}
                accessibilityLabel={`Tâche : ${t.title}${t.status === 'COMPLETED' ? ', terminée' : ''}`}
              >
                <View style={styles.taskMiniContent}>
                  <Ionicons
                    name={t.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={taskAccentColor}
                  />
                  <Text style={styles.taskMiniTitle} numberOfLines={1}>
                    {t.title}
                  </Text>
                  {t.estimatedMinutes ? (
                    <Text style={[styles.taskMiniDuration, { color: taskAccentColor }]}>
                      {t.estimatedMinutes}m
                    </Text>
                  ) : null}
                </View>
              </GlowCard>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Grille Chronologique Adaptative (Smart Range) ─────────────────── */}
      <View style={styles.timelineGrid}>
        {hours.map(hour => {
          const hourEvents = hourEventsMap[hour] || [];
          const hourReminders = hourRemindersMap[hour] || [];
          const hasItems = hourEvents.length > 0 || hourReminders.length > 0;
          const isCurrentSlot = isSelectedToday && currentHour === hour;

          return (
            <View key={hour} style={styles.hourRow}>
              {/* Colonne heure gauche */}
              <View style={styles.hourCol}>
                <Text style={[styles.hourText, isCurrentSlot && styles.hourTextCurrent]}>
                  {String(hour).padStart(2, '0')}:00
                </Text>
              </View>

              {/* Ligne séparatrice et contenu créneau */}
              <View style={styles.slotCol}>
                {/* Ligne "Maintenant" en direct */}
                {isCurrentSlot && (
                  <View
                    style={[
                      styles.nowLineContainer,
                      { top: (currentMinute / 60) * 100 },
                    ]}
                  >
                    <View style={styles.nowBadge}>
                      <View style={styles.nowPulseDot} />
                      <Text style={styles.nowBadgeText}>
                        MAINTENANT • {format(now, 'HH:mm')}
                      </Text>
                    </View>
                    <View style={styles.nowLine} />
                  </View>
                )}

                {hasItems ? (
                  <View style={styles.itemsStack}>
                    {/* Événements de ce créneau */}
                    {hourEvents.map((e, idx) => {
                      let timeStr = `${String(hour).padStart(2, '0')}:00`;
                      let proportionalMinHeight = 56;
                      try {
                        const startD = parseISO(e.startAt);
                        const endD = parseISO(e.endAt);
                        timeStr = `${format(startD, 'HH:mm')} - ${format(endD, 'HH:mm')}`;
                        const durationMinutes = Math.max(30, (endD.getTime() - startD.getTime()) / 60000);
                        // Hauteur proportionnelle au nombre d'heures (64px par heure)
                        proportionalMinHeight = Math.max(56, (durationMinutes / 60) * 64);
                      } catch {
                        // fallback
                      }

                      return (
                        <GlowCard
                          key={e.id}
                          index={idx}
                          tone="info"
                          intensity="default"
                          style={[styles.eventCard, { minHeight: proportionalMinHeight }]}
                          onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })}
                          accessibilityLabel={`Événement : ${e.title}, horaire ${timeStr}${e.location ? `, lieu ${e.location}` : ''}`}
                        >
                          <View style={styles.cardHeaderRow}>
                            <View style={styles.eventBadge}>
                              <Ionicons name="calendar" size={11} color={eventAccentColor} />
                              <Text style={[styles.eventBadgeText, { color: eventAccentColor }]}>
                                ÉVÉNEMENT
                              </Text>
                            </View>
                            <Text style={styles.cardTimeText}>{timeStr}</Text>
                          </View>

                          <Text style={styles.eventTitle} numberOfLines={2}>
                            {e.title}
                          </Text>

                          {e.location ? (
                            <View style={styles.cardMetaRow}>
                              <Ionicons name="location-outline" size={13} color={theme.onSurface.variant} />
                              <Text style={styles.cardMetaText} numberOfLines={1}>
                                {e.location}
                              </Text>
                            </View>
                          ) : null}
                        </GlowCard>
                      );
                    })}

                    {/* Rappels de ce créneau */}
                    {hourReminders.map((r, idx) => {
                      let reminderTimeStr = `${String(hour).padStart(2, '0')}:00`;
                      try {
                        reminderTimeStr = format(parseISO(r.scheduledAt), 'HH:mm');
                      } catch {
                        // fallback
                      }

                      const isUrgent = r.priority === 'URGENT';

                      return (
                        <GlowCard
                          key={r.id}
                          index={idx}
                          tone={isUrgent ? 'urgent' : 'primary'}
                          intensity="default"
                          style={styles.reminderCard}
                          onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: r.id } })}
                          accessibilityLabel={`Rappel : ${r.title}, heure ${reminderTimeStr}${isUrgent ? ', urgent' : ''}`}
                        >
                          <View style={styles.cardHeaderRow}>
                            <View style={[styles.reminderBadge, isUrgent && styles.reminderBadgeUrgent]}>
                              <Ionicons
                                name="notifications"
                                size={11}
                                color={isUrgent ? theme.error.default : theme.primary.default}
                              />
                              <Text
                                style={[
                                  styles.reminderBadgeText,
                                  isUrgent && styles.reminderBadgeTextUrgent,
                                ]}
                              >
                                {isUrgent ? 'RAPPEL URGENT' : 'RAPPEL'}
                              </Text>
                            </View>
                            <Text style={styles.cardTimeText}>{reminderTimeStr}</Text>
                          </View>

                          <Text style={styles.reminderTitle} numberOfLines={2}>
                            {r.title}
                          </Text>

                          {r.notes ? (
                            <Text style={styles.reminderNotes} numberOfLines={1}>
                              {r.notes}
                            </Text>
                          ) : null}

                          <View style={styles.reminderFooterRow}>
                            <TouchableOpacity
                              style={styles.reminderSnoozeBtn}
                              onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: r.id } })}
                              accessibilityRole="button"
                              accessibilityLabel={`Options et report pour le rappel ${r.title}`}
                            >
                              <Ionicons name="timer-outline" size={12} color={theme.primary.default} />
                              <Text style={styles.reminderSnoozeText}>Options & Snooze</Text>
                            </TouchableOpacity>
                          </View>
                        </GlowCard>
                      );
                    })}
                  </View>
                ) : (
                  /* Créneau libre */
                  <TouchableOpacity
                    style={styles.freeSlot}
                    onPress={() => setSelectedSlotHour(hour)}
                    activeOpacity={0.65}
                    accessibilityRole="button"
                    accessibilityLabel={`Créneau de ${hour}h disponible. Appuyer pour choisir une action.`}
                  >
                    <View style={styles.freeSlotInner}>
                      <Text style={styles.freeSlotText}>Créneau disponible • Choisir une action</Text>
                      <Ionicons name="add" size={14} color={theme.primary.default} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* ─── Modal de sélection du type d'élément pour le créneau ────── */}
      <CalendarActionModal
        visible={selectedSlotHour !== null}
        onClose={() => setSelectedSlotHour(null)}
        selectedDate={selectedDate}
        slotHour={selectedSlotHour}
      />
    </ScrollView>
  );
});

export function makeTimetableStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xs,
    },
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isLight ? theme.surface.container : 'rgba(26, 30, 46, 0.85)',
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.16)',
      marginBottom: Spacing.md,
    },
    summaryInfo: {
      gap: 2,
    },
    summaryTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    summarySub: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    legendText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
    },
    tasksSection: {
      marginBottom: Spacing.md,
      gap: Spacing.xs,
    },
    tasksHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
    },
    tasksTitle: {
      ...Typography.labelMedium,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tasksScroll: {
      paddingVertical: 4,
    },
    taskMiniCard: {
      marginRight: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      minWidth: 140,
      maxWidth: 200,
    },
    taskMiniContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    taskMiniTitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.primary,
      fontWeight: '600',
      flex: 1,
    },
    taskMiniDuration: {
      ...Typography.labelSmall,
      fontSize: 10,
      fontWeight: '600',
    },
    timelineGrid: {
      gap: Spacing.md,
    },
    hourRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      minHeight: 64,
    },
    hourCol: {
      width: 52,
      paddingTop: 4,
    },
    hourText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    hourTextCurrent: {
      color: theme.primary.default,
      fontWeight: '800',
    },
    slotCol: {
      flex: 1,
      position: 'relative',
      borderTopWidth: 1,
      borderTopColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.08)',
      paddingTop: Spacing.xs,
      minHeight: 56,
    },
    nowLineContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
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
    nowPulseDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#FFFFFF',
    },
    nowBadgeText: {
      ...Typography.labelSmall,
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 9,
    },
    nowLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.primary.default,
      shadowColor: theme.primary.default,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    },
    itemsStack: {
      gap: Spacing.xs + 2,
    },
    eventCard: {
      marginBottom: 4,
    },
    eventBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)',
      borderRadius: Radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    eventBadgeText: {
      ...Typography.labelSmall,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardTimeText: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      fontSize: 10,
      fontVariant: ['tabular-nums'],
    },
    eventTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
      marginBottom: 2,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    cardMetaText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      fontSize: 11,
    },
    reminderCard: {
      marginBottom: 4,
    },
    reminderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.15)',
      borderRadius: Radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    reminderBadgeUrgent: {
      backgroundColor: isLight ? theme.error.container : 'rgba(248, 113, 113, 0.18)',
    },
    reminderBadgeText: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    reminderBadgeTextUrgent: {
      color: theme.error.default,
    },
    reminderTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
      marginBottom: 2,
    },
    reminderNotes: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      fontSize: 11,
    },
    reminderFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 6,
    },
    reminderSnoozeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.10)',
      borderRadius: Radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    reminderSnoozeText: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      fontSize: 10,
      fontWeight: '600',
    },
    freeSlot: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isLight ? theme.outline.variant : 'rgba(255, 255, 255, 0.08)',
      backgroundColor: isLight ? theme.surface.high : 'rgba(255, 255, 255, 0.015)',
      justifyContent: 'center',
      minHeight: 40,
    },
    freeSlotInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    freeSlotText: {
      ...Typography.labelSmall,
      color: theme.onSurface.disabled,
      fontSize: 11,
    },
  });
}

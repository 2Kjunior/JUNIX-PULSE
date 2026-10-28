/**
 * Grille Hebdomadaire de l'Emploi du Temps (Matrice Temporelle 7J).
 * Reproduit fidèlement le design Stitch "Emploi du Temps - Grille Hebdomadaire".
 *
 * Spécifications respectées :
 * - Hauteur proportionnelle à la durée en heures (ex: 2h30 = 2.5 * HOUR_HEIGHT).
 * - Positionnement vertical exact selon l'heure de début (07h00 - 22h00).
 * - Couleurs et styles fidèles au design system Stitch (Deep Focus violet, Vitalité cyan, Projets indigo, Détente ardoise, Zone Tampon IA).
 * - Grille 7 jours avec défilement horizontal fluide et repères horaires horizontaux.
 * - Légende des catégories avec décompte réel des heures prévues.
 * - Carte IA "Junix Pulse IA" avec score de rythme et zones tampons.
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

import { PlanningBlock, PlanningBlockType } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, Typography } from '@/constants/theme';

export interface WeeklyTimetableGridProps {
  blocks: PlanningBlock[];
  onAddBlock: (dayNum: number, defaultTime?: string) => void;
  onDeleteBlock: (id: string, label: string) => void;
  onSelectBlock?: (block: PlanningBlock) => void;
  weekDays?: Date[];
  tasksCountByDay?: Record<number, number>;
  onPressTasksDay?: (dayNum: number) => void;
}

const START_HOUR = 7;   // 07:00
const END_HOUR = 22;    // 22:00
const TOTAL_HOURS = END_HOUR - START_HOUR; // 15 heures
const HOUR_HEIGHT = 48; // 48px par tranche de 60 minutes (exactement comme dans Stitch)
const TIME_COL_WIDTH = 54;
const DAY_COL_WIDTH = 84;

const DAYS_DEFINITION = [
  { num: 1, label: 'LUN', full: 'Lundi', dateNum: '01' },
  { num: 2, label: 'MAR', full: 'Mardi', dateNum: '02' },
  { num: 3, label: 'MER', full: 'Mercredi', dateNum: '03' },
  { num: 4, label: 'JEU', full: 'Jeudi', dateNum: '04' },
  { num: 5, label: 'VEN', full: 'Vendredi', dateNum: '05' },
  { num: 6, label: 'SAM', full: 'Samedi', dateNum: '06' },
  { num: 0, label: 'DIM', full: 'Dimanche', dateNum: '07' },
];

type PresetFilter = 'ideal' | 'pro' | 'weekend';

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface PositionedForegroundBlock {
  block: PlanningBlock;
  colIndex: number;
  totalCols: number;
  hasConflict: boolean;
  topPx: number;
  heightPx: number;
  leftPx: number;
  widthPx: number;
}

/**
 * Algorithme de partitionnement en sous-colonnes (Column Splitting standard Google / Apple Calendar)
 * Permet d'afficher côte à côte les événements qui ont lieu à la même heure sans aucune superposition.
 */
function layoutForegroundBlocks(
  blocks: PlanningBlock[],
  columnWidth: number
): PositionedForegroundBlock[] {
  if (blocks.length === 0) return [];

  const items = blocks
    .map(block => {
      const startMin = timeToMinutes(block.startTime);
      const endMin = timeToMinutes(block.endTime);
      const durationMin = Math.max(15, endMin - startMin);
      return {
        block,
        startMin,
        endMin,
        durationMin,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin);

  // Groupes d'intervalles qui se chevauchent consécutivement
  const clusters: typeof items[] = [];
  let currentCluster: typeof items = [];
  let clusterEndMin = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEndMin = item.endMin;
    } else if (item.startMin < clusterEndMin) {
      currentCluster.push(item);
      clusterEndMin = Math.max(clusterEndMin, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEndMin = item.endMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedForegroundBlock[] = [];

  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const assignments: { item: typeof items[0]; colIndex: number }[] = [];

    for (const item of cluster) {
      let placedCol = -1;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= item.startMin) {
          placedCol = c;
          colEnds[c] = item.endMin;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEnds.length;
        colEnds.push(item.endMin);
      }
      assignments.push({ item, colIndex: placedCol });
    }

    const totalCols = Math.min(3, colEnds.length); // Maximum 3 sous-colonnes simultanées sur mobile
    const hasConflict = colEnds.length > 1;

    for (const a of assignments) {
      const colIndex = Math.min(a.colIndex, totalCols - 1);
      const subColWidth = (columnWidth - 4) / totalCols;
      const leftPx = 2 + colIndex * subColWidth;
      const widthPx = Math.max(20, subColWidth - 2);

      const topPx = ((a.item.startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const heightPx = (a.item.durationMin / 60) * HOUR_HEIGHT;
      const clampedTop = Math.max(0, topPx);
      const clampedHeight = Math.max(24, heightPx - 2);

      result.push({
        block: a.item.block,
        colIndex,
        totalCols,
        hasConflict,
        topPx: clampedTop,
        heightPx: clampedHeight,
        leftPx,
        widthPx,
      });
    }
  }

  return result;
}

export function WeeklyTimetableGrid({
  blocks,
  onAddBlock,
  onDeleteBlock,
  onSelectBlock,
  weekDays,
  tasksCountByDay,
  onPressTasksDay,
}: WeeklyTimetableGridProps) {
  const { palette, isDark } = useTheme();

  // Détection s'il y a des tâches réparties sur la semaine
  const hasAnyTasks = useMemo(() => {
    return tasksCountByDay && Object.values(tasksCountByDay).some(c => c > 0);
  }, [tasksCountByDay]);

  // Définition dynamique des 7 jours de la semaine
  const displayedDays = useMemo(() => {
    if (weekDays && weekDays.length === 7) {
      return weekDays.map(d => {
        const num = d.getDay();
        const label = format(d, 'EEE', { locale: fr }).toUpperCase();
        const full = format(d, 'EEEE', { locale: fr });
        const dateNum = format(d, 'dd');
        const isCurrentDay = isToday(d);
        return { num, label, full, dateNum, isCurrentDay };
      });
    }
    return DAYS_DEFINITION.map(d => ({ ...d, isCurrentDay: false }));
  }, [weekDays]);

  // Calcul des statistiques par catégorie pour la légende Stitch
  const stats = useMemo(() => {
    let workMin = 0;
    let sportMin = 0;
    let restMin = 0;
    let otherMin = 0;

    blocks.forEach(b => {
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);
      const dur = Math.max(0, end - start);

      switch (b.type) {
        case 'WORK':
        case 'STUDY':
          workMin += dur;
          break;
        case 'SPORT':
          sportMin += dur;
          break;
        case 'REST':
        case 'FREE':
          restMin += dur;
          break;
        case 'HOUSE':
        case 'OTHER':
        default:
          otherMin += dur;
          break;
      }
    });

    const totalMin = workMin + sportMin + restMin + otherMin;
    const totalHours = Math.round((totalMin / 60) * 10) / 10;

    // Score de rythme estimé selon équilibre travail / repos
    const rhythmScore = totalHours > 0 ? Math.min(98, Math.max(75, Math.round(94 - Math.abs(workMin - (sportMin + restMin)) / 120))) : 90;

    return {
      workHours: Math.round(workMin / 60),
      sportHours: Math.round(sportMin / 60),
      restHours: Math.round(restMin / 60),
      otherHours: Math.round(otherMin / 60),
      totalHours,
      rhythmScore,
    };
  }, [blocks]);

  // Obtenir la configuration visuelle d'un bloc selon son type (Identique aux GlowCards de la liste)
  const getBlockStyleConfig = (type: PlanningBlockType) => {
    switch (type) {
      case 'WORK':
        return {
          bg: isDark ? 'rgba(208, 188, 255, 0.20)' : 'rgba(107, 70, 193, 0.15)',
          border: palette.primary.default, // #D0BCFF ou #6B46C1
          text: isDark ? '#E9DDFF' : '#4A3780',
          accent: palette.primary.default,
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'briefcase',
          isWork: true,
          isDashed: false,
        };
      case 'STUDY':
        return {
          bg: isDark ? 'rgba(123, 208, 255, 0.18)' : 'rgba(14, 116, 144, 0.12)',
          border: palette.tertiary.default, // #7BD0FF ou #0E7490
          text: isDark ? '#C3E7FF' : '#004C6D',
          accent: palette.tertiary.default,
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'book',
          isWork: false,
          isDashed: false,
        };
      case 'REST':
        return {
          bg: isDark ? 'rgba(76, 175, 80, 0.20)' : 'rgba(76, 175, 80, 0.14)',
          border: '#4CAF50',
          text: isDark ? '#A5D6A7' : '#1B5E20',
          accent: '#4CAF50',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'cafe',
          isWork: false,
          isDashed: false,
        };
      case 'SPORT':
        return {
          bg: isDark ? 'rgba(255, 152, 0, 0.20)' : 'rgba(255, 152, 0, 0.14)',
          border: '#FF9800',
          text: isDark ? '#FFCC80' : '#E65100',
          accent: '#FF9800',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'fitness',
          isWork: false,
          isDashed: false,
        };
      case 'HOUSE':
        return {
          bg: isDark ? 'rgba(156, 39, 176, 0.20)' : 'rgba(156, 39, 176, 0.14)',
          border: '#9C27B0',
          text: isDark ? '#CE93D8' : '#4A148C',
          accent: '#9C27B0',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'home',
          isWork: false,
          isDashed: false,
        };
      case 'FREE':
        return {
          bg: isDark ? 'rgba(0, 188, 212, 0.18)' : 'rgba(0, 188, 212, 0.12)',
          border: '#00BCD4',
          text: isDark ? '#80DEEA' : '#006064',
          accent: '#00BCD4',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'sparkles',
          isWork: false,
          isDashed: false,
        };
      case 'OTHER':
      default:
        return {
          bg: isDark ? 'rgba(148, 143, 154, 0.15)' : 'rgba(148, 143, 154, 0.10)',
          border: palette.onSurface.variant,
          text: isDark ? '#CAC4D0' : '#57534E',
          accent: palette.onSurface.variant,
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'ellipsis-horizontal',
          isWork: false,
          isDashed: true,
        };
    }
  };

  const gridContentWidth = TIME_COL_WIDTH + displayedDays.length * DAY_COL_WIDTH;

  return (
    <View style={styles.wrapper}>
      {/* ─── Conteneur principal de la Grille Matricielle 7J ────────────────────── */}
      <View style={styles.gridCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ minWidth: gridContentWidth }}
        >
          <View style={{ width: gridContentWidth }}>
            {/* Ligne d'en-tête collante des 7 jours */}
            <View style={styles.dayHeaderRow}>
              {/* Coin haut-gauche icône horloge */}
              <View style={[styles.cornerCell, { width: TIME_COL_WIDTH }]}>
                <Ionicons name="time-outline" size={16} color={palette.onSurface.variant} />
              </View>

              {/* Colonnes des jours (avec mise en avant du jour d'aujourd'hui) */}
              {displayedDays.map(d => {
                return (
                  <View
                    key={d.num}
                    style={[
                      styles.dayHeaderCell,
                      { width: DAY_COL_WIDTH },
                      d.isCurrentDay && styles.dayHeaderCellActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayHeaderName,
                        d.isCurrentDay && { color: palette.primary.default, fontWeight: '800' },
                      ]}
                    >
                      {d.label}
                    </Text>
                    <Text
                      style={[
                        styles.dayHeaderDate,
                        d.isCurrentDay && { color: palette.primary.default, fontWeight: '800' },
                      ]}
                    >
                      {d.dateNum}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Ligne facultative "Tâches à faire dans la journée" (All-day) */}
            {hasAnyTasks && (
              <View style={styles.allDayRow}>
                <View style={[styles.allDayGutter, { width: TIME_COL_WIDTH }]}>
                  <Ionicons name="checkbox-outline" size={13} color={palette.tertiary.default} />
                  <Text style={styles.allDayGutterText}>Tâches</Text>
                </View>
                {displayedDays.map(d => {
                  const count = tasksCountByDay?.[d.num] ?? 0;
                  return (
                    <View key={d.num} style={[styles.allDayCell, { width: DAY_COL_WIDTH }]}>
                      {count > 0 ? (
                        <TouchableOpacity
                          style={styles.allDayTaskPill}
                          onPress={() => onPressTasksDay ? onPressTasksDay(d.num) : onAddBlock(d.num)}
                          activeOpacity={0.75}
                          accessibilityLabel={`${count} tâches à faire pour ce jour`}
                        >
                          <Text style={styles.allDayTaskPillText} numberOfLines={1}>
                            {count} tâche{count > 1 ? 's' : ''}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Corps de la Grille : Colonne Heures + Colonnes Journées */}
            <View style={styles.gridBody}>
              {/* Colonne latérale gauche : Marqueurs 07:00 à 22:00 */}
              <View style={[styles.timeGutter, { width: TIME_COL_WIDTH }]}>
                {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                  const hour = START_HOUR + i;
                  const isHighlight = hour === 9 || hour === 14 || hour === 17;
                  return (
                    <View key={hour} style={[styles.timeCell, { height: HOUR_HEIGHT }]}>
                      <Text
                        style={[
                          styles.timeLabel,
                          isHighlight && { color: palette.primary.default, fontWeight: '700' },
                        ]}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Zone des colonnes de jours avec les lignes horizontales de fond */}
              <View style={[styles.daysContainer, { width: displayedDays.length * DAY_COL_WIDTH }]}>
                {/* Lignes de repère horizontales (une par tranche horaire) */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.hourHorizontalLine,
                        { height: HOUR_HEIGHT },
                        (i === 2 || i === 3) && { backgroundColor: isDark ? 'rgba(208,188,255,0.03)' : 'rgba(107,70,193,0.02)' },
                      ]}
                    />
                  ))}
                </View>

                {/* Colonnes par jour */}
                <View style={styles.columnsRow}>
                  {displayedDays.map(d => {
                    const dayBlocks = blocks.filter(b => b.dayOfWeek === d.num);
                    const backgroundBlocks = dayBlocks.filter(
                      b => b.scheduleId !== 'event' && b.scheduleId !== 'reminder' && b.scheduleId !== 'task'
                    );
                    const foregroundBlocks = dayBlocks.filter(
                      b => b.scheduleId === 'event' || b.scheduleId === 'task'
                    );
                    const reminderBlocks = dayBlocks.filter(
                      b => b.scheduleId === 'reminder'
                    );
                    const positionedForeground = layoutForegroundBlocks(foregroundBlocks, DAY_COL_WIDTH);

                    return (
                      <View
                        key={d.num}
                        style={[
                          styles.dayColumn,
                          { width: DAY_COL_WIDTH, height: TOTAL_HOURS * HOUR_HEIGHT },
                        ]}
                      >
                        {/* Clic rapide sur la colonne pour ajouter un bloc */}
                        <TouchableOpacity
                          style={StyleSheet.absoluteFill}
                          activeOpacity={0.9}
                          onPress={() => onAddBlock(d.num, '09:00')}
                          accessibilityLabel={`Ajouter un bloc pour ${d.full}`}
                        />

                        {/* 1. LAYER 0 : Blocs de vie récurrents (Fond contextuel en filigrane) */}
                        {backgroundBlocks.map((block, bIdx) => {
                          const startMin = timeToMinutes(block.startTime);
                          const endMin = timeToMinutes(block.endTime);
                          const durationMin = Math.max(15, endMin - startMin);
                          const topPx = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                          const heightPx = (durationMin / 60) * HOUR_HEIGHT;
                          const clampedTop = Math.max(0, topPx);
                          const clampedHeight = Math.max(22, heightPx - 2);
                          const config = getBlockStyleConfig(block.type);

                          return (
                            <TouchableOpacity
                              key={`bg-${block.id}-${d.num}-${bIdx}`}
                              style={[
                                styles.backgroundBlockCard,
                                {
                                  top: clampedTop + 1,
                                  height: clampedHeight,
                                  backgroundColor: isDark ? config.bg : 'rgba(240, 238, 248, 0.45)',
                                  borderColor: config.border + '55',
                                },
                              ]}
                              activeOpacity={0.85}
                              onPress={() => onSelectBlock ? onSelectBlock(block) : onAddBlock(d.num)}
                              onLongPress={() => onDeleteBlock(block.id, block.label)}
                              accessibilityRole="button"
                              accessibilityLabel={`${block.label}, de ${block.startTime} à ${block.endTime}.`}
                            >
                              <View style={styles.backgroundBlockHeader}>
                                <Ionicons name={config.icon as any} size={9} color={config.accent} style={{ opacity: 0.8 }} />
                                <Text style={[styles.backgroundBlockTitle, { color: config.text }]} numberOfLines={1}>
                                  {block.label}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        {/* 2. LAYER 1 : Événements réels avec Column Splitting côte-à-côte */}
                        {positionedForeground.map((item, itemIdx) => {
                          const { block } = item;
                          const config = getBlockStyleConfig(block.type);

                          return (
                            <TouchableOpacity
                              key={`fg-${block.id}-${d.num}-${item.colIndex}-${itemIdx}`}
                              style={[
                                styles.blockCard,
                                {
                                  top: item.topPx + 1,
                                  height: item.heightPx,
                                  left: item.leftPx,
                                  width: item.widthPx,
                                  backgroundColor: isDark ? 'rgba(28, 24, 40, 0.96)' : 'rgba(255, 255, 255, 0.96)',
                                  borderColor: config.border,
                                },
                              ]}
                              activeOpacity={0.85}
                              onPress={() => onSelectBlock ? onSelectBlock(block) : onAddBlock(d.num)}
                              onLongPress={() => onDeleteBlock(block.id, block.label)}
                              accessibilityRole="button"
                              accessibilityLabel={`${block.label}, de ${block.startTime} à ${block.endTime}.`}
                            >
                              <LinearGradient
                                colors={[config.accent + '33', 'transparent']}
                                start={{ x: 1, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.cardCornerGlow}
                                pointerEvents="none"
                              />

                              {isDark && (
                                <View style={styles.topSpecularHighlight} pointerEvents="none" />
                              )}

                              <View style={styles.blockCardHeader}>
                                {item.hasConflict ? (
                                  <View style={styles.conflictDot} />
                                ) : (
                                  <View style={[styles.workPulseDot, { backgroundColor: config.accent }]} />
                                )}
                                <Text
                                  style={[styles.blockTitle, { color: config.text }]}
                                  numberOfLines={item.heightPx > 50 ? 2 : 1}
                                >
                                  {block.label}
                                </Text>
                              </View>

                              {item.heightPx >= 36 && item.totalCols <= 2 && (
                                <View style={[styles.timeBadge, { backgroundColor: config.badgeBg }]}>
                                  <Text style={[styles.timeBadgeText, { color: config.accent }]}>
                                    {block.startTime.replace(':00', 'h')}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}

                        {/* 3. LAYER 2 : Rappels ponctuels (Pastilles compactes sans durée artificielle) */}
                        {reminderBlocks.map((block, rIdx) => {
                          const startMin = timeToMinutes(block.startTime);
                          const topPx = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                          const clampedTop = Math.max(0, topPx);

                          return (
                            <TouchableOpacity
                              key={`rem-${block.id}-${d.num}-${rIdx}`}
                              style={[
                                styles.reminderPillMarker,
                                {
                                  top: clampedTop - 9,
                                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(254, 243, 199, 0.95)',
                                  borderColor: '#F59E0B',
                                },
                              ]}
                              activeOpacity={0.85}
                              onPress={() => onSelectBlock ? onSelectBlock(block) : onAddBlock(d.num)}
                              onLongPress={() => onDeleteBlock(block.id, block.label)}
                              accessibilityRole="button"
                              accessibilityLabel={`Rappel : ${block.label} à ${block.startTime}.`}
                            >
                              <Ionicons name="notifications" size={10} color="#F59E0B" />
                              <Text style={styles.reminderPillText} numberOfLines={1}>
                                {block.startTime} {block.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ─── Synthèse hebdomadaire compacte & sobre ─────────────────────────── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: palette.primary.default }]} />
          <Text style={[styles.summaryText, { color: palette.onSurface.variant }]}>Événements</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.summaryText, { color: palette.onSurface.variant }]}>Rappels</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: palette.tertiary.default }]} />
          <Text style={[styles.summaryText, { color: palette.onSurface.variant }]}>Tâches</Text>
        </View>
        <Text style={[styles.summaryTotalText, { color: palette.primary.default }]}>
          {stats.totalHours > 0 ? `${stats.totalHours}h occupées` : 'Semaine libre'}
        </Text>
      </View>
    </View>
  );
}

// ─── STYLES DU COMPOSANT STITCH ───────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryTotalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topHeader: {
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matrixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CD0FF',
    ...Platform.select({
      ios: {
        shadowColor: '#7CD0FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 5,
      },
      android: { elevation: 3 },
    }),
  },
  matrixBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7CD0FF',
    letterSpacing: 0.8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CAC4D0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  mainTitle: {
    ...Typography.titleLarge,
    fontSize: 22,
    fontWeight: '700',
    color: '#E6E1E7',
    letterSpacing: -0.3,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weekPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CAC4D0',
  },
  subtitle: {
    fontSize: 13,
    color: '#948F9A',
    lineHeight: 18,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 14, 17, 0.8)',
    padding: 3,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: '#D0BCFF',
    ...Platform.select({
      ios: {
        shadowColor: '#D0BCFF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CAC4D0',
  },
  segmentTextActive: {
    color: '#210F48',
    fontWeight: '700',
  },
  gridSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  gridTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E6E1E7',
    letterSpacing: 0.3,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#7CD0FF',
    fontWeight: '500',
  },
  gridCard: {
    borderRadius: Radius.lg,
    backgroundColor: '#1C1B1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  dayHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#2B292D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  cornerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
  },
  dayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayHeaderCellActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
  },
  dayHeaderName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CAC4D0',
    letterSpacing: 0.5,
  },
  dayHeaderDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E6E1E7',
    marginTop: 1,
  },
  allDayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
  },
  allDayGutter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  allDayGutterText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#948F9A',
  },
  allDayCell: {
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDayTaskPill: {
    backgroundColor: 'rgba(14, 116, 144, 0.22)',
    borderWidth: 1,
    borderColor: '#00BCD4',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    width: '92%',
    alignItems: 'center',
  },
  allDayTaskPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#80DEEA',
  },
  gridBody: {
    flexDirection: 'row',
  },
  timeGutter: {
    backgroundColor: '#0F0E11',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  timeCell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#948F9A',
    fontVariant: ['tabular-nums'] as any,
  },
  daysContainer: {
    position: 'relative',
  },
  hourHorizontalLine: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  columnsRow: {
    flexDirection: 'row',
  },
  dayColumn: {
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  backgroundBlockCard: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 3,
    zIndex: 1,
    opacity: 0.70,
  },
  backgroundBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  backgroundBlockTitle: {
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.9,
    flex: 1,
  },
  blockCard: {
    position: 'absolute',
    borderRadius: Radius.sm + 2,
    padding: 3,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    overflow: 'hidden',
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  conflictDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  reminderPillMarker: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
      },
      android: { elevation: 3 },
    }),
  },
  reminderPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#D97706',
    flex: 1,
  },
  cardCornerGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
  },
  topSpecularHighlight: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  blockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  workPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D0BCFF',
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
    lineHeight: 12,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  timeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  legendCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: '#1C1B1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E6E1E7',
    letterSpacing: 0.5,
  },
  legendHeaderSub: {
    fontSize: 11,
    color: '#948F9A',
    fontWeight: '600',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendPill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#211F23',
    padding: 8,
    borderRadius: Radius.md,
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendPillTextCol: {
    flex: 1,
  },
  legendPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E6E1E7',
  },
  legendPillMeta: {
    fontSize: 9,
    color: '#948F9A',
    marginTop: 1,
  },
  aiInsightCard: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: '#211F23',
    borderWidth: 1,
    borderColor: 'rgba(123, 208, 255, 0.2)',
    padding: Spacing.md,
    gap: 6,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#D0BCFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D0BCFF',
  },
  aiStatusBadge: {
    backgroundColor: 'rgba(15, 14, 17, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  aiStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7CD0FF',
  },
  aiDescription: {
    fontSize: 12,
    color: '#CAC4D0',
    lineHeight: 16,
  },
  actionsSection: {
    marginTop: Spacing.md,
  },
  heroGlowBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#D0BCFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  heroGlowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  heroGlowText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

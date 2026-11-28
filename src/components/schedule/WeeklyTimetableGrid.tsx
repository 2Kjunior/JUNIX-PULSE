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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type LayoutChangeEvent,
  type RefreshControlProps,
} from 'react-native';
// The ScrollView of the gestures: a scroll cancels the tap of a card under the finger (sheet 031)
import { GestureDetector, ScrollView, usePinchGesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday } from 'date-fns';
import { useDateLocale, useT } from '@/i18n';

import { PlanningBlock, PlanningBlockType } from '@/domain/entities';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Spacing, Radius } from '@/constants/theme';
import { DraggableBlock } from '@/components/planning/DraggableBlock';
import { PlanningCard } from '@/components/planning/PlanningCard';
import { eventAccent, planningLook, taskAccent, type PlanningLook } from '@/constants/planning-look';
import { columnsForOffset, MIN_CARD_HEIGHT, minutesForOffset, SNAP_MINUTES } from '@/domain/rules/planning-move-rules';
import { withAlpha } from '@/utils/color';
import {
  DEFAULT_WEEK_ZOOM,
  FIT_WEEK_ZOOM,
  WEEK_ZOOM_LEVELS,
  clampZoom,
  scrollTargetFor,
  weekBandItems,
  weekSizes,
  zoomAfterPinch,
} from '@/domain/rules/week-view-rules';

// The gestures' ScrollView, driven on the UI thread: the days and the hours follow it (sheet 047)
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export interface WeeklyTimetableGridProps {
  blocks: PlanningBlock[];
  onAddBlock: (dayNum: number, defaultTime?: string) => void;
  onDeleteBlock: (id: string, label: string) => void;
  onSelectBlock?: (block: PlanningBlock) => void;
  weekDays?: Date[];
  tasksCountByDay?: Record<number, number>;
  onPressTasksDay?: (dayNum: number) => void;
  /** A moment or a reminder let go elsewhere (sheet 026): minutes and days; the others do not move. */
  onMoveBlock?: (block: PlanningBlock, minutes: number, days: number) => void;
  /** A card is lifted: the page stops scrolling meanwhile. */
  onLift?: (lifted: boolean) => void;
  /** The step of a move, in minutes (Planning settings, sheet 028). */
  step?: number;
  /** The look of each moment and reminder, by id: the GlowCard and the colours of the Day view (sheet 028). */
  looks?: Readonly<Record<string, PlanningLook>>;
  /** Pull to refresh, on the grid's own vertical scroll (sheet 047: the page no longer scrolls). */
  refreshControl?: ReactElement<RefreshControlProps>;
}

const DEFAULT_START_HOUR = 7;   // 07:00 par défaut
const DEFAULT_END_HOUR = 22;    // 22:00 par défaut
// 88 points an hour (sheet 028): a card of 30 minutes is as tall as a finger, as a GlowCard needs
const HOUR_HEIGHT = 88;
const TIME_COL_WIDTH = 54;
/** Under this width (three cards in a day) a card keeps its icon and its title only. */
const TINY_CARD_WIDTH = 72;
// The width of a day comes from the zoom (sheet 047): see WEEK_ZOOM_LEVELS

const DAYS_DEFINITION = [
  { num: 1, label: 'LUN', full: 'Lundi', dateNum: '01' },
  { num: 2, label: 'MAR', full: 'Mardi', dateNum: '02' },
  { num: 3, label: 'MER', full: 'Mercredi', dateNum: '03' },
  { num: 4, label: 'JEU', full: 'Jeudi', dateNum: '04' },
  { num: 5, label: 'VEN', full: 'Vendredi', dateNum: '05' },
  { num: 6, label: 'SAM', full: 'Samedi', dateNum: '06' },
  { num: 0, label: 'DIM', full: 'Dimanche', dateNum: '07' },
];

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
  columnWidth: number,
  startHour: number = DEFAULT_START_HOUR,
  hourHeight: number = HOUR_HEIGHT
): PositionedForegroundBlock[] {
  if (blocks.length === 0) return [];

  const items = blocks
    .map(block => {
      const startMin = timeToMinutes(block.startTime);
      const endMin = timeToMinutes(block.endTime);
      // At least 30 minutes on the screen (a finger), as in the Day view (sheet 028)
      const durationMin = Math.max(30, endMin - startMin);
      return {
        block,
        startMin,
        endMin: startMin + Math.max(30, endMin - startMin),
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

      const topPx = ((a.item.startMin - startHour * 60) / 60) * hourHeight;
      const heightPx = (a.item.durationMin / 60) * hourHeight;
      const clampedTop = Math.max(0, topPx);
      const clampedHeight = Math.max(MIN_CARD_HEIGHT, heightPx - 2);

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
  onMoveBlock,
  onLift,
  step = SNAP_MINUTES,
  looks,
  refreshControl,
}: WeeklyTimetableGridProps) {
  const { palette, isDark } = useTheme();
  const styles = useThemedStyles(makeTimetableStyles);
  const t = useT();
  const dateLocale = useDateLocale();
  // While a card is lifted (sheet 026), the grid does not scroll sideways
  const [lifted, setLifted] = useState(false);
  const lift = (value: boolean) => {
    setLifted(value);
    onLift?.(value);
  };

  // Détection s'il y a des tâches réparties sur la semaine
  const hasAnyTasks = useMemo(() => {
    return tasksCountByDay && Object.values(tasksCountByDay).some(c => c > 0);
  }, [tasksCountByDay]);

  // Calcul dynamique de la plage horaire pour la semaine (Smart Range)
  // S'étend automatiquement si une action a lieu tôt le matin (ex: 01h NBA) ou tard le soir
  const { startHour, totalHours } = useMemo(() => {
    let minH = DEFAULT_START_HOUR;
    let maxH = DEFAULT_END_HOUR;

    blocks.forEach(b => {
      const sMin = timeToMinutes(b.startTime);
      const eMin = timeToMinutes(b.endTime);
      const sH = Math.floor(sMin / 60);
      const eH = Math.min(24, Math.ceil(eMin / 60));
      if (sH < minH) minH = Math.max(0, sH);
      if (eH > maxH) maxH = Math.min(24, eH);
    });
    // This week: the current hour is in the grid, so « Maintenant » shows it (sheet 047)
    if (weekDays?.some(day => isToday(day))) {
      const hour = new Date().getHours();
      if (hour < minH) minH = hour;
      if (hour + 1 > maxH) maxH = Math.min(24, hour + 1);
    }

    return {
      startHour: minH,
      endHour: maxH,
      totalHours: Math.max(1, maxH - minH),
    };
  }, [blocks, weekDays]);

  // Définition dynamique des 7 jours de la semaine
  const displayedDays = useMemo(() => {
    if (weekDays && weekDays.length === 7) {
      return weekDays.map(d => {
        const num = d.getDay();
        const label = format(d, 'EEE', { locale: dateLocale }).toUpperCase();
        const full = format(d, 'EEEE', { locale: dateLocale });
        const dateNum = format(d, 'dd');
        const isCurrentDay = isToday(d);
        return { num, label, full, dateNum, isCurrentDay };
      });
    }
    // 2024-01-01 is a Monday: a fixed reference week gives the localized day names
    return DAYS_DEFINITION.map(d => {
      const ref = new Date(2024, 0, d.num === 0 ? 7 : d.num);
      return {
        ...d,
        label: format(ref, 'EEE', { locale: dateLocale }).toUpperCase(),
        full: format(ref, 'EEEE', { locale: dateLocale }),
        isCurrentDay: false,
      };
    });
  }, [weekDays, dateLocale]);

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
          bg: isDark ? withAlpha(palette.primary.default, 0.20) : withAlpha(palette.primary.default, 0.15),
          border: palette.primary.default, // #D0BCFF ou #6B46C1
          text: palette.primary.onContainer,
          accent: palette.primary.default,
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'briefcase',
          isWork: true,
          isDashed: false,
        };
      case 'STUDY':
        return {
          bg: withAlpha(palette.tertiary.default, isDark ? 0.18 : 0.12),
          border: palette.tertiary.default, // #7BD0FF ou #0E7490
          text: palette.tertiary.onContainer,
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

  // ─── The frame (sheet 047): the days' row and the hours' column stay in view ─────────────
  const [zoom, setZoom] = useState(DEFAULT_WEEK_ZOOM);
  // The visible part of the days' area, measured
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const { dayWidth, hourHeight } = weekSizes(zoom, frame.width, displayedDays.length);
  const daysWidth = displayedDays.length * dayWidth;
  const gridHeight = totalHours * hourHeight;
  const todayIndex = displayedDays.findIndex(d => d.isCurrentDay);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const scrollX = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const xRef = useAnimatedRef<Animated.ScrollView>();
  const yRef = useAnimatedRef<Animated.ScrollView>();
  const onScrollX = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });
  const onScrollY = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });
  const daysRowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -scrollX.value }] }));
  const hoursColumnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollY.value }] }));

  const scrollToPoint = useCallback(
    (x: number, y: number, animated = true) => {
      runOnUI(() => {
        'worklet';
        scrollTo(xRef, x, 0, animated);
        scrollTo(yRef, 0, y, animated);
      })();
    },
    [xRef, yRef]
  );

  /** A day and a time brought into view. */
  const goTo = useCallback(
    (dayIndex: number, minutes: number, animated = true) => {
      if (frame.width === 0) return;
      const target = scrollTargetFor({
        dayIndex,
        minutes,
        startHour,
        dayWidth,
        hourHeight,
        dayCount: displayedDays.length,
        totalHours,
        viewport: frame,
      });
      scrollToPoint(target.x, target.y, animated);
    },
    [frame, startHour, dayWidth, hourHeight, displayedDays.length, totalHours, scrollToPoint]
  );

  // The week opens on now (today, at this hour), once the frame is measured
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current || frame.width === 0) return;
    openedRef.current = true;
    if (todayIndex >= 0) goTo(todayIndex, nowMinutes, false);
    // Only when first measured: later, the person moves freely
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.width]);

  // A zoom keeps the middle of what was in view
  const zoomCentreRef = useRef<{ fx: number; fy: number } | null>(null);
  const applyZoom = useCallback(
    (next: number) => {
      const level = clampZoom(next);
      if (level === zoom || frame.width === 0) return;
      zoomCentreRef.current = {
        fx: (scrollX.value + frame.width / 2) / Math.max(1, daysWidth),
        fy: (scrollY.value + frame.height / 2) / Math.max(1, gridHeight),
      };
      setZoom(level);
    },
    [zoom, frame, daysWidth, gridHeight, scrollX, scrollY]
  );
  useEffect(() => {
    const centre = zoomCentreRef.current;
    if (!centre) return;
    zoomCentreRef.current = null;
    const x = Math.max(0, Math.min(daysWidth - frame.width, centre.fx * daysWidth - frame.width / 2));
    const y = Math.max(0, Math.min(gridHeight - frame.height, centre.fy * gridHeight - frame.height / 2));
    scrollToPoint(x, y, false);
  }, [zoom, daysWidth, gridHeight, frame, scrollToPoint]);

  // Two fingers: spread to zoom in, pinch to zoom out
  const pinchScale = useSharedValue(1);
  const pinchEnded = useCallback((scale: number) => applyZoom(zoomAfterPinch(zoom, scale)), [applyZoom, zoom]);
  const pinch = usePinchGesture({
    onUpdate: event => {
      'worklet';
      pinchScale.value = event.scale;
    },
    onDeactivate: () => {
      'worklet';
      runOnJS(pinchEnded)(pinchScale.value);
      pinchScale.value = 1;
    },
  });

  // The « Cette semaine » band: what is coming, a touch away
  const bandItems = useMemo(
    () =>
      weekBandItems(
        blocks
          .filter(b => b.scheduleId === 'event' || b.scheduleId === 'reminder')
          .map(b => ({
            id: b.id,
            label: b.label,
            dayIndex: displayedDays.findIndex(d => d.num === b.dayOfWeek),
            minutes: timeToMinutes(b.startTime),
            startTime: b.startTime,
          }))
          .filter(item => item.dayIndex >= 0),
        { todayIndex: todayIndex >= 0 ? todayIndex : null, nowMinutes }
      ),
    // nowMinutes moves each minute; the band is made again with the blocks
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blocks, displayedDays, todayIndex]
  );
  // The card reached from the band shines a moment
  const [flashId, setFlashId] = useState<string | null>(null);
  useEffect(() => {
    if (!flashId) return;
    const timer = setTimeout(() => setFlashId(null), 1400);
    return () => clearTimeout(timer);
  }, [flashId]);

  const onFrameLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame(current => (Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1 ? current : { width, height }));
  };

  return (
    <View style={styles.wrapper}>
      {/* ─── Zoom, « Semaine entière » and « Maintenant » (sheet 047) ─────────────────── */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => applyZoom(zoom - 1)}
          disabled={zoom === 0}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('weekGrid.zoomOut')}
          testID="week-zoom-out"
        >
          <Ionicons name="remove" size={18} color={zoom === 0 ? palette.onSurface.disabled : palette.onSurface.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => applyZoom(zoom + 1)}
          disabled={zoom === WEEK_ZOOM_LEVELS.length - 1}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('weekGrid.zoomIn')}
          testID="week-zoom-in"
        >
          <Ionicons name="add" size={18} color={zoom === WEEK_ZOOM_LEVELS.length - 1 ? palette.onSurface.disabled : palette.onSurface.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolPill, zoom === FIT_WEEK_ZOOM && styles.toolPillActive]}
          onPress={() => applyZoom(FIT_WEEK_ZOOM)}
          accessibilityRole="button"
          accessibilityState={{ selected: zoom === FIT_WEEK_ZOOM }}
          testID="week-fit"
        >
          <Text style={[styles.toolPillText, zoom === FIT_WEEK_ZOOM && styles.toolPillTextActive]}>{t('weekGrid.fitWeek')}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {todayIndex >= 0 ? (
          <TouchableOpacity
            style={styles.toolPill}
            onPress={() => goTo(todayIndex, nowMinutes)}
            accessibilityRole="button"
            testID="week-now"
          >
            <View style={[styles.nowDot, { backgroundColor: palette.error.default }]} />
            <Text style={styles.toolPillText}>{t('weekGrid.now')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ─── « Cette semaine »: a touch goes to the card (sheet 047) ─────────────────── */}
      {bandItems.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.band} accessibilityLabel={t('weekGrid.thisWeek')}>
          {bandItems.map(item => {
            const color = (looks?.[item.id] ?? planningLook(palette, 'event')).color;
            const day = displayedDays[item.dayIndex];
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.bandChip}
                onPress={() => {
                  goTo(item.dayIndex, item.minutes);
                  setFlashId(item.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('weekGrid.jumpA11y', { label: item.label, day: day.full, time: item.startTime })}
              >
                <View style={styles.bandChipTop}>
                  <View style={[styles.bandDot, { backgroundColor: color }]} />
                  <Text style={styles.bandWhen}>{`${day.label} ${item.startTime}`}</Text>
                </View>
                <Text style={styles.bandLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* ─── The grid: a fixed corner, the days that follow sideways, the hours that follow down ─── */}
      <View style={styles.gridCard}>
        <View style={styles.headRow}>
          <View style={[styles.cornerCell, { width: TIME_COL_WIDTH }]}>
            <Ionicons name="time-outline" size={16} color={palette.onSurface.variant} />
          </View>
          <View style={styles.headClip}>
            <Animated.View style={[{ width: daysWidth }, daysRowStyle]}>
              <View style={styles.dayHeaderRow}>
                {displayedDays.map((d, index) => (
                  <TouchableOpacity
                    key={d.num}
                    style={[styles.dayHeaderCell, { width: dayWidth }, d.isCurrentDay && styles.dayHeaderCellActive]}
                    // A day touched: it comes into view, zoomed in if the whole week was shown
                    onPress={() => {
                      if (zoom === FIT_WEEK_ZOOM) applyZoom(DEFAULT_WEEK_ZOOM);
                      goTo(index, d.isCurrentDay ? nowMinutes : startHour * 60 + 60);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={d.full}
                  >
                    <Text style={[styles.dayHeaderName, d.isCurrentDay && { color: palette.primary.default, fontWeight: '800' }]} numberOfLines={1}>
                      {dayWidth < 48 ? d.label.slice(0, 1) : d.label}
                    </Text>
                    <Text style={[styles.dayHeaderDate, d.isCurrentDay && { color: palette.primary.default, fontWeight: '800' }]}>
                      {d.dateNum}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* The tasks of each day, under its name */}
              {hasAnyTasks && (
                <View style={styles.allDayRow}>
                  {displayedDays.map(d => {
                    const count = tasksCountByDay?.[d.num] ?? 0;
                    return (
                      <View key={d.num} style={[styles.allDayCell, { width: dayWidth }]}>
                        {count > 0 ? (
                          <TouchableOpacity
                            style={styles.allDayTaskPill}
                            onPress={() => onPressTasksDay ? onPressTasksDay(d.num) : onAddBlock(d.num)}
                            activeOpacity={0.75}
                            accessibilityLabel={t('weekGrid.tasksA11y', { count })}
                          >
                            <Text style={styles.allDayTaskPillText} numberOfLines={1}>
                              {dayWidth < 64 ? String(count) : t(count > 1 ? 'weekGrid.taskMany' : 'weekGrid.taskOne', { count })}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          </View>
        </View>

        <View style={styles.bodyRow}>
          {/* The hours, following the vertical scroll */}
          <View style={[styles.timeGutter, styles.gutterClip, { width: TIME_COL_WIDTH }]}>
            <Animated.View style={hoursColumnStyle}>
              {Array.from({ length: totalHours }, (_, i) => {
                const hour = startHour + i;
                const isHighlight = hour === 9 || hour === 14 || hour === 17;
                return (
                  <View key={hour} style={[styles.timeCell, { height: hourHeight }]}>
                    <Text style={[styles.timeLabel, isHighlight && { color: palette.primary.default, fontWeight: '700' }]}>
                      {String(hour).padStart(2, '0')}:00
                    </Text>
                  </View>
                );
              })}
            </Animated.View>
          </View>

          <GestureDetector gesture={pinch}>
            <View style={styles.daysViewport} onLayout={onFrameLayout} collapsable={false}>
              <AnimatedScrollView
                ref={yRef}
                onScroll={onScrollY}
                scrollEventThrottle={16}
                scrollEnabled={!lifted}
                showsVerticalScrollIndicator={false}
                refreshControl={refreshControl}
                nestedScrollEnabled
              >
                <AnimatedScrollView
                  ref={xRef}
                  horizontal
                  onScroll={onScrollX}
                  scrollEventThrottle={16}
                  scrollEnabled={!lifted}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <View style={[styles.daysContainer, { width: daysWidth, height: gridHeight }]}>
                    {/* The hour lines */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      {Array.from({ length: totalHours }, (_, i) => (
                        <View key={i} style={[styles.hourHorizontalLine, { height: hourHeight }]} />
                      ))}
                    </View>

                    <View style={styles.columnsRow}>
                      {displayedDays.map(d => {
                        const dayBlocks = blocks.filter(b => b.dayOfWeek === d.num);
                        const backgroundBlocks = dayBlocks.filter(
                          b => b.scheduleId !== 'event' && b.scheduleId !== 'reminder' && b.scheduleId !== 'task'
                        );
                        // Moments and reminders together, side by side when they meet (sheet 028)
                        const foregroundBlocks = dayBlocks.filter(
                          b => b.scheduleId === 'event' || b.scheduleId === 'task' || b.scheduleId === 'reminder'
                        );
                        const positionedForeground = layoutForegroundBlocks(foregroundBlocks, dayWidth, startHour, hourHeight);

                        return (
                          <View key={d.num} style={[styles.dayColumn, { width: dayWidth, height: gridHeight }]}>
                            {/* A touch on the column adds something */}
                            <TouchableOpacity
                              style={StyleSheet.absoluteFill}
                              activeOpacity={0.9}
                              onPress={() => onAddBlock(d.num, '09:00')}
                              accessibilityLabel={t('weekGrid.addBlock', { day: d.full })}
                            />

                            {/* The life blocks behind (sheet 028) */}
                            {backgroundBlocks.map((block, bIdx) => {
                              const startMin = timeToMinutes(block.startTime);
                              const endMin = timeToMinutes(block.endTime);
                              const durationMin = Math.max(15, endMin - startMin);
                              const topPx = ((startMin - startHour * 60) / 60) * hourHeight;
                              const heightPx = (durationMin / 60) * hourHeight;
                              const config = getBlockStyleConfig(block.type);
                              return (
                                <TouchableOpacity
                                  key={`bg-${block.id}-${d.num}-${bIdx}`}
                                  style={[
                                    styles.backgroundBlockCard,
                                    {
                                      top: Math.max(0, topPx) + 1,
                                      height: Math.max(22, heightPx - 2),
                                      backgroundColor: config.bg,
                                      borderColor: config.border + '55',
                                    },
                                  ]}
                                  activeOpacity={0.85}
                                  onPress={() => onSelectBlock ? onSelectBlock(block) : onAddBlock(d.num)}
                                  onLongPress={() => onDeleteBlock(block.id, block.label)}
                                  accessibilityRole="button"
                                  accessibilityLabel={t('weekGrid.blockA11y', { label: block.label, start: block.startTime, end: block.endTime })}
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

                            {/* Moments and reminders as GlowCards, side by side (sheet 028) */}
                            {positionedForeground.map((item, itemIdx) => {
                              const { block } = item;
                              const isReminder = block.scheduleId === 'reminder';
                              const look = looks?.[block.id] ?? planningLook(palette, isReminder ? 'reminder' : 'event');
                              return (
                                <DraggableBlock
                                  key={`fg-${block.id}-${d.num}-${item.colIndex}-${itemIdx}`}
                                  style={[
                                    styles.blockBox,
                                    { top: item.topPx + 1, height: item.heightPx, left: item.leftPx, width: item.widthPx },
                                    // Reached from the band: it shines a moment
                                    flashId === block.id && { borderWidth: 2, borderColor: palette.onSurface.primary, borderRadius: Radius.md },
                                  ]}
                                  onPress={() => onSelectBlock ? onSelectBlock(block) : onAddBlock(d.num)}
                                  movable={!!onMoveBlock && (block.scheduleId === 'event' || isReminder)}
                                  stepY={(hourHeight * step) / 60}
                                  stepX={dayWidth}
                                  onLift={lift}
                                  onDrop={drop => onMoveBlock?.(block, minutesForOffset(drop.dy, hourHeight, step), columnsForOffset(drop.dx, dayWidth))}
                                  onMoveBy={(minutes, days) => onMoveBlock?.(block, Math.sign(minutes) * step, days)}
                                  accessibilityLabel={
                                    isReminder
                                      ? t('weekGrid.reminderA11y', { label: block.label, time: block.startTime })
                                      : t('weekGrid.blockA11y', { label: block.label, start: block.startTime, end: block.endTime })
                                  }
                                >
                                  <PlanningCard
                                    look={look}
                                    title={block.label}
                                    time={isReminder && !block.fillsTime ? block.startTime : `${block.startTime} – ${block.endTime}`}
                                    height={item.heightPx}
                                    narrow
                                    tiny={item.widthPx < TINY_CARD_WIDTH}
                                    index={itemIdx}
                                  />
                                </DraggableBlock>
                              );
                            })}

                            {/* Now: a red line across today */}
                            {d.isCurrentDay && nowMinutes >= startHour * 60 && nowMinutes <= (startHour + totalHours) * 60 ? (
                              <View
                                pointerEvents="none"
                                style={[styles.nowLine, { top: ((nowMinutes - startHour * 60) / 60) * hourHeight, backgroundColor: palette.error.default }]}
                              />
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </AnimatedScrollView>
              </AnimatedScrollView>
            </View>
          </GestureDetector>
        </View>
      </View>

      {/* ─── Synthèse hebdomadaire compacte & sobre ─────────────────────────── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: eventAccent(palette) }]} />
          <Text style={[styles.summaryText, { color: palette.onSurface.variant }]}>{t('search.filter.events')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: palette.primary.default }]} />
          <Text style={[styles.summaryText, { color: palette.onSurface.variant }]}>{t('tab.reminders')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: taskAccent(palette) }]} />
          <Text style={[styles.summaryText, { color: palette.onSurface.variant }]}>{t('tab.tasks')}</Text>
        </View>
        <Text style={[styles.summaryTotalText, { color: palette.primary.default }]}>
          {stats.totalHours > 0 ? t('weekGrid.busyHours', { hours: stats.totalHours }) : t('weekGrid.freeWeek')}
        </Text>
      </View>
    </View>
  );
}

// ─── STYLES DU COMPOSANT STITCH ───────────────────────────────────────────────

const makeTimetableStyles = (theme: ThemePalette) => {
  const isDark = theme.mode === 'dark';
  const line = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(76, 52, 120, 0.12)';
  const faintLine = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(76, 52, 120, 0.07)';

  return StyleSheet.create({
    // The view fills the page (sheet 047): the grid scrolls inside its frame, not the page
    wrapper: {
      flex: 1,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    toolButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    toolPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: Spacing.sm,
      borderRadius: 18,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    toolPillActive: {
      backgroundColor: theme.glass.controlActive,
      borderColor: theme.primary.default,
    },
    toolPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.onSurface.primary,
    },
    toolPillTextActive: {
      color: theme.primary.default,
    },
    nowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    band: {
      gap: Spacing.xs,
      paddingBottom: Spacing.xs,
    },
    bandChip: {
      maxWidth: 150,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.md,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    bandChipTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    bandDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    bandWhen: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.onSurface.variant,
    },
    bandLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.onSurface.primary,
    },
    headRow: {
      flexDirection: 'row',
      backgroundColor: theme.glass.nav.backgroundColor,
      borderBottomWidth: 1,
      borderBottomColor: line,
      zIndex: 2,
    },
    headClip: {
      flex: 1,
      overflow: 'hidden',
    },
    bodyRow: {
      flex: 1,
      flexDirection: 'row',
    },
    gutterClip: {
      overflow: 'hidden',
      zIndex: 2,
    },
    daysViewport: {
      flex: 1,
    },
    nowLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      zIndex: 4,
    },
    blockBox: {
      position: 'absolute',
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
    gridCard: {
      flex: 1,
      borderRadius: Radius.lg,
      backgroundColor: theme.glass.card.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.card.borderColor,
      overflow: 'hidden',
    },
    dayHeaderRow: {
      flexDirection: 'row',
    },
    cornerCell: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: line,
      paddingVertical: 8,
    },
    dayHeaderCell: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 7,
      borderRightWidth: 1,
      borderRightColor: line,
    },
    dayHeaderCellActive: {
      backgroundColor: theme.glass.controlActive,
    },
    dayHeaderName: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.onSurface.variant,
      letterSpacing: 0.5,
    },
    dayHeaderDate: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.onSurface.primary,
      marginTop: 1,
    },
    allDayRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: line,
      paddingVertical: 4,
      backgroundColor: theme.glass.control.backgroundColor,
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
      color: theme.onSurface.variant,
    },
    allDayCell: {
      paddingHorizontal: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    allDayTaskPill: {
      backgroundColor: theme.tertiary.default + '29',
      borderWidth: 1,
      borderColor: theme.tertiary.default,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 2,
      width: '92%',
      alignItems: 'center',
    },
    allDayTaskPillText: {
      fontSize: 8.5,
      fontWeight: '700',
      color: isDark ? theme.tertiary.default : theme.tertiary.onContainer,
    },
    gridBody: {
      flexDirection: 'row',
    },
    timeGutter: {
      backgroundColor: theme.glass.nav.backgroundColor,
      borderRightWidth: 1,
      borderRightColor: line,
    },
    timeCell: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 4,
      borderBottomWidth: 1,
      borderBottomColor: faintLine,
    },
    timeLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.onSurface.variant,
      fontVariant: ['tabular-nums'],
    },
    daysContainer: {
      position: 'relative',
    },
    hourHorizontalLine: {
      borderBottomWidth: 1,
      borderBottomColor: faintLine,
    },
    columnsRow: {
      flexDirection: 'row',
    },
    dayColumn: {
      position: 'relative',
      borderRightWidth: 1,
      borderRightColor: line,
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
      opacity: 0.7,
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
    },
    reminderPillText: {
      fontSize: 8.5,
      fontWeight: '700',
      color: isDark ? '#FBBF24' : '#B45309',
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
      fontVariant: ['tabular-nums'],
    },
  });
};

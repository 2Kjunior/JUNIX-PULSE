/**
 * A thing of the Planning drawn as a GlowCard (sheet 027), with the look of the earlier Day view:
 * the badge of its kind (type of moment, RAPPEL, TÂCHE) in its colour, its time, its title, then
 * its place or note, and "Options · Plus tard" on a reminder when there is room.
 * In the Day view its height follows its length: under 60 points it is a single line (time and
 * title), then the badge comes, then the details. In a list (Month view) it takes its own height.
 * The card only draws: touching, the long press and the move belong to DraggableBlock around it.
 */
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlowCard } from '@/components/ui/GlowCard';
import type { PlanningLook } from '@/constants/planning-look';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

/** Below this height the card is one line; from the second, it shows its details. */
export const ONE_LINE_HEIGHT = 60;
export const DETAILS_HEIGHT = 104;

export interface PlanningCardProps {
  look: PlanningLook;
  title: string;
  time: string;
  place?: string | null;
  note?: string | null;
  /** Its height in the Day view; undefined in a list. */
  height?: number;
  /** A task done is shown lighter, with its tick. */
  done?: boolean;
  /** "Options · Plus tard" on a reminder: a touch on the card opens them, as on the earlier Day view. */
  showOptions?: boolean;
  /** Its place in the list, for the arrival of the cards one after the other. */
  index?: number;
  /**
   * A narrow card (three side by side on a phone): the badge keeps its icon only, the title takes
   * two lines and the time goes under it; a one-line card shows its icon and title (its place on
   * the grid already says the time).
   */
  narrow?: boolean;
}

export const PlanningCard = memo(function PlanningCard({
  look,
  title,
  time,
  place,
  note,
  height,
  done = false,
  showOptions = false,
  index,
  narrow = false,
}: PlanningCardProps) {
  const t = useT();
  const { theme } = useTheme();
  const styles = useThemedStyles(makePlanningCardStyles);
  const sized = height !== undefined;
  const oneLine = sized && height < ONE_LINE_HEIGHT;
  const details = !sized || height >= DETAILS_HEIGHT;
  const badge = (
    <View style={[styles.badge, { backgroundColor: look.color + (theme.mode === 'light' ? '1F' : '26') }]}>
      <Ionicons name={look.icon} size={11} color={look.color} />
      {!narrow && (
        <Text style={[styles.badgeText, { color: look.color }]} numberOfLines={1}>
          {t(look.labelKey).toUpperCase()}
        </Text>
      )}
    </View>
  );

  return (
    <GlowCard
      tone={look.tone}
      intensity={done ? 'soft' : 'default'}
      index={index}
      fill={sized}
      style={sized ? styles.fill : undefined}
      contentStyle={oneLine ? styles.oneLine : sized ? styles.sized : undefined}
    >
      {oneLine ? (
        <View style={styles.row}>
          <Ionicons name={done ? 'checkmark-circle' : look.icon} size={13} color={look.color} />
          {!narrow && <Text style={[styles.time, { color: look.color }]}>{time}</Text>}
          <Text style={[styles.title, done && styles.done]} numberOfLines={1}>{title}</Text>
        </View>
      ) : (
        <>
          <View style={styles.head}>
            {badge}
            {!narrow && <Text style={styles.headTime} numberOfLines={1}>{time}</Text>}
          </View>
          <Text style={[styles.title, done && styles.done]} numberOfLines={narrow || !sized || height >= DETAILS_HEIGHT ? 2 : 1}>
            {title}
          </Text>
          {narrow && <Text style={styles.headTime} numberOfLines={1}>{time}</Text>}
          {details && !!place && (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={13} color={theme.onSurface.variant} />
              <Text style={styles.metaText} numberOfLines={1}>{place}</Text>
            </View>
          )}
          {details && !place && !!note && <Text style={styles.metaText} numberOfLines={1}>{note}</Text>}
          {details && showOptions && (
            <View style={styles.footer} importantForAccessibility="no-hide-descendants">
              <View style={[styles.options, { backgroundColor: look.color + '1A' }]}>
                <Ionicons name="timer-outline" size={12} color={look.color} />
                <Text style={[styles.optionsText, { color: look.color }]}>{t('planning.options')}</Text>
              </View>
            </View>
          )}
        </>
      )}
    </GlowCard>
  );
});

function makePlanningCardStyles(theme: ThemePalette) {
  return StyleSheet.create({
    fill: { flex: 1 },
    sized: { paddingHorizontal: 10, paddingVertical: 7, flex: 1 },
    oneLine: { paddingHorizontal: 10, paddingVertical: 0, flex: 1, justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 1 },
    badgeText: { ...Typography.labelSmall, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    headTime: { ...Typography.labelSmall, fontSize: 10, color: theme.onSurface.variant, fontVariant: ['tabular-nums'] },
    time: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
    title: { ...Typography.titleMedium, fontSize: 14, color: theme.onSurface.primary, fontWeight: '700', flexShrink: 1 },
    done: { textDecorationLine: 'line-through', color: theme.onSurface.variant },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    metaText: { ...Typography.bodySmall, fontSize: 11, color: theme.onSurface.variant, flexShrink: 1 },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 4 },
    options: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, minHeight: 24 },
    optionsText: { ...Typography.labelSmall, fontSize: 10, fontWeight: '600' },
  });
}

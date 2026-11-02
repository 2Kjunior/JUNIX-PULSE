/**
 * Liste des rappels — Référence R-04 du Master Prompt Junix Pulse.
 * Groupement temporel : En retard → Ce soir → Demain → À venir.
 * Filtres de période (Tous / Ce soir / Demain / En retard).
 * Actions rapides : complétion inline, quick-snooze (+2h), suppression avec Undo (30s).
 * Bouton flottant CTA dégradé : + Nouveau rappel.
 *
 * Swipe gauche : Supprimer (rouge) + +2h (tertiaire).
 * Swipe droit  : Compléter (vert).
 *
 * Règle A.1 : Zéro emoji dans tout le composant.
 * Règle A.2 : Cartes rayon 16px (Radius.lg), 1 seul dégradé (CTA flottant), palette theme.ts.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, isPast, addHours } from 'date-fns';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { deleteReminder, completeReminder, snoozeReminder } from '@/use-cases/reminder-use-cases';
import { Reminder } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { TAB_BAR_TOTAL_HEIGHT } from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { GlowCard } from '@/components/ui/GlowCard';
import { makeRemindersStyles } from '@/styles/reminders/reminders-styles';
import { SwipeableItem, type SwipeAction } from '@/components/ui/SwipeableItem';
import { MessageKey, useT } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';
type FilterTab = 'ALL' | 'TONIGHT' | 'TOMORROW' | 'MISSED';

interface ReminderSection {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  key: string;
  data: Reminder[];
}

const ACTION_KEYS: Record<string, MessageKey | undefined> = {
  CALL: 'reminders.action.CALL',
  MESSAGE: 'reminders.action.MESSAGE',
  EMAIL: 'reminders.action.EMAIL',
  MEET: 'reminders.action.MEET',
  TASK: 'reminders.action.TASK',
};

export default function RemindersListScreen({ hideBackButton = false }: { hideBackButton?: boolean }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeRemindersStyles);

  const [state, setState] = useState<ScreenState>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const load = useCallback(async () => {
    try {
      const rems = await ReminderRepository.findAll();
      setReminders(rems.filter(r => r.status !== 'DELETED' && r.status !== 'COMPLETED'));
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      setState('error');
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = useCallback(async (reminder: Reminder) => {
    const result = await deleteReminder(reminder);
    setReminders(prev => prev.filter(r => r.id !== reminder.id));

    showSnackbar(t('reminders.deleted'), {
      actionLabel: t('common.undo30'),
      onAction: async () => {
        await result.undo();
        load();
      },
      durationMs: 30_000,
    });
  }, [load, showSnackbar, t]);

  const handleComplete = useCallback(async (reminder: Reminder) => {
    await completeReminder(reminder);
    setReminders(prev => prev.filter(r => r.id !== reminder.id));
    showSnackbar(t('reminders.completed'));
  }, [showSnackbar, t]);

  const handleQuickSnooze = useCallback(async (reminder: Reminder) => {
    const twoHoursLater = addHours(new Date(), 2);
    await snoozeReminder(reminder, { kind: 'custom', until: twoHoursLater });
    showSnackbar(t('reminders.snoozed'));
    load();
  }, [showSnackbar, load, t]);

  // Regroupement temporel selon les spécifications R-04
  const { sections, counts } = useMemo(() => {
    const missed: Reminder[] = [];
    const tonight: Reminder[] = [];
    const tomorrow: Reminder[] = [];
    const upcoming: Reminder[] = [];

    for (const r of reminders) {
      if (r.status === 'MISSED') {
        missed.push(r);
        continue;
      }
      const d = new Date(r.scheduledAt);
      if (isPast(d) && r.status === 'UPCOMING') {
        missed.push(r);
      } else if (isToday(d)) {
        tonight.push(r);
      } else if (isTomorrow(d)) {
        tomorrow.push(r);
      } else {
        upcoming.push(r);
      }
    }

    const countsMap = {
      all: reminders.length,
      tonight: tonight.length,
      tomorrow: tomorrow.length,
      missed: missed.length,
    };

    const sectionList: ReminderSection[] = [];

    if ((activeFilter === 'ALL' || activeFilter === 'MISSED') && missed.length > 0) {
      sectionList.push({
        title: t('reminders.section.missed'),
        subtitle: t('reminders.section.missedSub'),
        icon: 'alert-circle',
        iconColor: palette.error.default,
        key: 'missed',
        data: missed,
      });
    }

    if ((activeFilter === 'ALL' || activeFilter === 'TONIGHT') && tonight.length > 0) {
      sectionList.push({
        title: t('reminders.section.tonight'),
        subtitle: t('reminders.section.tonightSub'),
        icon: 'moon-outline',
        iconColor: palette.tertiary.default,
        key: 'tonight',
        data: tonight,
      });
    }

    if ((activeFilter === 'ALL' || activeFilter === 'TOMORROW') && tomorrow.length > 0) {
      sectionList.push({
        title: t('reminders.section.tomorrow'),
        subtitle: t('reminders.section.tomorrowSub'),
        icon: 'sunny-outline',
        iconColor: '#F59E0B',
        key: 'tomorrow',
        data: tomorrow,
      });
    }

    if (activeFilter === 'ALL' && upcoming.length > 0) {
      sectionList.push({
        title: t('reminders.section.upcoming'),
        subtitle: t('reminders.section.upcomingSub'),
        icon: 'calendar-outline',
        iconColor: palette.primary.default,
        key: 'upcoming',
        data: upcoming,
      });
    }

    return { sections: sectionList, counts: countsMap };
  }, [reminders, activeFilter, palette, t]);

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.container, hideBackButton && styles.containerInTab, { paddingTop: insets.top }]}>
      {/* ─── En-tête R-04 ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        {!hideBackButton && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={22} color={palette.onSurface.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.titleCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('tab.reminders')}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{t('reminders.active', { count: counts.all })}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{t('reminders.subtitle')}</Text>
        </View>

        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel={t('common.settings')}
        >
          <Ionicons name="options-outline" size={20} color={palette.onSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* ─── Filtres horizontaux R-04 ─────────────────────────────────────────── */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
          <FilterChip
            label={t('reminders.filter.all', { count: counts.all })}
            active={activeFilter === 'ALL'}
            onPress={() => setActiveFilter('ALL')}
          />
          <FilterChip
            label={t('reminders.filter.tonight', { count: counts.tonight })}
            active={activeFilter === 'TONIGHT'}
            onPress={() => setActiveFilter('TONIGHT')}
          />
          <FilterChip
            label={t('reminders.filter.tomorrow', { count: counts.tomorrow })}
            active={activeFilter === 'TOMORROW'}
            onPress={() => setActiveFilter('TOMORROW')}
          />
          <FilterChip
            label={t('reminders.filter.missed', { count: counts.missed })}
            active={activeFilter === 'MISSED'}
            badgeColor={counts.missed > 0 ? palette.error.default : undefined}
            onPress={() => setActiveFilter('MISSED')}
          />
        </ScrollView>
      </View>

      {/* ─── Liste groupée ────────────────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <EmptyState
          iconName="notifications-outline"
          title={t('reminders.empty.title')}
          description={t('reminders.empty.desc')}
          actionLabel={t('reminders.empty.cta')}
          onAction={() => router.push('/reminders/new')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: hideBackButton ? TAB_BAR_TOTAL_HEIGHT + 104 : insets.bottom + 90 },
          ]}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={palette.primary.default}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name={section.icon} size={16} color={section.iconColor} />
                <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
              </View>
              {section.subtitle ? (
                <Text style={styles.sectionHeaderSubtitle}>{section.subtitle}</Text>
              ) : null}
            </View>
          )}
          renderItem={({ item }) => {
            /* Actions de swipe spécifiques aux rappels :
               - Droite (swipe gauche) : Supprimer + Reporter 2h
               - Gauche (swipe droit)  : Compléter */
            const rightActions: SwipeAction[] = [
              {
                key: 'snooze',
                icon: 'time-outline',
                label: '+2h',
                color: palette.tertiary.default,
                onPress: () => handleQuickSnooze(item),
              },
              {
                key: 'delete',
                icon: 'trash-outline',
                label: t('common.delete'),
                color: palette.error.default,
                onPress: () => handleDelete(item),
              },
            ];
            const leftActions: SwipeAction[] = [
              {
                key: 'complete',
                icon: 'checkmark-circle-outline',
                label: t('tasks.complete'),
                color: palette.success.default,
                onPress: () => handleComplete(item),
              },
            ];

            return (
              <SwipeableItem
                rightActions={rightActions}
                leftActions={leftActions}
                containerStyle={styles.cardWrapper}
              >
                <ReminderCardR04
                  reminder={item}
                  onComplete={() => handleComplete(item)}
                  onQuickSnooze={() => handleQuickSnooze(item)}
                />
              </SwipeableItem>
            );
          }}
          ListFooterComponent={
            <View style={styles.nightModeCard}>
              <Ionicons name="bed-outline" size={20} color={palette.tertiary.default} />
              <View style={styles.nightModeTextCol}>
                <Text style={styles.nightModeTitle}>{t('reminders.nightTitle')}</Text>
                <Text style={styles.nightModeDesc}>{t('reminders.nightDesc')}</Text>
              </View>
            </View>
          }
        />
      )}

      {/* ─── Bouton Flottant 3D (Unique CTA R-04) ─────────────────────────── */}
      <GlassFloatingActionButton
        label={t('reminders.new')}
        icon="add"
        // Dans l'onglet : position par défaut, au-dessus de la barre d'onglets
        bottomOffset={hideBackButton ? undefined : insets.bottom + 20}
        onPress={() => router.push('/reminders/new')}
      />
    </View>
  );
}

// ─── Composants locaux ─────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  badgeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  badgeColor?: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeRemindersStyles);

  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && styles.filterChipActive,
        badgeColor ? { borderColor: badgeColor } : null,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
          badgeColor ? { color: badgeColor } : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ReminderCardR04({
  reminder,
  onComplete,
  onQuickSnooze,
}: {
  reminder: Reminder;
  onComplete: () => void;
  onQuickSnooze: () => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeRemindersStyles);
  const priorityColor = palette.priority[reminder.priority];
  const d = new Date(reminder.scheduledAt);
  const timeStr = format(d, 'HH:mm');
  const actionKey = reminder.actionType ? ACTION_KEYS[reminder.actionType] : undefined;
  const actionLabel = actionKey ? t(actionKey) : '';
  // La couleur suit le sens : un rappel à venir reste neutre
  const tone = reminder.priority === 'URGENT' ? 'urgent' : isPast(d) ? 'attention' : 'neutral';

  return (
    <GlowCard
      tone={tone}
      intensity="soft"
      onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: reminder.id } })}
      accessibilityLabel={reminder.title}
    >
      <View style={styles.cardRow}>
        {/* Checkmark bouton */}
        <TouchableOpacity
          style={styles.checkCircle}
          onPress={onComplete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('reminders.markDoneA11y')}
        >
          <Ionicons name="ellipse-outline" size={22} color={palette.onSurface.variant} />
        </TouchableOpacity>

        {/* Détails du rappel */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {reminder.title}
          </Text>

          {/* Badges / Métadonnées en pills */}
          <View style={styles.metaRow}>
            {/* Heure */}
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={12} color={palette.primary.default} />
              <Text style={styles.metaPillText}>{timeStr}</Text>
            </View>

            {/* Action / Sphère */}
            {actionLabel ? (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{actionLabel}</Text>
              </View>
            ) : null}

            {/* Priorité discrète */}
            {reminder.priority === 'URGENT' || reminder.priority === 'HIGH' ? (
              <View style={[styles.metaPill, { borderColor: priorityColor + '40' }]}>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                <Text style={[styles.metaPillText, { color: priorityColor }]}>
                  {reminder.priority === 'URGENT' ? t('priority.urgent') : t('priority.high')}
                </Text>
              </View>
            ) : null}

            {/* Récurrence */}
            {reminder.recurrenceRuleId ? (
              <View style={styles.metaPill}>
                <Ionicons name="repeat-outline" size={12} color={palette.tertiary.default} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Bouton Quick Snooze (+2h) — conservé pour l'accessibilité */}
        <TouchableOpacity
          style={styles.quickSnoozeBtn}
          onPress={onQuickSnooze}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel={t('reminders.snoozeA11y')}
        >
          <Text style={styles.quickSnoozeText}>+2h</Text>
        </TouchableOpacity>
      </View>
    </GlowCard>
  );
}

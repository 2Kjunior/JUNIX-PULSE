/**
 * Liste des rappels — Référence R-04 du Master Prompt Junix Pulse.
 * Groupement temporel : En retard → Ce soir → Demain → À venir.
 * Filtres de période (Tous / Ce soir / Demain / En retard).
 * Actions rapides : complétion inline, quick-snooze (+2h), suppression avec Undo (30s).
 * Bouton flottant CTA dégradé : + Nouveau rappel.
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
import { LinearGradient } from 'expo-linear-gradient';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { deleteReminder, completeReminder, snoozeReminder } from '@/use-cases/reminder-use-cases';
import { Reminder } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
  Priority as PriorityColors,
  Gradient,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { styles } from '@/styles/reminders/reminders-styles';

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

const ACTION_LABELS: Record<string, string> = {
  CALL: 'Appeler',
  MESSAGE: 'Message',
  EMAIL: 'Email',
  MEET: 'Rencontre',
  TASK: 'Faire',
  NONE: '',
};

export default function RemindersListScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [state, setState] = useState<ScreenState>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const load = useCallback(async () => {
    try {
      const [rems, settings] = await Promise.all([
        ReminderRepository.findAll(),
        SettingsRepository.get(),
      ]);
      setReminders(rems.filter(r => r.status !== 'DELETED' && r.status !== 'COMPLETED'));
      setNotificationsEnabled(settings.notificationsEnabled);
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = useCallback(async (reminder: Reminder) => {
    const result = await deleteReminder(reminder);
    setReminders(prev => prev.filter(r => r.id !== reminder.id));

    showSnackbar('Rappel supprimé', {
      actionLabel: 'Annuler (30s)',
      onAction: async () => {
        await result.undo();
        load();
      },
      durationMs: 30_000,
    });
  }, [load, showSnackbar]);

  const handleComplete = useCallback(async (reminder: Reminder) => {
    await completeReminder(reminder, notificationsEnabled);
    setReminders(prev => prev.filter(r => r.id !== reminder.id));
    showSnackbar('Rappel complété.');
  }, [notificationsEnabled, showSnackbar]);

  const handleQuickSnooze = useCallback(async (reminder: Reminder) => {
    const twoHoursLater = addHours(new Date(), 2);
    await snoozeReminder(reminder, { kind: 'custom', until: twoHoursLater }, notificationsEnabled);
    showSnackbar('Rappel reporté de 2h.');
    load();
  }, [notificationsEnabled, showSnackbar, load]);

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
        title: 'En retard',
        subtitle: 'À traiter en priorité',
        icon: 'alert-circle',
        iconColor: ErrorColors.default,
        key: 'missed',
        data: missed,
      });
    }

    if ((activeFilter === 'ALL' || activeFilter === 'TONIGHT') && tonight.length > 0) {
      sectionList.push({
        title: 'Ce soir',
        subtitle: 'Avant 23:00',
        icon: 'moon-outline',
        iconColor: Tertiary.default,
        key: 'tonight',
        data: tonight,
      });
    }

    if ((activeFilter === 'ALL' || activeFilter === 'TOMORROW') && tomorrow.length > 0) {
      sectionList.push({
        title: 'Demain',
        subtitle: 'Matinée',
        icon: 'sunny-outline',
        iconColor: '#F59E0B',
        key: 'tomorrow',
        data: tomorrow,
      });
    }

    if (activeFilter === 'ALL' && upcoming.length > 0) {
      sectionList.push({
        title: 'À venir',
        subtitle: 'Prochains jours',
        icon: 'calendar-outline',
        iconColor: Primary.default,
        key: 'upcoming',
        data: upcoming,
      });
    }

    return { sections: sectionList, counts: countsMap };
  }, [reminders, activeFilter]);

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── En-tête R-04 ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={22} color={OnSurface.primary} />
        </TouchableOpacity>

        <View style={styles.titleCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Rappels</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{counts.all} actifs</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Rythme quotidien • Sanctuaire</Text>
        </View>

        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="options-outline" size={20} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* ─── Filtres horizontaux R-04 ─────────────────────────────────────────── */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
          <FilterChip
            label={`Tous • ${counts.all}`}
            active={activeFilter === 'ALL'}
            onPress={() => setActiveFilter('ALL')}
          />
          <FilterChip
            label={`Ce soir ${counts.tonight}`}
            active={activeFilter === 'TONIGHT'}
            onPress={() => setActiveFilter('TONIGHT')}
          />
          <FilterChip
            label={`Demain ${counts.tomorrow}`}
            active={activeFilter === 'TOMORROW'}
            onPress={() => setActiveFilter('TOMORROW')}
          />
          <FilterChip
            label={`En retard ${counts.missed}`}
            active={activeFilter === 'MISSED'}
            badgeColor={counts.missed > 0 ? ErrorColors.default : undefined}
            onPress={() => setActiveFilter('MISSED')}
          />
        </ScrollView>
      </View>

      {/* ─── Liste groupée ────────────────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <EmptyState
          iconName="notifications-outline"
          title="Aucun rappel actif"
          description="Tous vos rappels programmés apparaîtront ici avec leur échéance."
          actionLabel="+ Créer un rappel"
          onAction={() => router.push('/reminders/new')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={Primary.default}
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
          renderItem={({ item }) => (
            <ReminderCardR04
              reminder={item}
              onComplete={() => handleComplete(item)}
              onQuickSnooze={() => handleQuickSnooze(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListFooterComponent={
            <View style={styles.nightModeCard}>
              <Ionicons name="bed-outline" size={20} color={Tertiary.default} />
              <View style={styles.nightModeTextCol}>
                <Text style={styles.nightModeTitle}>Mode Nuit activé dès 22h30</Text>
                <Text style={styles.nightModeDesc}>
                  Les rappels non urgents basculent automatiquement au réveil.
                </Text>
              </View>
            </View>
          }
        />
      )}

      {/* ─── Bouton Flottant Dégradé (Unique CTA R-04) ─────────────────────────── */}
      <View style={[styles.floatingCtaContainer, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          onPress={() => router.push('/reminders/new')}
          activeOpacity={0.85}
          accessibilityLabel="Créer un nouveau rappel"
        >
          <LinearGradient
            colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingCta}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.floatingCtaText}>Nouveau rappel</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  onDelete,
}: {
  reminder: Reminder;
  onComplete: () => void;
  onQuickSnooze: () => void;
  onDelete: () => void;
}) {
  const priorityColor = PriorityColors[reminder.priority];
  const d = new Date(reminder.scheduledAt);
  const timeStr = format(d, 'HH:mm');
  const actionLabel = reminder.actionType && ACTION_LABELS[reminder.actionType];

  return (
    <View style={styles.cardWrapper}>
      <GlowCard
        tone="attention"
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
          accessibilityLabel="Marquer le rappel comme terminé"
        >
          <Ionicons name="ellipse-outline" size={22} color={OnSurface.variant} />
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
              <Ionicons name="time-outline" size={12} color={Primary.default} />
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
                  {reminder.priority === 'URGENT' ? 'Urgent' : 'Haute'}
                </Text>
              </View>
            ) : null}

            {/* Récurrence */}
            {reminder.recurrenceRuleId ? (
              <View style={styles.metaPill}>
                <Ionicons name="repeat-outline" size={12} color={Tertiary.default} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Bouton Quick Snooze (+2h) */}
        <TouchableOpacity
          style={styles.quickSnoozeBtn}
          onPress={onQuickSnooze}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel="Reporter de 2 heures"
        >
          <Text style={styles.quickSnoozeText}>+2h</Text>
        </TouchableOpacity>

        {/* Menu contextuel / Détails */}
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={onDelete}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel="Supprimer le rappel"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>
      </GlowCard>
    </View>
  );
}

/**
 * Liste de tous les rappels (actifs).
 * Groupés par : Manqués → Aujourd'hui → Cette semaine → Plus tard.
 * Swipe left pour supprimer, swipe right pour compléter.
 *
 * Étape 2 : implémentation complète.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isThisWeek, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { deleteReminder, completeReminder } from '@/use-cases/reminder-use-cases';
import { Reminder } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface, Primary, Tertiary, OnSurface, Outline, Error as ErrorColors,
  Spacing, Radius, Typography, Priority as PriorityColors,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

interface Section {
  title: string;
  key: string;
  data: Reminder[];
}

function groupReminders(reminders: Reminder[]): Section[] {
  const missed: Reminder[] = [];
  const today: Reminder[] = [];
  const thisWeek: Reminder[] = [];
  const later: Reminder[] = [];

  for (const r of reminders) {
    if (r.status === 'MISSED') { missed.push(r); continue; }
    const d = new Date(r.scheduledAt);
    if (isToday(d)) { today.push(r); continue; }
    if (isPast(d)) { missed.push(r); continue; }
    if (isThisWeek(d, { locale: fr })) { thisWeek.push(r); continue; }
    later.push(r);
  }

  const sections: Section[] = [];
  if (missed.length > 0) sections.push({ title: '⚠ À rattraper', key: 'missed', data: missed });
  if (today.length > 0) sections.push({ title: "Aujourd'hui", key: 'today', data: today });
  if (thisWeek.length > 0) sections.push({ title: 'Cette semaine', key: 'week', data: thisWeek });
  if (later.length > 0) sections.push({ title: 'Plus tard', key: 'later', data: later });

  return sections;
}

export default function RemindersListScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const [state, setState] = useState<ScreenState>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
    const result = await deleteReminder(reminder, () => {
      // Undo expiré — pas besoin d'action supplémentaire en V1
    });

    setReminders(prev => prev.filter(r => r.id !== reminder.id));

    showSnackbar('Rappel supprimé', {
      actionLabel: 'Annuler',
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
    showSnackbar('Rappel complété ✓');
  }, [notificationsEnabled, showSnackbar]);

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const sections = groupReminders(reminders);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Rappels</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/reminders/new' as any)}
          accessibilityLabel="Nouveau rappel"
          testID="reminders-add-btn"
        >
          <Ionicons name="add" size={24} color={Primary.on} />
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {sections.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Aucun rappel actif"
          description="Créez votre premier rappel pour ne rien oublier."
          actionLabel="+ Créer un rappel"
          onAction={() => router.push('/reminders/new' as any)}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
              tintColor={Primary.default}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <ReminderRow
              reminder={item}
              onComplete={() => handleComplete(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Ligne de rappel ──────────────────────────────────────────────────────────

function ReminderRow({
  reminder,
  onComplete,
  onDelete,
}: {
  reminder: Reminder;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const priorityColor = PriorityColors[reminder.priority];
  const d = new Date(reminder.scheduledAt);
  const timeStr = format(d, 'HH:mm');
  const dateStr = isToday(d) ? "Aujourd'hui" : format(d, 'EEE d MMM', { locale: fr });
  const isMissed = reminder.status === 'MISSED' || (isPast(d) && reminder.status === 'UPCOMING');

  return (
    <View style={[styles.row, isMissed && styles.rowMissed]}>
      {/* Indicateur priorité */}
      <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />

      {/* Contenu principal */}
      <TouchableOpacity
        style={styles.rowContent}
        onPress={() => router.push(`/reminders/${reminder.id}` as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.rowTitle} numberOfLines={2}>{reminder.title}</Text>
        <View style={styles.rowMeta}>
          <Ionicons name="time-outline" size={12} color={OnSurface.variant} />
          <Text style={styles.rowMetaText}>{dateStr} à {timeStr}</Text>
          {reminder.personId && (
            <>
              <View style={styles.metaDot} />
              <Ionicons name="person-outline" size={12} color={OnSurface.variant} />
            </>
          )}
          {reminder.recurrenceRuleId && (
            <>
              <View style={styles.metaDot} />
              <Ionicons name="repeat-outline" size={12} color={OnSurface.variant} />
            </>
          )}
          {reminder.status === 'SNOOZED' && (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { color: Tertiary.default }]}>Reporté</Text>
            </View>
          )}
          {isMissed && (
            <View style={[styles.badge, { backgroundColor: ErrorColors.container }]}>
              <Text style={[styles.badgeText, { color: ErrorColors.default }]}>Manqué</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Actions rapides */}
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionComplete]}
          onPress={onComplete}
          accessibilityLabel="Marquer complété"
        >
          <Ionicons name="checkmark" size={16} color="#6DD58C" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDelete]}
          onPress={onDelete}
          accessibilityLabel="Supprimer"
        >
          <Ionicons name="trash-outline" size={16} color={ErrorColors.default} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  title: { ...Typography.headlineLarge, color: OnSurface.primary },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  rowMissed: {
    borderWidth: 1,
    borderColor: ErrorColors.container,
  },
  priorityBar: {
    width: 4,
  },
  rowContent: {
    flex: 1,
    padding: Spacing.md,
  },
  rowTitle: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.xs,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  rowMetaText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: OnSurface.disabled,
  },
  badge: {
    backgroundColor: 'rgba(123, 208, 255, 0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    ...Typography.labelSmall,
    fontSize: 9,
  },
  rowActions: {
    flexDirection: 'column',
    width: 44,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionComplete: {
    backgroundColor: 'rgba(109, 213, 140, 0.08)',
  },
  actionDelete: {
    backgroundColor: 'rgba(147, 0, 10, 0.08)',
  },
});

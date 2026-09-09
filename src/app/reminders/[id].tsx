/**
 * Détail d'un rappel.
 * Affiche toutes les informations + actions (compléter, snooze, modifier, supprimer).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import {
  completeReminder, snoozeReminder, deleteReminder,
} from '@/use-cases/reminder-use-cases';
import { Reminder, ReminderChecklistItem } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface, Primary, Tertiary, OnSurface, Outline, Error as ErrorColors,
  Success, Spacing, Radius, Typography, Priority as PriorityColors,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { SNOOZE_OPTIONS_MINUTES } from '@/domain/rules/reminder-rules';

type ScreenState = 'loading' | 'content' | 'error';

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: '🔴 Urgent', HIGH: '🟠 Haute', NORMAL: '🔵 Normal', LOW: '⚪ Faible',
};

const ACTION_LABELS: Record<string, string> = {
  NONE: '—', CALL: '📞 Appeler', MESSAGE: '💬 Message',
  EMAIL: '📧 Email', MEET: '🤝 Rencontrer', TASK: '✓ Faire',
};

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [state, setState] = useState<ScreenState>('loading');
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [checklist, setChecklist] = useState<ReminderChecklistItem[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [error, setError] = useState('');
  const [showSnoozeSheet, setShowSnoozeSheet] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setError('ID manquant'); setState('error'); return; }
    try {
      const [rem, items, settings] = await Promise.all([
        ReminderRepository.findById(id),
        ReminderRepository.findChecklistItems(id),
        SettingsRepository.get(),
      ]);
      if (!rem) { setError('Rappel introuvable'); setState('error'); return; }
      setReminder(rem);
      setChecklist(items);
      setNotificationsEnabled(settings.notificationsEnabled);
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setState('error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleComplete() {
    if (!reminder) return;
    await completeReminder(reminder, notificationsEnabled);
    showSnackbar('Rappel complété ✓');
    router.back();
  }

  async function handleSnooze(minutes: number) {
    if (!reminder) return;
    setShowSnoozeSheet(false);
    await snoozeReminder(reminder, minutes, notificationsEnabled);
    showSnackbar(`Rappel reporté de ${minutes} min`);
    router.back();
  }

  async function handleDelete() {
    if (!reminder) return;
    Alert.alert(
      'Supprimer ce rappel ?',
      'Cette action peut être annulée pendant 30 secondes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteReminder(reminder);
            showSnackbar('Rappel supprimé', {
              actionLabel: 'Annuler',
              onAction: async () => {
                await result.undo();
              },
              durationMs: 30_000,
            });
            router.back();
          },
        },
      ]
    );
  }

  async function toggleChecklistItem(item: ReminderChecklistItem) {
    await ReminderRepository.updateChecklistItem(item.id, !item.isCompleted);
    setChecklist(prev =>
      prev.map(i => i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i)
    );
  }

  if (state === 'loading') return <LoadingState />;
  if (state === 'error' || !reminder) return <ErrorState message={error} onRetry={load} />;

  const scheduledDate = new Date(reminder.scheduledAt);
  const dateStr = format(scheduledDate, "EEEE d MMMM 'à' HH:mm", { locale: fr });
  const priorityColor = PriorityColors[reminder.priority];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={OnSurface.variant} />
          <Text style={styles.backLabel}>Rappels</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/reminders/edit/${reminder.id}` as any)}
          style={styles.editBtn}
        >
          <Text style={styles.editLabel}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Bandeau priorité */}
        <View style={[styles.priorityBanner, { backgroundColor: priorityColor + '15' }]}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.priorityLabel, { color: priorityColor }]}>
            {PRIORITY_LABELS[reminder.priority]}
          </Text>
        </View>

        {/* Titre */}
        <Text style={styles.title}>{reminder.title}</Text>

        {/* Date */}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={OnSurface.variant} />
          <Text style={styles.infoText}>{dateStr}</Text>
        </View>

        {/* Action */}
        {reminder.actionType !== 'NONE' && (
          <View style={styles.infoRow}>
            <Ionicons name="flash-outline" size={16} color={Primary.default} />
            <Text style={[styles.infoText, { color: Primary.default }]}>
              {ACTION_LABELS[reminder.actionType]}
            </Text>
          </View>
        )}

        {/* Récurrence */}
        {reminder.recurrenceRuleId && (
          <View style={styles.infoRow}>
            <Ionicons name="repeat-outline" size={16} color={Tertiary.default} />
            <Text style={[styles.infoText, { color: Tertiary.default }]}>Récurrent</Text>
          </View>
        )}

        {/* Notes */}
        {reminder.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{reminder.notes}</Text>
          </View>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liste de vérification</Text>
            {checklist.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistRow}
                onPress={() => toggleChecklistItem(item)}
              >
                <Ionicons
                  name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={item.isCompleted ? Success.default : OnSurface.disabled}
                />
                <Text
                  style={[
                    styles.checklistItem,
                    item.isCompleted && styles.checklistItemDone,
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Actions principales */}
      <View style={[styles.actionsBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionSnooze]}
          onPress={() => setShowSnoozeSheet(true)}
          testID="reminder-snooze-btn"
        >
          <Ionicons name="alarm-outline" size={20} color={Tertiary.default} />
          <Text style={[styles.actionBtnLabel, { color: Tertiary.default }]}>Reporter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionComplete]}
          onPress={handleComplete}
          testID="reminder-complete-btn"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={Success.default} />
          <Text style={[styles.actionBtnLabel, { color: Success.default }]}>Complété</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDelete]}
          onPress={handleDelete}
          testID="reminder-delete-btn"
        >
          <Ionicons name="trash-outline" size={20} color={ErrorColors.default} />
          <Text style={[styles.actionBtnLabel, { color: ErrorColors.default }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>

      {/* Snooze sheet */}
      {showSnoozeSheet && (
        <View style={styles.snoozeOverlay}>
          <TouchableOpacity
            style={styles.snoozeBackdrop}
            onPress={() => setShowSnoozeSheet(false)}
          />
          <View style={[styles.snoozeSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text style={styles.snoozeTitle}>Reporter de…</Text>
            {SNOOZE_OPTIONS_MINUTES.map(minutes => (
              <TouchableOpacity
                key={minutes}
                style={styles.snoozeOption}
                onPress={() => handleSnooze(minutes)}
              >
                <Text style={styles.snoozeOptionLabel}>
                  {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} heure${minutes >= 120 ? 's' : ''}`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Outline.variant,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLabel: { ...Typography.bodyMedium, color: OnSurface.variant },
  editBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  editLabel: { ...Typography.labelMedium, color: Primary.default },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityLabel: { ...Typography.labelMedium },
  title: { ...Typography.displayMedium, color: OnSurface.primary, lineHeight: 36 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  infoText: { ...Typography.bodyMedium, color: OnSurface.primary, flex: 1, textTransform: 'capitalize' },
  notesBox: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  notesText: { ...Typography.bodyMedium, color: OnSurface.variant, lineHeight: 22 },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.labelMedium, color: OnSurface.variant, textTransform: 'uppercase', letterSpacing: 0.5 },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  checklistItem: { ...Typography.bodyMedium, color: OnSurface.primary, flex: 1 },
  checklistItemDone: { textDecorationLine: 'line-through', color: OnSurface.disabled },
  actionsBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Outline.variant,
    backgroundColor: Surface.low,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionSnooze: { borderColor: Tertiary.default + '40', backgroundColor: Tertiary.container + '20' },
  actionComplete: { borderColor: Success.default + '40', backgroundColor: Success.container + '20' },
  actionDelete: { borderColor: ErrorColors.default + '40', backgroundColor: ErrorColors.container + '20' },
  actionBtnLabel: { ...Typography.labelSmall, fontSize: 11 },
  // Snooze sheet
  snoozeOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 100 },
  snoozeBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  snoozeSheet: {
    backgroundColor: Surface.high,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  snoozeTitle: { ...Typography.titleMedium, color: OnSurface.primary, marginBottom: Spacing.sm },
  snoozeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 48,
  },
  snoozeOptionLabel: { ...Typography.bodyMedium, color: OnSurface.primary },
});

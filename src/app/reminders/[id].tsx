/**
 * Détail d'un rappel + Snooze — Référence R-06 du Master Prompt Junix Pulse.
 * Affiche toutes les informations, actions rapides (appel/message), modification,
 * complétion, suppression réversible (30s) et bottom sheet de snooze à 6 options.
 *
 * Règle A.1 : Zéro emoji (icônes vectorielles et typographie soignée).
 * Règle A.2 : Cartes rayon 16px, bottom sheet 28px, palette theme.ts.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { PersonRepository } from '@/repositories/person-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import {
  completeReminder,
  snoozeReminder,
  deleteReminder,
  SnoozeInput,
} from '@/use-cases/reminder-use-cases';
import { Reminder, ReminderChecklistItem, Person } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Success,
  Spacing,
  Radius,
  Typography,
  Priority as PriorityColors,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { SNOOZE_OPTIONS_MINUTES } from '@/domain/rules/reminder-rules';

type ScreenState = 'loading' | 'content' | 'error';
type SnoozeSheet = 'hidden' | 'picker';

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'Haute',
  NORMAL: 'Normal',
  LOW: 'Faible',
};

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  CALL: { label: 'Appeler', icon: 'call-outline', color: Primary.default },
  MESSAGE: { label: 'Message', icon: 'chatbubble-outline', color: Tertiary.default },
  EMAIL: { label: 'Email', icon: 'mail-outline', color: '#38BDF8' },
  MEET: { label: 'Rencontre', icon: 'people-outline', color: '#F59E0B' },
  TASK: { label: 'Action à faire', icon: 'checkmark-outline', color: Success.default },
  NONE: { label: '', icon: 'remove-outline', color: OnSurface.variant },
};

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [state, setState] = useState<ScreenState>('loading');
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [checklist, setChecklist] = useState<ReminderChecklistItem[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [error, setError] = useState('');
  const [showSnoozeSheet, setShowSnoozeSheet] = useState(false);
  const [snoozeSheet, setSnoozeSheet] = useState<SnoozeSheet>('hidden');
  const [customDate, setCustomDate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    if (!id) {
      setError('ID manquant');
      setState('error');
      return;
    }
    try {
      const [rem, items, settings] = await Promise.all([
        ReminderRepository.findById(id),
        ReminderRepository.findChecklistItems(id),
        SettingsRepository.get(),
      ]);
      if (!rem) {
        setError('Rappel introuvable');
        setState('error');
        return;
      }
      setReminder(rem);
      setChecklist(items);
      setNotificationsEnabled(settings.notificationsEnabled);

      if (rem.personId) {
        const p = await PersonRepository.findById(rem.personId);
        setPerson(p);
      }

      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleComplete() {
    if (!reminder) return;
    await completeReminder(reminder, notificationsEnabled);
    showSnackbar('Rappel complété.');
    router.back();
  }

  async function handleSnooze(input: SnoozeInput) {
    if (!reminder) return;
    setShowSnoozeSheet(false);
    setSnoozeSheet('hidden');

    let label: string;
    switch (input.kind) {
      case 'quick':
        label = `${input.minutes} min`;
        break;
      case 'tomorrow':
        label = 'demain même heure';
        break;
      case 'custom':
        label = format(input.until, "d MMM 'à' HH:mm", { locale: fr });
        break;
    }

    await snoozeReminder(reminder, input, notificationsEnabled);
    showSnackbar(`Rappel reporté — ${label}`);
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
              actionLabel: 'Annuler (30s)',
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
      prev.map(i => (i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i))
    );
  }

  const handleExecuteAction = () => {
    if (!reminder || !person) return;
    if (reminder.actionType === 'CALL' && person.phone) {
      Linking.openURL(`tel:${person.phone}`);
    } else if (reminder.actionType === 'MESSAGE' && person.phone) {
      Linking.openURL(`sms:${person.phone}`);
    } else if (reminder.actionType === 'EMAIL' && person.email) {
      Linking.openURL(`mailto:${person.email}`);
    }
  };

  if (state === 'loading') return <LoadingState />;
  if (state === 'error' || !reminder) return <ErrorState message={error} onRetry={load} />;

  const scheduledDate = new Date(reminder.scheduledAt);
  const dateStr = format(scheduledDate, "EEEE d MMMM 'à' HH:mm", { locale: fr });
  const priorityColor = PriorityColors[reminder.priority];
  const actionInfo = reminder.actionType ? ACTION_CONFIG[reminder.actionType] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Barre de Navigation ────────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={22} color={OnSurface.primary} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Détail du rappel</Text>

        <TouchableOpacity
          onPress={() => router.push(`/reminders/edit/${reminder.id}` as any)}
          style={styles.editBtn}
          accessibilityLabel="Modifier"
        >
          <Text style={styles.editLabel}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── En-tête du rappel (Carte principale R-06) ─────────────────────── */}
        <View style={styles.mainCard}>
          <View style={styles.badgesRow}>
            {/* Badge de priorité vectoriel */}
            <View style={[styles.priorityBadge, { borderColor: priorityColor + '40' }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                {PRIORITY_LABELS[reminder.priority]}
              </Text>
            </View>

            {/* Badge récurrence */}
            {reminder.recurrenceRuleId && (
              <View style={styles.metaPill}>
                <Ionicons name="repeat-outline" size={13} color={Tertiary.default} />
                <Text style={styles.metaPillText}>Récurrent</Text>
              </View>
            )}
          </View>

          {/* Titre */}
          <Text style={styles.title}>{reminder.title}</Text>

          {/* Date et heure */}
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={Primary.default} />
            <Text style={styles.timeText}>{dateStr}</Text>
          </View>
        </View>

        {/* ─── Action Rapide Associée (Haut R-06) ─────────────────────────────── */}
        {actionInfo && actionInfo.label && (
          <View style={styles.actionSection}>
            <View style={styles.actionCard}>
              <View style={styles.actionCardLeft}>
                <View style={[styles.actionIconBox, { backgroundColor: actionInfo.color + '20' }]}>
                  <Ionicons name={actionInfo.icon} size={20} color={actionInfo.color} />
                </View>
                <View>
                  <Text style={styles.actionCardLabel}>{actionInfo.label}</Text>
                  {person ? (
                    <Text style={styles.actionCardTarget}>avec {person.displayName}</Text>
                  ) : null}
                </View>
              </View>

              {person && (person.phone || person.email) ? (
                <TouchableOpacity
                  style={styles.actionExecuteBtn}
                  onPress={handleExecuteAction}
                >
                  <Text style={styles.actionExecuteText}>Lancer</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* ─── Notes & Précisions ────────────────────────────────────────────── */}
        {reminder.notes ? (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color={OnSurface.variant} />
              <Text style={styles.sectionTitle}>Notes & Contexte</Text>
            </View>
            <Text style={styles.notesText}>{reminder.notes}</Text>
          </View>
        ) : null}

        {/* ─── Checklist / Sous-éléments ──────────────────────────────────────── */}
        {checklist.length > 0 && (
          <View style={styles.checklistCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="checkbox-outline" size={16} color={OnSurface.variant} />
              <Text style={styles.sectionTitle}>Liste de contrôle</Text>
            </View>
            {checklist.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItemRow}
                onPress={() => toggleChecklistItem(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={item.isCompleted ? Success.default : OnSurface.disabled}
                />
                <Text
                  style={[
                    styles.checklistItemText,
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

      {/* ─── Barre d'actions fixes en bas (R-06) ─────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.bottomBtn, styles.snoozeBtn]}
          onPress={() => setShowSnoozeSheet(true)}
          accessibilityLabel="Reporter ce rappel"
        >
          <Ionicons name="alarm-outline" size={18} color={Tertiary.default} />
          <Text style={styles.snoozeBtnText}>Reporter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBtn, styles.completeBtn]}
          onPress={handleComplete}
          accessibilityLabel="Marquer le rappel comme terminé"
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={Success.default} />
          <Text style={styles.completeBtnText}>Terminer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBtn, styles.deleteBtn]}
          onPress={handleDelete}
          accessibilityLabel="Supprimer ce rappel"
        >
          <Ionicons name="trash-outline" size={18} color={ErrorColors.default} />
          <Text style={styles.deleteBtnText}>Supprimer</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Bottom Sheet de Snooze (R-06 : 6 options) ───────────────────────── */}
      {showSnoozeSheet && (
        <View style={styles.snoozeOverlay}>
          <TouchableOpacity
            style={styles.snoozeBackdrop}
            onPress={() => {
              setShowSnoozeSheet(false);
              setSnoozeSheet('hidden');
            }}
          />
          <View style={[styles.snoozeSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.snoozeTitle}>Reporter ce rappel</Text>

            {/* 4 durées rapides en grille de chips (R-06) */}
            <Text style={styles.snoozeSubtitle}>Raccourcis rapides</Text>
            <View style={styles.snoozeGrid}>
              {SNOOZE_OPTIONS_MINUTES.map(minutes => (
                <TouchableOpacity
                  key={minutes}
                  style={styles.snoozeTile}
                  onPress={() => handleSnooze({ kind: 'quick', minutes })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="timer-outline" size={16} color={Tertiary.default} />
                  <Text style={styles.snoozeTileText}>
                    {minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2 options pleine largeur (R-06) */}
            <View style={styles.snoozeFullOptions}>
              {/* Demain même heure */}
              <TouchableOpacity
                style={styles.snoozeFullOption}
                onPress={() => handleSnooze({ kind: 'tomorrow' })}
                activeOpacity={0.7}
              >
                <View style={styles.snoozeOptionLeft}>
                  <Ionicons name="sunny-outline" size={18} color="#F59E0B" />
                  <View>
                    <Text style={styles.snoozeOptionLabel}>Demain même heure</Text>
                    <Text style={styles.snoozeOptionHint}>
                      {format(addDays(new Date(reminder.scheduledAt), 1), "EEEE d MMM 'à' HH:mm", {
                        locale: fr,
                      })}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
              </TouchableOpacity>

              {/* Date personnalisée */}
              <TouchableOpacity
                style={styles.snoozeFullOption}
                onPress={() => {
                  setSnoozeSheet('picker');
                  setCustomDate(new Date());
                }}
                activeOpacity={0.7}
              >
                <View style={styles.snoozeOptionLeft}>
                  <Ionicons name="calendar-outline" size={18} color={Primary.default} />
                  <Text style={styles.snoozeOptionLabel}>Choisir une date & heure</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
              </TouchableOpacity>
            </View>

            {/* DateTimePicker sélecteur */}
            {snoozeSheet === 'picker' && (
              <DateTimePicker
                value={customDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  if (!date) {
                    setSnoozeSheet('hidden');
                    return;
                  }
                  setCustomDate(date);
                  if (Platform.OS === 'android') {
                    setSnoozeSheet('hidden');
                    handleSnooze({ kind: 'custom', until: date });
                  }
                }}
              />
            )}

            {/* Bouton de confirmation sur iOS */}
            {snoozeSheet === 'picker' && Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.snoozeConfirmBtn}
                onPress={() => {
                  setSnoozeSheet('hidden');
                  handleSnooze({ kind: 'custom', until: customDate });
                }}
              >
                <Text style={styles.snoozeConfirmLabel}>Confirmer la date</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  editBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  editLabel: {
    ...Typography.labelLarge,
    color: Primary.default,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  mainCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.sm,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityBadgeText: {
    ...Typography.labelSmall,
    fontWeight: '700',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 4,
  },
  metaPillText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  title: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timeText: {
    ...Typography.bodyMedium,
    color: Primary.default,
    textTransform: 'capitalize',
  },
  actionSection: {
    marginTop: 2,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardLabel: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  actionCardTarget: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  actionExecuteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Primary.default,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  actionExecuteText: {
    ...Typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notesCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.xs,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.labelLarge,
    color: OnSurface.variant,
  },
  notesText: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    lineHeight: 22,
  },
  checklistCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.xs,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  checklistItemText: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    flex: 1,
  },
  checklistItemDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Surface.container,
    borderTopWidth: 1,
    borderTopColor: Outline.variant,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  snoozeBtn: {
    backgroundColor: Tertiary.container,
    borderColor: Tertiary.default + '40',
  },
  snoozeBtnText: {
    ...Typography.labelMedium,
    color: Tertiary.default,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: Success.container,
    borderColor: Success.default + '40',
  },
  completeBtnText: {
    ...Typography.labelMedium,
    color: Success.default,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: ErrorColors.container,
    borderColor: ErrorColors.default + '40',
  },
  deleteBtnText: {
    ...Typography.labelMedium,
    color: ErrorColors.default,
    fontWeight: '700',
  },
  snoozeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  snoozeBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  snoozeSheet: {
    backgroundColor: Surface.container,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: OnSurface.disabled,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  snoozeTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  snoozeSubtitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  snoozeGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  snoozeTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Surface.base,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 4,
  },
  snoozeTileText: {
    ...Typography.labelMedium,
    color: Tertiary.default,
    fontWeight: '700',
  },
  snoozeFullOptions: {
    gap: Spacing.xs,
  },
  snoozeFullOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Surface.base,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  snoozeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  snoozeOptionLabel: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  snoozeOptionHint: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  snoozeConfirmBtn: {
    backgroundColor: Primary.default,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  snoozeConfirmLabel: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

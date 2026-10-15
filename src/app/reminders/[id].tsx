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
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { ThemePalette } from '@/constants/palettes';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { ReminderBottomBar } from '@/components/reminders/ReminderBottomBar';
import { GlowCard } from '@/components/ui/GlowCard';
import { ReminderSnoozeSheet } from '@/components/reminders/ReminderSnoozeSheet';
import { makeReminderDetailStyles } from '@/styles/reminders/reminder-detail-styles';

type ScreenState = 'loading' | 'content' | 'error';
type SnoozeSheet = 'hidden' | 'picker';

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'Haute',
  NORMAL: 'Normal',
  LOW: 'Faible',
};

const getActionConfig = (
  theme: ThemePalette
): Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> => ({
  CALL: { label: 'Appeler', icon: 'call-outline', color: theme.primary.default },
  MESSAGE: { label: 'Message', icon: 'chatbubble-outline', color: theme.tertiary.default },
  EMAIL: { label: 'Email', icon: 'mail-outline', color: theme.mode === 'light' ? '#0284C7' : '#38BDF8' },
  MEET: { label: 'Rencontre', icon: 'people-outline', color: theme.mode === 'light' ? '#D97706' : '#F59E0B' },
  TASK: { label: 'Action à faire', icon: 'checkmark-outline', color: theme.success.default },
  NONE: { label: '', icon: 'remove-outline', color: theme.onSurface.variant },
});

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeReminderDetailStyles);

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
  const priorityColor = theme.priority[reminder.priority as keyof typeof theme.priority] ?? theme.priority.NORMAL;
  const actionConfigs = getActionConfig(theme);
  const actionInfo = reminder.actionType ? actionConfigs[reminder.actionType] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Barre de Navigation ────────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={22} color={theme.onSurface.primary} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Détail du rappel</Text>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/reminders/edit/[id]', params: { id: reminder.id } })}
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
        <GlowCard tone="attention" size="hero" accessibilityLabel={reminder.title}>
        <View style={styles.mainCardInner}>
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
                <Ionicons name="repeat-outline" size={13} color={theme.tertiary.default} />
                <Text style={styles.metaPillText}>Récurrent</Text>
              </View>
            )}
          </View>

          {/* Titre */}
          <Text style={styles.title}>{reminder.title}</Text>

          {/* Date et heure */}
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={theme.primary.default} />
            <Text style={styles.timeText}>{dateStr}</Text>
          </View>
        </View>
        </GlowCard>

        {/* ─── Action Rapide Associée (Haut R-06) ─────────────────────────────── */}
        {actionInfo && actionInfo.label && (
          <View style={styles.actionSection}>
            <GlowCard tone="neutral">
            <View style={styles.actionCardRow}>
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
            </GlowCard>
          </View>
        )}

        {/* ─── Notes & Précisions ────────────────────────────────────────────── */}
        {reminder.notes ? (
          <GlowCard tone="neutral">
          <View style={styles.notesCardInner}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color={theme.onSurface.variant} />
              <Text style={styles.sectionTitle}>Notes & Contexte</Text>
            </View>
            <Text style={styles.notesText}>{reminder.notes}</Text>
          </View>
          </GlowCard>
        ) : null}

        {/* ─── Checklist / Sous-éléments ──────────────────────────────────────── */}
        {checklist.length > 0 && (
          <GlowCard tone="neutral">
          <View style={styles.checklistCardInner}>
            <View style={styles.notesHeader}>
              <Ionicons name="checkbox-outline" size={16} color={theme.onSurface.variant} />
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
                  color={item.isCompleted ? theme.success.default : theme.onSurface.disabled}
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
          </GlowCard>
        )}
      </ScrollView>

      {/* ─── Barre d'actions fixes en bas (R-06) ─────────────────────────────── */}
      <ReminderBottomBar
        insetsBottom={insets.bottom}
        onSnooze={() => setShowSnoozeSheet(true)}
        onComplete={handleComplete}
        onDelete={handleDelete}
      />

      {/* ─── Bottom Sheet de Snooze (R-06 : 6 options) ───────────────────────── */}
      {showSnoozeSheet && (
        <ReminderSnoozeSheet
          scheduledAt={reminder.scheduledAt}
          insetsBottom={insets.bottom}
          snoozeSheet={snoozeSheet}
          customDate={customDate}
          onSnoozeSheetChange={setSnoozeSheet}
          onCustomDateChange={setCustomDate}
          onClose={() => {
            setShowSnoozeSheet(false);
            setSnoozeSheet('hidden');
          }}
          onSnooze={handleSnooze}
        />
      )}
    </View>
  );
}

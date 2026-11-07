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
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { PersonRepository } from '@/repositories/person-repository';
import { PersonAvatar } from '@/components/people/PersonAvatar';
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
import { MessageKey, TFunction, useDateLocale, useT } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';
type SnoozeSheet = 'hidden' | 'picker';

const PRIORITY_LABELS: Record<string, MessageKey> = {
  URGENT: 'priority.urgent',
  HIGH: 'priority.high',
  NORMAL: 'remNew.priority.normal',
  LOW: 'form.priority.low',
};

const getActionConfig = (
  theme: ThemePalette,
  t: TFunction
): Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> => ({
  CALL: { label: t('people.call'), icon: 'call-outline', color: theme.primary.default },
  MESSAGE: { label: t('reminders.action.MESSAGE'), icon: 'chatbubble-outline', color: theme.tertiary.default },
  EMAIL: { label: t('reminders.action.EMAIL'), icon: 'mail-outline', color: theme.mode === 'light' ? '#0284C7' : '#38BDF8' },
  MEET: { label: t('reminders.action.MEET'), icon: 'people-outline', color: theme.mode === 'light' ? '#D97706' : '#F59E0B' },
  TASK: { label: t('remDetail.actionTask'), icon: 'checkmark-outline', color: theme.success.default },
  NONE: { label: '', icon: 'remove-outline', color: theme.onSurface.variant },
});

export default function ReminderDetailScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeReminderDetailStyles);

  const [state, setState] = useState<ScreenState>('loading');
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [checklist, setChecklist] = useState<ReminderChecklistItem[]>([]);
  const [error, setError] = useState('');
  const [showSnoozeSheet, setShowSnoozeSheet] = useState(false);
  const [snoozeSheet, setSnoozeSheet] = useState<SnoozeSheet>('hidden');
  const [customDate, setCustomDate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    if (!id) {
      setError(t('person.missingId'));
      setState('error');
      return;
    }
    try {
      const [rem, items] = await Promise.all([
        ReminderRepository.findById(id),
        ReminderRepository.findChecklistItems(id),
      ]);
      if (!rem) {
        setError(t('remDetail.notFound'));
        setState('error');
        return;
      }
      setReminder(rem);
      setChecklist(items);

      if (rem.personId) {
        const p = await PersonRepository.findById(rem.personId);
        setPerson(p);
      }

      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      setState('error');
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleComplete() {
    if (!reminder) return;
    await completeReminder(reminder);
    showSnackbar(t('reminders.completed'));
    router.back();
  }

  async function handleSnooze(input: SnoozeInput) {
    if (!reminder) return;
    setShowSnoozeSheet(false);
    setSnoozeSheet('hidden');

    let label: string;
    switch (input.kind) {
      case 'quick':
        label = t('tasks.minutes', { minutes: input.minutes });
        break;
      case 'tomorrow':
        label = t('remDetail.snoozeTomorrow');
        break;
      case 'custom':
        label = format(input.until, t('remDetail.snoozeCustomFormat'), { locale: dateLocale });
        break;
    }

    await snoozeReminder(reminder, input);
    showSnackbar(t('remDetail.snoozed', { label }));
    router.back();
  }

  async function handleDelete() {
    if (!reminder) return;
    const result = await deleteReminder(reminder);
    showSnackbar(t('reminders.deleted'), {
      actionLabel: t('common.undo30'),
      onAction: async () => {
        await result.undo();
      },
      durationMs: 30_000,
    });
    router.back();
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
  const dateStr = format(scheduledDate, t('remNew.dateLabel'), { locale: dateLocale });
  const priorityColor = theme.priority[reminder.priority as keyof typeof theme.priority] ?? theme.priority.NORMAL;
  const actionConfigs = getActionConfig(theme, t);
  const actionInfo = reminder.actionType ? actionConfigs[reminder.actionType] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Barre de Navigation ────────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBtn}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={22} color={theme.onSurface.primary} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>{t('remDetail.title')}</Text>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/reminders/edit/[id]', params: { id: reminder.id } })}
          style={styles.editBtn}
          accessibilityLabel={t('common.edit')}
        >
          <Text style={styles.editLabel}>{t('common.edit')}</Text>
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
                {t(PRIORITY_LABELS[reminder.priority])}
              </Text>
            </View>

            {/* Badge récurrence */}
            {reminder.recurrenceRuleId && (
              <View style={styles.metaPill}>
                <Ionicons name="repeat-outline" size={13} color={theme.tertiary.default} />
                <Text style={styles.metaPillText}>{t('remDetail.recurring')}</Text>
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
                    <Text
                      style={styles.actionCardTarget}
                      onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.id } })}
                      accessibilityRole="link"
                    >
                      {t('remDetail.with', { name: person.displayName })}
                    </Text>
                  ) : null}
                </View>
              </View>

              {person && (person.phone || person.email) ? (
                <TouchableOpacity
                  style={styles.actionExecuteBtn}
                  onPress={handleExecuteAction}
                >
                  <Text style={styles.actionExecuteText}>{t('remDetail.launch')}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
            </GlowCard>
          </View>
        )}

        {/* ─── La personne du rappel, quand aucune action ne la montre déjà ───── */}
        {person && !actionInfo?.label && (
          <View style={styles.actionSection}>
            <GlowCard
              tone="neutral"
              onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.id } })}
              accessibilityLabel={t('remDetail.with', { name: person.displayName })}
            >
              <View style={styles.actionCardRow}>
                <View style={styles.actionCardLeft}>
                  <PersonAvatar name={person.displayName} size={36} />
                  <Text style={styles.actionCardLabel}>{t('remDetail.with', { name: person.displayName })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.onSurface.disabled} />
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
              <Text style={styles.sectionTitle}>{t('remDetail.notes')}</Text>
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
              <Text style={styles.sectionTitle}>{t('remDetail.checklist')}</Text>
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

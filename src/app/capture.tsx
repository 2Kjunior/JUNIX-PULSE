/**
 * Écran R-11 — Quick Capture (Saisie en langage naturel).
 * Permet de saisir librement une intention ("Appeler Sophie demain à 18h"),
 * présente l'interprétation sous forme de chips interactifs avant confirmation.
 * Règle d'or : JAMAIS de création silencieuse, validation explicite obligatoire.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { closeScreen } from '@/utils/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';

import { createReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { useDictation, type DictationProblem } from '@/features/capture/use-dictation';
import { PersonRepository } from '@/repositories/person-repository';
import { Person, ActionType, ReminderPriority } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';

import { parseQuickCapture, type CaptureKind, type CaptureRecurrence } from '@/domain/rules/capture-rules';
import { callAdvice } from '@/domain/rules/person-availability-rules';
import { useDateLocale, useLanguage, useT } from '@/i18n';
import { WEEKDAY_KEYS } from '@/i18n/weekdays';

export default function QuickCaptureScreen() {
  const insets = useSafeAreaInsets();
  const { userTimezone, showSnackbar } = useAppStore();
  const t = useT();
  const dateLocale = useDateLocale();
  const language = useLanguage();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeQuickCaptureStyles);

  const [input, setInput] = useState('');
  const [persons, setPersons] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);

  // Valeurs interprétées / ajustables
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [targetPerson, setTargetPerson] = useState<Person | null>(null);
  const [targetDate, setTargetDate] = useState<Date>(() => addDays(new Date(), 1));
  const [targetTime, setTargetTime] = useState<string>('09:00');
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [cleanTitle, setCleanTitle] = useState('');
  const [kind, setKind] = useState<CaptureKind>('reminder');
  const [recurrence, setRecurrence] = useState<CaptureRecurrence | undefined>(undefined);

  // Charger les contacts pour la reconnaissance
  useEffect(() => {
    async function loadContacts() {
      try {
        const list = await PersonRepository.findAll();
        setPersons(list);
      } catch {
        // Ignorer
      }
    }
    loadContacts();
  }, []);

  // Analyseur en langage naturel (local, déterministe et testé — DEF-10)
  useEffect(() => {
    const parsed = parseQuickCapture(input, persons, new Date(), language);
    setCleanTitle(parsed.cleanTitle);
    setKind(parsed.kind);
    setRecurrence(parsed.recurrence);
    setActionType(parsed.actionType);
    setTargetPerson(parsed.targetPerson ?? null);
    setTargetDate(parsed.targetDate);
    setTargetTime(parsed.targetTime);
    setPriority(parsed.priority);
  }, [input, persons, language]);

  // Construire la date finale combinée
  const computedDateTime = useMemo(() => {
    const [h, m] = targetTime.split(':').map(Number);
    const d = new Date(targetDate);
    d.setHours(h, m, 0, 0);
    return d;
  }, [targetDate, targetTime]);

  // A task has a day, not an hour: only a reminder can be in the past
  const isDateTimePast = kind === 'reminder' && computedDateTime <= new Date();

  // Calling someone who lives elsewhere: what time it will be there, and whether it suits them
  const advice = useMemo(
    () =>
      actionType === 'CALL' && targetPerson && !isDateTimePast
        ? callAdvice(targetPerson, computedDateTime, userTimezone)
        : null,
    [actionType, targetPerson, computedDateTime, userTimezone, isDateTimePast]
  );

  const applySuggestedSlot = (instant: Date) => {
    setTargetDate(instant);
    setTargetTime(format(instant, 'HH:mm'));
  };

  const handleCreate = async () => {
    if (!cleanTitle.trim()) return;
    if (kind === 'task') {
      setSaving(true);
      try {
        await TaskUseCases.createTask({
          title: cleanTitle.trim(),
          scheduledDate: format(targetDate, 'yyyy-MM-dd'),
          priority,
          personId: targetPerson?.id,
        });
        showSnackbar(t('capture.createdTask'));
        closeScreen();
      } catch (e) {
        showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
      } finally {
        setSaving(false);
      }
      return;
    }
    if (computedDateTime <= new Date()) {
      showSnackbar(t('capture.mustBeFuture'));
      return;
    }
    setSaving(true);
    try {
      await createReminder({
        title: cleanTitle.trim(),
        scheduledAt: computedDateTime,
        timezone: userTimezone,
        priority,
        actionType,
        personId: targetPerson?.id,
        recurrenceRule: recurrence,
      });

      showSnackbar(t('capture.created'));
      closeScreen();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
    } finally {
      setSaving(false);
    }
  };

  const cycleAction = () => {
    const actions: ActionType[] = ['NONE', 'CALL', 'MESSAGE', 'EMAIL', 'MEET', 'TASK'];
    const nextIdx = (actions.indexOf(actionType) + 1) % actions.length;
    setActionType(actions[nextIdx]);
  };

  const cyclePriority = () => {
    const priorities: ReminderPriority[] = ['LOW', 'NORMAL', 'URGENT'];
    const nextIdx = (priorities.indexOf(priority) + 1) % priorities.length;
    setPriority(priorities[nextIdx]);
  };

  const cycleDate = () => {
    setTargetDate(prev => addDays(prev, 1));
  };

  // Dictation: what is heard replaces the text, which the parser then reads as if typed
  const onDictationProblem = useCallback(
    (problem: DictationProblem) => showSnackbar(t(DICTATION_PROBLEM_KEYS[problem])),
    [showSnackbar, t]
  );
  const dictation = useDictation(language, setInput, onDictationProblem);

  const recurrenceLabel = (rule: CaptureRecurrence): string => {
    if (rule.type === 'MONTHLY') return t('capture.repeat.monthly', { day: rule.dayOfMonth ?? targetDate.getDate() });
    if (rule.type === 'WEEKLY') {
      // getDay() counts Sunday as 0, the weekday keys go from Monday (1) to Sunday (7)
      const days = (rule.daysOfWeek ?? []).map(day => t(WEEKDAY_KEYS[(day + 6) % 7])).join(', ');
      return t('capture.repeat.weekly', { days });
    }
    return rule.interval > 1 ? t('capture.repeat.everyDays', { count: rule.interval }) : t('capture.repeat.daily');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => closeScreen()}
          accessibilityLabel={t('personNew.close')}
        >
          <Ionicons name="close" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('capture.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          {t('capture.subtitle')}
        </Text>

        {/* Champ de saisie libre */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={t('capture.placeholder')}
            placeholderTextColor={palette.onSurface.disabled}
            autoFocus
            multiline
            numberOfLines={3}
          />
          {dictation.available && (
            <TouchableOpacity
              style={[styles.micButton, dictation.listening && styles.micButtonActive]}
              onPress={dictation.toggle}
              accessibilityRole="button"
              accessibilityLabel={t(dictation.listening ? 'capture.dictation.stop' : 'capture.dictation.start')}
              testID="capture-dictation"
            >
              <Ionicons
                name={dictation.listening ? 'stop' : 'mic-outline'}
                size={20}
                color={dictation.listening ? palette.onSurface.primary : palette.primary.default}
              />
            </TouchableOpacity>
          )}
        </View>
        {dictation.listening && <Text style={styles.hint}>{t('capture.dictation.listening')}</Text>}

        {/* Interprétation en temps réel */}
        {cleanTitle.length > 0 && (
          <View style={styles.interpretationSection}>
            <View style={styles.interpretationHeader}>
              <Ionicons name="sparkles-outline" size={16} color={palette.primary.default} />
              <Text style={styles.interpretationTitle}>{t('capture.understood')}</Text>
            </View>

            <View style={styles.chipsWrap}>
              {/* Chip Tâche ou Rappel : ce qui sera créé */}
              <TouchableOpacity
                style={[styles.chip, styles.chipActiveAction]}
                onPress={() => setKind(current => (current === 'task' ? 'reminder' : 'task'))}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('capture.kindSwitch')}
                testID="capture-kind"
              >
                <Ionicons
                  name={kind === 'task' ? 'checkbox-outline' : 'notifications-outline'}
                  size={15}
                  color={palette.primary.default}
                />
                <Text style={styles.chipText}>{t(kind === 'task' ? 'capture.kind.task' : 'capture.kind.reminder')}</Text>
              </TouchableOpacity>

              {/* Chip Action : pour un rappel seulement, une tâche ne garde pas d'action */}
              {kind === 'reminder' && (
                <TouchableOpacity
                  style={[styles.chip, actionType !== 'NONE' && styles.chipActiveAction]}
                  onPress={cycleAction}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      actionType === 'CALL'
                        ? 'call-outline'
                        : actionType === 'MESSAGE'
                        ? 'chatbubble-outline'
                        : actionType === 'EMAIL'
                        ? 'mail-outline'
                        : actionType === 'MEET'
                        ? 'people-outline'
                        : actionType === 'TASK'
                        ? 'checkbox-outline'
                        : 'ellipse-outline'
                    }
                    size={15}
                    color={palette.primary.default}
                  />
                  <Text style={styles.chipText}>
                    {actionType === 'CALL'
                      ? t('interaction.CALL')
                      : actionType === 'MESSAGE'
                      ? t('interaction.SMS')
                      : actionType === 'EMAIL'
                      ? t('interaction.EMAIL')
                      : actionType === 'MEET'
                      ? t('interaction.IN_PERSON')
                      : actionType === 'TASK'
                      ? t('search.type.task')
                      : t('capture.freeAction')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Chip Personne */}
              {targetPerson && (
                <View style={styles.chipPerson}>
                  <Ionicons name="person-outline" size={14} color={palette.tertiary.default} />
                  <Text style={styles.chipPersonText}>{targetPerson.displayName}</Text>
                </View>
              )}

              {/* Chip Date */}
              <TouchableOpacity style={styles.chip} onPress={cycleDate} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={14} color={palette.tertiary.default} />
                <Text style={styles.chipText}>
                  {format(targetDate, 'EEEE d MMM', { locale: dateLocale })}
                </Text>
              </TouchableOpacity>

              {/* Chip Heure : une tâche a un jour, pas d'heure */}
              {kind === 'reminder' && (
                <View style={styles.chip}>
                  <Ionicons name="time-outline" size={14} color={palette.onSurface.variant} />
                  <Text style={styles.chipText}>{targetTime}</Text>
                </View>
              )}

              {/* Chip Répétition : touchée, elle est retirée */}
              {kind === 'reminder' && recurrence && (
                <TouchableOpacity
                  style={[styles.chip, styles.chipActiveAction]}
                  onPress={() => setRecurrence(undefined)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('capture.repeat.remove')}
                  testID="capture-recurrence"
                >
                  <Ionicons name="repeat-outline" size={14} color={palette.primary.default} />
                  <Text style={styles.chipText}>{recurrenceLabel(recurrence)}</Text>
                  <Ionicons name="close" size={12} color={palette.onSurface.variant} />
                </TouchableOpacity>
              )}

              {/* Chip Priorité */}
              <TouchableOpacity
                style={[
                  styles.chip,
                  priority === 'URGENT' && styles.chipUrgent,
                ]}
                onPress={cyclePriority}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="flag-outline"
                  size={14}
                  color={priority === 'URGENT' ? palette.error.default : palette.onSurface.variant}
                />
                <Text
                  style={[
                    styles.chipText,
                    priority === 'URGENT' && { color: palette.error.default, fontWeight: '700' },
                  ]}
                >
                  {priority === 'URGENT' ? t('priority.urgent') : priority === 'LOW' ? t('capture.gentle') : t('remNew.priority.normal')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              {t('capture.tip')}
            </Text>

            {advice && targetPerson && (
              <View style={styles.adviceBox} testID="capture-call-advice">
                <Ionicons
                  name={advice.kind === 'outside' ? 'moon-outline' : 'earth-outline'}
                  size={16}
                  color={advice.kind === 'outside' ? palette.priority.HIGH : palette.primary.default}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.adviceText}>
                    {advice.kind === 'info' &&
                      t('capture.callInfo', { time: advice.localTime, name: targetPerson.displayName })}
                    {advice.kind === 'inside' &&
                      t('capture.callInside', { time: advice.localTime, name: targetPerson.displayName })}
                    {advice.kind === 'outside' &&
                      t('capture.callOutside', { time: advice.localTime, name: targetPerson.displayName })}
                  </Text>
                  {advice.kind === 'outside' && advice.suggestion && (
                    <TouchableOpacity
                      onPress={() => advice.suggestion && applySuggestedSlot(advice.suggestion.instant)}
                      accessibilityRole="button"
                      testID="capture-use-suggested-slot"
                    >
                      <Text style={styles.adviceAction}>
                        {t('capture.callSuggestion', {
                          here: `${t(WEEKDAY_KEYS[advice.suggestion.here.weekday - 1])} ${advice.suggestion.here.time}`,
                          there: advice.suggestion.there.time,
                        })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {isDateTimePast && (
              <Text style={[styles.hint, { color: palette.error.default, marginTop: 8 }]}>
                {t('capture.pastWarning')}
              </Text>
            )}
          </View>
        )}

        {/* Bouton de confirmation unique avec dégradé */}
        <View style={styles.actionBlock}>
          <Button
            label={t(kind === 'task' ? 'capture.confirmTask' : 'capture.confirm')}
            onPress={handleCreate}
            variant="primary"
            size="lg"
            loading={saving}
            disabled={!cleanTitle.trim()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const DICTATION_PROBLEM_KEYS = {
  permission: 'capture.dictation.permission',
  language: 'capture.dictation.language',
  failed: 'capture.dictation.failed',
} as const;

const makeQuickCaptureStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
    },
    closeBtn: {
      padding: Spacing.xs,
    },
    headerTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    subtitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    inputContainer: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    textInput: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    micButton: {
      alignSelf: 'flex-end',
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.primary.default,
      backgroundColor: theme.primary.container,
    },
    micButtonActive: {
      backgroundColor: theme.error.default,
      borderColor: theme.error.default,
    },
    adviceBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      backgroundColor: theme.surface.high,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    adviceText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    adviceAction: {
      ...Typography.labelMedium,
      color: theme.primary.default,
      fontWeight: '700',
    },
    interpretationSection: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: Spacing.md,
    },
    interpretationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    interpretationTitle: {
      ...Typography.titleMedium,
      color: theme.primary.default,
      fontWeight: '600',
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.high,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: 6,
    },
    chipActiveAction: {
      borderColor: theme.primary.default,
      backgroundColor: theme.primary.container,
    },
    chipPerson: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.tertiary.container,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.tertiary.default,
      gap: 6,
    },
    chipPersonText: {
      ...Typography.labelMedium,
      color: theme.tertiary.default,
      fontWeight: '600',
    },
    chipUrgent: {
      borderColor: theme.error.default,
      backgroundColor: theme.error.container,
    },
    chipText: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
    },
    hint: {
      ...Typography.labelSmall,
      color: theme.onSurface.disabled,
      fontSize: 11,
    },
    actionBlock: {
      marginTop: Spacing.md,
    },
  });

/**
 * The "To do" form (study 001, 12.2 "2-B"; sheet 012), in cyan: What → When → Alert → With whom
 * → More options, in the order of the registry (constants/item-forms). Saved without an alert it
 * is a task; with one, a reminder: the kinds kept in the data (constants/item-kinds).
 */

import { Ionicons } from '@expo/vector-icons';
import { addDays, addWeeks, format, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  ChoiceChips,
  DictateAll,
  DictatedInput,
  FieldLabel,
  FormSection,
  FormShell,
  MoreOptions,
  SwitchRow,
  type Choice,
  type IconName,
} from '@/components/create/form/FormBricks';
import { PersonField } from '@/components/people/PersonField';
import { TagField } from '@/components/tags/TagField';
import { DeadlineField } from '@/components/tasks/DeadlineField';
import {
  alertMoment,
  dayParam,
  hourParam,
  TODO_DURATION_OPTIONS,
  visibleMoreFields,
  visibleSections,
  type FormSectionId,
  type MoreFieldId,
} from '@/constants/item-forms';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Radius, Spacing } from '@/constants/theme';
import type { Person, Reminder, ReminderPriority } from '@/domain/entities';
import { todoFromSentence } from '@/domain/rules/form-dictation-rules';
import { offerExactAlarmsForConfirmation } from '@/features/reminders/offer-exact-alarms';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT, type MessageKey } from '@/i18n';
import { PersonRepository } from '@/repositories/person-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';
import { createReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

type ActionType = Reminder['actionType'];
type Recurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const PRIORITIES: readonly { value: ReminderPriority; labelKey: MessageKey }[] = [
  { value: 'LOW', labelKey: 'form.priority.low' },
  { value: 'NORMAL', labelKey: 'priority.normal' },
  { value: 'HIGH', labelKey: 'priority.high' },
  { value: 'URGENT', labelKey: 'form.priority.urgentF' },
];

const ACTIONS: readonly { value: ActionType; labelKey: MessageKey; icon: IconName }[] = [
  { value: 'NONE', labelKey: 'form.none', icon: 'remove-outline' },
  { value: 'CALL', labelKey: 'people.call', icon: 'call-outline' },
  { value: 'MESSAGE', labelKey: 'reminders.action.MESSAGE', icon: 'chatbubble-outline' },
  { value: 'EMAIL', labelKey: 'reminders.action.EMAIL', icon: 'mail-outline' },
  { value: 'MEET', labelKey: 'remNew.action.meet', icon: 'people-outline' },
  { value: 'TASK', labelKey: 'reminders.action.TASK', icon: 'checkmark-outline' },
];

const RECURRENCES: readonly { value: Recurrence; labelKey: MessageKey }[] = [
  { value: 'DAILY', labelKey: 'remNew.daily' },
  { value: 'WEEKLY', labelKey: 'remNew.weekly' },
  { value: 'MONTHLY', labelKey: 'remNew.monthly' },
];

const pad = (value: number) => String(value).padStart(2, '0');

export interface TodoFormProps {
  /** Opened as a reminder ("With an alert", a Planning slot): the alert is on. */
  initialAlert?: boolean;
  defaultDate?: string;
  defaultHour?: string;
  /** Opened from the page of a person: it is already about them. */
  personId?: string;
}

export function TodoForm({ initialAlert = false, defaultDate, defaultHour, personId }: TodoFormProps) {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const { showSnackbar } = useAppStore();
  const accent = itemFamilyColor(palette, 'todo');

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const nextMonday = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [day, setDay] = useState<string | undefined>(() => dayParam(defaultDate) ?? (initialAlert ? today : undefined));
  const [alert, setAlert] = useState(initialAlert);
  const [alertTime, setAlertTime] = useState(() => ({
    hour: hourParam(defaultHour) ?? (new Date().getHours() + 1) % 24,
    minute: 0,
  }));
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [repeat, setRepeat] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>('DAILY');
  const [confirm, setConfirm] = useState(false);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [personIds, setPersonIds] = useState<string[]>(() => (personId ? [personId] : []));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<'day' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);
  // The people, so that "Appeler Paul" in a dictated sentence finds Paul
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    PersonRepository.findAll()
      .then(setPersons)
      .catch(() => {});
  }, []);

  // "Dictate everything" (sheets 013 and 014): the sentence fills and touches every field it
  // speaks of; "Compris" lists them so the person checks before adding
  const [understood, setUnderstood] = useState<string[]>([]);
  const applySentence = (sentence: string) => {
    const fill = todoFromSentence(sentence, persons, new Date(), language);
    setTitle(fill.title);
    if (fill.title) setTitleError('');
    setDay(fill.day);
    setAlert(fill.alert);
    setAlertTime(fill.time);
    setPriority(fill.priority);
    setActionType(fill.actionType);
    setRepeat(Boolean(fill.recurrence));
    if (fill.recurrence) setRecurrence(fill.recurrence);
    setConfirm(fill.confirm);
    if (fill.dueDate) setDueDate(fill.dueDate);
    if (fill.estimatedMinutes) setEstimatedMinutes(fill.estimatedMinutes);
    if (fill.notes) setNotes(fill.notes);
    const personId = fill.personId;
    if (personId) setPersonIds(ids => (ids.includes(personId) ? ids : [personId, ...ids]));
    const shortDay = (ymd: string) => format(new Date(`${ymd}T12:00:00`), 'EEE d MMM', { locale: dateLocale });
    const priorityKey = PRIORITIES.find(option => option.value === fill.priority)?.labelKey;
    const actionKey = ACTIONS.find(option => option.value === fill.actionType)?.labelKey;
    const recurrenceKey = RECURRENCES.find(option => option.value === fill.recurrence)?.labelKey;
    setUnderstood(
      [
        fill.day ? shortDay(fill.day) : '',
        fill.alert ? `${pad(fill.time.hour)}:${pad(fill.time.minute)}` : '',
        fill.priority !== 'NORMAL' && priorityKey ? t(priorityKey) : '',
        fill.actionType !== 'NONE' && actionKey ? t(actionKey) : '',
        recurrenceKey ? t(recurrenceKey) : '',
        fill.confirm ? t('confirmReminder.label') : '',
        fill.dueDate ? t('itemForm.understoodDeadline', { date: shortDay(fill.dueDate) }) : '',
        fill.estimatedMinutes ? durationLabel(fill.estimatedMinutes) : '',
        persons.find(person => person.id === personId)?.displayName ?? '',
        fill.notes ? t('itemForm.understoodNote') : '',
      ].filter(Boolean)
    );
  };

  const customDay = day && ![today, tomorrow, nextMonday].includes(day) ? day : undefined;
  const dayChoice = day === undefined ? 'none' : customDay ? 'pick' : day;
  const dayOptions: Choice<string>[] = [
    ...(alert ? [] : [{ value: 'none', label: t('itemForm.noDay'), icon: 'file-tray-outline' as const }]),
    { value: today, label: t('common.today'), icon: 'today-outline' },
    { value: tomorrow, label: t('reminders.section.tomorrow'), icon: 'arrow-forward-outline' },
    { value: nextMonday, label: t('taskNew.nextMonday'), icon: 'calendar-outline' },
    {
      value: 'pick',
      label: customDay
        ? format(new Date(`${customDay}T12:00:00`), t('form.dateFormat'), { locale: dateLocale })
        : t('form.pickDate'),
      icon: 'calendar-number-outline',
    },
  ];
  const priorityOptions: Choice<ReminderPriority>[] = PRIORITIES.map(option => ({ value: option.value, label: t(option.labelKey) }));
  const durationLabel = (minutes: number | undefined) => {
    if (minutes === undefined) return t('form.none');
    if (minutes === 60) return t('taskNew.hours1');
    if (minutes === 120) return t('taskNew.hours2');
    return `${minutes} min`;
  };

  const toggleAlert = (on: boolean) => {
    setAlert(on);
    // An alert rings on a day: today when none was chosen
    if (on && !day) setDay(today);
  };

  const addSubtask = () => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    setSubtasks(previous => [...previous, trimmed]);
    setSubtaskInput('');
  };

  async function handleSave() {
    if (!title.trim()) {
      setTitleError(t('taskNew.titleRequired'));
      return;
    }
    const scheduledAt = alertMoment(day, alertTime, new Date());
    if (alert && scheduledAt <= new Date()) {
      showSnackbar(t('remNew.mustBeFuture'));
      return;
    }
    setSaving(true);
    try {
      if (alert) {
        const settings = await SettingsRepository.get();
        await createReminder({
          title: title.trim(),
          notes: notes.trim() || undefined,
          scheduledAt,
          timezone: settings.timezone,
          priority,
          actionType,
          personIds,
          tagIds,
          requiresConfirmation: confirm,
          recurrenceRule: repeat
            ? { type: recurrence, interval: 1, dayOfMonth: recurrence === 'MONTHLY' ? scheduledAt.getDate() : undefined }
            : undefined,
        });
        showSnackbar(t('remNew.created'));
      } else {
        await TaskUseCases.createTask({
          title: title.trim(),
          description: notes.trim() || undefined,
          priority,
          scheduledDate: day,
          dueDate,
          estimatedMinutes,
          subtasks,
          personIds,
          tagIds,
        });
        showSnackbar(t('taskNew.created'));
      }
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
    } finally {
      setSaving(false);
    }
  }

  const renderMore = (field: MoreFieldId) => {
    switch (field) {
      case 'priority':
        return (
          <View key={field}>
            <FieldLabel label={t('itemForm.priority')} />
            <ChoiceChips options={priorityOptions} value={priority} onChange={setPriority} accent={accent} testIDPrefix="todo-priority" />
          </View>
        );
      case 'deadline':
        return <DeadlineField key={field} value={dueDate} onChange={setDueDate} />;
      case 'duration':
        return (
          <View key={field}>
            <FieldLabel label={t('taskNew.durationHeader')} hint={t('itemForm.durationHint')} />
            <ChoiceChips
              options={TODO_DURATION_OPTIONS.map(minutes => ({ value: minutes, label: durationLabel(minutes) }))}
              value={estimatedMinutes}
              onChange={setEstimatedMinutes}
              accent={accent}
              testIDPrefix="todo-duration"
            />
          </View>
        );
      case 'subtasks':
        return (
          <View key={field} style={{ gap: Spacing.xs }}>
            <FieldLabel label={t('taskNew.subtasksHeader', { count: subtasks.length })} />
            {subtasks.map((subtask, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 }}>
                <Ionicons name="ellipse-outline" size={16} color={accent} />
                <Text style={[formStyles.fieldLabel, { flex: 1 }]}>{subtask}</Text>
                <TouchableOpacity
                  onPress={() => setSubtasks(previous => previous.filter((_, i) => i !== index))}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.removeSubtask', { title: subtask })}
                  style={{ padding: Spacing.sm }}
                >
                  <Ionicons name="close-circle" size={18} color={palette.error.default} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <TextInput
                style={[formStyles.inputBox, { flex: 1 }]}
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                placeholder={t('taskNew.subtaskPlaceholder')}
                placeholderTextColor={palette.onSurface.disabled}
                onSubmitEditing={addSubtask}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addSubtask}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.addSubtask')}
                style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={20} color={palette.mode === 'light' ? '#FFFFFF' : '#141317'} />
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'tags':
        return <TagField key={field} selectedIds={tagIds} onChange={setTagIds} />;
      default:
        return null;
    }
  };

  const renderSection = (section: FormSectionId) => {
    switch (section) {
      case 'what':
        return (
          <FormSection icon="create-outline" title={t('itemForm.what')} accent={accent}>
            <DictatedInput
              value={title}
              onChangeText={text => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
              accent={accent}
              placeholder={t('itemForm.todoPlaceholder')}
              inputStyle={formStyles.titleInput}
              autoFocus
              maxLength={120}
              testID="todo-title"
            />
            {titleError ? <Text style={formStyles.errorText}>{titleError}</Text> : null}
            <DictatedInput
              value={notes}
              onChangeText={setNotes}
              accent={accent}
              placeholder={t('itemForm.notesPlaceholder')}
              inputStyle={formStyles.notesInput}
              multiline
              maxLength={500}
              testID="todo-notes"
              small
            />
          </FormSection>
        );
      case 'when':
        return (
          <FormSection icon="calendar-outline" title={t('itemForm.when')} accent={accent}>
            <ChoiceChips
              options={dayOptions}
              value={dayChoice}
              onChange={value => {
                if (value === 'pick') setPicker('day');
                else setDay(value === 'none' ? undefined : value);
              }}
              accent={accent}
              testIDPrefix="todo-day"
            />
          </FormSection>
        );
      case 'alert':
        return (
          <FormSection icon="notifications-outline" title={t('itemForm.alert')} accent={accent}>
            <SwitchRow
              label={t('itemForm.alertSwitch')}
              hint={t('itemForm.alertHint')}
              value={alert}
              onChange={toggleAlert}
              accent={accent}
              testID="todo-alert"
            />
            {alert ? (
              <View style={{ gap: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setPicker('time')}
                  accessibilityRole="button"
                  accessibilityLabel={t('itemForm.alertTime', { time: `${pad(alertTime.hour)}:${pad(alertTime.minute)}` })}
                  testID="todo-alert-time"
                  style={[formStyles.selectorRow, { minHeight: 44 }]}
                >
                  <View style={formStyles.selectorLeft}>
                    <Ionicons name="time-outline" size={18} color={accent} />
                    <Text style={formStyles.selectorValue}>
                      {t('itemForm.alertTime', { time: `${pad(alertTime.hour)}:${pad(alertTime.minute)}` })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
                </TouchableOpacity>
                <FieldLabel label={t('itemForm.priority')} hint={t('itemForm.priorityHint')} />
                <ChoiceChips options={priorityOptions} value={priority} onChange={setPriority} accent={accent} testIDPrefix="todo-priority" />
                <FieldLabel label={t('itemForm.action')} />
                <ChoiceChips
                  options={ACTIONS.map(option => ({ value: option.value, label: t(option.labelKey), icon: option.icon }))}
                  value={actionType}
                  onChange={setActionType}
                  accent={accent}
                  testIDPrefix="todo-action"
                />
                <SwitchRow label={t('remNew.repeat')} hint={t('remNew.repeatHelper')} value={repeat} onChange={setRepeat} accent={accent} />
                {repeat ? (
                  <ChoiceChips
                    options={RECURRENCES.map(option => ({ value: option.value, label: t(option.labelKey) }))}
                    value={recurrence}
                    onChange={setRecurrence}
                    accent={accent}
                  />
                ) : null}
                <SwitchRow
                  label={t('confirmReminder.label')}
                  hint={t('confirmReminder.helper')}
                  value={confirm}
                  onChange={value => {
                    setConfirm(value);
                    if (value) void offerExactAlarmsForConfirmation();
                  }}
                  accent={accent}
                  testID="reminder-confirmation"
                />
              </View>
            ) : null}
          </FormSection>
        );
      case 'who':
        return <PersonField selectedIds={personIds} onChange={setPersonIds} multiple />;
      case 'more':
        return <MoreOptions accent={accent}>{visibleMoreFields('todo', { alert }).map(renderMore)}</MoreOptions>;
      default:
        return null;
    }
  };

  return (
    <FormShell
      family="todo"
      // The header says whether it will ring (sheet 014)
      icon={alert ? 'notifications' : undefined}
      title={t(alert ? 'itemForm.todo.titleAlert' : 'itemForm.todo.title')}
      subtitle={t(alert ? 'itemForm.todo.subtitleAlert' : 'itemForm.todo.subtitle')}
      saveLabel={t('itemForm.todo.submit')}
      saving={saving}
      onSave={handleSave}
      testID="todo-form"
    >
      <DictateAll
        accent={accent}
        example={t('itemForm.dictateTodoExample')}
        onSentence={applySentence}
        understood={understood}
      />
      {visibleSections('todo', { alert }).map(section => (
        <React.Fragment key={section}>{renderSection(section)}</React.Fragment>
      ))}
      <DateTimePickerModal
        isVisible={picker !== null}
        mode={picker === 'time' ? 'time' : 'date'}
        date={picker === 'time' ? alertMoment(day, alertTime, new Date()) : new Date(`${day ?? today}T12:00:00`)}
        onConfirm={picked => {
          if (picker === 'time') setAlertTime({ hour: picked.getHours(), minute: picked.getMinutes() });
          else setDay(format(picked, 'yyyy-MM-dd'));
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
        confirmTextIOS={t('personNew.confirm')}
        cancelTextIOS={t('form.cancel')}
        locale={language === 'fr' ? 'fr_FR' : 'en_US'}
      />
    </FormShell>
  );
}

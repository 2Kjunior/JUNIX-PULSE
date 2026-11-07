/**
 * Détail et Édition d'une tâche.
 * Permet de modifier la tâche, de gérer ses sous-tâches en direct,
 * de basculer son statut et de la supprimer avec Undo (30s).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PersonField } from '@/components/people/PersonField';
import { DeadlineField } from '@/components/tasks/DeadlineField';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, addDays } from 'date-fns';

import { TaskRepository } from '@/repositories/task-repository';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { Task, Subtask, TaskStatus, ReminderPriority } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { makeTaskDetailStyles } from '@/styles/tasks/task-detail-styles';
import { useDateLocale, useLanguage, useT } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';

export default function TaskDetailScreen() {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeTaskDetailStyles);
  const isLight = theme.mode === 'light';

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [error, setError] = useState('');

  // Form local state for editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [scheduledDateStr, setScheduledDateStr] = useState<string | undefined>(undefined);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const statusLabels: Record<TaskStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = useMemo(() => ({
    INBOX: { label: t('taskDetail.status.INBOX'), color: theme.onSurface.variant, icon: 'file-tray-outline' },
    SCHEDULED: { label: t('taskDetail.status.SCHEDULED'), color: theme.primary.default, icon: 'calendar-outline' },
    IN_PROGRESS: { label: t('taskDetail.status.IN_PROGRESS'), color: theme.tertiary.default, icon: 'time-outline' },
    COMPLETED: { label: t('taskDetail.status.COMPLETED'), color: theme.success.default, icon: 'checkmark-circle-outline' },
    POSTPONED: { label: t('taskDetail.status.POSTPONED'), color: theme.priority.HIGH, icon: 'arrow-forward-circle-outline' },
  }), [theme, t]);

  const priorityOptions: { key: ReminderPriority; label: string; color: string }[] = useMemo(() => [
    { key: 'LOW', label: t('form.priority.low'), color: theme.onSurface.variant },
    { key: 'NORMAL', label: t('priority.normal'), color: theme.primary.default },
    { key: 'HIGH', label: t('priority.high'), color: theme.priority.HIGH },
    { key: 'URGENT', label: t('form.priority.urgentF'), color: theme.error.default },
  ], [theme, t]);

  const load = useCallback(async () => {
    if (!id) {
      setError(t('taskDetail.missingId'));
      setScreenState('error');
      return;
    }
    try {
      const [loaded, subs] = await Promise.all([
        TaskRepository.findById(id),
        TaskRepository.findSubtasks(id),
      ]);
      if (!loaded) {
        setError(t('taskDetail.notFound'));
        setScreenState('error');
        return;
      }
      setTask(loaded);
      setSubtasks(subs);

      // Population du formulaire local
      setTitle(loaded.title);
      setDescription(loaded.description ?? '');
      setPriority(loaded.priority);
      setScheduledDateStr(loaded.scheduledDate);
      setEstimatedMinutes(loaded.estimatedMinutes);
      setPersonIds(await TaskRepository.findPersonIds(loaded.id));
      setDueDate(loaded.dueDate);

      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('taskDetail.loadError'));
      setScreenState('error');
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Handlers sous-tâches ───────────────────────────────────────────────────

  async function handleToggleSubtask(subtaskId: string, currentCompleted: boolean) {
    if (!id) return;
    const nextCompleted = !currentCompleted;
    setSubtasks(prev =>
      prev.map(s => (s.id === subtaskId ? { ...s, isCompleted: nextCompleted } : s))
    );
    await TaskUseCases.toggleSubtask(subtaskId, nextCompleted);
  }

  async function handleAddSubtask() {
    if (!id || !newSubtaskInput.trim()) return;
    const added = await TaskUseCases.addSubtask(id, newSubtaskInput);
    setSubtasks(prev => [...prev, added]);
    setNewSubtaskInput('');
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const deleted = subtasks.find(s => s.id === subtaskId);
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    await TaskUseCases.deleteSubtask(subtaskId);
    showSnackbar(t('taskDetail.subtaskDeleted'), {
      actionLabel: t('taskDetail.undo'),
      onAction: async () => {
        if (deleted && id) {
          await TaskUseCases.addSubtask(id, deleted.title);
          load();
        }
      },
    });
  }

  // ─── Actions Tâche ─────────────────────────────────────────────────────────

  async function handleToggleStatus() {
    if (!task) return;
    const newStatus = await TaskUseCases.toggleComplete(task.id);
    const isCompleted = newStatus === 'COMPLETED';

    showSnackbar(isCompleted ? t('taskDetail.completed') : t('taskDetail.reopened'), {
      actionLabel: t('taskDetail.undo'),
      onAction: async () => {
        await TaskUseCases.toggleComplete(task.id);
        load();
      },
    });

    router.back();
  }

  async function handleSave() {
    if (!task || !title.trim()) return;
    setSaving(true);
    try {
      await TaskUseCases.updateTask({
        id: task.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        scheduledDate: scheduledDateStr,
        estimatedMinutes: estimatedMinutes,
        personIds,
        dueDate: dueDate ?? null,
        status:
          task.status === 'INBOX' && scheduledDateStr
            ? 'SCHEDULED'
            : task.status === 'SCHEDULED' && !scheduledDateStr
            ? 'INBOX'
            : task.status,
      });

      showSnackbar(t('taskDetail.updated'));
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('taskDetail.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    await TaskUseCases.deleteTask(task.id);
    showSnackbar(t('tasks.deleted'), {
      actionLabel: t('common.undo30'),
      onAction: async () => {
        await TaskUseCases.undoDelete(task.id);
        load();
      },
      durationMs: 30000,
    });
    router.back();
  }

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error' || !task)
    return <ErrorState message={error} onRetry={load} />;

  const statusConfig = statusLabels[task.status];
  const completedSubtasksCount = subtasks.filter(s => s.isCompleted).length;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={24} color={theme.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('taskDetail.title')}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={t('taskDetail.deleteA11y')}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error.default} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Statut Badge & Bouton de bascule */}
        <GlowCard tone="neutral">
          <View style={styles.statusRowInner}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.color + '20' },
              ]}
            >
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>

            <Button
              label={task.status === 'COMPLETED' ? t('taskDetail.reopenButton') : t('taskDetail.completeButton')}
              onPress={handleToggleStatus}
              variant={task.status === 'COMPLETED' ? 'secondary' : 'primary'}
              size="sm"
            />
          </View>
        </GlowCard>

        {/* Lancer une session Focus Pomodoro sur cette tâche */}
        {task.status !== 'COMPLETED' && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.surface.container,
              padding: Spacing.md,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: theme.outline.variant,
            }}
            onPress={() =>
              router.push({
                pathname: '/focus' as any,
                params: { taskId: task.id, taskTitle: task.title },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t('taskDetail.focusA11y')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="timer-outline" size={20} color={theme.tertiary.default} />
              <Text style={{ ...Typography.labelLarge, color: theme.onSurface.primary }}>
                {t('taskDetail.focusLabel')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.onSurface.inactive} />
          </TouchableOpacity>
        )}

        {/* Titre */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('taskDetail.titleLabel')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('taskDetail.titlePlaceholder')}
            placeholderTextColor={theme.onSurface.disabled}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('taskDetail.descriptionLabel')}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('taskDetail.descriptionPlaceholder')}
            placeholderTextColor={theme.onSurface.disabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Priorité */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('taskDetail.priorityLabel')}</Text>
          <View style={styles.chipRow}>
            {priorityOptions.map(opt => {
              const isSelected = priority === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: opt.color + '22', borderColor: opt.color },
                  ]}
                  onPress={() => setPriority(opt.key)}
                >
                  <Text style={[styles.chipText, isSelected && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Planification de Date */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('taskDetail.scheduleLabel')}</Text>
          <View style={styles.chipRowWrap}>
            <TouchableOpacity
              style={[styles.chip, !scheduledDateStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(undefined)}
              accessibilityRole="radio"
              accessibilityState={{ selected: !scheduledDateStr }}
              accessibilityLabel={`Inbox${!scheduledDateStr ? ', ' + t('common.selected') : ''}`}
            >
              <Ionicons
                name="file-tray-outline"
                size={14}
                color={!scheduledDateStr ? (isLight ? theme.primary.onContainer : theme.primary.onContainer) : theme.onSurface.variant}
              />
              <Text style={[styles.chipText, !scheduledDateStr && styles.chipTextActive]}>
                {t('tasks.filter.inbox')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === todayStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(todayStr)}
              accessibilityRole="radio"
              accessibilityState={{ selected: scheduledDateStr === todayStr }}
              accessibilityLabel={`${t('common.today')}${scheduledDateStr === todayStr ? ', ' + t('common.selected') : ''}`}
            >
              <Ionicons
                name="today-outline"
                size={14}
                color={scheduledDateStr === todayStr ? (isLight ? theme.primary.onContainer : theme.primary.onContainer) : theme.onSurface.variant}
              />
              <Text style={[styles.chipText, scheduledDateStr === todayStr && styles.chipTextActive]}>
                {t('common.today')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === tomorrowStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(tomorrowStr)}
              accessibilityRole="radio"
              accessibilityState={{ selected: scheduledDateStr === tomorrowStr }}
              accessibilityLabel={`${t('reminders.section.tomorrow')}${scheduledDateStr === tomorrowStr ? ', ' + t('common.selected') : ''}`}
            >
              <Ionicons
                name="arrow-forward-outline"
                size={14}
                color={scheduledDateStr === tomorrowStr ? (isLight ? theme.primary.onContainer : theme.primary.onContainer) : theme.onSurface.variant}
              />
              <Text style={[styles.chipText, scheduledDateStr === tomorrowStr && styles.chipTextActive]}>
                {t('reminders.section.tomorrow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                !!scheduledDateStr &&
                  ![todayStr, tomorrowStr].includes(scheduledDateStr) &&
                  styles.chipActive,
              ]}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={
                scheduledDateStr && ![todayStr, tomorrowStr].includes(scheduledDateStr)
                  ? t('taskDetail.customDateA11y', {
                      date: format(new Date(scheduledDateStr + 'T12:00:00'), t('form.dateFormat'), { locale: dateLocale }),
                    })
                  : t('taskDetail.pickDateA11y')
              }
            >
              <Ionicons name="calendar-outline" size={16} color={theme.onSurface.variant} />
              <Text style={styles.chipText}>
                {scheduledDateStr && ![todayStr, tomorrowStr].includes(scheduledDateStr)
                  ? format(new Date(scheduledDateStr + 'T12:00:00'), t('form.dateFormat'), { locale: dateLocale })
                  : t('taskDetail.otherDate')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* À rendre le… */}
        <View style={styles.field}>
          <DeadlineField value={dueDate} onChange={setDueDate} />
        </View>

        {/* Avec qui ? */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('personField.header')}</Text>
          <PersonField selectedIds={personIds} onChange={setPersonIds} look="bare" multiple />
        </View>

        {/* Sous-tâches */}
        <View style={styles.field}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.label}>{t('taskDetail.subtasks')}</Text>
            {subtasks.length > 0 && (
              <Text style={styles.subtaskCounter}>
                {t('taskDetail.subtasksDone', { done: completedSubtasksCount, total: subtasks.length })}
              </Text>
            )}
          </View>

          {/* Liste des sous-tâches */}
          {subtasks.map(s => (
            <View key={s.id} style={styles.subtaskWrapper}>
              <GlowCard tone="neutral">
                <View style={styles.subtaskRowInner}>
                  <TouchableOpacity
                    onPress={() => handleToggleSubtask(s.id, s.isCompleted)}
                    style={styles.subtaskCheck}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.isCompleted }}
                    accessibilityLabel={
                      s.isCompleted
                        ? t('taskDetail.markSubtaskUndone', { title: s.title })
                        : t('taskDetail.markSubtaskDone', { title: s.title })
                    }
                  >
                    <Ionicons
                      name={s.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={s.isCompleted ? theme.success.default : theme.onSurface.disabled}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.subtaskTitle,
                      s.isCompleted && styles.subtaskTitleCompleted,
                    ]}
                  >
                    {s.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteSubtask(s.id)}
                    style={styles.subtaskDelete}
                    accessibilityRole="button"
                    accessibilityLabel={t('taskDetail.deleteSubtaskA11y', { title: s.title })}
                  >
                    <Ionicons name="close" size={18} color={theme.onSurface.disabled} />
                  </TouchableOpacity>
                </View>
              </GlowCard>
            </View>
          ))}

          {/* Champ d'ajout sous-tâche inline */}
          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={styles.subtaskInput}
              value={newSubtaskInput}
              onChangeText={setNewSubtaskInput}
              placeholder={t('taskDetail.addSubtaskPlaceholder')}
              placeholderTextColor={theme.onSurface.disabled}
              onSubmitEditing={handleAddSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.subtaskAddBtn}
              onPress={handleAddSubtask}
              accessibilityRole="button"
              accessibilityLabel={t('taskDetail.addSubtaskA11y')}
            >
              <Ionicons name="add" size={20} color={theme.primary.on} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton Enregistrer */}
        <Button
          label={t('taskDetail.saveChanges')}
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Modal Date Picker */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={scheduledDateStr ? new Date(scheduledDateStr + 'T12:00:00') : new Date()}
        onConfirm={d => {
          setShowDatePicker(false);
          setScheduledDateStr(format(d, 'yyyy-MM-dd'));
        }}
        onCancel={() => setShowDatePicker(false)}
        confirmTextIOS={t('personNew.confirm')}
        cancelTextIOS={t('form.cancel')}
        locale={language === 'fr' ? 'fr_FR' : 'en_US'}
      />
    </KeyboardAvoidingView>
  );
}

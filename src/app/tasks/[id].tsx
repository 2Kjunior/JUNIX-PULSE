/**
 * The page of a task: its status, Focus, what it says and its subtasks, ticked here.
 * Changing the task opens the "To do" form that created it (sheet 022, /tasks/edit/[id]); the
 * page reads the task again when it comes back to the front.
 */

import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { TaskRepository } from '@/repositories/task-repository';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { Task, Subtask, TaskStatus } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { makeTaskDetailStyles } from '@/styles/tasks/task-detail-styles';
import { ShareItemCard } from '@/features/share/ShareItemCard';
import { useDateLocale, useT, type MessageKey } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';

const PRIORITY_KEYS: Record<Task['priority'], MessageKey> = {
  LOW: 'form.priority.low',
  NORMAL: 'priority.normal',
  HIGH: 'priority.high',
  URGENT: 'form.priority.urgentF',
};

export default function TaskDetailScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeTaskDetailStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [error, setError] = useState('');
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const statusLabels: Record<TaskStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = useMemo(() => ({
    INBOX: { label: t('taskDetail.status.INBOX'), color: theme.onSurface.variant, icon: 'file-tray-outline' },
    SCHEDULED: { label: t('taskDetail.status.SCHEDULED'), color: theme.primary.default, icon: 'calendar-outline' },
    IN_PROGRESS: { label: t('taskDetail.status.IN_PROGRESS'), color: theme.tertiary.default, icon: 'time-outline' },
    COMPLETED: { label: t('taskDetail.status.COMPLETED'), color: theme.success.default, icon: 'checkmark-circle-outline' },
    POSTPONED: { label: t('taskDetail.status.POSTPONED'), color: theme.priority.HIGH, icon: 'arrow-forward-circle-outline' },
  }), [theme, t]);

  const load = useCallback(async () => {
    if (!id) {
      setError(t('taskDetail.missingId'));
      setScreenState('error');
      return;
    }
    try {
      const [loaded, subs] = await Promise.all([TaskRepository.findById(id), TaskRepository.findSubtasks(id)]);
      if (!loaded) {
        setError(t('taskDetail.notFound'));
        setScreenState('error');
        return;
      }
      setTask(loaded);
      setSubtasks(subs);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('taskDetail.loadError'));
      setScreenState('error');
    }
  }, [id, t]);

  // Read again on coming back from the form, so the page shows what was just saved
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // ─── Subtasks ──────────────────────────────────────────────────────────────

  async function handleToggleSubtask(subtaskId: string, currentCompleted: boolean) {
    if (!id) return;
    const nextCompleted = !currentCompleted;
    setSubtasks(prev => prev.map(s => (s.id === subtaskId ? { ...s, isCompleted: nextCompleted } : s)));
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

  // ─── Task ──────────────────────────────────────────────────────────────────

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
  if (screenState === 'error' || !task) return <ErrorState message={error} onRetry={load} />;

  const statusConfig = statusLabels[task.status];
  const completedSubtasksCount = subtasks.filter(s => s.isCompleted).length;
  const longDay = (ymd: string) => format(new Date(`${ymd}T12:00:00`), t('form.dateFormat'), { locale: dateLocale });
  // What the task says, one line each: only what was given
  const facts: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: task.scheduledDate ? 'calendar-outline' : 'file-tray-outline', text: task.scheduledDate ? longDay(task.scheduledDate) : t('itemForm.noDay') },
    ...(task.dueDate ? [{ icon: 'flag-outline' as const, text: t('itemForm.understoodDeadline', { date: longDay(task.dueDate) }) }] : []),
    ...(task.estimatedMinutes ? [{ icon: 'timer-outline' as const, text: `${task.estimatedMinutes} min` }] : []),
    ...(task.priority !== 'NORMAL' ? [{ icon: 'alert-circle-outline' as const, text: t(PRIORITY_KEYS[task.priority]) }] : []),
  ];

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={theme.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('taskDetail.title')}</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push({ pathname: '/tasks/edit/[id]', params: { id: task.id } })}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            testID="task-edit"
          >
            <Ionicons name="create-outline" size={20} color={theme.onSurface.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete} accessibilityRole="button" accessibilityLabel={t('taskDetail.deleteA11y')}>
            <Ionicons name="trash-outline" size={20} color={theme.error.default} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlowCard tone="neutral">
          <View style={styles.statusRowInner}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
            <Button
              label={task.status === 'COMPLETED' ? t('taskDetail.reopenButton') : t('taskDetail.completeButton')}
              onPress={handleToggleStatus}
              variant={task.status === 'COMPLETED' ? 'secondary' : 'primary'}
              size="sm"
            />
          </View>
        </GlowCard>

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
                pathname: '/focus' as never,
                params: { taskId: task.id, taskTitle: task.title, minutes: String(task.estimatedMinutes ?? '') },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t('taskDetail.focusA11y')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="timer-outline" size={20} color={theme.tertiary.default} />
              <Text style={{ ...Typography.labelLarge, color: theme.onSurface.primary }}>{t('taskDetail.focusLabel')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.onSurface.inactive} />
          </TouchableOpacity>
        )}

        {/* What the task says; "Modifier" changes it */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/tasks/edit/[id]', params: { id: task.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${task.title}. ${t('common.edit')}`}
          style={{
            backgroundColor: theme.surface.container,
            padding: Spacing.lg,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: theme.outline.variant,
            gap: Spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
            <Text style={{ ...Typography.titleLarge, color: theme.onSurface.primary, flex: 1 }}>{task.title}</Text>
            <Ionicons name="create-outline" size={18} color={theme.onSurface.variant} />
          </View>
          {task.description ? <Text style={{ ...Typography.bodyMedium, color: theme.onSurface.variant }}>{task.description}</Text> : null}
          {facts.map(fact => (
            <View key={fact.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name={fact.icon} size={16} color={theme.onSurface.variant} />
              <Text style={{ ...Typography.bodyMedium, color: theme.onSurface.primary }}>{fact.text}</Text>
            </View>
          ))}
        </TouchableOpacity>

        <View style={styles.field}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.label}>{t('taskDetail.subtasks')}</Text>
            {subtasks.length > 0 && (
              <Text style={styles.subtaskCounter}>
                {t('taskDetail.subtasksDone', { done: completedSubtasksCount, total: subtasks.length })}
              </Text>
            )}
          </View>

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
                  <Text style={[styles.subtaskTitle, s.isCompleted && styles.subtaskTitleCompleted]}>{s.title}</Text>
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

        {/* Send it to someone, without an account (sheet 025) */}
        <ShareItemCard kind="task" itemId={task.id} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

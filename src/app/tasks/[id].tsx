/**
 * Détail et Édition d'une tâche.
 * Permet de modifier la tâche, de gérer ses sous-tâches en direct,
 * de basculer son statut et de la supprimer avec Undo (30s).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { TaskRepository } from '@/repositories/task-repository';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { Task, Subtask, TaskStatus, ReminderPriority } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { makeTaskDetailStyles } from '@/styles/tasks/task-detail-styles';

type ScreenState = 'loading' | 'content' | 'error';

export default function TaskDetailScreen() {
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
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const statusLabels: Record<TaskStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = useMemo(() => ({
    INBOX: { label: 'Inbox', color: theme.onSurface.variant, icon: 'file-tray-outline' },
    SCHEDULED: { label: 'Planifiée', color: theme.primary.default, icon: 'calendar-outline' },
    IN_PROGRESS: { label: 'En cours', color: theme.tertiary.default, icon: 'time-outline' },
    COMPLETED: { label: 'Terminée', color: theme.success.default, icon: 'checkmark-circle-outline' },
    POSTPONED: { label: 'Reportée', color: theme.priority.HIGH, icon: 'arrow-forward-circle-outline' },
  }), [theme]);

  const priorityOptions: { key: ReminderPriority; label: string; color: string }[] = useMemo(() => [
    { key: 'LOW', label: 'Faible', color: theme.onSurface.variant },
    { key: 'NORMAL', label: 'Normale', color: theme.primary.default },
    { key: 'HIGH', label: 'Haute', color: theme.priority.HIGH },
    { key: 'URGENT', label: 'Urgente', color: theme.error.default },
  ], [theme]);

  const load = useCallback(async () => {
    if (!id) {
      setError('ID de tâche manquant');
      setScreenState('error');
      return;
    }
    try {
      const [t, subs] = await Promise.all([
        TaskRepository.findById(id),
        TaskRepository.findSubtasks(id),
      ]);
      if (!t) {
        setError('Tâche introuvable');
        setScreenState('error');
        return;
      }
      setTask(t);
      setSubtasks(subs);

      // Population du formulaire local
      setTitle(t.title);
      setDescription(t.description ?? '');
      setPriority(t.priority);
      setScheduledDateStr(t.scheduledDate);
      setEstimatedMinutes(t.estimatedMinutes);

      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur au chargement');
      setScreenState('error');
    }
  }, [id]);

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
    Alert.alert(
      'Supprimer cette sous-tâche ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
            await TaskUseCases.deleteSubtask(subtaskId);
            showSnackbar('Sous-tâche supprimée');
          },
        },
      ]
    );
  }

  // ─── Actions Tâche ─────────────────────────────────────────────────────────

  async function handleToggleStatus() {
    if (!task) return;
    const newStatus = await TaskUseCases.toggleComplete(task.id);
    const isCompleted = newStatus === 'COMPLETED';

    showSnackbar(isCompleted ? 'Tâche terminée ✓' : 'Tâche réouverte', {
      actionLabel: 'Annuler',
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
        status:
          task.status === 'INBOX' && scheduledDateStr
            ? 'SCHEDULED'
            : task.status === 'SCHEDULED' && !scheduledDateStr
            ? 'INBOX'
            : task.status,
      });

      showSnackbar('Tâche mise à jour avec succès');
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    Alert.alert(
      'Supprimer cette tâche ?',
      'Vous pourrez annuler cette action pendant 30 secondes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await TaskUseCases.deleteTask(task.id);
            showSnackbar('Tâche supprimée', {
              actionLabel: 'Annuler (30s)',
              onAction: async () => {
                await TaskUseCases.undoDelete(task.id);
                load();
              },
            });
            router.back();
          },
        },
      ]
    );
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
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={24} color={theme.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la tâche</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Supprimer la tâche"
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
              label={task.status === 'COMPLETED' ? 'Réouvrir la tâche' : 'Marquer terminée ✓'}
              onPress={handleToggleStatus}
              variant={task.status === 'COMPLETED' ? 'secondary' : 'primary'}
              size="sm"
            />
          </View>
        </GlowCard>

        {/* Titre */}
        <View style={styles.field}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre de la tâche"
            placeholderTextColor={theme.onSurface.disabled}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description / Notes</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ajouter des précisions..."
            placeholderTextColor={theme.onSurface.disabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Priorité */}
        <View style={styles.field}>
          <Text style={styles.label}>Priorité</Text>
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
          <Text style={styles.label}>Planification</Text>
          <View style={styles.chipRowWrap}>
            <TouchableOpacity
              style={[styles.chip, !scheduledDateStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(undefined)}
              accessibilityRole="radio"
              accessibilityState={{ selected: !scheduledDateStr }}
              accessibilityLabel={`Inbox${!scheduledDateStr ? ', sélectionné' : ''}`}
            >
              <Ionicons
                name="file-tray-outline"
                size={14}
                color={!scheduledDateStr ? (isLight ? theme.primary.onContainer : theme.primary.onContainer) : theme.onSurface.variant}
              />
              <Text style={[styles.chipText, !scheduledDateStr && styles.chipTextActive]}>
                Inbox
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === todayStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(todayStr)}
              accessibilityRole="radio"
              accessibilityState={{ selected: scheduledDateStr === todayStr }}
              accessibilityLabel={`Aujourd'hui${scheduledDateStr === todayStr ? ', sélectionné' : ''}`}
            >
              <Ionicons
                name="today-outline"
                size={14}
                color={scheduledDateStr === todayStr ? (isLight ? theme.primary.onContainer : theme.primary.onContainer) : theme.onSurface.variant}
              />
              <Text style={[styles.chipText, scheduledDateStr === todayStr && styles.chipTextActive]}>
                Aujourd&apos;hui
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === tomorrowStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(tomorrowStr)}
              accessibilityRole="radio"
              accessibilityState={{ selected: scheduledDateStr === tomorrowStr }}
              accessibilityLabel={`Demain${scheduledDateStr === tomorrowStr ? ', sélectionné' : ''}`}
            >
              <Ionicons
                name="arrow-forward-outline"
                size={14}
                color={scheduledDateStr === tomorrowStr ? (isLight ? theme.primary.onContainer : theme.primary.onContainer) : theme.onSurface.variant}
              />
              <Text style={[styles.chipText, scheduledDateStr === tomorrowStr && styles.chipTextActive]}>
                Demain
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
                  ? `Date personnalisée : ${format(new Date(scheduledDateStr + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })}`
                  : 'Choisir une autre date'
              }
            >
              <Ionicons name="calendar-outline" size={16} color={theme.onSurface.variant} />
              <Text style={styles.chipText}>
                {scheduledDateStr && ![todayStr, tomorrowStr].includes(scheduledDateStr)
                  ? format(new Date(scheduledDateStr + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })
                  : 'Autre...'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sous-tâches */}
        <View style={styles.field}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.label}>Sous-tâches</Text>
            {subtasks.length > 0 && (
              <Text style={styles.subtaskCounter}>
                {completedSubtasksCount} / {subtasks.length} terminées
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
                    accessibilityLabel={s.isCompleted ? `Marquer sous-tâche ${s.title} non terminée` : `Marquer sous-tâche ${s.title} terminée`}
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
                    accessibilityLabel={`Supprimer la sous-tâche ${s.title}`}
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
              placeholder="Ajouter une sous-tâche..."
              placeholderTextColor={theme.onSurface.disabled}
              onSubmitEditing={handleAddSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.subtaskAddBtn}
              onPress={handleAddSubtask}
              accessibilityRole="button"
              accessibilityLabel="Ajouter la sous-tâche"
            >
              <Ionicons name="add" size={20} color={theme.primary.on} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton Enregistrer */}
        <Button
          label="Enregistrer les modifications"
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
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
        locale="fr_FR"
      />
    </KeyboardAvoidingView>
  );
}

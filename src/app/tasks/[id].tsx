/**
 * Détail et Édition d'une tâche.
 * Permet de modifier la tâche, de gérer ses sous-tâches en direct,
 * de basculer son statut et de la supprimer avec Undo (30s).
 */

import { useEffect, useState, useCallback } from 'react';
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
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { styles } from '@/styles/tasks/task-detail-styles';

type ScreenState = 'loading' | 'content' | 'error';

const STATUS_LABELS: Record<TaskStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  INBOX: { label: 'Inbox', color: OnSurface.variant, icon: 'file-tray-outline' },
  SCHEDULED: { label: 'Planifiée', color: Primary.default, icon: 'calendar-outline' },
  IN_PROGRESS: { label: 'En cours', color: Tertiary.default, icon: 'time-outline' },
  COMPLETED: { label: 'Terminée', color: Success.default, icon: 'checkmark-circle-outline' },
  POSTPONED: { label: 'Reportée', color: '#FFB74D', icon: 'arrow-forward-circle-outline' },
};

const PRIORITY_OPTIONS: { key: ReminderPriority; label: string; color: string }[] = [
  { key: 'LOW', label: 'Faible', color: OnSurface.variant },
  { key: 'NORMAL', label: 'Normale', color: Primary.default },
  { key: 'HIGH', label: 'Haute', color: '#FFB74D' },
  { key: 'URGENT', label: 'Urgente', color: ErrorColors.default },
];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

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
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    await TaskUseCases.deleteSubtask(subtaskId);
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

  const statusConfig = STATUS_LABELS[task.status];
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
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la tâche</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          accessibilityLabel="Supprimer"
        >
          <Ionicons name="trash-outline" size={20} color={ErrorColors.default} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Statut Badge & Bouton de bascule */}
        <View style={styles.statusRow}>
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

        {/* Titre */}
        <View style={styles.field}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre de la tâche"
            placeholderTextColor={OnSurface.disabled}
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
            placeholderTextColor={OnSurface.disabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Priorité */}
        <View style={styles.field}>
          <Text style={styles.label}>Priorité</Text>
          <View style={styles.chipRow}>
            {PRIORITY_OPTIONS.map(opt => {
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
            >
              <Ionicons
                name="file-tray-outline"
                size={14}
                color={!scheduledDateStr ? Primary.onContainer : OnSurface.variant}
              />
              <Text style={[styles.chipText, !scheduledDateStr && styles.chipTextActive]}>
                Inbox
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === todayStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(todayStr)}
            >
              <Ionicons
                name="today-outline"
                size={14}
                color={scheduledDateStr === todayStr ? Primary.onContainer : OnSurface.variant}
              />
              <Text style={[styles.chipText, scheduledDateStr === todayStr && styles.chipTextActive]}>
                Aujourd&apos;hui
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === tomorrowStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(tomorrowStr)}
            >
              <Ionicons
                name="arrow-forward-outline"
                size={14}
                color={scheduledDateStr === tomorrowStr ? Primary.onContainer : OnSurface.variant}
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
            >
              <Ionicons name="calendar-outline" size={16} color={OnSurface.variant} />
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
            <View key={s.id} style={styles.subtaskRow}>
              <TouchableOpacity
                onPress={() => handleToggleSubtask(s.id, s.isCompleted)}
                style={styles.subtaskCheck}
              >
                <Ionicons
                  name={s.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={s.isCompleted ? Success.default : OnSurface.disabled}
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
              >
                <Ionicons name="close" size={18} color={OnSurface.disabled} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Champ d'ajout sous-tâche inline */}
          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={styles.subtaskInput}
              value={newSubtaskInput}
              onChangeText={setNewSubtaskInput}
              placeholder="Ajouter une sous-tâche..."
              placeholderTextColor={OnSurface.disabled}
              onSubmitEditing={handleAddSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.subtaskAddBtn} onPress={handleAddSubtask}>
              <Ionicons name="add" size={20} color={Primary.on} />
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

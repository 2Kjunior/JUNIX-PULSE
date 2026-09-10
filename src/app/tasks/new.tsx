/**
 * Formulaire de création d'une tâche.
 * Champs : Titre, Description/Notes, Priorité, Date planifiée (Inbox vs Planifiée),
 * Durée estimée, et liste dynamique de sous-tâches.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

import { TaskUseCases } from '@/use-cases/task-use-cases';
import { useAppStore } from '@/store/app-store';
import { ReminderPriority } from '@/domain/entities';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const PRIORITY_OPTIONS: { key: ReminderPriority; label: string; color: string }[] = [
  { key: 'LOW', label: 'Faible', color: OnSurface.variant },
  { key: 'NORMAL', label: 'Normale', color: Primary.default },
  { key: 'HIGH', label: 'Haute', color: '#FFB74D' },
  { key: 'URGENT', label: 'Urgente', color: ErrorColors.default },
];

const ESTIMATED_TIME_OPTIONS: { minutes?: number; label: string }[] = [
  { minutes: undefined, label: 'Aucune' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 120, label: '2 h+' },
];

export default function NewTaskScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  // Champs de saisie
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [scheduledDateStr, setScheduledDateStr] = useState<string | undefined>(undefined); // YYYY-MM-DD
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);

  // Sous-tâches dynamiques
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);

  // Modal DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  // Raccourcis de date
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const nextWeekStr = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');

  function addSubtask() {
    const trimmed = subtaskInput.trim();
    if (trimmed) {
      setSubtasks(prev => [...prev, trimmed]);
      setSubtaskInput('');
    }
  }

  function removeSubtask(index: number) {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    if (!title.trim()) {
      setTitleError('Le titre de la tâche est requis');
      return false;
    }
    setTitleError('');
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    try {
      await TaskUseCases.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        scheduledDate: scheduledDateStr,
        estimatedMinutes,
        subtasks,
      });

      showSnackbar('Tâche créée avec succès');

      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle tâche</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Enregistrer la tâche"
        >
          <Text style={[styles.saveBtnText, saving && styles.saveBtnDisabled]}>
            {saving ? 'Création...' : 'Créer'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Titre */}
        <View style={styles.field}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={[styles.input, !!titleError && styles.inputError]}
            value={title}
            onChangeText={t => {
              setTitle(t);
              if (titleError) setTitleError('');
            }}
            placeholder="Que devez-vous accomplir ?"
            placeholderTextColor={OnSurface.disabled}
            autoFocus
          />
          {!!titleError && <Text style={styles.errorText}>{titleError}</Text>}
        </View>

        {/* Description / Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Description / Détails</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Contextes, liens, critères de validation..."
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
              <Text style={[styles.chipText, !scheduledDateStr && styles.chipTextActive]}>
                📥 Inbox (sans date)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === todayStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(todayStr)}
            >
              <Text style={[styles.chipText, scheduledDateStr === todayStr && styles.chipTextActive]}>
                📅 Aujourd&apos;hui
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === tomorrowStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(tomorrowStr)}
            >
              <Text style={[styles.chipText, scheduledDateStr === tomorrowStr && styles.chipTextActive]}>
                ➡️ Demain
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, scheduledDateStr === nextWeekStr && styles.chipActive]}
              onPress={() => setScheduledDateStr(nextWeekStr)}
            >
              <Text style={[styles.chipText, scheduledDateStr === nextWeekStr && styles.chipTextActive]}>
                📆 Lundi prochain
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                !!scheduledDateStr &&
                  ![todayStr, tomorrowStr, nextWeekStr].includes(scheduledDateStr) &&
                  styles.chipActive,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={OnSurface.variant} />
              <Text style={styles.chipText}>
                {scheduledDateStr && ![todayStr, tomorrowStr, nextWeekStr].includes(scheduledDateStr)
                  ? format(new Date(scheduledDateStr + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })
                  : 'Autre date...'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Durée estimée */}
        <View style={styles.field}>
          <Text style={styles.label}>Durée estimée</Text>
          <View style={styles.chipRowWrap}>
            {ESTIMATED_TIME_OPTIONS.map((opt, i) => {
              const isSelected = estimatedMinutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setEstimatedMinutes(opt.minutes)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sous-tâches */}
        <View style={styles.field}>
          <Text style={styles.label}>Sous-tâches ({subtasks.length})</Text>

          {/* Liste des sous-tâches ajoutées */}
          {subtasks.map((st, index) => (
            <View key={index} style={styles.subtaskRow}>
              <Ionicons name="ellipse-outline" size={18} color={OnSurface.disabled} />
              <Text style={styles.subtaskTitle}>{st}</Text>
              <TouchableOpacity onPress={() => removeSubtask(index)} style={styles.subtaskRemove}>
                <Ionicons name="close-circle" size={20} color={ErrorColors.default} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Champ d'ajout sous-tâche */}
          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={styles.subtaskInput}
              value={subtaskInput}
              onChangeText={setSubtaskInput}
              placeholder="Ajouter une étape..."
              placeholderTextColor={OnSurface.disabled}
              onSubmitEditing={addSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.subtaskAddBtn} onPress={addSubtask}>
              <Ionicons name="add" size={20} color={Primary.on} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton Créer */}
        <Button
          label="Créer la tâche"
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          style={styles.submitBtn}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  closeBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  saveBtnText: { ...Typography.titleMedium, color: Primary.default },
  saveBtnDisabled: { color: OnSurface.disabled },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  field: { gap: Spacing.xs },
  label: { ...Typography.labelMedium, color: OnSurface.variant, marginBottom: 4 },
  input: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  multilineInput: { minHeight: 90 },
  inputError: { borderColor: ErrorColors.default },
  errorText: { ...Typography.labelSmall, color: ErrorColors.default, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: Primary.container, borderColor: Primary.default },
  chipText: { ...Typography.labelMedium, color: OnSurface.variant },
  chipTextActive: { color: Primary.onContainer },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  subtaskTitle: { flex: 1, ...Typography.bodyMedium, color: OnSurface.primary },
  subtaskRemove: { padding: 2 },
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
  },
  subtaskAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: { marginTop: Spacing.md },
});

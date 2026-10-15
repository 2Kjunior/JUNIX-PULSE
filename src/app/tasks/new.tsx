import { useState, useMemo } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

import { TaskUseCases } from '@/use-cases/task-use-cases';
import { useAppStore } from '@/store/app-store';
import { ReminderPriority } from '@/domain/entities';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { makeFormStyles } from '@/styles/common/form-styles';

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
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const styles = useThemedStyles(makeNewTaskStyles);
  const params = useLocalSearchParams<{ defaultDate?: string }>();

  // Champs de saisie
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [scheduledDateStr, setScheduledDateStr] = useState<string | undefined>(
    params.defaultDate || undefined
  );
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

  // Options de priorité thématiques
  const priorityOptions = useMemo(() => [
    { key: 'LOW' as ReminderPriority, label: 'Faible', color: palette.priority.LOW },
    { key: 'NORMAL' as ReminderPriority, label: 'Normale', color: palette.priority.NORMAL },
    { key: 'HIGH' as ReminderPriority, label: 'Haute', color: palette.priority.HIGH },
    { key: 'URGENT' as ReminderPriority, label: 'Urgente', color: palette.priority.URGENT },
  ], [palette]);

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
      style={[formStyles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête harmonisé Midnight / Crème */}
      <View style={formStyles.toolbar}>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={() => router.back()}
          accessibilityLabel="Annuler"
        >
          <Text style={formStyles.toolbarCancel}>Annuler</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <Text style={formStyles.toolbarTitle}>Nouvelle tâche</Text>
          <Text style={formStyles.toolbarSubtitle}>Action & Projet</Text>
        </View>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Créer la tâche"
        >
          <Text style={[formStyles.toolbarSave, saving && formStyles.toolbarSaveDisabled]}>
            {saving ? 'Création...' : 'Créer'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={formStyles.scroll}
        contentContainerStyle={[formStyles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Carte 1 : Titre & Détails */}
        <View style={formStyles.cardGroup}>
          <TextInput
            style={[formStyles.titleInput, !!titleError && styles.inputErrorBorder]}
            value={title}
            onChangeText={t => {
              setTitle(t);
              if (titleError) setTitleError('');
            }}
            placeholder="Que devez-vous accomplir ?"
            placeholderTextColor={palette.onSurface.disabled}
            autoFocus
          />
          {!!titleError && <Text style={formStyles.errorText}>{titleError}</Text>}

          <View style={formStyles.notesRow}>
            <Ionicons name="document-text-outline" size={18} color={palette.onSurface.variant} style={formStyles.notesIcon} />
            <TextInput
              style={formStyles.notesInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Contextes, notes, liens utiles..."
              placeholderTextColor={palette.onSurface.disabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Carte 2 : Priorité */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="flag-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Priorité d'exécution</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={formStyles.chipsRow}>
            {priorityOptions.map(opt => {
              const isSelected = priority === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    formStyles.chip,
                    isSelected && {
                      backgroundColor: opt.color + '22',
                      borderColor: opt.color,
                    },
                  ]}
                  onPress={() => setPriority(opt.key)}
                >
                  <View style={[formStyles.chipDot, { backgroundColor: opt.color }]} />
                  <Text style={[formStyles.chipText, isSelected && { color: opt.color, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Carte 3 : Planification */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="calendar-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Date planifiée</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={formStyles.chipsRow}>
            <TouchableOpacity
              style={[formStyles.chip, !scheduledDateStr && formStyles.chipActive]}
              onPress={() => setScheduledDateStr(undefined)}
            >
              <Ionicons
                name="file-tray-outline"
                size={14}
                color={!scheduledDateStr ? palette.primary.default : palette.onSurface.variant}
              />
              <Text style={[formStyles.chipText, !scheduledDateStr && formStyles.chipTextActive]}>
                Inbox (sans date)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[formStyles.chip, scheduledDateStr === todayStr && formStyles.chipActive]}
              onPress={() => setScheduledDateStr(todayStr)}
            >
              <Ionicons
                name="today-outline"
                size={14}
                color={scheduledDateStr === todayStr ? palette.primary.default : palette.onSurface.variant}
              />
              <Text style={[formStyles.chipText, scheduledDateStr === todayStr && formStyles.chipTextActive]}>
                Aujourd'hui
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[formStyles.chip, scheduledDateStr === tomorrowStr && formStyles.chipActive]}
              onPress={() => setScheduledDateStr(tomorrowStr)}
            >
              <Ionicons
                name="arrow-forward-outline"
                size={14}
                color={scheduledDateStr === tomorrowStr ? palette.primary.default : palette.onSurface.variant}
              />
              <Text style={[formStyles.chipText, scheduledDateStr === tomorrowStr && formStyles.chipTextActive]}>
                Demain
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[formStyles.chip, scheduledDateStr === nextWeekStr && formStyles.chipActive]}
              onPress={() => setScheduledDateStr(nextWeekStr)}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={scheduledDateStr === nextWeekStr ? palette.primary.default : palette.onSurface.variant}
              />
              <Text style={[formStyles.chipText, scheduledDateStr === nextWeekStr && formStyles.chipTextActive]}>
                Lundi prochain
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                formStyles.chip,
                !!scheduledDateStr &&
                  ![todayStr, tomorrowStr, nextWeekStr].includes(scheduledDateStr) &&
                  formStyles.chipActive,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-number-outline" size={14} color={palette.primary.default} />
              <Text
                style={[
                  formStyles.chipText,
                  !!scheduledDateStr &&
                    ![todayStr, tomorrowStr, nextWeekStr].includes(scheduledDateStr) &&
                    formStyles.chipTextActive,
                ]}
              >
                {scheduledDateStr && ![todayStr, tomorrowStr, nextWeekStr].includes(scheduledDateStr)
                  ? format(new Date(scheduledDateStr + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })
                  : 'Autre date...'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carte 4 : Durée estimée */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="hourglass-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Durée estimée</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={formStyles.chipsRow}>
            {ESTIMATED_TIME_OPTIONS.map((opt, i) => {
              const isSelected = estimatedMinutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={i}
                  style={[formStyles.chip, isSelected && formStyles.chipActive]}
                  onPress={() => setEstimatedMinutes(opt.minutes)}
                >
                  <Text style={[formStyles.chipText, isSelected && formStyles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Carte 5 : Sous-tâches */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="list-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Sous-tâches ({subtasks.length})</Text>
        </View>

        <View style={formStyles.cardGroup}>
          {subtasks.map((st, index) => (
            <View key={index} style={styles.subtaskItem}>
              <Ionicons name="ellipse-outline" size={16} color={palette.primary.default} />
              <Text style={styles.subtaskLabel}>{st}</Text>
              <TouchableOpacity onPress={() => removeSubtask(index)} style={styles.subtaskRemoveBtn}>
                <Ionicons name="close-circle" size={18} color={palette.error.default} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.subtaskAdderRow}>
            <TextInput
              style={styles.subtaskInputField}
              value={subtaskInput}
              onChangeText={setSubtaskInput}
              placeholder="Ajouter une étape (ex: Rédiger le plan)..."
              placeholderTextColor={palette.onSurface.disabled}
              onSubmitEditing={addSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.subtaskAddIconButton} onPress={addSubtask}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton de confirmation */}
        <Button
          label="Créer la tâche"
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          style={{ marginTop: Spacing.sm }}
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

function makeNewTaskStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    inputErrorBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.error.default,
    },
    subtaskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(15, 18, 28, 0.85)' : theme.surface.container,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.outline.variant,
      gap: Spacing.sm,
    },
    subtaskLabel: {
      flex: 1,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    subtaskRemoveBtn: {
      padding: 2,
    },
    subtaskAdderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 4,
    },
    subtaskInputField: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(15, 18, 28, 0.85)' : theme.surface.container,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      color: theme.onSurface.primary,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      ...Typography.bodyMedium,
    },
    subtaskAddIconButton: {
      width: 38,
      height: 38,
      borderRadius: Radius.md,
      backgroundColor: theme.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

/**
 * Formulaire de création d'un rappel.
 * Présenté comme une modale (presentation: 'modal' dans _layout.tsx).
 *
 * Champs : titre, date/heure, priorité, action, note, récurrence, personne liée.
 * La récurrence avancée est simplifiée en V1 : Quotidien / Hebdomadaire / Mensuel / Custom.
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
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { createReminder } from '@/use-cases/reminder-use-cases';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { Reminder } from '@/domain/entities';
import {
  Surface, Primary, Tertiary, OnSurface, Outline, Error as ErrorColors,
  Spacing, Radius, Typography, Priority as PriorityColors,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type PriorityKey = Reminder['priority'];
type ActionType = Reminder['actionType'];

const PRIORITY_OPTIONS: { key: PriorityKey; label: string }[] = [
  { key: 'LOW', label: 'Faible' },
  { key: 'NORMAL', label: 'Normal' },
  { key: 'HIGH', label: 'Haute' },
  { key: 'URGENT', label: 'Urgent' },
];

const ACTION_OPTIONS: { key: ActionType; label: string; icon: string }[] = [
  { key: 'NONE', label: 'Aucune', icon: '—' },
  { key: 'CALL', label: 'Appeler', icon: '📞' },
  { key: 'MESSAGE', label: 'Message', icon: '💬' },
  { key: 'EMAIL', label: 'Email', icon: '📧' },
  { key: 'MEET', label: 'Rencontrer', icon: '🤝' },
  { key: 'TASK', label: 'Faire', icon: '✓' },
];

export default function NewReminderScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar, userTimezone } = useAppStore();

  // Champs du formulaire
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(0, 0);
    return d;
  });
  const [priority, setPriority] = useState<PriorityKey>('NORMAL');
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  function validate(): boolean {
    if (!title.trim()) {
      setTitleError('Le titre est requis');
      return false;
    }
    setTitleError('');
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const settings = await SettingsRepository.get();
      await createReminder({
        title: title.trim(),
        notes: notes.trim() || undefined,
        scheduledAt,
        timezone: settings.timezone,
        priority,
        actionType,
        recurrenceRule: hasRecurrence
          ? { type: recurrenceType, interval: 1 }
          : undefined,
        notificationsEnabled: settings.notificationsEnabled,
      });
      showSnackbar('Rappel créé ✓');
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = format(scheduledAt, "EEEE d MMM 'à' HH:mm", { locale: fr });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Barre d'outils modale */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
            <Text style={styles.toolbarCancel}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Nouveau rappel</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.toolbarBtn}
            disabled={saving}
            testID="reminder-save-btn"
          >
            <Text style={[styles.toolbarSave, saving && styles.toolbarSaveDisabled]}>
              {saving ? '...' : 'Créer'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Titre */}
          <View style={styles.field}>
            <TextInput
              style={[styles.titleInput, titleError && styles.inputError]}
              value={title}
              onChangeText={t => { setTitle(t); if (t.trim()) setTitleError(''); }}
              placeholder="Intitulé du rappel"
              placeholderTextColor={OnSurface.disabled}
              maxLength={100}
              autoFocus
              testID="reminder-title-input"
            />
            {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optionnel)"
              placeholderTextColor={OnSurface.disabled}
              multiline
              numberOfLines={3}
              maxLength={500}
              testID="reminder-notes-input"
            />
          </View>

          {/* Date & heure */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date et heure</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
              testID="reminder-date-btn"
            >
              <Ionicons name="calendar-outline" size={18} color={Primary.default} />
              <Text style={styles.dateValue}>{dateLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
            </TouchableOpacity>
          </View>

          {/* Priorité */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Priorité</Text>
            <View style={styles.chipRow}>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.chip,
                    priority === opt.key && {
                      backgroundColor: PriorityColors[opt.key] + '25',
                      borderColor: PriorityColors[opt.key],
                    },
                  ]}
                  onPress={() => setPriority(opt.key)}
                >
                  <View
                    style={[
                      styles.chipDot,
                      { backgroundColor: PriorityColors[opt.key] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.chipLabel,
                      priority === opt.key && { color: OnSurface.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Type d'action</Text>
            <View style={styles.chipRow}>
              {ACTION_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.chip,
                    actionType === opt.key && styles.chipActive,
                  ]}
                  onPress={() => setActionType(opt.key)}
                >
                  <Text style={styles.chipIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.chipLabel,
                      actionType === opt.key && { color: Primary.onContainer },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Récurrence */}
          <View style={styles.field}>
            <View style={styles.rowBetween}>
              <Text style={styles.fieldLabel}>Récurrent</Text>
              <Switch
                value={hasRecurrence}
                onValueChange={setHasRecurrence}
                trackColor={{ false: Outline.variant, true: Primary.container }}
                thumbColor={hasRecurrence ? Primary.default : OnSurface.disabled}
                testID="reminder-recurrence-switch"
              />
            </View>
            {hasRecurrence && (
              <View style={styles.chipRow}>
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, recurrenceType === type && styles.chipActive]}
                    onPress={() => setRecurrenceType(type)}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        recurrenceType === type && { color: Primary.onContainer },
                      ]}
                    >
                      {type === 'DAILY' ? 'Quotidien'
                        : type === 'WEEKLY' ? 'Hebdomadaire' : 'Mensuel'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Date picker natif */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="datetime"
        date={scheduledAt}
        minimumDate={new Date()}
        locale="fr"
        onConfirm={date => {
          setScheduledAt(date);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Outline.variant,
  },
  toolbarBtn: { minWidth: 60 },
  toolbarTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  toolbarCancel: { ...Typography.bodyMedium, color: OnSurface.variant },
  toolbarSave: { ...Typography.labelLarge, color: Primary.default, textAlign: 'right' },
  toolbarSaveDisabled: { opacity: 0.4 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  field: { gap: Spacing.sm },
  fieldLabel: { ...Typography.labelMedium, color: OnSurface.variant, textTransform: 'uppercase', letterSpacing: 0.5 },
  titleInput: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
    paddingVertical: Spacing.sm,
  },
  notesInput: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: { borderBottomColor: ErrorColors.default },
  errorText: { ...Typography.bodySmall, color: ErrorColors.default },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 48,
  },
  dateValue: { ...Typography.bodyMedium, color: OnSurface.primary, flex: 1, textTransform: 'capitalize' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  chipActive: { backgroundColor: Primary.container, borderColor: Primary.default },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipIcon: { fontSize: 14 },
  chipLabel: { ...Typography.labelMedium, color: OnSurface.variant },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

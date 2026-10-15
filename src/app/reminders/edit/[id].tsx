/**
 * Écran d'édition d'un rappel existant.
 * Route : /reminders/edit/[id]
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { updateReminder } from '@/use-cases/reminder-use-cases';
import { Reminder } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { makeEditReminderStyles } from '@/styles/reminders/edit-reminder-styles';

type PriorityKey = Reminder['priority'];
type ActionType = Reminder['actionType'];

const PRIORITY_OPTIONS: { key: PriorityKey; label: string }[] = [
  { key: 'LOW', label: 'Faible' },
  { key: 'NORMAL', label: 'Normal' },
  { key: 'HIGH', label: 'Haute' },
  { key: 'URGENT', label: 'Urgent' },
];

const ACTION_OPTIONS: { key: ActionType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'NONE', label: 'Aucune', icon: 'remove-outline' },
  { key: 'CALL', label: 'Appeler', icon: 'call-outline' },
  { key: 'MESSAGE', label: 'Message', icon: 'chatbubble-outline' },
  { key: 'EMAIL', label: 'Email', icon: 'mail-outline' },
  { key: 'MEET', label: 'Rencontrer', icon: 'people-outline' },
  { key: 'TASK', label: 'Faire', icon: 'checkbox-outline' },
];

export default function EditReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeEditReminderStyles);

  const [loading, setLoading] = useState(true);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [error, setError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(new Date());
  const [priority, setPriority] = useState<PriorityKey>('NORMAL');
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  const loadReminder = useCallback(async () => {
    if (!id) {
      setError('ID manquant');
      setLoading(false);
      return;
    }
    try {
      const [rem, settings] = await Promise.all([
        ReminderRepository.findById(id),
        SettingsRepository.get(),
      ]);
      if (!rem) {
        setError('Rappel introuvable');
        setLoading(false);
        return;
      }
      setReminder(rem);
      setTitle(rem.title);
      setNotes(rem.notes ?? '');
      setScheduledAt(new Date(rem.scheduledAt));
      setPriority(rem.priority);
      setActionType(rem.actionType);
      setNotificationsEnabled(settings.notificationsEnabled);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  function validate(): boolean {
    if (!title.trim()) {
      setTitleError('Le titre est requis');
      return false;
    }
    setTitleError('');
    return true;
  }

  async function handleSave() {
    if (!validate() || !reminder) return;
    setSaving(true);
    try {
      await updateReminder({
        id: reminder.id,
        title: title.trim(),
        notes: notes.trim() || undefined,
        scheduledAt,
        priority,
        actionType,
        notificationsEnabled,
        currentNotificationId: reminder.notificationId,
      });

      showSnackbar('Rappel modifié ✓');
      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de modifier le rappel');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !reminder) return <ErrorState message={error} onRetry={loadReminder} />;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Barre supérieure */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Modifier le rappel</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveText}>{saving ? '...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Titre */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={[styles.input, !!titleError && styles.inputError]}
              placeholder="Ex: Appeler le comptable"
              placeholderTextColor={palette.onSurface.variant}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (titleError) setTitleError('');
              }}
              autoFocus
            />
            {!!titleError && <Text style={styles.errorText}>{titleError}</Text>}
          </View>

          {/* Date & Heure */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Date et heure</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={palette.primary.default} />
              <Text style={styles.datePickerText}>
                {format(scheduledAt, "EEEE d MMMM 'à' HH:mm", { locale: fr })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={palette.onSurface.variant} />
            </TouchableOpacity>
          </View>

          {/* Priorité */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Priorité</Text>
            <View style={styles.chipsRow}>
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = priority === opt.key;
                const chipColor = palette.priority[opt.key];
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.chip,
                      isSelected && { backgroundColor: palette.primary.container, borderColor: chipColor },
                    ]}
                    onPress={() => setPriority(opt.key)}
                  >
                    <View style={[styles.chipDot, { backgroundColor: chipColor }]} />
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: chipColor, fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action rapide */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Action associée</Text>
            <View style={styles.actionGrid}>
              {ACTION_OPTIONS.map((opt) => {
                const isSelected = actionType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.actionOption,
                      isSelected && styles.actionOptionSelected,
                    ]}
                    onPress={() => setActionType(opt.key)}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? palette.primary.default : palette.onSurface.variant}
                    />
                    <Text
                      style={[
                        styles.actionLabel,
                        isSelected && styles.actionLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Note / Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Précisions, liens, contexte..."
              placeholderTextColor={palette.onSurface.variant}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Bouton de validation final */}
          <View style={styles.footerBtn}>
            <Button
              label="Enregistrer les modifications"
              variant="primary"
              onPress={handleSave}
              loading={saving}
            />
          </View>
        </ScrollView>

        {/* Modal sélecteur de date/heure */}
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          date={scheduledAt}
          onConfirm={(d) => {
            setShowDatePicker(false);
            setScheduledAt(d);
          }}
          onCancel={() => setShowDatePicker(false)}
          locale="fr-FR"
          confirmTextIOS="Confirmer"
          cancelTextIOS="Annuler"
        />
      </View>
    </KeyboardAvoidingView>
  );
}


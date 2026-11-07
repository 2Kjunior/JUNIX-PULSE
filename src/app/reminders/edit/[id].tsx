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
  Switch,
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { updateReminder } from '@/use-cases/reminder-use-cases';
import { PersonField } from '@/components/people/PersonField';
import { offerExactAlarmsForConfirmation } from '@/features/reminders/offer-exact-alarms';
import { Reminder } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { makeEditReminderStyles } from '@/styles/reminders/edit-reminder-styles';
import { MessageKey, useDateLocale, useLanguage, useT } from '@/i18n';

type PriorityKey = Reminder['priority'];
type ActionType = Reminder['actionType'];

const PRIORITY_OPTIONS: { key: PriorityKey; labelKey: MessageKey }[] = [
  { key: 'LOW', labelKey: 'form.priority.low' },
  { key: 'NORMAL', labelKey: 'remNew.priority.normal' },
  { key: 'HIGH', labelKey: 'priority.high' },
  { key: 'URGENT', labelKey: 'priority.urgent' },
];

const ACTION_OPTIONS: { key: ActionType; labelKey: MessageKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'NONE', labelKey: 'form.none', icon: 'remove-outline' },
  { key: 'CALL', labelKey: 'people.call', icon: 'call-outline' },
  { key: 'MESSAGE', labelKey: 'reminders.action.MESSAGE', icon: 'chatbubble-outline' },
  { key: 'EMAIL', labelKey: 'reminders.action.EMAIL', icon: 'mail-outline' },
  { key: 'MEET', labelKey: 'remNew.action.meet', icon: 'people-outline' },
  { key: 'TASK', labelKey: 'reminders.action.TASK', icon: 'checkbox-outline' },
];

export default function EditReminderScreen() {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
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
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  const loadReminder = useCallback(async () => {
    if (!id) {
      setError(t('person.missingId'));
      setLoading(false);
      return;
    }
    try {
      const rem = await ReminderRepository.findById(id);
      if (!rem) {
        setError(t('remDetail.notFound'));
        setLoading(false);
        return;
      }
      setReminder(rem);
      setTitle(rem.title);
      setNotes(rem.notes ?? '');
      setScheduledAt(new Date(rem.scheduledAt));
      setPriority(rem.priority);
      setActionType(rem.actionType);
      setPersonIds(await ReminderRepository.findPersonIds(rem.id));
      setRequiresConfirmation(!!rem.requiresConfirmation);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  function validate(): boolean {
    if (!title.trim()) {
      setTitleError(t('form.titleRequired'));
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
        personIds,
        requiresConfirmation,
      });

      showSnackbar(t('remEdit.updated'));
      router.back();
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('remEdit.updateError'));
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
            <Text style={styles.cancelText}>{t('form.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('remEdit.title')}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveText}>{saving ? '...' : t('personTime.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Titre */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('remEdit.titleLabel')}</Text>
            <TextInput
              style={[styles.input, !!titleError && styles.inputError]}
              placeholder={t('remEdit.titlePlaceholder')}
              placeholderTextColor={palette.onSurface.variant}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
              autoFocus
            />
            {!!titleError && <Text style={styles.errorText}>{titleError}</Text>}
          </View>

          {/* Date & Heure */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('remEdit.dateLabel')}</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={palette.primary.default} />
              <Text style={styles.datePickerText}>
                {format(scheduledAt, t('remNew.dateLabel'), { locale: dateLocale })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={palette.onSurface.variant} />
            </TouchableOpacity>
          </View>

          {/* Priorité */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('taskDetail.priorityLabel')}</Text>
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
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action rapide */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('remEdit.actionLabel')}</Text>
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
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* À confirmer */}
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.label}>{t('confirmReminder.label')}</Text>
              <Text style={styles.helper}>{t('confirmReminder.helper')}</Text>
            </View>
            <Switch
              value={requiresConfirmation}
              onValueChange={(value: boolean) => {
                setRequiresConfirmation(value);
                if (value) void offerExactAlarmsForConfirmation();
              }}
              trackColor={{ false: palette.outline.variant, true: palette.primary.default }}
              thumbColor={requiresConfirmation ? '#FFFFFF' : palette.onSurface.disabled}
              accessibilityLabel={t('confirmReminder.label')}
            />
          </View>

          {/* Avec qui ? */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('personField.header')}</Text>
            <PersonField selectedIds={personIds} onChange={setPersonIds} look="bare" multiple />
          </View>

          {/* Note / Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('remEdit.notes')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('remEdit.notesPlaceholder')}
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
              label={t('taskDetail.saveChanges')}
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
          locale={language === 'fr' ? 'fr-FR' : 'en-US'}
          confirmTextIOS={t('personNew.confirm')}
          cancelTextIOS={t('form.cancel')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}


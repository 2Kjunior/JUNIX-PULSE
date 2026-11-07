/**
 * Formulaire de création d'un rappel — Référence R-05 du Master Prompt Junix Pulse.
 * Présenté comme une modale (presentation: 'modal' dans _layout.tsx).
 *
 * Champs : titre, date/heure, priorité, action vectorielle, note, récurrence.
 * Règle A.1 : Zéro emoji (icônes vectorielles exclusives).
 * Règle A.2 : 1 seul bouton dégradé par écran (CTA Créer le rappel).
 *
 * Migration P5 : Entièrement thématisé avec contrastes parfaits en mode clair/sombre.
 */
import { useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { createReminder } from '@/use-cases/reminder-use-cases';
import { PersonField } from '@/components/people/PersonField';
import { TagField } from '@/components/tags/TagField';
import { offerExactAlarmsForConfirmation } from '@/features/reminders/offer-exact-alarms';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { Reminder } from '@/domain/entities';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { makeNewReminderStyles } from '@/styles/reminders/new-reminder-styles';
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
  { key: 'TASK', labelKey: 'reminders.action.TASK', icon: 'checkmark-outline' },
];

export default function NewReminderScreen() {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNewReminderStyles);

  const { defaultHour, defaultDate, personId: defaultPersonId } = useLocalSearchParams<{
    defaultHour?: string;
    defaultDate?: string;
    /** Opened from the page of a person: the reminder is already about them. */
    personId?: string;
  }>();

  // Champs du formulaire
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(() => {
    let d = new Date();
    if (defaultDate) {
      try {
        const parsed = new Date(defaultDate);
        if (!isNaN(parsed.getTime())) d = parsed;
      } catch {}
    }
    const h = defaultHour !== undefined ? Number(defaultHour) : d.getHours() + 1;
    d = setHours(d, h);
    d = setMinutes(d, 0);
    return d;
  });
  const [priority, setPriority] = useState<PriorityKey>('NORMAL');
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [personIds, setPersonIds] = useState<string[]>(() => (defaultPersonId ? [defaultPersonId] : []));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // États UI
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  // Raccourcis rapides d'échéance
  const setQuickTime = (type: 'now_10s' | 'tonight' | 'tomorrow') => {
    const now = new Date();
    if (type === 'now_10s') {
      setScheduledAt(new Date(now.getTime() + 10 * 1000));
    } else if (type === 'tonight') {
      const tonight = new Date();
      tonight.setHours(20, 0, 0, 0);
      setScheduledAt(tonight > now ? tonight : addHours(now, 2));
    } else if (type === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledAt(tomorrow);
    }
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      setTitleError(t('form.titleRequired'));
      return false;
    }
    if (scheduledAt <= new Date()) {
      showSnackbar(t('remNew.mustBeFuture'));
      return false;
    }
    setTitleError('');
    return true;
  };

  const handleSave = async () => {
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
        personIds,
        tagIds,
        requiresConfirmation,
        recurrenceRule: hasRecurrence
          ? {
              type: recurrenceType,
              interval: 1,
              dayOfMonth: recurrenceType === 'MONTHLY' ? scheduledAt.getDate() : undefined,
            }
          : undefined,
      });

      showSnackbar(t('remNew.created'));
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = format(scheduledAt, t('remNew.dateLabel'), { locale: dateLocale });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.surface.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ─── Barre d'outils modale ───────────────────────────────────────────── */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => router.back()}
            accessibilityLabel={t('form.cancel')}
          >
            <Text style={styles.toolbarCancel}>{t('form.cancel')}</Text>
          </TouchableOpacity>
          <View style={styles.toolbarCenter}>
            <Text style={styles.toolbarTitle}>{t('remNew.title')}</Text>
            <Text style={styles.toolbarSubtitle}>{t('remNew.subtitle')}</Text>
          </View>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel={t('remNew.create')}
          >
            <Text style={[styles.toolbarSave, saving && styles.toolbarSaveDisabled]}>
              {saving ? t('remNew.creating') : t('remNew.create')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Carte 1 : Titre & Notes (Midnight Glass) ────────────────────────── */}
          <View style={styles.cardGroup}>
            <TextInput
              style={[styles.titleInput, !!titleError && styles.inputError]}
              value={title}
              onChangeText={text => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
              placeholder={t('remNew.titlePlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              autoFocus
              maxLength={120}
            />
            {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}

            <View style={styles.notesRow}>
              <Ionicons name="menu-outline" size={18} color={palette.onSurface.variant} style={styles.notesIcon} />
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('remNew.notesPlaceholder')}
                placeholderTextColor={palette.onSurface.disabled}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>
          </View>

          {/* ─── Échéance & Moment (Groupe 2 - R-05) ──────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="moon-outline" size={16} color={palette.tertiary.default} />
            <Text style={styles.sectionHeaderTitle}>{t('remNew.dueHeader')}</Text>
          </View>

          <View style={styles.cardGroup}>
            {/* Chips rapides */}
            <View style={styles.quickTimesRow}>
              {__DEV__ && (
                <TouchableOpacity
                  style={[styles.quickTimeChip, { borderColor: palette.primary.default }]}
                  onPress={() => setQuickTime('now_10s')}
                >
                  <Ionicons name="flash-outline" size={12} color={palette.primary.default} />
                  <Text style={[styles.quickTimeText, { color: palette.primary.default, fontWeight: '600' }]}>
                    {t('remNew.in10s')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.quickTimeChip}
                onPress={() => setQuickTime('tonight')}
              >
                <Ionicons name="time-outline" size={12} color={palette.onSurface.variant} />
                <Text style={styles.quickTimeText}>{t('remNew.tonight')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickTimeChip}
                onPress={() => setQuickTime('tomorrow')}
              >
                <Ionicons name="sunny-outline" size={12} color={palette.onSurface.variant} />
                <Text style={styles.quickTimeText}>{t('remNew.tomorrow')}</Text>
              </TouchableOpacity>
            </View>

            {/* Sélecteur complet de date/heure */}
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateSelectorLeft}>
                <Ionicons name="calendar-outline" size={18} color={palette.primary.default} />
                <Text style={styles.dateValue}>{dateLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
            </TouchableOpacity>
          </View>

          {/* ─── Sphère d'Intention / Action (Groupe 3 - R-05) ────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shapes-outline" size={16} color={palette.onSurface.variant} />
            <Text style={styles.sectionHeaderTitle}>{t('remNew.actionHeader')}</Text>
          </View>

          <View style={styles.actionGrid}>
            {ACTION_OPTIONS.map(opt => {
              const isSelected = actionType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.actionTile,
                    isSelected && styles.actionTileSelected,
                  ]}
                  onPress={() => setActionType(opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={isSelected ? palette.primary.default : palette.onSurface.variant}
                  />
                  <Text
                    style={[
                      styles.actionTileLabel,
                      isSelected && styles.actionTileLabelSelected,
                    ]}
                  >
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ─── Avec qui ? Une ou plusieurs personnes, la première est la principale ─── */}
          <PersonField selectedIds={personIds} onChange={setPersonIds} look="reminder" multiple />

          {/* ─── Étiquettes de couleur ─────────────────────────────────────────────── */}
          <TagField selectedIds={tagIds} onChange={setTagIds} look="reminder" />

          {/* ─── Priorité (Groupe 4 - R-05) ───────────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flash-outline" size={16} color={palette.primary.default} />
            <Text style={styles.sectionHeaderTitle}>{t('remNew.priorityHeader')}</Text>
          </View>

          <View style={styles.priorityRow}>
            {PRIORITY_OPTIONS.map(opt => {
              const isSelected = priority === opt.key;
              const chipColor = palette.priority[opt.key];
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.priorityTile,
                    isSelected && {
                      backgroundColor: palette.surface.high,
                      borderColor: chipColor,
                    },
                  ]}
                  onPress={() => setPriority(opt.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityDot, { backgroundColor: chipColor }]} />
                  <Text
                    style={[
                      styles.priorityLabel,
                      isSelected && { color: chipColor, fontWeight: '700' },
                    ]}
                  >
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ─── Récurrence & Cadence (Groupe 5) ──────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="repeat-outline" size={16} color={palette.tertiary.default} />
            <Text style={styles.sectionHeaderTitle}>{t('remNew.recurrenceHeader')}</Text>
          </View>

          <View style={styles.cardGroup}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.fieldLabel}>{t('remNew.repeat')}</Text>
                <Text style={styles.fieldHelper}>{t('remNew.repeatHelper')}</Text>
              </View>
              <Switch
                value={hasRecurrence}
                onValueChange={setHasRecurrence}
                trackColor={{ false: palette.outline.variant, true: palette.primary.default }}
                thumbColor={hasRecurrence ? '#FFFFFF' : palette.onSurface.disabled}
              />
            </View>

            {hasRecurrence && (
              <View style={styles.recurrenceOptionsRow}>
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(type => {
                  const labels = { DAILY: t('remNew.daily'), WEEKLY: t('remNew.weekly'), MONTHLY: t('remNew.monthly') };
                  const isSel = recurrenceType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.recurrenceChip, isSel && styles.recurrenceChipSelected]}
                      onPress={() => setRecurrenceType(type)}
                    >
                      <Text style={[styles.recurrenceText, isSel && styles.recurrenceTextSelected]}>
                        {labels[type]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* À confirmer : il sonne de nouveau tant qu'il n'est ni terminé ni reporté */}
            <View style={[styles.rowBetween, { marginTop: Spacing.sm }]}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={styles.fieldLabel}>{t('confirmReminder.label')}</Text>
                <Text style={styles.fieldHelper}>{t('confirmReminder.helper')}</Text>
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
                testID="reminder-confirmation"
              />
            </View>
          </View>

          {/* ─── CTA Principal Dégradé (Unique dégradé R-05) ───────────────────────── */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={palette.gradient.primary as unknown as readonly [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.gradientBtnText}>
                  {saving ? t('remNew.submitting') : t('remNew.submit')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerNoteRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color={palette.onSurface.disabled} />
              <Text style={styles.footerNote}>{t('remNew.footer')}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Modal sélecteur de date/heure natif */}
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          date={scheduledAt}
          onConfirm={d => {
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

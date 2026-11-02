import { useEffect, useState } from 'react';
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
import { format, addHours } from 'date-fns';

import { EventUseCases } from '@/use-cases/event-use-cases';
import { PersonRepository } from '@/repositories/person-repository';
import { Person, EventType } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { makeFormStyles } from '@/styles/common/form-styles';
import { MessageKey, useDateLocale, useLanguage, useT } from '@/i18n';

const BUFFER_OPTIONS: { minutes: number; labelKey?: MessageKey; label?: string }[] = [
  { minutes: 0, labelKey: 'form.none' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, labelKey: 'taskNew.hours1' },
];

export default function NewEventScreen() {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const insets = useSafeAreaInsets();
  const { showSnackbar, userTimezone } = useAppStore();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const styles = useThemedStyles(makeNewEventStyles);

  const { defaultHour, defaultDate } = useLocalSearchParams<{
    defaultHour?: string;
    defaultDate?: string;
  }>();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [startAt, setStartAt] = useState<Date>(() => {
    let d = new Date();
    if (defaultDate) {
      try {
        const parsed = new Date(defaultDate);
        if (!isNaN(parsed.getTime())) d = parsed;
      } catch {}
    }
    const h = defaultHour !== undefined ? Number(defaultHour) : d.getHours() + 1;
    d.setMinutes(0, 0, 0);
    d.setHours(h);
    return d;
  });

  const [endAt, setEndAt] = useState<Date>(() => {
    let d = new Date();
    if (defaultDate) {
      try {
        const parsed = new Date(defaultDate);
        if (!isNaN(parsed.getTime())) d = parsed;
      } catch {}
    }
    const h = defaultHour !== undefined ? Number(defaultHour) + 1 : d.getHours() + 2;
    d.setMinutes(0, 0, 0);
    d.setHours(h);
    return d;
  });

  const [eventType, setEventType] = useState<EventType>('BUSY');
  const [travelBufferMinutes, setTravelBufferMinutes] = useState<number>(0);

  // Personnes disponibles & sélection associées
  const [availablePersons, setAvailablePersons] = useState<Person[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  // Picker states
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    PersonRepository.findAll().then(setAvailablePersons).catch(() => {});
  }, []);

  function togglePersonSelect(id: string) {
    setSelectedPersonIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function validate(): boolean {
    if (!title.trim()) {
      setTitleError(t('eventNew.titleRequired'));
      return false;
    }
    if (endAt <= startAt) {
      showSnackbar(t('eventNew.endAfterStart'));
      return false;
    }
    setTitleError('');
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    try {
      await EventUseCases.createEvent({
        title: title.trim(),
        notes: notes.trim() || undefined,
        startAt,
        endAt,
        timezone: userTimezone,
        location: location.trim() || undefined,
        type: eventType,
        travelBufferMinutes,
        personIds: selectedPersonIds,
      });

      showSnackbar(t('eventNew.created'));
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[formStyles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* En-tête dynamique Midnight / Crème */}
      <View style={formStyles.toolbar}>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={() => router.back()}
          accessibilityLabel={t('form.cancel')}
        >
          <Text style={formStyles.toolbarCancel}>{t('form.cancel')}</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <Text style={formStyles.toolbarTitle}>{t('eventNew.title')}</Text>
          <Text style={formStyles.toolbarSubtitle}>{t('eventNew.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={t('eventNew.createA11y')}
        >
          <Text style={[formStyles.toolbarSave, saving && formStyles.toolbarSaveDisabled]}>
            {saving ? t('taskNew.creating') : t('taskNew.create')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={formStyles.scroll}
        contentContainerStyle={[formStyles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Carte 1 : Titre, Lieu & Notes */}
        <View style={formStyles.cardGroup}>
          <TextInput
            style={[formStyles.titleInput, !!titleError && styles.inputErrorBorder]}
            value={title}
            onChangeText={text => {
              setTitle(text);
              if (titleError) setTitleError('');
            }}
            placeholder={t('eventNew.titlePlaceholder')}
            placeholderTextColor={palette.onSurface.disabled}
            autoFocus
          />
          {!!titleError && <Text style={formStyles.errorText}>{titleError}</Text>}

          <View style={styles.inlineFieldRow}>
            <Ionicons name="location-outline" size={18} color={palette.primary.default} />
            <TextInput
              style={styles.inlineInput}
              value={location}
              onChangeText={setLocation}
              placeholder={t('eventNew.locationPlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
            />
          </View>

          <View style={formStyles.notesRow}>
            <Ionicons name="document-text-outline" size={18} color={palette.onSurface.variant} style={formStyles.notesIcon} />
            <TextInput
              style={formStyles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('eventNew.notesPlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Carte 2 : Plage Horaire */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="time-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>{t('eventNew.slotHeader')}</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={styles.timeRangeRow}>
            {/* Début */}
            <TouchableOpacity
              style={styles.timeBox}
              onPress={() => setActivePicker('start')}
            >
              <View style={styles.timeBoxHeader}>
                <Ionicons name="play-circle-outline" size={14} color={palette.primary.default} />
                <Text style={styles.timeBoxLabel}>{t('eventNew.start')}</Text>
              </View>
              <Text style={styles.timeBoxValue}>
                {format(startAt, 'HH:mm')}
              </Text>
              <Text style={styles.timeBoxDate}>
                {format(startAt, t('eventNew.shortDate'), { locale: dateLocale })}
              </Text>
            </TouchableOpacity>

            <View style={styles.timeArrow}>
              <Ionicons name="arrow-forward" size={16} color={palette.onSurface.variant} />
            </View>

            {/* Fin */}
            <TouchableOpacity
              style={styles.timeBox}
              onPress={() => setActivePicker('end')}
            >
              <View style={styles.timeBoxHeader}>
                <Ionicons name="stop-circle-outline" size={14} color={palette.tertiary.default} />
                <Text style={styles.timeBoxLabel}>{t('eventNew.end')}</Text>
              </View>
              <Text style={styles.timeBoxValue}>
                {format(endAt, 'HH:mm')}
              </Text>
              <Text style={styles.timeBoxDate}>
                {format(endAt, t('eventNew.shortDate'), { locale: dateLocale })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carte 3 : Disponibilité */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="briefcase-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>{t('eventNew.availabilityHeader')}</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={formStyles.chipsRow}>
            <TouchableOpacity
              style={[formStyles.chip, eventType === 'BUSY' && formStyles.chipActive]}
              onPress={() => setEventType('BUSY')}
            >
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color={eventType === 'BUSY' ? palette.primary.default : palette.onSurface.variant}
              />
              <Text style={[formStyles.chipText, eventType === 'BUSY' && formStyles.chipTextActive]}>
                {t('eventNew.busy')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[formStyles.chip, eventType === 'FREE' && formStyles.chipActive]}
              onPress={() => setEventType('FREE')}
            >
              <Ionicons
                name="cafe-outline"
                size={14}
                color={eventType === 'FREE' ? palette.primary.default : palette.onSurface.variant}
              />
              <Text style={[formStyles.chipText, eventType === 'FREE' && formStyles.chipTextActive]}>
                {t('eventNew.free')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carte 4 : Marge de trajet */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="car-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>{t('eventNew.bufferHeader')}</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={formStyles.chipsRow}>
            {BUFFER_OPTIONS.map(opt => {
              const isSelected = travelBufferMinutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[formStyles.chip, isSelected && formStyles.chipActive]}
                  onPress={() => setTravelBufferMinutes(opt.minutes)}
                >
                  <Text style={[formStyles.chipText, isSelected && formStyles.chipTextActive]}>
                    {opt.labelKey ? t(opt.labelKey) : opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Carte 5 : Personnes associées */}
        {availablePersons.length > 0 && (
          <>
            <View style={formStyles.sectionHeaderRow}>
              <View style={formStyles.sectionHeaderIconBadge}>
                <Ionicons name="people-outline" size={14} color={palette.primary.default} />
              </View>
              <Text style={formStyles.sectionHeaderTitle}>{t('eventNew.peopleHeader', { count: selectedPersonIds.length })}</Text>
            </View>

            <View style={formStyles.cardGroup}>
              <View style={formStyles.chipsRow}>
                {availablePersons.map(p => {
                  const isSelected = selectedPersonIds.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[formStyles.chip, isSelected && formStyles.chipActive]}
                      onPress={() => togglePersonSelect(p.id)}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'person-outline'}
                        size={14}
                        color={isSelected ? palette.primary.default : palette.onSurface.variant}
                      />
                      <Text style={[formStyles.chipText, isSelected && formStyles.chipTextActive]}>
                        {p.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Bouton Créer */}
        <Button
          label={t('eventNew.submit')}
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>

      {/* Modal Date Time Picker */}
      <DateTimePickerModal
        isVisible={activePicker !== null}
        mode="datetime"
        date={activePicker === 'start' ? startAt : endAt}
        onConfirm={d => {
          if (activePicker === 'start') {
            setStartAt(d);
            if (endAt <= d) {
              setEndAt(addHours(d, 1));
            }
          } else if (activePicker === 'end') {
            setEndAt(d);
          }
          setActivePicker(null);
        }}
        onCancel={() => setActivePicker(null)}
        confirmTextIOS={t('personNew.confirm')}
        cancelTextIOS={t('form.cancel')}
        locale={language === 'fr' ? 'fr_FR' : 'en_US'}
      />
    </KeyboardAvoidingView>
  );
}

function makeNewEventStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    inputErrorBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.error.default,
    },
    inlineFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      paddingVertical: Spacing.xs,
    },
    inlineInput: {
      flex: 1,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      paddingVertical: Spacing.xs,
    },
    timeRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    timeBox: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(15, 18, 28, 0.85)' : theme.surface.container,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(208, 188, 255, 0.16)' : theme.outline.variant,
    },
    timeBoxHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    timeBoxLabel: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timeBoxValue: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    timeBoxDate: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      marginTop: 2,
    },
    timeArrow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
  });
}

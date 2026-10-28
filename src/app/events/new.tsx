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
import { fr } from 'date-fns/locale';

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

const BUFFER_OPTIONS = [
  { minutes: 0, label: 'Aucune' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
];

export default function NewEventScreen() {
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
      setTitleError('Le titre de l\'événement est requis');
      return false;
    }
    if (endAt <= startAt) {
      showSnackbar('L\'heure de fin doit être postérieure à l\'heure de début');
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

      showSnackbar('Événement créé avec succès');
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* En-tête dynamique Midnight / Crème */}
      <View style={formStyles.toolbar}>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={() => router.back()}
          accessibilityLabel="Annuler"
        >
          <Text style={formStyles.toolbarCancel}>Annuler</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <Text style={formStyles.toolbarTitle}>Nouvel événement</Text>
          <Text style={formStyles.toolbarSubtitle}>Agenda & Calendrier</Text>
        </View>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Créer l'événement"
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
        {/* Carte 1 : Titre, Lieu & Notes */}
        <View style={formStyles.cardGroup}>
          <TextInput
            style={[formStyles.titleInput, !!titleError && styles.inputErrorBorder]}
            value={title}
            onChangeText={t => {
              setTitle(t);
              if (titleError) setTitleError('');
            }}
            placeholder="Ex: Réunion projet, Déjeuner, Atelier..."
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
              placeholder="Lieu / Adresse (ex: Salle B, Visioconférence)..."
              placeholderTextColor={palette.onSurface.disabled}
            />
          </View>

          <View style={formStyles.notesRow}>
            <Ionicons name="document-text-outline" size={18} color={palette.onSurface.variant} style={formStyles.notesIcon} />
            <TextInput
              style={formStyles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ordre du jour, contexte, détails utiles..."
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
          <Text style={formStyles.sectionHeaderTitle}>Créneau horaire</Text>
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
                <Text style={styles.timeBoxLabel}>Début</Text>
              </View>
              <Text style={styles.timeBoxValue}>
                {format(startAt, 'HH:mm')}
              </Text>
              <Text style={styles.timeBoxDate}>
                {format(startAt, 'd MMM yyyy', { locale: fr })}
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
                <Text style={styles.timeBoxLabel}>Fin</Text>
              </View>
              <Text style={styles.timeBoxValue}>
                {format(endAt, 'HH:mm')}
              </Text>
              <Text style={styles.timeBoxDate}>
                {format(endAt, 'd MMM yyyy', { locale: fr })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carte 3 : Disponibilité */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="briefcase-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Disponibilité</Text>
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
                Occupé (bloque le créneau)
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
                Temps libre
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carte 4 : Marge de trajet */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="car-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Marge de trajet / Buffer</Text>
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
                    {opt.label}
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
              <Text style={formStyles.sectionHeaderTitle}>Contacts associés ({selectedPersonIds.length})</Text>
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
          label="Créer l'événement"
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
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
        locale="fr_FR"
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

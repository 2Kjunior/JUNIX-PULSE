/**
 * Formulaire de création d'un événement dans l'agenda.
 */

import { useEffect, useState, useCallback } from 'react';
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
import { format, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';

import { EventUseCases } from '@/use-cases/event-use-cases';
import { PersonRepository } from '@/repositories/person-repository';
import { Person, EventType } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
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

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [startAt, setStartAt] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });

  const [endAt, setEndAt] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
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
      setTitleError('Le titre est requis');
      return false;
    }
    if (endAt <= startAt) {
      showSnackbar("L'heure de fin doit être postérieure à l'heure de début");
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
        <Text style={styles.headerTitle}>Nouvel événement</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Enregistrer"
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
            placeholder="Ex: Réunion projet, Anniversaire, Déjeuner..."
            placeholderTextColor={OnSurface.disabled}
            autoFocus
          />
          {!!titleError && <Text style={styles.errorText}>{titleError}</Text>}
        </View>

        {/* Lieu / Adresse */}
        <View style={styles.field}>
          <Text style={styles.label}>Lieu / Adresse</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={18} color={OnSurface.variant} />
            <TextInput
              style={styles.inputInner}
              value={location}
              onChangeText={setLocation}
              placeholder="Ex: Bureau B2, Visioconférence, Restaurant..."
              placeholderTextColor={OnSurface.disabled}
            />
          </View>
        </View>

        {/* Dates & Heures (Début et Fin) */}
        <View style={styles.fieldRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Début</Text>
            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => setActivePicker('start')}
            >
              <Ionicons name="time-outline" size={18} color={Primary.default} />
              <Text style={styles.dateTimeText}>
                {format(startAt, 'd MMM HH:mm', { locale: fr })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Fin</Text>
            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => setActivePicker('end')}
            >
              <Ionicons name="time-outline" size={18} color={Tertiary.default} />
              <Text style={styles.dateTimeText}>
                {format(endAt, 'd MMM HH:mm', { locale: fr })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Type d'événement (Occupé vs Libre) */}
        <View style={styles.field}>
          <Text style={styles.label}>Disponibilité</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, eventType === 'BUSY' && styles.chipActive]}
              onPress={() => setEventType('BUSY')}
            >
              <Ionicons
                name="briefcase-outline"
                size={16}
                color={eventType === 'BUSY' ? Primary.onContainer : OnSurface.variant}
              />
              <Text style={[styles.chipText, eventType === 'BUSY' && styles.chipTextActive]}>
                Occupé (Bloque le créneau)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, eventType === 'FREE' && styles.chipActive]}
              onPress={() => setEventType('FREE')}
            >
              <Ionicons
                name="cafe-outline"
                size={16}
                color={eventType === 'FREE' ? Primary.onContainer : OnSurface.variant}
              />
              <Text style={[styles.chipText, eventType === 'FREE' && styles.chipTextActive]}>
                Temps libre
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Marge de trajet / déplacement */}
        <View style={styles.field}>
          <Text style={styles.label}>Marge de déplacement (Buffer avant)</Text>
          <View style={styles.chipRowWrap}>
            {BUFFER_OPTIONS.map(opt => {
              const isSelected = travelBufferMinutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setTravelBufferMinutes(opt.minutes)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {opt.minutes > 0 ? `🚗 ${opt.label}` : opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Personnes invitées / associées */}
        {availablePersons.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Personnes associées</Text>
            <View style={styles.chipRowWrap}>
              {availablePersons.map(p => {
                const isSelected = selectedPersonIds.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => togglePersonSelect(p.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'person-outline'}
                      size={16}
                      color={isSelected ? Primary.onContainer : OnSurface.variant}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {p.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes & Détails</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ordre du jour, informations importantes, liens..."
            placeholderTextColor={OnSurface.disabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Button
          label="Créer l'événement"
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          style={styles.submitBtn}
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
            // Si la fin est inférieure au nouveau début, décaler la fin de +1h
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
  fieldRow: { flexDirection: 'row', gap: Spacing.md },
  label: { ...Typography.labelMedium, color: OnSurface.variant, marginBottom: 4 },
  input: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
  },
  multilineInput: { minHeight: 90 },
  inputError: { borderWidth: 1, borderColor: ErrorColors.default },
  errorText: { ...Typography.labelSmall, color: ErrorColors.default, marginTop: 4 },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inputInner: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
  },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateTimeText: { ...Typography.labelMedium, color: OnSurface.primary },
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
  submitBtn: { marginTop: Spacing.md },
});

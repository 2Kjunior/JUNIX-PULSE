/**
 * Formulaire de création d'une nouvelle personne / contact.
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { PersonUseCases } from '@/use-cases/person-use-cases';
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

const RELATIONSHIP_OPTIONS = [
  'Ami·e',
  'Famille',
  'Collègue',
  'Partenaire',
  'Client·e',
  'Autre',
];

const THRESHOLD_OPTIONS = [
  { days: 7, label: 'Tous les 7 jours' },
  { days: 14, label: 'Tous les 14 jours' },
  { days: 30, label: 'Tous les mois' },
  { days: 60, label: 'Tous les 2 mois' },
  { days: 90, label: 'Tous les 3 mois' },
];

export default function NewPersonScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState('Ami·e');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [forgottenThresholdDays, setForgottenThresholdDays] = useState<number>(30);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  function validate(): boolean {
    if (!displayName.trim()) {
      setNameError('Le nom est requis');
      return false;
    }
    setNameError('');
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    try {
      await PersonUseCases.createPerson({
        displayName: displayName.trim(),
        relationship,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthDate,
        notes: notes.trim() || undefined,
        forgottenThresholdDays,
      });

      showSnackbar('Personne ajoutée avec succès');
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
        <Text style={styles.headerTitle}>Nouvelle personne</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Enregistrer"
        >
          <Text style={[styles.saveBtnText, saving && styles.saveBtnDisabled]}>
            {saving ? 'Ajout...' : 'Ajouter'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Nom complet */}
        <View style={styles.field}>
          <Text style={styles.label}>Nom complet *</Text>
          <TextInput
            style={[styles.input, !!nameError && styles.inputError]}
            value={displayName}
            onChangeText={t => {
              setDisplayName(t);
              if (nameError) setNameError('');
            }}
            placeholder="Ex: Alexandre Dupont"
            placeholderTextColor={OnSurface.disabled}
            autoFocus
          />
          {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
        </View>

        {/* Relation */}
        <View style={styles.field}>
          <Text style={styles.label}>Lien / Relation</Text>
          <View style={styles.chipRowWrap}>
            {RELATIONSHIP_OPTIONS.map(opt => {
              const isSelected = relationship === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setRelationship(opt)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Coordonnées (Téléphone & Email) */}
        <View style={styles.fieldRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="06 12 34 56 78"
              placeholderTextColor={OnSurface.disabled}
              keyboardType="phone-pad"
            />
          </View>

          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="alex@example.com"
              placeholderTextColor={OnSurface.disabled}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Date d'anniversaire */}
        <View style={styles.field}>
          <Text style={styles.label}>Date d&apos;anniversaire</Text>
          <TouchableOpacity
            style={styles.inputSelect}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="gift-outline" size={20} color={Tertiary.default} />
            <Text style={styles.inputSelectText}>
              {birthDate
                ? format(new Date(birthDate + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })
                : 'Ajouter la date d’anniversaire...'}
            </Text>
            {birthDate && (
              <TouchableOpacity onPress={() => setBirthDate(undefined)}>
                <Ionicons name="close-circle" size={18} color={OnSurface.disabled} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Fréquence de contact souhaitée */}
        <View style={styles.field}>
          <Text style={styles.label}>Fréquence de contact conseillée</Text>
          <View style={styles.chipRowWrap}>
            {THRESHOLD_OPTIONS.map(opt => {
              const isSelected = forgottenThresholdDays === opt.days;
              return (
                <TouchableOpacity
                  key={opt.days}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setForgottenThresholdDays(opt.days)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes & Mémos personnels</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Goûts, sujets de discussion, contexte, adresses..."
            placeholderTextColor={OnSurface.disabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Button
          label="Ajouter la personne"
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
        date={birthDate ? new Date(birthDate + 'T12:00:00') : new Date()}
        onConfirm={d => {
          setShowDatePicker(false);
          setBirthDate(format(d, 'yyyy-MM-dd'));
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
  inputSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  inputSelectText: { flex: 1, ...Typography.bodyMedium, color: OnSurface.primary },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  chipActive: { backgroundColor: Primary.container, borderColor: Primary.default },
  chipText: { ...Typography.labelMedium, color: OnSurface.variant },
  chipTextActive: { color: Primary.onContainer },
  submitBtn: { marginTop: Spacing.md },
});

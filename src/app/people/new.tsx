/**
 * Formulaire de création d'une nouvelle personne / contact.
 * Thématisé dynamiquement : mode sombre Midnight Glow et mode clair crème chaleureuse.
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

import { Contact, requestPermissionsAsync } from 'expo-contacts';

import { PersonUseCases } from '@/use-cases/person-use-cases';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
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
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNewPersonStyles);

  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState('Ami·e');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [forgottenThresholdDays, setForgottenThresholdDays] = useState<number>(30);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedFromContacts, setImportedFromContacts] = useState(false);
  const [nameError, setNameError] = useState('');

  async function handleImportFromContacts() {
    setImporting(true);
    try {
      if (Platform.OS === 'android') {
        const { status } = await requestPermissionsAsync();
        if (status !== 'granted') {
          showSnackbar("Permission d'accès aux contacts requise");
          setImporting(false);
          return;
        }
      }

      const contact = await Contact.presentPicker();
      if (!contact) {
        setImporting(false);
        return;
      }

      const fullName = (await contact.getFullName()) || '';
      const phones = await contact.getPhones();
      const emails = await contact.getEmails();

      let birthday: { day?: number; month?: number; year?: number } | null = null;
      try {
        birthday = await contact.getBirthday();
      } catch {
        // getBirthday est specifique iOS
      }
      if (!birthday) {
        try {
          const dates = await contact.getDates();
          const bDay = dates?.find((d) => d.label?.toLowerCase() === 'birthday');
          if (bDay?.date) {
            birthday = bDay.date;
          }
        } catch {
          // ignore
        }
      }

      if (fullName) {
        setDisplayName(fullName);
        setNameError('');
      }
      if (phones && phones.length > 0 && phones[0]?.number) {
        setPhone(phones[0].number);
      }
      if (emails && emails.length > 0 && emails[0]?.address) {
        setEmail(emails[0].address);
      }
      if (birthday && birthday.day && birthday.month) {
        const y = birthday.year ? String(birthday.year).padStart(4, '0') : '2000';
        const m = String(birthday.month).padStart(2, '0');
        const d = String(birthday.day).padStart(2, '0');
        setBirthDate(`${y}-${m}-${d}`);
      }

      setImportedFromContacts(true);
      showSnackbar(`Contact « ${fullName || 'sélectionné'} » importé.`);
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : "Impossible d'accéder au carnet d'adresses");
    } finally {
      setImporting(false);
    }
  }

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
        importedFromContacts,
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={24} color={palette.onSurface.primary} />
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
        {/* Action d'importation rapide depuis le carnet d'adresses */}
        <TouchableOpacity
          style={[styles.importBtn, importedFromContacts && styles.importBtnActive]}
          onPress={handleImportFromContacts}
          disabled={importing}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Importer depuis le carnet d'adresses"
        >
          <View style={[styles.importIconCircle, importedFromContacts && styles.importIconCircleActive]}>
            <Ionicons
              name={importedFromContacts ? 'checkmark' : 'person-add-outline'}
              size={18}
              color={importedFromContacts ? palette.success.default : palette.primary.default}
            />
          </View>
          <View style={styles.importTextCol}>
            <Text style={styles.importTitle}>
              {importedFromContacts
                ? 'Coordonnées issues du carnet d’adresses'
                : 'Importer depuis le carnet d’adresses'}
            </Text>
            <Text style={styles.importSubtitle}>
              {importedFromContacts
                ? 'Nom, téléphone et email chargés en local'
                : 'Pré-remplir le nom, le numéro et l’email en 1 clic'}
            </Text>
          </View>
          <Ionicons
            name={importedFromContacts ? 'checkmark-circle' : 'chevron-forward'}
            size={18}
            color={importedFromContacts ? palette.success.default : palette.onSurface.variant}
          />
        </TouchableOpacity>

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
            placeholderTextColor={palette.onSurface.disabled}
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
              placeholderTextColor={palette.onSurface.disabled}
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
              placeholderTextColor={palette.onSurface.disabled}
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
            <Ionicons name="gift-outline" size={20} color={palette.tertiary.default} />
            <Text style={styles.inputSelectText}>
              {birthDate
                ? format(new Date(birthDate + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })
                : 'Ajouter la date d’anniversaire...'}
            </Text>
            {birthDate && (
              <TouchableOpacity onPress={() => setBirthDate(undefined)}>
                <Ionicons name="close-circle" size={18} color={palette.onSurface.disabled} />
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
            placeholderTextColor={palette.onSurface.disabled}
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

function makeNewPersonStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
    },
    closeBtn: {
      padding: Spacing.xs,
    },
    headerTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    saveBtnText: {
      ...Typography.titleMedium,
      color: theme.primary.default,
      fontWeight: '700',
    },
    saveBtnDisabled: {
      color: theme.onSurface.disabled,
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.xl,
    },
    field: {
      gap: Spacing.xs,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    label: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      marginBottom: 4,
    },
    input: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      color: theme.onSurface.primary,
      borderWidth: 1,
      borderColor: isDark ? 'transparent' : theme.outline.variant,
      ...Typography.bodyMedium,
    },
    multilineInput: {
      minHeight: 90,
    },
    inputError: {
      borderWidth: 1,
      borderColor: theme.error.default,
    },
    errorText: {
      ...Typography.labelSmall,
      color: theme.error.default,
      marginTop: 4,
    },
    inputSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? 'transparent' : theme.outline.variant,
    },
    inputSelectText: {
      flex: 1,
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
    },
    chipRowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    chipActive: {
      backgroundColor: theme.primary.container,
      borderColor: theme.primary.default,
    },
    chipText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    chipTextActive: {
      color: theme.primary.onContainer,
      fontWeight: '700',
    },
    submitBtn: {
      marginTop: Spacing.md,
    },
    importBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : theme.surface.container,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : theme.outline.variant,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    importBtnActive: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(5, 150, 105, 0.10)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : theme.success.default,
    },
    importIconCircle: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: isDark ? 'rgba(160, 120, 255, 0.12)' : 'rgba(107, 70, 193, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    importIconCircleActive: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.15)',
    },
    importTextCol: {
      flex: 1,
      gap: 2,
    },
    importTitle: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    importSubtitle: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      fontSize: 12,
    },
  });
}

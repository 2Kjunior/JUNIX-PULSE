/**
 * Formulaire de création d'un objectif.
 */
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { GoalUseCases } from '@/use-cases/goal-use-cases';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function NewGoalScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un titre pour l\'objectif.');
      return;
    }

    try {
      setSaving(true);
      await GoalUseCases.createGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline ? deadline.toISOString() : undefined,
      });

      showSnackbar({ message: `Objectif "${title.trim()}" créé avec succès ! 🎯` });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer l\'objectif.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvel objectif</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Titre */}
        <View style={styles.field}>
          <Text style={styles.label}>Titre de l'objectif *</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: Lancer mon application, Courir un marathon..."
            placeholderTextColor={OnSurface.disabled}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description & Vision</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Pourquoi cet objectif est important et comment vous allez l'atteindre..."
            placeholderTextColor={OnSurface.disabled}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Deadline */}
        <View style={styles.field}>
          <Text style={styles.label}>Date cible (Deadline)</Text>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={Primary.default} />
            <Text style={styles.dateText}>
              {deadline
                ? format(deadline, 'd MMMM yyyy', { locale: fr })
                : 'Aucune date limite fixée'}
            </Text>
            {deadline && (
              <TouchableOpacity onPress={() => setDeadline(null)}>
                <Ionicons name="close-circle" size={18} color={OnSurface.disabled} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        <Button
          label={saving ? 'Création...' : 'Créer l\'objectif'}
          onPress={handleSave}
          disabled={saving}
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={deadline || new Date()}
        onConfirm={date => {
          setShowDatePicker(false);
          setDeadline(date);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Surface.container,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  closeBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.titleLarge, color: OnSurface.primary },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  field: { marginBottom: Spacing.xl },
  label: { ...Typography.labelMedium, color: OnSurface.variant, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: OnSurface.primary,
  },
  multiline: { height: 100, textAlignVertical: 'top' },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateText: { flex: 1, ...Typography.bodyMedium, color: OnSurface.primary },
});

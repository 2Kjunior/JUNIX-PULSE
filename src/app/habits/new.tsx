/**
 * Formulaire de création d'une habitude.
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

import { HabitUseCases } from '@/use-cases/habit-use-cases';
import { HabitFrequency } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const COLOR_OPTIONS = [
  { id: 'primary', label: 'Violet', hex: Primary.default },
  { id: 'tertiary', label: 'Rose', hex: Tertiary.default },
  { id: 'green', label: 'Vert', hex: '#4CAF50' },
  { id: 'orange', label: 'Orange', hex: '#FF9800' },
  { id: 'purple', label: 'Pourpre', hex: '#9C27B0' },
  { id: 'cyan', label: 'Cyan', hex: '#00BCD4' },
];

export default function NewHabitScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('DAILY');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(3);
  const [color, setColor] = useState('primary');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un titre pour votre habitude.');
      return;
    }

    try {
      setSaving(true);
      await HabitUseCases.createHabit({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        targetDaysPerWeek: frequency === 'WEEKLY' ? targetDaysPerWeek : undefined,
        color,
      });

      showSnackbar(`Habitude "${title.trim()}" créée avec succès`);
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer l\'habitude.');
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
        <Text style={styles.headerTitle}>Nouvelle habitude</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Titre */}
        <View style={styles.field}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: Boire 2L d'eau, Lire 15 mins..."
            placeholderTextColor={OnSurface.disabled}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description (optionnelle)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Ajouter des précisions..."
            placeholderTextColor={OnSurface.disabled}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Fréquence */}
        <View style={styles.field}>
          <Text style={styles.label}>Fréquence</Text>
          <View style={styles.freqRow}>
            <TouchableOpacity
              style={[
                styles.freqTab,
                frequency === 'DAILY' && styles.freqTabActive,
              ]}
              onPress={() => setFrequency('DAILY')}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={frequency === 'DAILY' ? Surface.base : OnSurface.variant}
              />
              <Text
                style={[
                  styles.freqText,
                  frequency === 'DAILY' && styles.freqTextActive,
                ]}
              >
                Quotidienne
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.freqTab,
                frequency === 'WEEKLY' && styles.freqTabActive,
              ]}
              onPress={() => setFrequency('WEEKLY')}
            >
              <Ionicons
                name="bar-chart-outline"
                size={18}
                color={frequency === 'WEEKLY' ? Surface.base : OnSurface.variant}
              />
              <Text
                style={[
                  styles.freqText,
                  frequency === 'WEEKLY' && styles.freqTextActive,
                ]}
              >
                Hebdomadaire
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Jours visés si Hebdomadaire */}
        {frequency === 'WEEKLY' && (
          <View style={styles.field}>
            <Text style={styles.label}>Objectif : {targetDaysPerWeek} jours par semaine</Text>
            <View style={styles.daysSelector}>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.dayPill,
                    targetDaysPerWeek === num && styles.dayPillActive,
                  ]}
                  onPress={() => setTargetDaysPerWeek(num)}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      targetDaysPerWeek === num && styles.dayPillTextActive,
                    ]}
                  >
                    {num}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Thème Couleur */}
        <View style={styles.field}>
          <Text style={styles.label}>Couleur distinctive</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.hex },
                  color === c.id && styles.colorCircleSelected,
                ]}
                onPress={() => setColor(c.id)}
              >
                {color === c.id && (
                  <Ionicons name="checkmark" size={16} color={Surface.base} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          label="Créer l'habitude"
          onPress={handleSave}
          variant="primary"
          loading={saving}
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
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
  label: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    marginBottom: Spacing.xs,
  },
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
  multiline: { height: 90, textAlignVertical: 'top' },
  freqRow: { flexDirection: 'row', gap: Spacing.md },
  freqTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.xs,
  },
  freqTabActive: {
    backgroundColor: Primary.default,
    borderColor: Primary.default,
  },
  freqText: { ...Typography.labelLarge, color: OnSurface.variant },
  freqTextActive: { color: Surface.base, fontWeight: '700' },
  daysSelector: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  dayPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: Tertiary.default, borderColor: Tertiary.default },
  dayPillText: { ...Typography.labelMedium, color: OnSurface.variant },
  dayPillTextActive: { color: Surface.base, fontWeight: '700' },
  colorRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: OnSurface.primary,
  },
});

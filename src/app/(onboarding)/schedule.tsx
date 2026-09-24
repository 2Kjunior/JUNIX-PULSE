/**
 * Onboarding — Étape 4 : Préférences de planification
 * Heure de fin de journée et résumé matin. Minimal et utile.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
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
import { StepIndicator } from '@/components/ui/StepIndicator';
import { SettingsRepository } from '@/repositories/settings-repository';

const END_OF_DAY_OPTIONS = [17, 18, 19, 20, 21, 22];
const MORNING_OPTIONS = [6, 7, 8, 9, 10];

export default function OnboardingSchedule() {
  const [endOfDayHour, setEndOfDayHour] = useState(20);
  const [morningHour, setMorningHour] = useState(8);
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    setSaving(true);
    try {
      await SettingsRepository.update({
        endOfDayHour,
        morningBriefingHour: morningHour,
        updatedAt: new Date().toISOString(),
      });
      router.push('/(onboarding)/permissions');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Indicateur d'étape */}
      <StepIndicator total={5} current={4} />

      <Text style={styles.title}>Votre rythme</Text>
      <Text style={styles.subtitle}>
        Ces préférences aident Junix Pulse à proposer les bons moments.
      </Text>

      {/* Fin de journée */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Fin de journée</Text>
        <Text style={styles.sectionHint}>
          À cette heure, Junix peut vous proposer de gérer les tâches non terminées.
        </Text>
        <View style={styles.chipRow}>
          {END_OF_DAY_OPTIONS.map(h => (
            <TouchableOpacity
              key={h}
              style={[styles.chip, endOfDayHour === h && styles.chipSelected]}
              onPress={() => setEndOfDayHour(h)}
            >
              <Text style={[styles.chipLabel, endOfDayHour === h && styles.chipLabelSelected]}>
                {h}h
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Résumé matin */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Résumé du matin</Text>
        <Text style={styles.sectionHint}>
          Sur l'écran Aujourd'hui, votre journée sera prête à cette heure.
        </Text>
        <View style={styles.chipRow}>
          {MORNING_OPTIONS.map(h => (
            <TouchableOpacity
              key={h}
              style={[styles.chip, morningHour === h && styles.chipSelected]}
              onPress={() => setMorningHour(h)}
            >
              <Text style={[styles.chipLabel, morningHour === h && styles.chipLabelSelected]}>
                {h}h
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Ces préférences sont modifiables à tout moment dans Paramètres.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Continuer"
          onPress={handleNext}
          variant="primary"
          size="lg"
          loading={saving}
          style={styles.btnPrimary}
          testID="onboarding-schedule-next"
        />
        <Button label="Retour" onPress={() => router.back()} variant="ghost" size="md" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: OnSurface.primary,
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: OnSurface.variant,
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  section: { marginBottom: Spacing.xxl },
  sectionLabel: { ...Typography.titleMedium, color: OnSurface.primary, marginBottom: Spacing.xs },
  sectionHint: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  chipSelected: { backgroundColor: Primary.container, borderColor: Primary.default },
  chipLabel: { ...Typography.labelLarge, color: OnSurface.variant },
  chipLabelSelected: { color: Primary.onContainer },
  note: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  noteText: { ...Typography.bodySmall, color: OnSurface.disabled, lineHeight: 18 },
  actions: { gap: Spacing.sm, alignItems: 'center' },
  btnPrimary: { width: '100%' },
});

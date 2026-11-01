/**
 * Onboarding — Étape 3 : Personnalisation minimale
 * Demande le prénom et le fuseau horaire. Rien de plus.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { detectDeviceTimezone } from '@/services/device-timezone';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useMascotPreferences } from '@/features/mascot/use-mascot-preferences';
import { saveMascotSettings } from '@/services/mascot/mascot-settings-service';

const ADDRESS_CHOICES: readonly { value: 'tu' | 'vous'; label: string }[] = [
  { value: 'tu', label: 'Tutoiement' },
  { value: 'vous', label: 'Vouvoiement' },
];

export default function OnboardingPersonalize() {
  const { settings: mascotSettings } = useMascotPreferences();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingPersonalizeStyles);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    setSaving(true);
    try {
      await SettingsRepository.update({
        displayName: name.trim() || undefined,
        // The timezone is the one of the phone: it is never asked
        timezone: detectDeviceTimezone(),
        updatedAt: new Date().toISOString(),
      });
      router.push('/(onboarding)/schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Indicateur d'étape */}
        <View style={styles.headerRow}>
          <StepIndicator total={5} current={3} />
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/permissions')}
            style={styles.skipBtn}
            accessibilityLabel="Passer les étapes restantes"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Passer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Quelques préférences</Text>
        <Text style={styles.subtitle}>
          Pour vous identifier et adapter Junix Pulse à votre fuseau horaire.
        </Text>

        {/* Prénom (optionnel) */}
        <View style={styles.field}>
          <Text style={styles.label}>Votre prénom</Text>
          <Text style={styles.hint}>Optionnel — pour personnaliser les messages</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex&nbsp;: Camille"
            placeholderTextColor={palette.onSurface.disabled}
            maxLength={50}
            autoCorrect={false}
            testID="onboarding-name-input"
          />
        </View>

        {/* Façon dont la mascotte s'adresse à l'utilisateur (sans réponse : tutoiement) */}
        <View style={styles.field}>
          <Text style={styles.label}>Façon de vous parler</Text>
          <Text style={styles.hint}>Pulse peut tutoyer ou vouvoyer — modifiable dans Paramètres</Text>
          <View style={styles.choiceRow}>
            {ADDRESS_CHOICES.map(choice => {
              const selected = mascotSettings.address === choice.value;
              return (
                <TouchableOpacity
                  key={choice.value}
                  style={[styles.choice, selected && styles.choiceSelected]}
                  onPress={() => void saveMascotSettings({ address: choice.value }).catch(() => {})}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`onboarding-address-${choice.value}`}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{choice.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Continuer"
            onPress={handleNext}
            variant="primary"
            size="lg"
            loading={saving}
            style={styles.btnPrimary}
            testID="onboarding-personalize-next"
          />
          <Button
            label="Retour"
            onPress={() => router.back()}
            variant="ghost"
            size="md"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeOnboardingPersonalizeStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    content: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.xxxl,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    skipBtn: {
      paddingVertical: Spacing.xs,
      paddingLeft: Spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    skipText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.disabled,
    },
    title: {
      fontSize: 26,
      fontFamily: 'Outfit-Bold',
      color: theme.onSurface.primary,
      marginBottom: Spacing.sm,
      lineHeight: 34,
    },
    subtitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.variant,
      lineHeight: 24,
      marginBottom: Spacing.xxl,
    },
    field: {
      marginBottom: Spacing.xl,
    },
    label: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginBottom: Spacing.xs,
    },
    hint: {
      ...Typography.bodySmall,
      color: theme.onSurface.disabled,
      marginBottom: Spacing.sm,
    },
    input: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      color: theme.onSurface.primary,
      fontSize: 16,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      minHeight: 48,
    },
    choiceRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    choice: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    choiceSelected: {
      backgroundColor: theme.primary.container,
      borderColor: theme.primary.default,
    },
    choiceText: {
      ...Typography.labelLarge,
      color: theme.onSurface.variant,
    },
    choiceTextSelected: {
      color: theme.primary.onContainer,
      fontWeight: '700',
    },
    actions: {
      gap: Spacing.sm,
      alignItems: 'center',
      marginTop: Spacing.xl,
    },
    btnPrimary: {
      width: '100%',
    },
  });


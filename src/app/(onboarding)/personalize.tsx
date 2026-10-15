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
import { Ionicons } from '@expo/vector-icons';
import { getLocales, getCalendars } from 'expo-localization';
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

// Fuseaux les plus courants — simplification V1
// Un sélecteur complet est disponible dans Paramètres
const COMMON_TIMEZONES = [
  { label: 'Paris (Europe/Paris)', value: 'Europe/Paris' },
  { label: 'Londres (Europe/London)', value: 'Europe/London' },
  { label: 'Abidjan (Africa/Abidjan)', value: 'Africa/Abidjan' },
  { label: 'Dakar (Africa/Dakar)', value: 'Africa/Dakar' },
  { label: 'Casablanca (Africa/Casablanca)', value: 'Africa/Casablanca' },
  { label: 'New York (America/New_York)', value: 'America/New_York' },
  { label: 'Los Angeles (America/Los_Angeles)', value: 'America/Los_Angeles' },
  { label: 'Montréal (America/Toronto)', value: 'America/Toronto' },
  { label: 'UTC', value: 'UTC' },
];

function detectTimezone(): string {
  try {
    const calendars = getCalendars();
    return calendars[0]?.timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function OnboardingPersonalize() {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingPersonalizeStyles);
  const detectedTz = detectTimezone();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(detectedTz);
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayTz = COMMON_TIMEZONES.find(t => t.value === timezone)?.label ?? timezone;

  async function handleNext() {
    setSaving(true);
    try {
      await SettingsRepository.update({
        displayName: name.trim() || undefined,
        timezone,
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
        <StepIndicator total={5} current={3} />

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
            placeholder="Ex : Marie"
            placeholderTextColor={palette.onSurface.disabled}
            maxLength={50}
            autoCorrect={false}
            testID="onboarding-name-input"
          />
        </View>

        {/* Fuseau horaire */}
        <View style={styles.field}>
          <Text style={styles.label}>Fuseau horaire</Text>
          <Text style={styles.hint}>Détecté automatiquement — modifiable plus tard</Text>
          <TouchableOpacity
            style={styles.tzSelector}
            onPress={() => setShowTzPicker(!showTzPicker)}
            testID="onboarding-tz-selector"
            accessibilityRole="button"
            accessibilityLabel="Sélectionner le fuseau horaire"
          >
            <Text style={styles.tzValue}>{displayTz}</Text>
            <Ionicons
              name={showTzPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={palette.onSurface.variant}
            />
          </TouchableOpacity>

          {showTzPicker && (
            <View style={styles.tzList}>
              {COMMON_TIMEZONES.map(tz => (
                <TouchableOpacity
                  key={tz.value}
                  style={[
                    styles.tzItem,
                    tz.value === timezone && styles.tzItemSelected,
                  ]}
                  onPress={() => {
                    setTimezone(tz.value);
                    setShowTzPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.tzItemLabel,
                      tz.value === timezone && styles.tzItemLabelSelected,
                    ]}
                  >
                    {tz.label}
                  </Text>
                  {tz.value === timezone && (
                    <Ionicons name="checkmark" size={16} color={palette.primary.default} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    tzSelector: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
    },
    tzValue: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      flex: 1,
    },
    tzList: {
      backgroundColor: theme.surface.high,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      marginTop: Spacing.xs,
      overflow: 'hidden',
    },
    tzItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.outline.variant,
    },
    tzItemSelected: {
      backgroundColor: theme.primary.container,
    },
    tzItemLabel: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      flex: 1,
    },
    tzItemLabelSelected: {
      color: theme.primary.onContainer,
    },
    tzCheck: {
      color: theme.primary.default,
      fontSize: 16,
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


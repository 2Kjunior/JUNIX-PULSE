/**
 * Onboarding, screen 3 of 5: the first name, and « tu » or « vous » (study 001, 16.13; sheet 044).
 * Both optional. The time zone is the phone's: it is never asked.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useMascotPreferences } from '@/features/mascot/use-mascot-preferences';
import { GUIDE_ROOM, OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { MessageKey, useLanguage, useT } from '@/i18n';
import { SettingsRepository } from '@/repositories/settings-repository';
import { detectDeviceTimezone } from '@/services/device-timezone';
import { saveMascotSettings } from '@/services/mascot/mascot-settings-service';

const ADDRESS_CHOICES: readonly { value: 'tu' | 'vous'; labelKey: MessageKey }[] = [
  { value: 'tu', labelKey: 'personalize.addressTu' },
  { value: 'vous', labelKey: 'personalize.addressVous' },
];

export default function OnboardingPersonalize() {
  const t = useT();
  const language = useLanguage();
  const { settings: mascotSettings } = useMascotPreferences();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingPersonalizeStyles);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // A visit seen again: the first name already known is there
  useEffect(() => {
    SettingsRepository.get()
      .then(settings => setName(current => current || settings.displayName?.trim() || ''))
      .catch(() => {});
  }, []);

  async function handleNext() {
    setSaving(true);
    try {
      await SettingsRepository.update({
        displayName: name.trim() || undefined,
        // The timezone is the one of the phone: it is never asked
        timezone: detectDeviceTimezone(),
        updatedAt: new Date().toISOString(),
      });
      router.push('/(onboarding)/try');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingFrame
      step={3}
      onSkip={() => router.push('/(onboarding)/permissions')}
      // Pulse sits at the top left with its bubble: room for it above the title
      guideRoom={GUIDE_ROOM}
      title={t('onb.name.title')}
      cta={{ label: t('common.continue'), onPress: handleNext, loading: saving, testID: 'onboarding-personalize-next' }}
    >
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t('personalize.namePlaceholder')}
        placeholderTextColor={palette.onSurface.disabled}
        maxLength={50}
        autoCorrect={false}
        accessibilityLabel={t('personalize.nameLabel')}
        testID="onboarding-name-input"
      />

      {/* « tu » or « vous » for Pulse (none chosen: tu). English has neither: French only. */}
      {language === 'fr' && (
        <View style={styles.field}>
          <Text style={styles.label}>{t('onb.name.address')}</Text>
          <View style={styles.choiceRow}>
            {ADDRESS_CHOICES.map(choice => {
              const selected = mascotSettings.address === choice.value;
              return (
                <TouchableOpacity
                  key={choice.value}
                  style={[styles.choice, selected && styles.choiceSelected]}
                  onPress={() => void saveMascotSettings({ address: choice.value }).catch(() => {})}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`onboarding-address-${choice.value}`}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{t(choice.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </OnboardingFrame>
  );
}

function makeOnboardingPersonalizeStyles(theme: ThemePalette) {
  return StyleSheet.create({
    input: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      minHeight: 52,
    },
    field: {
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    label: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
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
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      backgroundColor: theme.surface.container,
    },
    choiceSelected: {
      borderColor: theme.primary.default,
      backgroundColor: theme.primary.container,
    },
    choiceText: {
      ...Typography.labelLarge,
      color: theme.onSurface.variant,
    },
    choiceTextSelected: {
      color: theme.primary.onContainer,
      fontWeight: '700',
    },
  });
}

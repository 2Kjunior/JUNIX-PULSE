/**
 * Onboarding, screen 5 of 5: one permission, the notifications, with its reason (study 001, 16.13;
 * sheet 044). « Pour que "Appeler maman" sonne demain » when the person just added one.
 *
 * The other permissions are asked when they serve (the contacts when importing a person); the
 * exact alarms are offered right after the notifications are allowed, since a reminder now waits.
 * The backup, the hours of the morning and the evening and the language stay in the settings.
 * Refused, the app still works: the reminders stay visible in it.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import type { ThemePalette } from '@/constants/palettes';
import { Spacing, Typography } from '@/constants/theme';
import { setGuidePermission } from '@/features/mascot/onboarding-guide-state';
import { OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { SettingsRepository } from '@/repositories/settings-repository';
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';

export default function OnboardingPermissions() {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingPermissionsStyles);
  const setOnboardingComplete = useAppStore(state => state.setOnboardingComplete);
  const { first } = useLocalSearchParams<{ first?: string }>();
  const [answer, setAnswer] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [busy, setBusy] = useState(false);

  async function offerExactAlarms() {
    const { granted, canAsk } = await NotificationService.getExactAlarmStatus();
    if (granted || !canAsk) return;
    GlassAlert.alert(t('permissions.exactAlarms.title'), t('permissions.exactAlarms.body'), [
      { text: t('permissions.exactAlarms.later'), style: 'cancel' },
      { text: t('permissions.exactAlarms.allow'), onPress: () => void NotificationService.requestExactAlarms() },
    ]);
  }

  async function allow() {
    setBusy(true);
    try {
      const granted = await NotificationService.requestPermissions();
      setAnswer(granted ? 'granted' : 'denied');
      // Pulse answers: a small party if allowed, no insisting otherwise
      setGuidePermission(granted ? 'granted' : 'denied');
      await SettingsRepository.update({ notificationsEnabled: granted, updatedAt: new Date().toISOString() });
      if (granted) await offerExactAlarms();
    } catch {
      setAnswer('denied');
      setGuidePermission('denied');
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await SettingsRepository.markOnboardingComplete(new Date().toISOString());
      setOnboardingComplete(true);
      // The move to the tabs is made by the redirect of the root layout
    } finally {
      setBusy(false);
    }
  }

  const asked = answer !== 'idle';
  const title = first ? t('onb.notif.titleFirst', { title: first }) : t('onb.notif.title');
  const subtitle =
    answer === 'granted' ? t('onb.notif.granted') : answer === 'denied' ? t('onb.notif.denied') : t('onb.notif.subtitle');

  return (
    <OnboardingFrame
      step={5}
      onSkip={asked ? undefined : () => void finish()}
      skipLabel={t('permissions.exactAlarms.later')}
      centered
      cta={
        asked
          ? { label: t('onb.notif.start'), onPress: () => void finish(), loading: busy, testID: 'onboarding-finish-btn' }
          : { label: t('onb.notif.allow'), onPress: () => void allow(), loading: busy, testID: 'onboarding-notif-btn' }
      }
    >
      <View style={styles.icon}>
        <Ionicons
          name={answer === 'granted' ? 'checkmark-circle' : 'notifications-outline'}
          size={56}
          color={answer === 'granted' ? palette.success.default : palette.primary.default}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </OnboardingFrame>
  );
}

function makeOnboardingPermissionsStyles(theme: ThemePalette) {
  return StyleSheet.create({
    icon: {
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    title: {
      ...Typography.displayMedium,
      color: theme.onSurface.primary,
      textAlign: 'center',
    },
    subtitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
  });
}

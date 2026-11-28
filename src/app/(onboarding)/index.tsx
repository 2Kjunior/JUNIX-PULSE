/**
 * Onboarding, screen 1 of 5: Bonjour (study 001, 16.13; sheet 044).
 *
 * Pulse greets in one sentence (the guide sits in the room kept here; the logo when Pulse is off),
 * one line on what the app is for, « Commencer », and « J'ai une sauvegarde » for someone who
 * already uses Junix Pulse.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { PulseLogo } from '@/components/ui/PulseLogo';
import type { ThemePalette } from '@/constants/palettes';
import { Spacing, Typography } from '@/constants/theme';
import { useBackupRestore } from '@/features/backup/use-backup-restore';
import { setGuidePermission, setWelcomeAnchorY } from '@/features/mascot/onboarding-guide-state';
import { useMascotPreferences } from '@/features/mascot/use-mascot-preferences';
import { OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';

/** Room kept for the guide: its orb of 96 dp, then its bubble of two sentences. */
const MASCOT_ROOM_HEIGHT = 210;
/** Centre of the orb, measured from the top of that room. */
const MASCOT_ROOM_ANCHOR_OFFSET = 56;

export default function OnboardingWelcome() {
  const t = useT();
  const styles = useThemedStyles(makeOnboardingWelcomeStyles);
  const setOnboardingComplete = useAppStore(state => state.setOnboardingComplete);
  const { startRestore, restoreModal } = useBackupRestore(async () => {
    await SettingsRepository.markOnboardingComplete(new Date().toISOString());
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  });

  const { settings: mascotSettings } = useMascotPreferences();
  const mascotPresent = mascotSettings.presence !== 'off';
  const mascotRoomRef = useRef<React.ComponentRef<typeof View>>(null);
  const measureMascotRoom = () => {
    mascotRoomRef.current?.measureInWindow((_x, y) => setWelcomeAnchorY(y + MASCOT_ROOM_ANCHOR_OFFSET));
  };

  // A new pass through the onboarding starts from a permission not asked yet
  useEffect(() => {
    setGuidePermission('ask');
  }, []);

  return (
    <>
      {restoreModal}
      <OnboardingFrame
        step={1}
        onSkip={() => router.push('/(onboarding)/permissions')}
        centered
        cta={{ label: t('onb.hello.start'), onPress: () => router.push('/(onboarding)/discover'), testID: 'onboarding-start-btn' }}
        below={
          <TouchableOpacity onPress={startRestore} accessibilityRole="button" accessibilityLabel={t('welcome.restoreA11y')} style={styles.restore}>
            <Text style={styles.restoreText}>{t('onb.hello.restore')}</Text>
          </TouchableOpacity>
        }
      >
        {mascotPresent ? (
          // The guide comes here (its orb, then its bubble)
          <View ref={mascotRoomRef} onLayout={measureMascotRoom} style={styles.mascotRoom} />
        ) : (
          <View style={styles.logo}>
            <PulseLogo size={88} mode="idle" />
          </View>
        )}
        <Text style={styles.title}>{t('onb.hello.title')}</Text>
        <Text style={styles.subtitle}>{t('onb.hello.subtitle')}</Text>
      </OnboardingFrame>
    </>
  );
}

function makeOnboardingWelcomeStyles(theme: ThemePalette) {
  return StyleSheet.create({
    mascotRoom: {
      height: MASCOT_ROOM_HEIGHT,
      alignSelf: 'stretch',
    },
    logo: {
      alignItems: 'center',
      marginBottom: Spacing.md,
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
    restore: {
      minHeight: 44,
      justifyContent: 'center',
    },
    restoreText: {
      ...Typography.labelLarge,
      color: theme.primary.default,
    },
  });
}

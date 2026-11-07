/**
 * The lock screen: Pulse asleep on a glass card, the fingerprint asked at once. Once the user
 * is recognised, Pulse wakes up for a moment and the app shows again.
 * While `pending`, it only hides the screen: the app is coming back and the delay is not known
 * to have passed yet, so nothing of the screen beneath may show for a frame.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import { PulseMascot } from '@/features/mascot/PulseMascot';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { authenticateAppUnlock } from '@/services/app-lock-service';

const WAKE_UP_MS = 450;

interface AppLockScreenProps {
  pending?: boolean;
  onUnlocked: () => void;
}

export function AppLockScreen({ pending = false, onUnlocked }: AppLockScreenProps) {
  const styles = useThemedStyles(makeAppLockStyles);
  const t = useT();
  const [mood, setMood] = useState<MascotMood>('sleepy');
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);

  const unlock = useCallback(async () => {
    setBusy(true);
    const result = await authenticateAppUnlock();
    setBusy(false);
    if (result !== 'unlocked') return;
    setMood('happy');
    setTimeout(onUnlocked, WAKE_UP_MS);
  }, [onUnlocked]);

  // Asked once on its own; then the button asks again
  useEffect(() => {
    if (pending || asked.current) return;
    asked.current = true;
    void unlock();
  }, [pending, unlock]);

  return (
    <View style={styles.overlay} testID="app-lock-screen" accessibilityViewIsModal>
      {!pending && (
        <View style={styles.card}>
          <PulseMascot mood={mood} size={96} />
          <Text style={styles.title} accessibilityRole="header">
            {t('appLock.title')}
          </Text>
          <Text style={styles.body}>{t('appLock.body')}</Text>
          <Button
            label={t('appLock.unlock')}
            onPress={unlock}
            variant="primary"
            size="lg"
            loading={busy}
            style={styles.button}
            testID="app-lock-unlock"
          />
        </View>
      )}
    </View>
  );
}

const makeAppLockStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.surface.base,
      justifyContent: 'center',
      padding: Spacing.xl,
      zIndex: 1000,
      elevation: 1000,
    },
    card: {
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.xl,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
      backgroundColor: theme.glass.nav.backgroundColor,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      textAlign: 'center',
    },
    body: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
    button: {
      alignSelf: 'stretch',
      marginTop: Spacing.sm,
    },
  });

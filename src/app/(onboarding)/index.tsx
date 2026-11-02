/**
 * Onboarding — Étape 1 : Bienvenue (R-02)
 *
 * Structure : logo → accroche → 3 badges de valeur → CTA dégradé → lien restauration
 * Corrections vs source Stitch :
 * - Aucun emoji — icônes Ionicons uniquement (règle A.1)
 * - Titre en Outfit Bold (règle A.2)
 * - CTA dégradé pleine largeur (1 seul dégradé par écran)
 * - Badges pill avec icônes vectorielles (pas d'emojis)
 * - Navigation 5 destinations inchangée
 */
import { Alert, Platform, View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { setGuidePermission, setWelcomeAnchorY } from '@/features/mascot/onboarding-guide-state';
import { useMascotPreferences } from '@/features/mascot/use-mascot-preferences';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { BackupPasswordModal } from '@/components/ui/BackupPasswordModal';
import { PulseLogo } from '@/components/ui/PulseLogo';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { ValueBadge } from '@/components/ui/ValueBadge';
import { getDatabase } from '@/database/sqlite';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { decryptBackup, importBackup, parseBackup } from '@/services/backup-service';
import { reconcileOverdueRecurringReminders } from '@/use-cases/reminder-use-cases';
import { useT } from '@/i18n';

const { height } = Dimensions.get('window');

/** Hauteur réservée à la mascotte guide : son orbe de 96 dp, puis sa bulle de deux phrases. */
const MASCOT_ROOM_HEIGHT = 210;
/** Centre de l'orbe, mesuré depuis le haut de cette place. */
const MASCOT_ROOM_ANCHOR_OFFSET = 56;

export default function OnboardingWelcome() {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingWelcomeStyles);
  const setOnboardingComplete = useAppStore(state => state.setOnboardingComplete);
  const [backupPasswordVisible, setBackupPasswordVisible] = useState(false);
  const [pendingBackupContents, setPendingBackupContents] = useState<string | null>(null);

  // La mascotte guide prend la place du logo, avec sa bulle juste dessous. Elle se pose à
  // l'endroit mesuré ici ; si l'utilisateur l'a désactivée, le logo reste.
  const { settings: mascotSettings } = useMascotPreferences();
  const mascotPresent = mascotSettings.presence !== 'off';
  const mascotRoomRef = useRef<React.ComponentRef<typeof View>>(null);
  const measureMascotRoom = () => {
    mascotRoomRef.current?.measureInWindow((_x, y) => setWelcomeAnchorY(y + MASCOT_ROOM_ANCHOR_OFFSET));
  };

  // Un nouveau passage dans l'onboarding repart d'une permission non demandée
  useEffect(() => {
    setGuidePermission('ask');
  }, []);

  const handleRestoreBackup = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('welcome.restore.unavailableTitle'), t('welcome.restore.unavailableBody'));
        return;
      }

      const selection = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;

      setPendingBackupContents(await new File(selection.assets[0].uri).text());
      setBackupPasswordVisible(true);
    } catch (error) {
      Alert.alert(
        t('welcome.restore.invalidTitle'),
        error instanceof Error ? error.message : t('welcome.restore.invalidBody')
      );
    }
  };

  const handleDecryptBackup = async (password: string) => {
    if (!pendingBackupContents) {
      throw new Error(t('welcome.restore.pickAgain'));
    }

    const plaintext = await decryptBackup(pendingBackupContents, password);
    const backupData = parseBackup(plaintext);
    const rowCount = Object.values(backupData).reduce((total, rows) => total + rows.length, 0);
    setBackupPasswordVisible(false);
    setPendingBackupContents(null);

    Alert.alert(
      t('welcome.restore.mergeTitle'),
      t('welcome.restore.mergeBody', { count: rowCount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('welcome.restore.import'),
          onPress: async () => {
            try {
              const result = await importBackup(await getDatabase(), backupData);
              // Les notifications suivent à la fin de l'onboarding, une fois les dates recalées
              await reconcileOverdueRecurringReminders();
              Alert.alert(
                t('welcome.restore.doneTitle'),
                t('welcome.restore.doneBody', { inserted: result.inserted, skipped: result.skipped }),
                [{
                  text: t('common.continue'),
                  onPress: async () => {
                    await SettingsRepository.markOnboardingComplete(new Date().toISOString());
                    setOnboardingComplete(true);
                    router.replace('/(tabs)');
                  },
                }]
              );
            } catch (error) {
              Alert.alert(
                t('welcome.restore.failTitle'),
                error instanceof Error ? error.message : t('welcome.restore.failBody')
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <BackupPasswordModal
        visible={backupPasswordVisible}
        title={t('welcome.restore.unlockTitle')}
        confirmLabel={t('welcome.restore.decrypt')}
        onCancel={() => {
          setBackupPasswordVisible(false);
          setPendingBackupContents(null);
        }}
        onSubmit={handleDecryptBackup}
      />
      {/* En-tête : étape + bouton passer */}
      <View style={styles.topRow}>
        <StepIndicator total={5} current={1} showLabel={true} />
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/permissions')}
          style={styles.skipBtn}
          accessibilityLabel={t('welcome.skipA11y')}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </TouchableOpacity>
      </View>

      {/* Section hero : logo + accroche */}
      <View style={styles.heroSection}>
        {mascotPresent ? (
          // Place réservée à la mascotte (orbe en haut) et à sa bulle (dessous)
          <View
            ref={mascotRoomRef}
            onLayout={measureMascotRoom}
            style={{ height: MASCOT_ROOM_HEIGHT, alignSelf: 'stretch', marginBottom: Spacing.md }}
          />
        ) : (
          /* Cercle de fond subtil derrière le logo */
          <View style={styles.logoOrb}>
            <PulseLogo size={88} mode="idle" />
          </View>
        )}

        <Text style={styles.headline}>
          {t('welcome.headline')}{'\n'}
          <Text style={styles.headlineAccent}>{t('welcome.headlineAccent')}</Text>
        </Text>

        <Text style={styles.subheadline}>{t('welcome.tagline')}</Text>
        <Text style={styles.description}>
          {t('welcome.description1')}{'\n'}
          {t('welcome.description2')}
        </Text>
      </View>

      {/* 3 badges de valeur */}
      <View style={styles.badges}>
        <ValueBadge
          icon="moon-outline"
          title={t('welcome.badge.calm.title')}
          subtitle={t('welcome.badge.calm.subtitle')}
          accentColor={palette.primary.default}
        />
        <ValueBadge
          icon="shield-checkmark-outline"
          title={t('welcome.badge.private.title')}
          subtitle={t('welcome.badge.private.subtitle')}
          accentColor={palette.tertiary.default}
        />
        <ValueBadge
          icon="pulse-outline"
          title={t('welcome.badge.rhythm.title')}
          subtitle={t('welcome.badge.rhythm.subtitle')}
          accentColor={palette.primary.default}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={t('welcome.start')}
          onPress={() => router.push('/(onboarding)/discover')}
          variant="primary"
          size="lg"
          style={styles.btnPrimary}
          testID="onboarding-start-btn"
          icon={undefined}
        />
        <TouchableOpacity
          onPress={handleRestoreBackup}
          accessibilityRole="button"
          accessibilityLabel={t('welcome.restoreA11y')}
          style={styles.restoreBtn}
        >
          <Text style={styles.restoreText}>
            {t('welcome.restoreQuestion')}{' '}
            <Text style={styles.restoreLink}>{t('welcome.restoreLink')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeOnboardingWelcomeStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
      paddingHorizontal: Spacing.xl,
      paddingTop: height * 0.06,
      paddingBottom: Spacing.xxl,
    },

    // ─── En-tête ──────────────────────────────────────────────────────────────
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
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

    // ─── Hero ─────────────────────────────────────────────────────────────────
    heroSection: {
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    logoOrb: {
      width: 120,
      height: 120,
      borderRadius: Radius.full,
      backgroundColor: theme.primary.container + '33',
      borderWidth: 1,
      borderColor: theme.primary.default + '33',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xl,
    },
    headline: {
      fontSize: 28,
      fontFamily: 'Outfit-Bold',
      color: theme.onSurface.primary,
      textAlign: 'center',
      lineHeight: 36,
      marginBottom: Spacing.sm,
    },
    headlineAccent: {
      color: theme.primary.default,
      fontFamily: 'Outfit-Bold',
    },
    subheadline: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      textAlign: 'center',
      marginBottom: Spacing.xs,
    },
    description: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
      lineHeight: 22,
    },

    // ─── Badges ───────────────────────────────────────────────────────────────
    badges: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.xl,
    },

    // ─── Actions ──────────────────────────────────────────────────────────────
    actions: {
      gap: Spacing.md,
      alignItems: 'center',
    },
    btnPrimary: {
      width: '100%',
    },
    restoreBtn: {
      paddingVertical: Spacing.xs,
      minHeight: 44,
      justifyContent: 'center',
    },
    restoreText: {
      ...Typography.bodySmall,
      color: theme.onSurface.disabled,
      textAlign: 'center',
    },
    restoreLink: {
      color: theme.primary.default,
      textDecorationLine: 'underline',
    },
  });


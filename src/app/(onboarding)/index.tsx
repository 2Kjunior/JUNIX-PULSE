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
import { useState } from 'react';
import { router } from 'expo-router';
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

const { height } = Dimensions.get('window');

export default function OnboardingWelcome() {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingWelcomeStyles);
  const setOnboardingComplete = useAppStore(state => state.setOnboardingComplete);
  const [backupPasswordVisible, setBackupPasswordVisible] = useState(false);
  const [pendingBackupContents, setPendingBackupContents] = useState<string | null>(null);

  const handleRestoreBackup = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Indisponible', 'La restauration de sauvegarde est disponible dans l’application mobile.');
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
        'Fichier invalide',
        error instanceof Error ? error.message : 'Impossible de lire la sauvegarde sélectionnée.'
      );
    }
  };

  const handleDecryptBackup = async (password: string) => {
    if (!pendingBackupContents) {
      throw new Error('Sélectionnez à nouveau le fichier de sauvegarde.');
    }

    const plaintext = await decryptBackup(pendingBackupContents, password);
    const backupData = parseBackup(plaintext);
    const rowCount = Object.values(backupData).reduce((total, rows) => total + rows.length, 0);
    setBackupPasswordVisible(false);
    setPendingBackupContents(null);

    Alert.alert(
      'Fusionner cette sauvegarde ?',
      `${rowCount} enregistrements validés seront examinés. Les éléments dont l’identifiant existe déjà seront conservés sans être remplacés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Importer',
          onPress: async () => {
            try {
              const result = await importBackup(await getDatabase(), backupData);
              Alert.alert(
                'Restauration terminée',
                `${result.inserted} enregistrements ajoutés, ${result.skipped} ignorés car ils existaient déjà.`,
                [{
                  text: 'Continuer',
                  onPress: async () => {
                    await SettingsRepository.markOnboardingComplete(new Date().toISOString());
                    setOnboardingComplete(true);
                    router.replace('/(tabs)');
                  },
                }]
              );
            } catch (error) {
              Alert.alert(
                'Échec de la restauration',
                error instanceof Error ? error.message : 'Aucune donnée n’a été importée.'
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
        title="Déverrouiller la sauvegarde"
        confirmLabel="Déchiffrer"
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
          accessibilityLabel="Passer l'onboarding"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Section hero : logo + accroche */}
      <View style={styles.heroSection}>
        {/* Cercle de fond subtil derrière le logo */}
        <View style={styles.logoOrb}>
          <PulseLogo size={88} mode="idle" />
        </View>

        <Text style={styles.headline}>
          Retrouvez votre{'\n'}
          <Text style={styles.headlineAccent}>rythme naturel</Text>
        </Text>

        <Text style={styles.subheadline}>
          Se souvenir. Planifier. Vivre.
        </Text>
        <Text style={styles.description}>
          Une gestion sereine de vos journées,{'\n'}
          pensée pour apaiser votre charge mentale.
        </Text>
      </View>

      {/* 3 badges de valeur */}
      <View style={styles.badges}>
        <ValueBadge
          icon="moon-outline"
          title="Serein"
          subtitle="Zéro surcharge"
          accentColor={palette.primary.default}
        />
        <ValueBadge
          icon="shield-checkmark-outline"
          title="Privé"
          subtitle="100 % Hors-ligne"
          accentColor={palette.tertiary.default}
        />
        <ValueBadge
          icon="pulse-outline"
          title="Rhythm"
          subtitle="IA au repos"
          accentColor={palette.primary.default}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Commencer l'expérience"
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
          accessibilityLabel="Restaurer une sauvegarde"
          style={styles.restoreBtn}
        >
          <Text style={styles.restoreText}>
            Déjà utilisateur de Junix Pulse ?{' '}
            <Text style={styles.restoreLink}>Restaurer une sauvegarde</Text>
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


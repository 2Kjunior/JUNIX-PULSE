/**
 * Écran Paramètres complet — Junix Pulse.
 * Permet de modifier le profil, les notifications, les heures de briefing,
 * d'accéder au planning récurrent, d'exporter/sauvegarder les données et de réinitialiser l'app.
 *
 * Entièrement thématisé : toutes les couleurs proviennent de `useTheme()`
 * et `useThemedStyles(makeSettingsStyles)`. Aucun hex en dur.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRepository } from '@/repositories/settings-repository';
import { AppearanceMode, Settings } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { BackupPasswordModal } from '@/components/ui/BackupPasswordModal';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/feedback/States';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { getDatabase } from '@/database/sqlite';
import { clearAllData } from '@/database/seed';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { createBackup, encryptBackup } from '@/services/backup-service';
import { SanctumAuthService } from '@/services/sanctum-auth-service';
import { makeSettingsStyles } from '@/styles/settings/settings-styles';

const APPEARANCE_OPTIONS: {
  value: AppearanceMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
  { value: 'system', label: 'Automatique', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete, showSnackbar, themeMode, setThemeMode } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeSettingsStyles);


  const [settings, setSettings] = useState<Settings | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [backupPasswordVisible, setBackupPasswordVisible] = useState(false);
  const [isSanctumPinConfigured, setIsSanctumPinConfigured] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await SettingsRepository.get();
    setSettings(s);
    setDisplayNameInput(s.displayName ?? '');
    try {
      const pinConfigured = await SanctumAuthService.isPinConfigured();
      setIsSanctumPinConfigured(pinConfigured);
    } catch {
      // Ignoré si indisponible
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!settings) return <LoadingState message="Chargement des paramètres..." />;

  const handleSaveName = async () => {
    try {
      setSaving(true);
      await SettingsRepository.update({
        displayName: displayNameInput.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      showSnackbar('Prénom mis à jour !');
      setEditingName(false);
      loadSettings();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    try {
      await SettingsRepository.update({
        notificationsEnabled: val,
        updatedAt: new Date().toISOString(),
      });
      setSettings(s => s ? { ...s, notificationsEnabled: val } : s);
      showSnackbar(val ? 'Notifications activées' : 'Notifications désactivées');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  };

  const handleToggleNotificationSound = async (val: boolean) => {
    try {
      await SettingsRepository.update({
        notificationSoundEnabled: val,
        updatedAt: new Date().toISOString(),
      });
      setSettings(s => s ? { ...s, notificationSoundEnabled: val } : s);
      showSnackbar(val ? 'Son des notifications activé' : 'Son des notifications désactivé');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  };

  const handleSelectAppearance = async (newMode: AppearanceMode) => {
    const previousMode = themeMode;
    setThemeMode(newMode);
    setSettings(s => s ? { ...s, appearanceMode: newMode } : s);

    try {
      await SettingsRepository.update({
        appearanceMode: newMode,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setThemeMode(previousMode);
      setSettings(s => s ? { ...s, appearanceMode: previousMode } : s);
      showSnackbar('Échec de la sauvegarde de l’apparence');
    }
  };


  const handleUpdateBriefingHour = async (hour: number) => {
    try {
      await SettingsRepository.update({
        morningBriefingHour: hour,
        updatedAt: new Date().toISOString(),
      });
      setSettings(s => s ? { ...s, morningBriefingHour: hour } : s);
      showSnackbar(`Résumé matin réglé à ${hour}h00`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  };

  const handleUpdateEndOfDayHour = async (hour: number) => {
    try {
      await SettingsRepository.update({
        endOfDayHour: hour,
        updatedAt: new Date().toISOString(),
      });
      setSettings(s => s ? { ...s, endOfDayHour: hour } : s);
      showSnackbar(`Bilan fin de journée réglé à ${hour}h00`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  };

  const handleExportData = async () => {
    Alert.alert(
      'Créer une sauvegarde complète ?',
      'Le fichier inclura toutes vos données, y compris les notes Sanctum. Il sera chiffré avec un mot de passe que vous seul connaissez.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: () => setBackupPasswordVisible(true),
        },
      ]
    );
  };

  const handleCreateEncryptedBackup = async (password: string) => {
    if (Platform.OS === 'web') {
      throw new Error('La création de sauvegarde est disponible dans l\'application mobile.');
    }

    const contents = await createBackup(await getDatabase());
    const encryptedContents = await encryptBackup(contents, password);
    const file = new File(Paths.cache, `junix-pulse-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    file.create({ overwrite: true });
    await file.write(encryptedContents);

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Le fichier chiffré a été créé, mais le partage n\'est pas disponible sur cet appareil.');
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Partager la sauvegarde chiffrée Junix Pulse',
    });
    setBackupPasswordVisible(false);
  };

  const handleResetApp = () => {
    Alert.alert(
      "Recommencer l’onboarding\u00A0?",
      "Cela va relancer la visite d’accueil de l’application. Toutes vos données existantes seront conservées.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Recommencer',
          onPress: async () => {
            await SettingsRepository.resetOnboarding(new Date().toISOString());
            setOnboardingComplete(false);
            showSnackbar("Visite d’accueil relancée");
            router.replace('/(onboarding)');
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Effacer toutes les données',
      'ATTENTION : Cette action efface TOUTES les données locales (rappels, tâches, personnes, habitudes, objectifs). Irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              showSnackbar('Toutes les données effacées.');
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Section Profil */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Profil & Identité</Text>
        <TouchableOpacity style={styles.row} onPress={() => setEditingName(true)}>
          <View>
            <Text style={styles.rowLabel}>Prénom</Text>
            <Text style={styles.rowSub}>Utilisé dans les briefings quotidiens</Text>
          </View>
          <View style={styles.rowValCol}>
            <Text style={styles.rowValue}>{settings.displayName ?? 'Non défini'}</Text>
            <Ionicons name="create-outline" size={16} color={palette.primary.default} />
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Fuseau horaire</Text>
          <Text style={styles.rowValue}>{settings.timezone}</Text>
        </View>
      </View>

      {/* Section Apparence (D-08: visible en mode DEV) */}
      {(__DEV__ || true) && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Apparence</Text>
          <View
            style={styles.segmentedControl}
            accessibilityRole="radiogroup"
            accessibilityLabel="Sélection du mode d'apparence"
          >
            {APPEARANCE_OPTIONS.map((opt) => {
              const selected = (settings.appearanceMode ?? themeMode) === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentBtn,
                    selected && styles.segmentBtnActive,
                  ]}
                  onPress={() => handleSelectAppearance(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${opt.label}${selected ? ', sélectionné' : ''}`}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={selected ? palette.primary.on : palette.onSurface.variant}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      selected && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.appearanceHelp}>
            Automatique suit le réglage de votre téléphone. Le mode sombre est le réglage par défaut.
          </Text>

          {/* Mini aperçu en direct avec GlowCard */}
          <View style={styles.previewContainer}>
            <GlowCard tone="primary" intensity="soft" size="list">
              <View style={styles.previewCardInner}>

                <View style={styles.previewHeader}>
                  <Ionicons name="sparkles" size={16} color={palette.primary.default} />
                  <Text style={styles.previewTitle}>
                    Aperçu en direct
                  </Text>
                </View>
                <Text style={styles.previewDesc}>
                  Thème {palette.mode === 'light' ? 'Clair' : 'Sombre'} actif
                </Text>
              </View>
            </GlowCard>
          </View>
        </View>
      )}

      {/* Section Horaires des briefings */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Horaires des briefings</Text>

        {/* Heure Résumé Matin */}
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>Heure du briefing du matin</Text>
          <View style={styles.hoursRow}>
            {[6, 7, 8, 9].map(h => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.hourPill,
                  settings.morningBriefingHour === h && styles.hourPillActive,
                ]}
                onPress={() => handleUpdateBriefingHour(h)}
              >
                <Text
                  style={[
                    styles.hourPillText,
                    settings.morningBriefingHour === h && styles.hourPillTextActive,
                  ]}
                >
                  {h}h00
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Heure Bilan Soir */}
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>Heure du bilan de fin de journée</Text>
          <View style={styles.hoursRow}>
            {[18, 19, 20, 21].map(h => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.hourPill,
                  settings.endOfDayHour === h && styles.hourPillActive,
                ]}
                onPress={() => handleUpdateEndOfDayHour(h)}
              >
                <Text
                  style={[
                    styles.hourPillText,
                    settings.endOfDayHour === h && styles.hourPillTextActive,
                  ]}
                >
                  {h}h00
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Section Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowLabel}>Rappels & Alertes</Text>
            <Text style={styles.rowSub}>Notifications locales hors ligne</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: palette.outline.variant, true: palette.primary.container }}
            thumbColor={settings.notificationsEnabled ? palette.primary.default : palette.onSurface.disabled}
          />
        </View>

        {/* Son des notifications — visible seulement si les notifications sont activées */}
        {settings.notificationsEnabled && (
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Son des notifications</Text>
              <Text style={styles.rowSub}>Signature sonore Junix Pulse</Text>
            </View>
            <Switch
              value={settings.notificationSoundEnabled}
              onValueChange={handleToggleNotificationSound}
              trackColor={{ false: palette.outline.variant, true: palette.primary.container }}
              thumbColor={settings.notificationSoundEnabled ? palette.primary.default : palette.onSurface.disabled}
            />
          </View>
        )}
      </View>

      {/* Section Zone de danger */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={handleClearAllData}>
          <View>
            <Text style={[styles.rowLabel, { color: palette.error.default }]}>
              Effacer toutes les données
            </Text>
            <Text style={styles.rowSub}>Repart à zéro (irréversible)</Text>
          </View>
          <Ionicons name="trash-outline" size={20} color={palette.error.default} />
        </TouchableOpacity>
      </View>

      {/* Section Données & Confidentialité */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Données & Confidentialité</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/sanctum')}
        >
          <View>
            <Text style={styles.rowLabel}>Sanctuaire — Espace Privé</Text>
            <Text style={styles.rowSub}>Notes chiffrées et protégées par biométrie</Text>
          </View>
          <Ionicons name="lock-closed-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            if (isSanctumPinConfigured) {
              router.push({ pathname: '/sanctum', params: { action: 'change_pin' } });
            } else {
              router.push('/sanctum');
            }
          }}
        >
          <View>
            <Text style={styles.rowLabel}>Code PIN du Sanctuaire</Text>
            <Text style={styles.rowSub}>
              {isSanctumPinConfigured
                ? 'Code configuré • Modifier le code PIN'
                : 'Non configuré • Définir un code secret'}
            </Text>
          </View>
          <Ionicons name="key-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleExportData}>
          <View>
            <Text style={styles.rowLabel}>Sauvegarder les données</Text>
            <Text style={styles.rowSub}>Exporter la base SQLite en JSON</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleResetApp}>
          <View>
            <Text style={[styles.rowLabel, { color: palette.primary.default }]}>
              Recommencer l'onboarding
            </Text>
            <Text style={styles.rowSub}>Revoir la visite d'accueil sans perdre vos données</Text>
          </View>
          <Ionicons name="refresh-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={palette.primary.default} />
          <Text style={styles.infoText}>
            Junix Pulse fonctionne en mode Local-First / Offline-First. Aucune donnée n'est envoyée à des serveurs tiers.
          </Text>
        </View>
      </View>

      {/* Modal d'édition du prénom */}
      <Modal visible={editingName} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier votre prénom</Text>
            <TextInput
              style={styles.input}
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              placeholder="Saisissez votre prénom..."
              placeholderTextColor={palette.onSurface.disabled}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                label="Annuler"
                onPress={() => setEditingName(false)}
                variant="ghost"
                size="sm"
              />
              <Button
                label={saving ? 'Sauvegarde...' : 'Enregistrer'}
                onPress={handleSaveName}
                disabled={saving}
                size="sm"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Text style={styles.version}>Junix Pulse v1.0.0 — Offline-First SQLite</Text>
      <BackupPasswordModal
        visible={backupPasswordVisible}
        title="Protéger la sauvegarde"
        confirmLabel="Chiffrer et partager"
        confirmPassword
        onCancel={() => setBackupPasswordVisible(false)}
        onSubmit={handleCreateEncryptedBackup}
      />
    </ScrollView>
  );
}

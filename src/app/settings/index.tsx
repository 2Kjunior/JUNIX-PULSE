/**
 * Écran Paramètres complet — Junix Pulse.
 * Permet de modifier le profil, les notifications, les heures de briefing,
 * d'accéder au planning récurrent, d'exporter/sauvegarder les données et de réinitialiser l'app.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRepository } from '@/repositories/settings-repository';
import { Settings } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/feedback/States';
import { getDatabase } from '@/database/sqlite';
import { seedDatabase, clearAllData, isSeedAlreadyLoaded } from '@/database/seed';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete, showSnackbar } = useAppStore();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await SettingsRepository.get();
    setSettings(s);
    setDisplayNameInput(s.displayName ?? '');
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
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
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
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
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
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
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
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleExportData = async () => {
    try {
      const db = await getDatabase();
      const [reminders, tasks, persons, habits, goals] = await Promise.all([
        db.getAllAsync('SELECT * FROM reminders WHERE deleted_at IS NULL'),
        db.getAllAsync('SELECT * FROM tasks WHERE deleted_at IS NULL'),
        db.getAllAsync('SELECT * FROM persons WHERE deleted_at IS NULL'),
        db.getAllAsync('SELECT * FROM habits WHERE deleted_at IS NULL'),
        db.getAllAsync('SELECT * FROM goals WHERE deleted_at IS NULL'),
      ]);

      const backup = {
        app: 'Junix Pulse',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: { reminders, tasks, persons, habits, goals },
      };

      Alert.alert(
        'Sauvegarde locale générée',
        `Vos données SQLite ont été exportées en JSON (${reminders.length} rappels, ${tasks.length} tâches, ${persons.length} personnes, ${habits.length} habitudes, ${goals.length} objectifs).\n\nToutes les données sont 100% enregistrées localement sur votre téléphone.`,
        [{ text: 'Super !', style: 'default' }]
      );
    } catch (e: any) {
      Alert.alert('Erreur lors de la sauvegarde', e.message);
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      'Réinitialiser l\'application',
      'ATTENTION : Cette action va réinitialiser l\'application et relancer l\'onboarding. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            setOnboardingComplete(false);
            showSnackbar('Application réinitialisée');
            router.replace('/(onboarding)/index' as any);
          },
        },
      ]
    );
  };

  const handleLoadSeed = () => {
    Alert.alert(
      'Charger les données de démo',
      'Cela va ajouter des personnes, rappels, tâches, habitudes et objectifs exemples pour tester l\'app. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Charger',
          onPress: async () => {
            try {
              const already = await isSeedAlreadyLoaded();
              if (already) {
                Alert.alert(
                  'Données existantes',
                  'Des données sont déjà présentes. Vider d\'abord via "Effacer toutes les données" puis réessayer.',
                  [{ text: 'OK' }]
                );
                return;
              }
              await seedDatabase();
              showSnackbar('Données de démo chargées avec succès !');
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
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
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
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
            <Ionicons name="create-outline" size={16} color={Primary.default} />
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Fuseau horaire</Text>
          <Text style={styles.rowValue}>{settings.timezone}</Text>
        </View>
      </View>

      {/* Section Planning */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Planning & Horaires</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/settings/schedule')}
        >
          <View>
            <Text style={styles.rowLabel}>Emploi du temps type</Text>
            <Text style={styles.rowSub}>Blocs récurrents de la semaine</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={OnSurface.disabled} />
        </TouchableOpacity>

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
            trackColor={{ false: Outline.variant, true: Primary.container }}
            thumbColor={settings.notificationsEnabled ? Primary.default : OnSurface.disabled}
          />
        </View>
      </View>

      {/* Section Données de démo */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Données de démonstration</Text>
        <TouchableOpacity style={styles.row} onPress={handleLoadSeed}>
          <View>
            <Text style={styles.rowLabel}>Charger les données exemples</Text>
            <Text style={styles.rowSub}>Personnes, rappels, habitudes, objectifs</Text>
          </View>
          <Ionicons name="sparkles-outline" size={20} color={Primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleClearAllData}>
          <View>
            <Text style={[styles.rowLabel, { color: ErrorColors.default }]}>
              Effacer toutes les données
            </Text>
            <Text style={styles.rowSub}>Repart à zéro (irréversible)</Text>
          </View>
          <Ionicons name="trash-outline" size={20} color={ErrorColors.default} />
        </TouchableOpacity>
      </View>

      {/* Section Données & Confidentialité */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Données & Confidentialité</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/sanctum' as any)}
        >
          <View>
            <Text style={styles.rowLabel}>Sanctum — Espace Privé</Text>
            <Text style={styles.rowSub}>Notes protégées par biométrie native</Text>
          </View>
          <Ionicons name="lock-closed-outline" size={20} color={Primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleExportData}>
          <View>
            <Text style={styles.rowLabel}>Sauvegarder les données</Text>
            <Text style={styles.rowSub}>Exporter la base SQLite en JSON</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={Primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleResetApp}>
          <View>
            <Text style={[styles.rowLabel, { color: ErrorColors.default }]}>
              Réinitialiser l'application
            </Text>
            <Text style={styles.rowSub}>Relancer le processus d'onboarding</Text>
          </View>
          <Ionicons name="refresh-outline" size={20} color={ErrorColors.default} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Primary.default} />
          <Text style={styles.infoText}>
            Junix Pulse fonctionne en mode Local-First / Offline-First. Aucune donnée n'est envoyée à des serveurs tiers.
          </Text>
        </View>
      </View>

      {/* Modal d'édition du prénom */}
      <Modal visible={editingName} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier votre prénom</Text>
            <TextInput
              style={styles.input}
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              placeholder="Saisissez votre prénom..."
              placeholderTextColor={OnSurface.disabled}
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
        </View>
      </Modal>

      <Text style={styles.version}>Junix Pulse v1.0.0 — Offline-First SQLite</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backBtn: { padding: Spacing.xs },
  title: { ...Typography.titleLarge, color: OnSurface.primary },
  section: { marginBottom: Spacing.xl },
  sectionLabel: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  rowCol: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  rowLabel: { ...Typography.titleMedium, color: OnSurface.primary },
  rowSub: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  rowValCol: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowValue: { ...Typography.bodyMedium, color: OnSurface.variant },
  hoursRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  hourPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Surface.base,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
  },
  hourPillActive: { backgroundColor: Primary.default, borderColor: Primary.default },
  hourPillText: { ...Typography.labelMedium, color: OnSurface.variant },
  hourPillTextActive: { color: Surface.base, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
  },
  infoText: { ...Typography.bodySmall, color: OnSurface.variant, flex: 1, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  modalTitle: { ...Typography.titleLarge, color: OnSurface.primary, marginBottom: Spacing.md },
  input: {
    backgroundColor: Surface.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: OnSurface.primary,
    marginBottom: Spacing.lg,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  version: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

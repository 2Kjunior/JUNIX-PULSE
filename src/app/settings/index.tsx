/**
 * Écran Paramètres — V1 minimale.
 * Étape 16 construira l'écran complet.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Surface, Primary, OnSurface, Outline, Spacing, Radius, Typography } from '@/constants/theme';
import { SettingsRepository } from '@/repositories/settings-repository';
import { Settings } from '@/domain/entities';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/feedback/States';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const s = await SettingsRepository.get();
    setSettings(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!settings) return <LoadingState />;

  async function toggleNotifications(value: boolean) {
    setSaving(true);
    await SettingsRepository.update({ notificationsEnabled: value, updatedAt: new Date().toISOString() });
    setSettings(s => s ? { ...s, notificationsEnabled: value } : s);
    setSaving(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
    >
      <View style={styles.header}>
        <Button
          label="‹ Retour"
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
        />
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Profil */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Profil</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Prénom</Text>
          <Text style={styles.rowValue}>{settings.displayName ?? 'Non défini'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Fuseau horaire</Text>
          <Text style={styles.rowValue}>{settings.timezone}</Text>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Activées</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: Outline.variant, true: Primary.container }}
            thumbColor={settings.notificationsEnabled ? Primary.default : OnSurface.disabled}
          />
        </View>
      </View>

      {/* Planning */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Planning</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Résumé matin</Text>
          <Text style={styles.rowValue}>{settings.morningBriefingHour}h00</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Fin de journée</Text>
          <Text style={styles.rowValue}>{settings.endOfDayHour}h00</Text>
        </View>
      </View>

      {/* Confidentialité */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Confidentialité</Text>
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Primary.default} />
          <Text style={styles.infoText}>
            Toutes vos données restent sur votre appareil. Aucun compte, aucun serveur distant.
          </Text>
        </View>
      </View>

      {/* Version */}
      <Text style={styles.version}>Junix Pulse v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
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
    minHeight: 48,
  },
  rowLabel: { ...Typography.bodyMedium, color: OnSurface.primary },
  rowValue: { ...Typography.bodyMedium, color: OnSurface.variant },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  infoText: { ...Typography.bodySmall, color: OnSurface.variant, flex: 1, lineHeight: 18 },
  version: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});

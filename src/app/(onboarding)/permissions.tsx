/**
 * Onboarding — Étape 5 : Permissions
 * Demande les permissions utiles au bon moment (BR-019).
 * Les permissions sont demandées ici, après que l'utilisateur comprend leur utilité.
 * Si refusées, l'application continue de fonctionner.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NotificationService } from '@/services/notification-service';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Success,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';

export default function OnboardingPermissions() {
  const { setOnboardingComplete } = useAppStore();
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [finishing, setFinishing] = useState(false);

  async function requestNotifications() {
    try {
      const granted = await NotificationService.requestPermissions();
      setNotifStatus(granted ? 'granted' : 'denied');
      await SettingsRepository.update({
        notificationsEnabled: granted,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setNotifStatus('denied');
    }
  }

  async function finish() {
    setFinishing(true);
    try {
      await SettingsRepository.markOnboardingComplete(new Date().toISOString());
      setOnboardingComplete(true);
      // La navigation vers (tabs) est gérée par le redirect dans _layout.tsx
    } finally {
      setFinishing(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Indicateur d'étape — toutes complètes */}
      <StepIndicator total={5} current={5} />

      <Text style={styles.title}>Dernière étape</Text>
      <Text style={styles.subtitle}>
        Ces autorisations permettent à Junix Pulse de fonctionner pleinement.
        Elles peuvent être modifiées dans les paramètres de votre téléphone.
      </Text>

      {/* Notification */}
      <View style={styles.permCard}>
        <View style={styles.permHeader}>
          <View style={[styles.permIcon, { backgroundColor: 'rgba(208, 188, 255, 0.10)' }]}>
            <Ionicons name="notifications-outline" size={22} color={Primary.default} />
          </View>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Notifications</Text>
            <Text style={styles.permDesc}>
              Indispensable pour recevoir vos rappels même quand l&apos;application est fermée.
            </Text>
          </View>
        </View>

        {notifStatus === 'idle' ? (
          <Button
            label="Autoriser les notifications"
            onPress={requestNotifications}
            variant="secondary"
            size="md"
            style={styles.permBtn}
            testID="onboarding-notif-btn"
          />
        ) : notifStatus === 'granted' ? (
          <View style={styles.permGranted}>
            <Ionicons name="checkmark-circle" size={16} color={Success.default} style={{ marginRight: 6 }} />
            <Text style={styles.permGrantedText}>Autorisées</Text>
          </View>
        ) : (
          <View style={styles.permDenied}>
            <Text style={styles.permDeniedText}>
              Non autorisées — vous pouvez les activer plus tard dans les paramètres de votre téléphone.
            </Text>
          </View>
        )}
      </View>

      {/* Note contacts (pour plus tard dans l'app) */}
      <View style={styles.noteCard}>
        <View style={styles.noteTitleRow}>
          <Ionicons name="people-outline" size={18} color={Tertiary.default} style={{ marginRight: 6 }} />
          <Text style={styles.noteTitle}>Contacts</Text>
        </View>
        <Text style={styles.noteDesc}>
          L&apos;accès aux contacts sera demandé uniquement si vous souhaitez importer
          des personnes depuis votre répertoire. Ce n&apos;est pas requis maintenant.
        </Text>
      </View>

      <View style={styles.ready}>
        <Text style={styles.readyTitle}>Vous êtes prêt·e !</Text>
        <Text style={styles.readyDesc}>
          Junix Pulse est configuré pour vous. Commencez par créer votre premier rappel
          ou explorez librement.
        </Text>
      </View>

      <Button
        label="Commencer à utiliser Junix Pulse"
        onPress={finish}
        variant="primary"
        size="lg"
        loading={finishing}
        style={styles.btnFinish}
        testID="onboarding-finish-btn"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: OnSurface.primary,
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  permCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  permHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  permIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permInfo: { flex: 1 },
  permTitle: { ...Typography.titleMedium, color: OnSurface.primary, marginBottom: Spacing.xs },
  permDesc: { ...Typography.bodySmall, color: OnSurface.variant, lineHeight: 18 },
  permBtn: { width: '100%' },
  permGranted: {
    backgroundColor: 'rgba(109, 213, 140, 0.12)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  permGrantedText: { ...Typography.labelMedium, color: Success.default },
  permDenied: {
    backgroundColor: Surface.high,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  permDeniedText: { ...Typography.bodySmall, color: OnSurface.disabled, lineHeight: 18 },
  noteCard: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  noteTitle: { ...Typography.titleMedium, color: OnSurface.primary, marginBottom: Spacing.xs },
  noteDesc: { ...Typography.bodySmall, color: OnSurface.variant, lineHeight: 18 },
  ready: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    padding: Spacing.xl,
  },
  readyTitle: {
    ...Typography.headlineMedium,
    color: Primary.default,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  readyDesc: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 22,
  },
  btnFinish: { width: '100%' },
});

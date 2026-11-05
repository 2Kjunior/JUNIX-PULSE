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
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
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
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { createBackup, encryptBackup } from '@/services/backup-service';
import { purgeBackupExports } from '@/services/backup-export-cleanup';
import { syncDailyRecapNotifications } from '@/services/daily-recap-service';
import { syncReminderNotifications } from '@/services/reminder-notification-service';
import { NotificationService } from '@/services/notification-service';
import { MascotSettingsSection } from '@/features/mascot/MascotSettingsSection';
import { useBackupRestore } from '@/features/backup/use-backup-restore';
import { GlassActionButton } from '@/components/ui/GlassActionButton';
import { playHaptic, setHapticsEnabled } from '@/services/haptic-service';
import {
  AutoBackupConfig,
  disableAutoBackup,
  enableAutoBackup,
  getAutoBackupConfig,
  runAutoBackup,
} from '@/services/auto-backup-service';
import { format } from 'date-fns';
import type { HapticKind } from '@/domain/rules/haptic-rules';
import { emitMascotEvent } from '@/services/mascot/mascot-event-bus';
import { SanctumAuthService } from '@/services/sanctum-auth-service';
import { detectDeviceTimezone } from '@/services/device-timezone';
import { timezoneLabel } from '@/constants/timezones';
import { useDateLocale, useLanguage, useT, type MessageKey } from '@/i18n';
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { makeSettingsStyles } from '@/styles/settings/settings-styles';

const APPEARANCE_OPTIONS: {
  value: AppearanceMode;
  labelKey: MessageKey;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'light', labelKey: 'settingsScreen.light', icon: 'sunny-outline' },
  { value: 'dark', labelKey: 'settingsScreen.dark', icon: 'moon-outline' },
  { value: 'system', labelKey: 'settingsScreen.auto', icon: 'phone-portrait-outline' },
];

const HAPTIC_TESTS: readonly {
  kind: HapticKind;
  label: MessageKey;
  icon: 'checkmark-circle-outline' | 'radio-button-on-outline' | 'warning-outline' | 'close-circle-outline';
  color: 'success' | 'primary' | 'tertiary' | 'error';
}[] = [
  { kind: 'success', label: 'haptic.success', icon: 'checkmark-circle-outline', color: 'success' },
  { kind: 'light', label: 'haptic.light', icon: 'radio-button-on-outline', color: 'primary' },
  { kind: 'warning', label: 'haptic.warning', icon: 'warning-outline', color: 'tertiary' },
  { kind: 'error', label: 'haptic.error', icon: 'close-circle-outline', color: 'error' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete, showSnackbar, themeMode, setThemeMode } = useAppStore();
  const { palette } = useTheme();
  const deviceTimezone = detectDeviceTimezone();
  const t = useT();
  const language = useLanguage();
  const styles = useThemedStyles(makeSettingsStyles);


  const [settings, setSettings] = useState<Settings | null>(null);
  const [autoBackup, setAutoBackup] = useState<AutoBackupConfig | null>(null);
  const [autoBackupDirectory, setAutoBackupDirectory] = useState<string | null>(null);
  const dateLocale = useDateLocale();
  const { startRestore, restoreModal } = useBackupRestore(async () => {
    await syncReminderNotifications();
    await syncDailyRecapNotifications();
    await loadSettings();
    showSnackbar(t('settingsScreen.restoreDone'));
  });
  const [editingName, setEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [backupPasswordVisible, setBackupPasswordVisible] = useState(false);
  const [isSanctumPinConfigured, setIsSanctumPinConfigured] = useState(false);
  const [canEnableExactAlarms, setCanEnableExactAlarms] = useState(false);

  const loadSettings = useCallback(async () => {
    setAutoBackup(await getAutoBackupConfig());
    purgeBackupExports();
    const s = await SettingsRepository.get();
    setSettings(s);
    setDisplayNameInput(s.displayName ?? '');
    const exactAlarms = await NotificationService.getExactAlarmStatus();
    setCanEnableExactAlarms(!exactAlarms.granted && exactAlarms.canAsk);
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

  if (!settings) return <LoadingState message={t('settingsScreen.loading')} />;

  const handleSaveName = async () => {
    try {
      setSaving(true);
      await SettingsRepository.update({
        displayName: displayNameInput.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      showSnackbar(t('settingsScreen.nameUpdated'));
      setEditingName(false);
      loadSettings();
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
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
      if (val) await NotificationService.requestPermissions();
      await syncDailyRecapNotifications();
      await syncReminderNotifications();
      showSnackbar(val ? t('settingsScreen.notifOn') : t('settingsScreen.notifOff'));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleEnableExactAlarms = async () => {
    const granted = await NotificationService.requestExactAlarms();
    setCanEnableExactAlarms(!granted);
    if (!granted) return;
    // Les notifications déjà programmées doivent l'être à nouveau pour en profiter
    await syncReminderNotifications({ force: true });
    showSnackbar(t('settingsScreen.exactDone'));
  };

  const handleToggleNotificationSound = async (val: boolean) => {
    try {
      await SettingsRepository.update({
        notificationSoundEnabled: val,
        updatedAt: new Date().toISOString(),
      });
      setSettings(s => s ? { ...s, notificationSoundEnabled: val } : s);
      // Already scheduled reminders move to the channel with or without sound
      await syncReminderNotifications({ force: true });
      showSnackbar(val ? t('settingsScreen.soundOn') : t('settingsScreen.soundOff'));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const autoBackupStatus = !autoBackup
    ? t('autoBackup.statusOff')
    : (autoBackup.lastSuccessAt
        ? t('autoBackup.statusOn', { date: format(new Date(autoBackup.lastSuccessAt), 'PPp', { locale: dateLocale }) })
        : t('autoBackup.statusPending')) +
      (autoBackup.lastFailedAt && (autoBackup.lastSuccessAt ?? 0) < autoBackup.lastFailedAt
        ? ` · ${t('autoBackup.statusFailed')}`
        : '');

  const handleToggleHaptics = async (val: boolean) => {
    try {
      await SettingsRepository.update({ hapticsEnabled: val, updatedAt: new Date().toISOString() });
      setHapticsEnabled(val);
      setSettings(s => (s ? { ...s, hapticsEnabled: val } : s));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const refreshAutoBackup = async () => setAutoBackup(await getAutoBackupConfig());

  const runAutoBackupNow = async () => {
    const result = await runAutoBackup({ force: true });
    await refreshAutoBackup();
    showSnackbar(result === 'done' ? t('autoBackup.done') : t('autoBackup.failed'));
  };

  const handleAutoBackup = () => {
    if (!autoBackup) {
      GlassAlert.alert(t('autoBackup.setupTitle'), t('autoBackup.setupBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('autoBackup.pickFolder'),
          onPress: async () => {
            try {
              const directory = await Directory.pickDirectoryAsync();
              if (directory?.uri) setAutoBackupDirectory(directory.uri);
            } catch {
              // Picker closed without a folder
            }
          },
        },
      ]);
      return;
    }
    GlassAlert.alert(t('autoBackup.title'), autoBackupStatus, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('autoBackup.disable'),
        style: 'destructive',
        onPress: async () => {
          await disableAutoBackup();
          await refreshAutoBackup();
        },
      },
      { text: t('autoBackup.now'), onPress: runAutoBackupNow },
    ]);
  };

  const handleEnableAutoBackup = async (password: string) => {
    if (!autoBackupDirectory) return;
    await enableAutoBackup(autoBackupDirectory, password);
    setAutoBackupDirectory(null);
    await runAutoBackupNow();
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
      showSnackbar(t('settingsScreen.appearanceFailed'));
    }
  };


  const handleUpdateBriefingHour = async (hour: number) => {
    try {
      await SettingsRepository.update({
        morningBriefingHour: hour,
        updatedAt: new Date().toISOString(),
      });
      setSettings(s => s ? { ...s, morningBriefingHour: hour } : s);
      await syncDailyRecapNotifications();
      showSnackbar(t('settingsScreen.morningSet', { hour }));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleUpdateEndOfDayHour = async (hour: number) => {
    try {
      await SettingsRepository.update({
        endOfDayHour: hour,
        updatedAt: new Date().toISOString(),
      });
      setSettings(s => s ? { ...s, endOfDayHour: hour } : s);
      await syncDailyRecapNotifications();
      showSnackbar(t('settingsScreen.eveningSet', { hour }));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleExportData = async () => {
    GlassAlert.alert(
      t('settingsScreen.backupTitle'),
      t('settingsScreen.backupBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          onPress: () => setBackupPasswordVisible(true),
        },
      ]
    );
  };

  const handleCreateEncryptedBackup = async (password: string) => {
    if (Platform.OS === 'web') {
      throw new Error(t('settingsScreen.backupWeb'));
    }

    const contents = await createBackup(await getDatabase());
    const encryptedContents = await encryptBackup(contents, password);
    purgeBackupExports();
    const file = new File(Paths.cache, `junix-pulse-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    file.create({ overwrite: true });
    await file.write(encryptedContents);

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error(t('settingsScreen.shareUnavailable'));
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: t('settingsScreen.shareDialog'),
    });
    setBackupPasswordVisible(false);
    emitMascotEvent({ type: 'BACKUP_DONE' });
  };

  const handleResetApp = () => {
    GlassAlert.alert(
      t('settingsScreen.resetTitle'),
      t('settingsScreen.resetBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.restart'),
          onPress: async () => {
            await SettingsRepository.resetOnboarding(new Date().toISOString());
            setOnboardingComplete(false);
            showSnackbar(t('settingsScreen.resetDone'));
            router.replace('/(onboarding)');
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    GlassAlert.alert(
      t('settingsScreen.clearTitle'),
      t('settingsScreen.clearBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.erase'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              showSnackbar(t('settingsScreen.cleared'));
            } catch (e) {
              GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
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
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('common.settings')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Section Profil */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settingsScreen.profile')}</Text>
        <TouchableOpacity style={styles.row} onPress={() => setEditingName(true)}>
          <View>
            <Text style={styles.rowLabel}>{t('settingsScreen.firstName')}</Text>
            <Text style={styles.rowSub}>{t('settingsScreen.firstNameHint')}</Text>
          </View>
          <View style={styles.rowValCol}>
            <Text style={styles.rowValue}>{settings.displayName ?? t('settingsScreen.notDefined')}</Text>
            <Ionicons name="create-outline" size={16} color={palette.primary.default} />
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{t('settings.timezone')}</Text>
            <Text style={styles.rowSub}>{t('settings.timezoneHint')}</Text>
          </View>
          <Text style={styles.rowValue}>{timezoneLabel(deviceTimezone, language)}</Text>
        </View>

        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>{t('language.label')}</Text>
          <LanguagePicker onError={showSnackbar} />
        </View>
      </View>

      {/* Section Apparence */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settingsScreen.appearance')}</Text>
        <View
          style={styles.segmentedControl}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('settingsScreen.appearanceA11y')}
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
                accessibilityLabel={`${t(opt.labelKey)}${selected ? t('settingsScreen.selectedSuffix') : ''}`}
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
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.appearanceHelp}>
          {t('settingsScreen.appearanceHelp')}
        </Text>

        {/* Mini aperçu en direct avec GlowCard */}
        <View style={styles.previewContainer}>
          <GlowCard tone="primary" intensity="soft" size="list">
            <View style={styles.previewCardInner}>

              <View style={styles.previewHeader}>
                <Ionicons name="sparkles" size={16} color={palette.primary.default} />
                <Text style={styles.previewTitle}>
                  {t('settingsScreen.preview')}
                </Text>
              </View>
              <Text style={styles.previewDesc}>
                {t('settingsScreen.themeActive', { mode: t(palette.mode === 'light' ? 'settingsScreen.light' : 'settingsScreen.dark') })}
              </Text>
            </View>
          </GlowCard>
        </View>
      </View>

      {/* Section Horaires des briefings */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settingsScreen.briefings')}</Text>

        {/* Heure Résumé Matin */}
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>{t('settingsScreen.morningHour')}</Text>
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
                  {t('settingsScreen.hour', { hour: h })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Heure Bilan Soir */}
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>{t('settingsScreen.eveningHour')}</Text>
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
                  {t('settingsScreen.hour', { hour: h })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Section Pulse, ta mascotte */}
      <MascotSettingsSection displayName={settings.displayName} />

      {/* Section Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settingsScreen.notifications')}</Text>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowLabel}>{t('settingsScreen.remindersAlerts')}</Text>
            <Text style={styles.rowSub}>{t('settingsScreen.offlineNotifs')}</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: palette.outline.variant, true: palette.primary.container }}
            thumbColor={settings.notificationsEnabled ? palette.primary.default : palette.onSurface.disabled}
          />
        </View>

        {settings.notificationsEnabled && canEnableExactAlarms && (
          <TouchableOpacity
            style={styles.row}
            onPress={handleEnableExactAlarms}
            accessibilityRole="button"
            accessibilityLabel={t('settingsScreen.exactA11y')}
          >
            <View style={styles.rowTextFill}>
              <Text style={styles.rowLabel}>{t('settingsScreen.exactLabel')}</Text>
              <Text style={styles.rowSub}>{t('settingsScreen.exactHint')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
          </TouchableOpacity>
        )}

        {/* Son des notifications — visible seulement si les notifications sont activées */}
        {settings.notificationsEnabled && (
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>{t('settingsScreen.soundLabel')}</Text>
              <Text style={styles.rowSub}>{t('settingsScreen.soundHint')}</Text>
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
              {t('settingsScreen.clearTitle')}
            </Text>
            <Text style={styles.rowSub}>{t('settingsScreen.clearHint')}</Text>
          </View>
          <Ionicons name="trash-outline" size={20} color={palette.error.default} />
        </TouchableOpacity>
      </View>

      {/* Section Données & Confidentialité */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settingsScreen.dataPrivacy')}</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/sanctum')}
        >
          <View>
            <Text style={styles.rowLabel}>{t('settingsScreen.sanctum')}</Text>
            <Text style={styles.rowSub}>{t('settingsScreen.sanctumHint')}</Text>
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
            <Text style={styles.rowLabel}>{t('settingsScreen.pin')}</Text>
            <Text style={styles.rowSub}>
              {isSanctumPinConfigured
                ? t('settingsScreen.pinSet')
                : t('settingsScreen.pinUnset')}
            </Text>
          </View>
          <Ionicons name="key-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleExportData}>
          <View>
            <Text style={styles.rowLabel}>{t('settingsScreen.backup')}</Text>
            <Text style={styles.rowSub}>{t('settingsScreen.backupHint')}</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={startRestore} accessibilityRole="button">
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('settingsScreen.restore')}</Text>
            <Text style={styles.rowSub}>{t('settingsScreen.restoreHint')}</Text>
          </View>
          <Ionicons name="cloud-upload-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleAutoBackup} accessibilityRole="button">
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('autoBackup.title')}</Text>
            <Text style={styles.rowSub}>{autoBackupStatus}</Text>
          </View>
          <Ionicons name="sync-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <View style={styles.rowCol}>
          <View style={styles.hapticHeader}>
            <View style={styles.rowTextFill}>
              <Text style={styles.rowLabel}>{t('settingsScreen.haptics')}</Text>
              <Text style={styles.rowSub}>{t('settingsScreen.hapticsHint')}</Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={handleToggleHaptics}
              trackColor={{ false: palette.outline.variant, true: palette.primary.container }}
              thumbColor={settings.hapticsEnabled ? palette.primary.default : palette.onSurface.disabled}
              accessibilityLabel={t('settingsScreen.hapticsSwitch')}
            />
          </View>
          <View style={styles.hapticRow}>
            {HAPTIC_TESTS.map(test => (
              <GlassActionButton
                key={test.kind}
                icon={test.icon}
                label={t(test.label)}
                color={palette[test.color].default}
                onPress={() => playHaptic(test.kind)}
                layout="stacked"
                style={styles.hapticButton}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.row} onPress={handleResetApp}>
          <View>
            <Text style={[styles.rowLabel, { color: palette.primary.default }]}>
              {t('settingsScreen.restartRow')}
            </Text>
            <Text style={styles.rowSub}>{t('settingsScreen.restartHint')}</Text>
          </View>
          <Ionicons name="refresh-outline" size={20} color={palette.primary.default} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={palette.primary.default} />
          <Text style={styles.infoText}>
            {t('settingsScreen.localFirst')}
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
            <Text style={styles.modalTitle}>{t('settingsScreen.editName')}</Text>
            <TextInput
              style={styles.input}
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              placeholder={t('settingsScreen.namePlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                label={t('common.cancel')}
                onPress={() => setEditingName(false)}
                variant="ghost"
                size="sm"
              />
              <Button
                label={saving ? t('settingsScreen.saving') : t('settingsScreen.save')}
                onPress={handleSaveName}
                disabled={saving}
                size="sm"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Text style={styles.version}>Junix Pulse v1.0.0 — Offline-First SQLite</Text>
      {restoreModal}
      <BackupPasswordModal
        visible={autoBackupDirectory !== null}
        title={t('autoBackup.passwordTitle')}
        confirmLabel={t('autoBackup.enable')}
        confirmPassword
        onCancel={() => setAutoBackupDirectory(null)}
        onSubmit={handleEnableAutoBackup}
      />
      <BackupPasswordModal
        visible={backupPasswordVisible}
        title={t('settingsScreen.protect')}
        confirmLabel={t('settingsScreen.encryptShare')}
        confirmPassword
        onCancel={() => setBackupPasswordVisible(false)}
        onSubmit={handleCreateEncryptedBackup}
      />
    </ScrollView>
  );
}

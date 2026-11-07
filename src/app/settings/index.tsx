/**
 * Écran Paramètres complet — Junix Pulse.
 * Permet de modifier le profil, les notifications, les heures de briefing,
 * d'accéder au planning récurrent, d'exporter/sauvegarder les données et de réinitialiser l'app.
 *
 * Entièrement thématisé : toutes les couleurs proviennent de `useTheme()`
 * et `useThemedStyles(makeSettingsStyles)`. Aucun hex en dur.
 */
import { useState, useEffect, useCallback, type ReactElement } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
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
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { createBackup, encryptBackup } from '@/services/backup-service';
import { purgeBackupExports } from '@/services/backup-export-cleanup';
import { syncDailyRecapNotifications } from '@/services/daily-recap-service';
import { syncReminderNotifications } from '@/services/reminder-notification-service';
import { NotificationService } from '@/services/notification-service';
import { MascotSettingsSection } from '@/features/mascot/MascotSettingsSection';
import { useBackupRestore } from '@/features/backup/use-backup-restore';
import { playHaptic, setHapticsEnabled } from '@/services/haptic-service';
import {
  AutoBackupConfig,
  disableAutoBackup,
  getAutoBackupConfig,
  runAutoBackup,
  setAutoBackupBiometric,
} from '@/services/auto-backup-service';
import { useAutoBackupSetup } from '@/features/backup/use-auto-backup-setup';
import { canUseAppLock, expectAppLockReturn, setAppLockConfig } from '@/services/app-lock-service';
import { refreshTodayWidget } from '@/widget/widget-task-handler';
import { APP_LOCK_DELAYS_MINUTES } from '@/domain/rules/app-lock-rules';
import { requestDeviceCalendarAccess } from '@/services/device-calendar-service';
import { format } from 'date-fns';
import { hexToRgba } from '@/utils/color';
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

/** The pages of the settings: the summary lists them, each opens on its own. */
type SettingsSection = 'notifications' | 'mascot' | 'security' | 'data';
type SettingsPage = SettingsSection;

const HUB_SECTIONS: readonly {
  id: SettingsSection;
  titleKey: MessageKey;
  icon: keyof typeof Ionicons.glyphMap;
  color: 'primary' | 'tertiary' | 'success' | 'error';
}[] = [
  { id: 'notifications', titleKey: 'settingsHub.notifications', icon: 'notifications-outline', color: 'tertiary' },
  { id: 'mascot', titleKey: 'mascotSettings.title', icon: 'happy-outline', color: 'primary' },
  { id: 'security', titleKey: 'settingsHub.security', icon: 'shield-checkmark-outline', color: 'success' },
  { id: 'data', titleKey: 'settingsHub.data', icon: 'cloud-outline', color: 'tertiary' },
];

const PAGE_IDS: readonly string[] = HUB_SECTIONS.map(item => item.id);

function pageOf(value: unknown): SettingsPage | null {
  return typeof value === 'string' && PAGE_IDS.includes(value) ? (value as SettingsPage) : null;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete, showSnackbar, themeMode, setThemeMode, setReduceTransparency } = useAppStore();
  const { palette } = useTheme();
  const deviceTimezone = detectDeviceTimezone();
  const t = useT();
  const language = useLanguage();
  const styles = useThemedStyles(makeSettingsStyles);
  // The summary, or one of its pages: each page is the same screen opened with its name
  const section = pageOf(useLocalSearchParams<{ section?: string }>().section);
  const openSection = (page: SettingsPage) => router.push({ pathname: '/settings', params: { section: page } });
  // A page opened directly (a notification at launch) has nothing behind it: the summary, or home
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(section ? '/settings' : '/(tabs)');
  };
  const hubTint = (color: 'primary' | 'tertiary' | 'success' | 'error') =>
    hexToRgba(palette[color].default, palette.mode === 'light' ? 0.14 : 0.18);


  const [settings, setSettings] = useState<Settings | null>(null);
  const [autoBackup, setAutoBackup] = useState<AutoBackupConfig | null>(null);
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

  const refreshAutoBackup = async () => setAutoBackup(await getAutoBackupConfig());

  const runAutoBackupNow = async () => {
    const result = await runAutoBackup({ force: true });
    await refreshAutoBackup();
    showSnackbar(result === 'done' ? t('autoBackup.done') : t('autoBackup.failed'));
  };

  // Before the early return below: a hook must run on every render
  const { startSetup: startAutoBackupSetup, setupModal: autoBackupSetupModal } = useAutoBackupSetup(runAutoBackupNow);

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

  const saveAppLock = async (enabled: boolean, delayMinutes: number) => {
    await SettingsRepository.update({
      appLockEnabled: enabled,
      appLockDelayMinutes: delayMinutes,
      updatedAt: new Date().toISOString(),
    });
    setAppLockConfig({ enabled, delayMinutes });
    setSettings(s => (s ? { ...s, appLockEnabled: enabled, appLockDelayMinutes: delayMinutes } : s));
    // The widget hides or shows the reminder titles at once
    void refreshTodayWidget();
  };

  const handleToggleAppLock = async (val: boolean) => {
    try {
      // A phone without fingerprint nor code could never be unlocked: refused rather than a dead end
      if (val && !(await canUseAppLock())) {
        GlassAlert.alert(t('appLock.unavailableTitle'), t('appLock.unavailableBody'));
        return;
      }
      await saveAppLock(val, settings.appLockDelayMinutes);
      showSnackbar(t(val ? 'appLock.on' : 'appLock.off'));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleToggleDeviceCalendar = async (val: boolean) => {
    try {
      if (val && !(await requestDeviceCalendarAccess())) {
        GlassAlert.alert(t('deviceCalendar.deniedTitle'), t('deviceCalendar.deniedBody'));
        return;
      }
      await SettingsRepository.update({ deviceCalendarEnabled: val, updatedAt: new Date().toISOString() });
      setSettings(s => (s ? { ...s, deviceCalendarEnabled: val } : s));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleToggleHaptics = async (val: boolean) => {
    try {
      await SettingsRepository.update({ hapticsEnabled: val, updatedAt: new Date().toISOString() });
      setHapticsEnabled(val);
      setSettings(s => (s ? { ...s, hapticsEnabled: val } : s));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleToggleAutoBackupBiometric = async (val: boolean) => {
    await setAutoBackupBiometric(val);
    await refreshAutoBackup();
  };

  const handleAutoBackup = () => {
    if (!autoBackup) {
      startAutoBackupSetup();
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


  // The glass effect: on by default, off puts cards and bars on a plain background
  const handleToggleGlass = async (glass: boolean) => {
    setReduceTransparency(!glass);
    setSettings(s => (s ? { ...s, reduceTransparency: !glass } : s));
    try {
      await SettingsRepository.update({ reduceTransparency: !glass, updatedAt: new Date().toISOString() });
    } catch {
      setReduceTransparency(glass);
      setSettings(s => (s ? { ...s, reduceTransparency: glass } : s));
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

    // The share sheet is a step of this flow: coming back from it does not lock the app
    expectAppLockReturn();
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

  // ─── Pages ──────────────────────────────────────────────────────────────

  const switchColors = (value: boolean) => ({
    trackColor: { false: palette.outline.variant, true: palette.primary.container },
    thumbColor: value ? palette.primary.default : palette.onSurface.disabled,
  });


  const summaries: Record<SettingsSection, string> = {
    notifications: settings.notificationsEnabled
      ? [
          t('settingsHub.notifOn'),
          settings.notificationSoundEnabled ? t('settingsHub.sound') : t('settingsHub.silent'),
          settings.hapticsEnabled ? t('settingsHub.vibrations') : t('settingsHub.noVibrations'),
        ].join(' · ')
      : t('settingsHub.notifOff'),
    mascot:
      settings.mascotPresence === 'off'
        ? t('mascotSettings.presence.off')
        : t('settingsHub.mascotSummary', { morning: settings.morningBriefingHour, evening: settings.endOfDayHour }),
    security: [
      settings.appLockEnabled ? t('settingsHub.lockOn') : t('settingsHub.lockOff'),
      isSanctumPinConfigured ? t('settingsHub.sanctumOn') : t('settingsHub.sanctumOff'),
    ].join(' · '),
    data: autoBackup ? autoBackupStatus : t('settingsHub.backupOff'),
  };

  const renderHub = () => (
    <>
      {/* Profil : le prénom et la langue, réglés ici même */}
      <GlowCard tone="primary" intensity="soft" size="list">
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => setEditingName(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${t('settingsScreen.firstName')}, ${settings.displayName?.trim() || t('settingsScreen.notDefined')}`}
          accessibilityHint={t('settingsScreen.editName')}
          testID="settings-edit-name"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(settings.displayName?.trim()[0] ?? 'J').toUpperCase()}</Text>
          </View>
          <View style={styles.rowTextFill}>
            <Text style={styles.profileName}>{settings.displayName?.trim() || t('settingsHub.profileEmpty')}</Text>
            <Text style={styles.rowSub}>{t('settingsScreen.firstNameHint')}</Text>
          </View>
          <Ionicons name="create-outline" size={18} color={palette.primary.default} />
        </TouchableOpacity>

        <View style={styles.profileLanguage}>
          <Text style={styles.rowLabel}>{t('language.label')}</Text>
          <LanguagePicker onError={showSnackbar} />
          {/* Le fuseau suit le téléphone : une information, pas un réglage */}
          <Text style={styles.footnote}>
            {t('settingsHub.timezoneNote', { timezone: timezoneLabel(deviceTimezone, language) })}
          </Text>
        </View>
      </GlowCard>

      {/* Apparence : choisie ici même, sans page à ouvrir */}
      {renderAppearance()}

      <View style={styles.hubGroup}>
        {HUB_SECTIONS.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.hubRow, index > 0 && styles.hubRowDivider]}
            onPress={() => openSection(section.id)}
            accessibilityRole="button"
            accessibilityLabel={`${t(section.titleKey)}, ${summaries[section.id]}`}
            testID={`settings-open-${section.id}`}
          >
            <View style={[styles.hubIcon, { backgroundColor: hubTint(section.color) }]}>
              <Ionicons name={section.icon} size={20} color={palette[section.color].default} />
            </View>
            <View style={styles.rowTextFill}>
              <Text style={styles.rowLabel}>{t(section.titleKey)}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {summaries[section.id]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={18} color={palette.primary.default} />
        <Text style={styles.infoText}>{t('settingsScreen.localFirst')}</Text>
      </View>
    </>
  );

  const renderAppearance = () => (
    <View style={[styles.hubGroup, styles.appearanceGroup]}>
      <Text style={styles.sectionLabel}>{t('settingsScreen.appearance')}</Text>
      <View
        style={styles.segmentedControl}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('settingsScreen.appearanceA11y')}
      >
        {APPEARANCE_OPTIONS.map(opt => {
          const selected = (settings.appearanceMode ?? themeMode) === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
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
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{t(opt.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.appearanceHelp}>{t('settingsScreen.appearanceHelp')}</Text>

      <View style={styles.glassRow}>
        <View style={styles.rowTextFill}>
          <Text style={styles.rowLabel}>{t('settingsScreen.glass')}</Text>
          <Text style={styles.rowSub}>{t('settingsScreen.glassHelp')}</Text>
        </View>
        <Switch
          value={!settings.reduceTransparency}
          onValueChange={handleToggleGlass}
          {...switchColors(!settings.reduceTransparency)}
          accessibilityLabel={t('settingsScreen.glass')}
          testID="settings-glass"
        />
      </View>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.section}>
      <View style={styles.row}>
        <View style={styles.rowTextFill}>
          <Text style={styles.rowLabel}>{t('settingsScreen.remindersAlerts')}</Text>
          <Text style={styles.rowSub}>{t('settingsScreen.offlineNotifs')}</Text>
        </View>
        <Switch
          value={settings.notificationsEnabled}
          onValueChange={handleToggleNotifications}
          {...switchColors(settings.notificationsEnabled)}
          accessibilityLabel={t('settingsScreen.remindersAlerts')}
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

      {settings.notificationsEnabled && (
        <View style={styles.row}>
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('settingsScreen.soundLabel')}</Text>
            <Text style={styles.rowSub}>{t('settingsScreen.soundHint')}</Text>
          </View>
          <Switch
            value={settings.notificationSoundEnabled}
            onValueChange={handleToggleNotificationSound}
            {...switchColors(settings.notificationSoundEnabled)}
            accessibilityLabel={t('settingsScreen.soundLabel')}
          />
        </View>
      )}

      {/* Vibrations : un interrupteur, et un seul essai plutôt que quatre boutons */}
      <View style={styles.row}>
        <View style={styles.rowTextFill}>
          <Text style={styles.rowLabel}>{t('settingsHub.vibrationsLabel')}</Text>
          <Text style={styles.rowSub}>{t('settingsHub.vibrationsHint')}</Text>
        </View>
        <Switch
          value={settings.hapticsEnabled}
          onValueChange={handleToggleHaptics}
          {...switchColors(settings.hapticsEnabled)}
          accessibilityLabel={t('settingsScreen.hapticsSwitch')}
        />
      </View>
      {settings.hapticsEnabled && (
        <TouchableOpacity
          style={styles.inlineAction}
          onPress={() => playHaptic('success')}
          accessibilityRole="button"
          accessibilityLabel={t('settingsHub.testVibration')}
          testID="settings-test-haptic"
        >
          <Ionicons name="pulse-outline" size={16} color={palette.primary.default} />
          <Text style={styles.inlineActionText}>{t('settingsHub.testVibration')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHourPills = (hours: readonly number[], value: number, onSelect: (hour: number) => void) => (
    <View style={styles.hoursRow} accessibilityRole="radiogroup">
      {hours.map(hour => {
        const active = value === hour;
        return (
          <TouchableOpacity
            key={hour}
            style={[styles.hourPill, active && styles.hourPillActive]}
            onPress={() => onSelect(hour)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.hourPillText, active && styles.hourPillTextActive]}>
              {t('settingsScreen.hour', { hour })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMascot = () => (
    <>
      <MascotSettingsSection displayName={settings.displayName} showTitle={false} />
      {/* Les heures du point du matin et du bilan du soir, que Pulse annonce */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settingsScreen.briefings')}</Text>
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>{t('settingsScreen.morningHour')}</Text>
          {renderHourPills([6, 7, 8, 9], settings.morningBriefingHour, handleUpdateBriefingHour)}
        </View>
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>{t('settingsScreen.eveningHour')}</Text>
          {renderHourPills([18, 19, 20, 21], settings.endOfDayHour, handleUpdateEndOfDayHour)}
        </View>
      </View>
    </>
  );

  const renderSecurity = () => (
    <View style={styles.section}>
      <View style={styles.rowCol}>
        <View style={styles.hapticHeader}>
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('appLock.label')}</Text>
            <Text style={styles.rowSub}>{t('appLock.hint')}</Text>
          </View>
          <Switch
            value={settings.appLockEnabled}
            onValueChange={handleToggleAppLock}
            {...switchColors(settings.appLockEnabled)}
            accessibilityLabel={t('appLock.label')}
            testID="settings-app-lock"
          />
        </View>
        {settings.appLockEnabled && (
          <>
            <Text style={[styles.rowSub, styles.lockDelayLabel]}>{t('appLock.delay')}</Text>
            <View style={styles.hoursRow} accessibilityRole="radiogroup">
              {APP_LOCK_DELAYS_MINUTES.map(minutes => {
                const active = settings.appLockDelayMinutes === minutes;
                const label = minutes === 0 ? t('appLock.delayNow') : t('appLock.delayMinutes', { count: minutes });
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[styles.hourPill, active && styles.hourPillActive]}
                    onPress={() => void saveAppLock(true, minutes)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.hourPillText, active && styles.hourPillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>{t('settingsHub.sanctumGroup')}</Text>
      <TouchableOpacity style={styles.row} onPress={() => router.push('/sanctum')} accessibilityRole="button">
        <View style={styles.rowTextFill}>
          <Text style={styles.rowLabel}>{t('settingsScreen.sanctum')}</Text>
          <Text style={styles.rowSub}>{t('settingsScreen.sanctumHint')}</Text>
        </View>
        <Ionicons name="lock-closed-outline" size={20} color={palette.primary.default} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          isSanctumPinConfigured
            ? router.push({ pathname: '/sanctum', params: { action: 'change_pin' } })
            : router.push('/sanctum')
        }
        accessibilityRole="button"
      >
        <View style={styles.rowTextFill}>
          <Text style={styles.rowLabel}>{t('settingsScreen.pin')}</Text>
          <Text style={styles.rowSub}>{isSanctumPinConfigured ? t('settingsScreen.pinSet') : t('settingsScreen.pinUnset')}</Text>
        </View>
        <Ionicons name="key-outline" size={20} color={palette.primary.default} />
      </TouchableOpacity>
    </View>
  );

  const renderData = () => (
    <View style={styles.section}>
      {/* Sauvegarde automatique d'abord : c'est celle qui protège sans y penser */}
      <TouchableOpacity style={styles.row} onPress={handleAutoBackup} accessibilityRole="button">
        <View style={styles.rowTextFill}>
          <Text style={styles.rowLabel}>{t('autoBackup.title')}</Text>
          <Text style={styles.rowSub}>{autoBackupStatus}</Text>
        </View>
        <Ionicons name="sync-outline" size={20} color={palette.primary.default} />
      </TouchableOpacity>
      {autoBackup && (
        <View style={styles.row}>
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('autoBackup.biometricLabel')}</Text>
            <Text style={styles.rowSub}>{t('autoBackup.biometricHint')}</Text>
          </View>
          <Switch
            value={!!autoBackup.requireBiometric}
            onValueChange={handleToggleAutoBackupBiometric}
            {...switchColors(!!autoBackup.requireBiometric)}
            accessibilityLabel={t('autoBackup.biometricLabel')}
          />
        </View>
      )}

      <TouchableOpacity style={styles.row} onPress={handleExportData} accessibilityRole="button">
        <View style={styles.rowTextFill}>
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

      {Platform.OS !== 'web' && (
        <View style={styles.row}>
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('deviceCalendar.label')}</Text>
            <Text style={styles.rowSub}>{t('deviceCalendar.hint')}</Text>
          </View>
          <Switch
            value={settings.deviceCalendarEnabled}
            onValueChange={handleToggleDeviceCalendar}
            {...switchColors(settings.deviceCalendarEnabled)}
            accessibilityLabel={t('deviceCalendar.label')}
            testID="settings-device-calendar"
          />
        </View>
      )}

      {/* Zone sensible : tout en bas, et en rouge pour ce qui efface */}
      <Text style={[styles.sectionLabel, styles.dangerLabel]}>{t('settingsHub.dangerZone')}</Text>
      <TouchableOpacity style={styles.row} onPress={handleResetApp} accessibilityRole="button">
        <View style={styles.rowTextFill}>
          <Text style={styles.rowLabel}>{t('settingsScreen.restartRow')}</Text>
          <Text style={styles.rowSub}>{t('settingsScreen.restartHint')}</Text>
        </View>
        <Ionicons name="refresh-outline" size={20} color={palette.onSurface.variant} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleClearAllData} accessibilityRole="button">
        <View style={styles.rowTextFill}>
          <Text style={[styles.rowLabel, { color: palette.error.default }]}>{t('settingsScreen.clearTitle')}</Text>
          <Text style={styles.rowSub}>{t('settingsScreen.clearHint')}</Text>
        </View>
        <Ionicons name="trash-outline" size={20} color={palette.error.default} />
      </TouchableOpacity>
    </View>
  );

  const PAGES: Record<SettingsPage, () => ReactElement> = {
    notifications: renderNotifications,
    mascot: renderMascot,
    security: renderSecurity,
    data: renderData,
  };

  const pageTitle =
    section === null ? t('common.settings') : t(HUB_SECTIONS.find(item => item.id === section)!.titleKey);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          {pageTitle}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {section === null ? renderHub() : PAGES[section]()}

      {/* Modal d'édition du prénom */}
      <Modal visible={editingName} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              <Button label={t('common.cancel')} onPress={() => setEditingName(false)} variant="ghost" size="sm" />
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

      {section === null && <Text style={styles.version}>Junix Pulse v{Constants.expoConfig?.version ?? ''}</Text>}
      {restoreModal}
      {autoBackupSetupModal}
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

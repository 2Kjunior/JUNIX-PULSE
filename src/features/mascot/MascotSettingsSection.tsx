/**
 * "Pulse, ta mascotte" section of the settings screen.
 *
 * Four choices, nothing more: how present the mascot is, how it addresses the user (tu or vous),
 * how often it proposes things, and whether it gives the morning and evening summaries.
 * A sample sentence in its own voice follows every change. Each choice applies at once and can
 * be undone at any time.
 */

import { router } from 'expo-router';
import React from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';

import {
  DEFAULT_MASCOT_SETTINGS,
  MascotAddress,
  MascotPresence,
  MascotProposalsLevel,
  MascotSettings,
  mascotPreferencesFromSettings,
} from '@/domain/rules/mascot-preferences';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { MascotStateRepository } from '@/repositories/mascot-state-repository';
import { resetBudget } from '@/services/mascot/mascot-budget-service';
import { replayHomeTour } from '@/services/mascot/mascot-tips-service';
import { saveMascotSettings } from '@/services/mascot/mascot-settings-service';
import { useAppStore } from '@/store/app-store';
import { useLanguage, useT, type MessageKey } from '@/i18n';
import { makeSettingsStyles } from '@/styles/settings/settings-styles';

import { MascotBubble } from './MascotBubble';
import { PulseMascot } from './PulseMascot';
import { useMascotPreferences } from './use-mascot-preferences';

interface Choice<T extends string> {
  value: T;
  labelKey: MessageKey;
}

const PRESENCE_CHOICES: readonly Choice<MascotPresence>[] = [
  { value: 'full', labelKey: 'mascotSettings.presence.full' },
  { value: 'discreet', labelKey: 'mascotSettings.presence.discreet' },
  { value: 'off', labelKey: 'mascotSettings.presence.off' },
];

const ADDRESS_CHOICES: readonly Choice<MascotAddress>[] = [
  { value: 'tu', labelKey: 'mascotSettings.address.tu' },
  { value: 'vous', labelKey: 'mascotSettings.address.vous' },
];

const PROPOSALS_CHOICES: readonly Choice<MascotProposalsLevel>[] = [
  { value: 'normal', labelKey: 'mascotSettings.proposals.normal' },
  { value: 'rare', labelKey: 'mascotSettings.proposals.rare' },
  { value: 'off', labelKey: 'mascotSettings.proposals.off' },
];

const PRESENCE_HINT: Record<MascotPresence, MessageKey> = {
  full: 'mascotSettings.presenceHint.full',
  discreet: 'mascotSettings.presenceHint.discreet',
  off: 'mascotSettings.presenceHint.off',
};

const PROPOSALS_HINT: Record<MascotProposalsLevel, MessageKey> = {
  normal: 'mascotSettings.proposalsHint.normal',
  rare: 'mascotSettings.proposalsHint.rare',
  off: 'mascotSettings.proposalsHint.off',
};

interface PillsProps<T extends string> {
  choices: readonly Choice<T>[];
  value: T;
  onSelect: (value: T) => void;
  styles: ReturnType<typeof makeSettingsStyles>;
}

function Pills<T extends string>({ choices, value, onSelect, styles }: PillsProps<T>) {
  const t = useT();
  return (
    <View style={styles.hoursRow}>
      {choices.map(choice => (
        <TouchableOpacity
          key={choice.value}
          style={[styles.hourPill, value === choice.value && styles.hourPillActive]}
          onPress={() => onSelect(choice.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === choice.value }}
        >
          <Text style={[styles.hourPillText, value === choice.value && styles.hourPillTextActive]}>
            {t(choice.labelKey)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function MascotSettingsSection({ displayName }: { displayName?: string }) {
  const styles = useThemedStyles(makeSettingsStyles);
  const { palette } = useTheme();
  const t = useT();
  const language = useLanguage();
  const { showSnackbar } = useAppStore();
  const { settings } = useMascotPreferences();

  const change = async (next: Partial<MascotSettings>) => {
    try {
      await saveMascotSettings(next);
    } catch (e) {
      // Le Snackbar se voit partout, y compris sur le web où Alert n'affiche rien
      showSnackbar(e instanceof Error ? t('mascotSettings.notSavedWith', { message: e.message }) : t('mascotSettings.notSaved'));
    }
  };

  const replayTour = async () => {
    try {
      await replayHomeTour();
      // The tour starts by itself a moment after the home screen shows
      router.push('/(tabs)' as never);
    } catch (e) {
      showSnackbar(e instanceof Error ? t('mascotSettings.failedWith', { message: e.message }) : t('mascotSettings.failed'));
    }
  };

  const forgetTips = async () => {
    try {
      await MascotStateRepository.deleteByPrefix('tip:');
      await resetBudget();
      showSnackbar(t('mascotSettings.forgotten'));
    } catch (e) {
      showSnackbar(e instanceof Error ? t('mascotSettings.failedWith', { message: e.message }) : t('mascotSettings.failed'));
    }
  };

  const resetAll = async () => {
    await change(DEFAULT_MASCOT_SETTINGS);
    showSnackbar(t('mascotSettings.resetDone'));
  };

  const present = settings.presence !== 'off';
  const preferences = mascotPreferencesFromSettings(settings);
  const sample = resolveMascotMessage(
    'FORGOTTEN_CONTACT',
    { days: 31, person: 'Paul' },
    { ...preferences, presence: 'full' },
    displayName
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t('mascotSettings.title')}</Text>

      <View style={styles.rowCol}>
        <Text style={styles.rowLabel}>{t('mascotSettings.presence')}</Text>
        <Pills
          choices={PRESENCE_CHOICES}
          value={settings.presence}
          onSelect={presence => change({ presence })}
          styles={styles}
        />
        <Text style={styles.rowSub}>{t(PRESENCE_HINT[settings.presence])}</Text>
      </View>

      {present && (
        <>
          {/* Tu and vous only exist in French: English has a single form */}
          {language === 'fr' && (
            <View style={styles.rowCol}>
              <Text style={styles.rowLabel}>{t('mascotSettings.address')}</Text>
              <Pills
                choices={ADDRESS_CHOICES}
                value={settings.address}
                onSelect={address => change({ address })}
                styles={styles}
              />
            </View>
          )}

          <View style={styles.rowCol}>
            <Text style={styles.rowLabel}>{t('mascotSettings.proposals')}</Text>
            <Pills
              choices={PROPOSALS_CHOICES}
              value={settings.proposals}
              onSelect={proposals => change({ proposals })}
              styles={styles}
            />
            <Text style={styles.rowSub}>{t(PROPOSALS_HINT[settings.proposals])}</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t('mascotSettings.briefings')}</Text>
              <Text style={styles.rowSub}>{t('mascotSettings.briefingsHint')}</Text>
            </View>
            <Switch
              value={settings.briefings}
              onValueChange={briefings => change({ briefings })}
              trackColor={{ false: palette.outline.variant, true: palette.primary.container }}
              thumbColor={settings.briefings ? palette.primary.default : palette.onSurface.disabled}
            />
          </View>

          {/* Aperçu : la même phrase, dans la voix qui vient d'être choisie */}
          {sample ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <PulseMascot mood="calm" size={40} />
              <MascotBubble text={sample} maxWidth={260} tailSide="left" />
            </View>
          ) : null}
        </>
      )}

      {present && (
        <TouchableOpacity style={styles.row} onPress={replayTour} accessibilityRole="button">
          <View>
            <Text style={styles.rowLabel}>{t('mascotSettings.replay')}</Text>
            <Text style={styles.rowSub}>{t('mascotSettings.replayHint')}</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.row} onPress={forgetTips} accessibilityRole="button">
        <View>
          <Text style={styles.rowLabel}>{t('mascotSettings.forget')}</Text>
          <Text style={styles.rowSub}>{t('mascotSettings.forgetHint')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={resetAll} accessibilityRole="button">
        <View>
          <Text style={styles.rowLabel}>{t('mascotSettings.reset')}</Text>
          <Text style={styles.rowSub}>{t('mascotSettings.resetHint')}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

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
import { makeSettingsStyles } from '@/styles/settings/settings-styles';

import { MascotBubble } from './MascotBubble';
import { PulseMascot } from './PulseMascot';
import { useMascotPreferences } from './use-mascot-preferences';

interface Choice<T extends string> {
  value: T;
  label: string;
}

const PRESENCE_CHOICES: readonly Choice<MascotPresence>[] = [
  { value: 'full', label: 'Complète' },
  { value: 'discreet', label: 'Discrète' },
  { value: 'off', label: 'Désactivée' },
];

const ADDRESS_CHOICES: readonly Choice<MascotAddress>[] = [
  { value: 'tu', label: 'Tutoiement' },
  { value: 'vous', label: 'Vouvoiement' },
];

const PROPOSALS_CHOICES: readonly Choice<MascotProposalsLevel>[] = [
  { value: 'normal', label: 'Normales' },
  { value: 'rare', label: 'Rares' },
  { value: 'off', label: 'Aucune' },
];

const PRESENCE_HINT: Record<MascotPresence, string> = {
  full: 'Elle réagit à tes actions et te parle avec chaleur.',
  discreet: 'Ton sobre, et seulement les réactions marquantes.',
  off: 'Elle ne se montre plus et ne dit plus rien.',
};

const PROPOSALS_HINT: Record<MascotProposalsLevel, string> = {
  normal: "Jusqu'à 3 propositions par jour.",
  rare: 'Une proposition par jour au plus.',
  off: "Elle ne propose rien d'elle-même.",
};

interface PillsProps<T extends string> {
  choices: readonly Choice<T>[];
  value: T;
  onSelect: (value: T) => void;
  styles: ReturnType<typeof makeSettingsStyles>;
}

function Pills<T extends string>({ choices, value, onSelect, styles }: PillsProps<T>) {
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
            {choice.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function MascotSettingsSection({ displayName }: { displayName?: string }) {
  const styles = useThemedStyles(makeSettingsStyles);
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const { settings } = useMascotPreferences();

  const change = async (next: Partial<MascotSettings>) => {
    try {
      await saveMascotSettings(next);
    } catch (e) {
      // Le Snackbar se voit partout, y compris sur le web où Alert n'affiche rien
      showSnackbar(e instanceof Error ? `Réglage non enregistré : ${e.message}` : 'Réglage non enregistré.');
    }
  };

  const replayTour = async () => {
    try {
      await replayHomeTour();
      // The tour starts by itself a moment after the home screen shows
      router.push('/(tabs)' as never);
    } catch (e) {
      showSnackbar(e instanceof Error ? `Échec : ${e.message}` : 'Échec.');
    }
  };

  const forgetTips = async () => {
    try {
      await MascotStateRepository.deleteByPrefix('tip:');
      await resetBudget();
      showSnackbar('Pulse a oublié ce que tu as déjà vu.');
    } catch (e) {
      showSnackbar(e instanceof Error ? `Échec : ${e.message}` : 'Échec.');
    }
  };

  const resetAll = async () => {
    await change(DEFAULT_MASCOT_SETTINGS);
    showSnackbar('Réglages de Pulse remis par défaut.');
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
      <Text style={styles.sectionLabel}>Pulse, ta mascotte</Text>

      <View style={styles.rowCol}>
        <Text style={styles.rowLabel}>Présence</Text>
        <Pills
          choices={PRESENCE_CHOICES}
          value={settings.presence}
          onSelect={presence => change({ presence })}
          styles={styles}
        />
        <Text style={styles.rowSub}>{PRESENCE_HINT[settings.presence]}</Text>
      </View>

      {present && (
        <>
          <View style={styles.rowCol}>
            <Text style={styles.rowLabel}>Forme de politesse</Text>
            <Pills
              choices={ADDRESS_CHOICES}
              value={settings.address}
              onSelect={address => change({ address })}
              styles={styles}
            />
          </View>

          <View style={styles.rowCol}>
            <Text style={styles.rowLabel}>Propositions</Text>
            <Pills
              choices={PROPOSALS_CHOICES}
              value={settings.proposals}
              onSelect={proposals => change({ proposals })}
              styles={styles}
            />
            <Text style={styles.rowSub}>{PROPOSALS_HINT[settings.proposals]}</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Résumé du matin et bilan du soir</Text>
              <Text style={styles.rowSub}>Aux heures choisies plus haut</Text>
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
            <Text style={styles.rowLabel}>Revoir la présentation</Text>
            <Text style={styles.rowSub}>Elle te refait le tour de l'Accueil</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.row} onPress={forgetTips} accessibilityRole="button">
        <View>
          <Text style={styles.rowLabel}>Oublier les astuces vues</Text>
          <Text style={styles.rowSub}>Elle pourra de nouveau tout te présenter</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={resetAll} accessibilityRole="button">
        <View>
          <Text style={styles.rowLabel}>Tout remettre par défaut</Text>
          <Text style={styles.rowSub}>Ne supprime aucune de tes données</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

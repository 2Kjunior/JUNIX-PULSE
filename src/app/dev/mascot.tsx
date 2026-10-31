/**
 * Mascot test bench (development only): the six moods, the four reaction levels, the sizes,
 * the poses, the message bubble in every tu/vous and tone variant, and the guide's travel.
 * In a production build this route redirects to the home screen.
 * Open it with the deep link /dev/mascot (web: http://localhost:8081/dev/mascot).
 */

import { Redirect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { computeGuidePlacement, GuideDirection, GuidePlacement, GuideStep } from '@/domain/rules/mascot-guide-rules';
import type { MascotMessageId } from '@/domain/rules/mascot-message-catalog';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import {
  DEFAULT_MASCOT_PREFERENCES,
  MascotAddress,
  MascotPreferences,
  MascotTone,
} from '@/domain/rules/mascot-preferences';
import type { MascotReactionLevel } from '@/domain/rules/mascot-reaction-rules';
import { MascotBubble } from '@/features/mascot/MascotBubble';
import { MascotReactionTrigger, PulseMascot } from '@/features/mascot/PulseMascot';
import { PulseMascotMover } from '@/features/mascot/PulseMascotMover';
import { MASCOT_SIZES } from '@/features/mascot/mascot-visuals';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

const MOODS: readonly { mood: MascotMood; label: string }[] = [
  { mood: 'calm', label: 'Calme' },
  { mood: 'happy', label: 'Content' },
  { mood: 'focused', label: 'Concentré' },
  { mood: 'alert', label: 'Alerte' },
  { mood: 'sleepy', label: 'Endormi' },
  { mood: 'party', label: 'Fête' },
];

const LEVELS: readonly { level: MascotReactionLevel; label: string }[] = [
  { level: 'micro', label: 'Micro' },
  { level: 'small', label: 'Petite' },
  { level: 'medium', label: 'Moyenne' },
  { level: 'large', label: 'Grande' },
];

const STEPS: readonly { step: GuideStep; label: string }[] = [
  { step: 'welcome', label: 'Bienvenue' },
  { step: 'discover', label: 'Découverte' },
  { step: 'personalize', label: 'Personnaliser' },
  { step: 'schedule', label: 'Rythme' },
  { step: 'permissions', label: 'Notifications' },
  { step: 'home', label: 'Accueil' },
];

const SAMPLE_MESSAGES: readonly { id: MascotMessageId; params: Record<string, string | number> }[] = [
  { id: 'WELCOME', params: {} },
  { id: 'FORGOTTEN_CONTACT', params: { days: 31, person: 'Paul' } },
  { id: 'STREAK_AT_RISK', params: { streak: 6, title: 'Lecture' } },
  { id: 'TASKS_TO_POSTPONE', params: { count: 3 } },
  { id: 'EVENING_REVIEW', params: { done: 4, total: 5 } },
];

const SAMPLE_NAME = 'Awa';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function MascotLab() {
  const styles = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useSafeReducedMotion();

  const [reaction, setReaction] = useState<MascotReactionTrigger | null>(null);
  const [preferences, setPreferences] = useState<MascotPreferences>(DEFAULT_MASCOT_PREFERENCES);
  const [placement, setPlacement] = useState<GuidePlacement | null>(null);
  const stepIndexRef = useRef(-1);
  const keyRef = useRef(0);

  const react = useCallback((level: MascotReactionLevel) => {
    keyRef.current += 1;
    setReaction({ level, key: keyRef.current });
  }, []);

  const goTo = useCallback(
    (index: number, direction?: GuideDirection) => {
      const { step } = STEPS[index];
      const auto: GuideDirection = index < stepIndexRef.current ? 'back' : 'forward';
      stepIndexRef.current = index;
      setPlacement(prev =>
        computeGuidePlacement({
          step,
          direction: direction ?? auto,
          phase: 'ask',
          screen: { width, height, insets },
          keyboardOpen: false,
          reducedMotion,
          from: prev?.center ?? null,
          rowCenterY: height * 0.5,
          target: step === 'discover' ? { x: width / 2, y: height * 0.45 } : undefined,
        })
      );
    },
    [width, height, insets, reducedMotion]
  );

  const setAddress = (address: MascotAddress) => setPreferences(p => ({ ...p, address }));
  const setTone = (tone: MascotTone) => setPreferences(p => ({ ...p, tone }));
  const toggleName = () => setPreferences(p => ({ ...p, useFirstName: !p.useFirstName }));

  const bubbleWidth = Math.round(width * 0.7);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
      >
        <Text style={styles.title}>Pulse : banc d'essai</Text>
        <Text style={styles.note}>Visible en développement seulement. Aucune donnée n'est lue ni écrite.</Text>

        <Text style={styles.section}>Les six humeurs</Text>
        <View style={styles.grid}>
          {MOODS.map(({ mood, label }) => (
            <View key={mood} style={styles.cell}>
              <PulseMascot mood={mood} size={80} />
              <Text style={styles.caption}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Les quatre niveaux de réaction</Text>
        <View style={styles.row}>
          <PulseMascot mood="happy" size={96} reaction={reaction} />
          <View style={styles.chips}>
            {LEVELS.map(({ level, label }) => (
              <Chip key={level} label={label} selected={reaction?.level === level} onPress={() => react(level)} />
            ))}
          </View>
        </View>

        <Text style={styles.section}>Cinq tailles, un seul dessin</Text>
        <View style={styles.rowWrap}>
          {MASCOT_SIZES.map(size => (
            <View key={size} style={styles.cell}>
              <PulseMascot mood="calm" size={size} />
              <Text style={styles.caption}>{size} px</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Poses du guide</Text>
        <View style={styles.rowWrap}>
          <View style={styles.cell}>
            <PulseMascot mood="happy" size={80} pose="greet" />
            <Text style={styles.caption}>Salue</Text>
          </View>
          <View style={styles.cell}>
            <PulseMascot mood="calm" size={80} pose="pointAt" pointAt={{ arm: 'right', angleDeg: -62 }} />
            <Text style={styles.caption}>Désigne à droite</Text>
          </View>
          <View style={styles.cell}>
            <PulseMascot mood="calm" size={80} pose="pointAt" pointAt={{ arm: 'left', angleDeg: 62 }} />
            <Text style={styles.caption}>Désigne à gauche</Text>
          </View>
        </View>

        <Text style={styles.section}>Bulle de verre</Text>
        <View style={styles.chips}>
          <Chip label="Tu" selected={preferences.address === 'tu'} onPress={() => setAddress('tu')} />
          <Chip label="Vous" selected={preferences.address === 'vous'} onPress={() => setAddress('vous')} />
          <Chip label="Chaleureux" selected={preferences.tone === 'warm'} onPress={() => setTone('warm')} />
          <Chip label="Sobre" selected={preferences.tone === 'sober'} onPress={() => setTone('sober')} />
          <Chip label={`Prénom : ${preferences.useFirstName ? 'oui' : 'non'}`} selected={preferences.useFirstName} onPress={toggleName} />
        </View>
        {SAMPLE_MESSAGES.map(({ id, params }) => {
          const text = resolveMascotMessage(id, params, preferences, SAMPLE_NAME);
          return text ? (
            <View key={id} style={styles.bubbleRow}>
              <PulseMascot mood="calm" size={56} />
              <MascotBubble text={text} maxWidth={bubbleWidth - 56} tailSide="left" />
            </View>
          ) : null;
        })}

        <Text style={styles.section}>Déplacement du guide</Text>
        <Text style={styles.note}>
          La mascotte traverse l'écran sans bloquer les boutons. Elle part de sa place actuelle, sans file d'attente.
        </Text>
        <View style={styles.chips}>
          {STEPS.map(({ label }, index) => (
            <Chip key={label} label={label} selected={placement !== null && stepIndexRef.current === index} onPress={() => goTo(index)} />
          ))}
          <Chip label="Passer" selected={false} onPress={() => goTo(3, 'skip')} />
          <Chip
            label="Masquer"
            selected={false}
            onPress={() => {
              stepIndexRef.current = -1;
              setPlacement(null);
            }}
          />
        </View>
        <Text style={[styles.note, { color: palette.onSurface.inactive }]}>
          Mouvement réduit du téléphone : {reducedMotion ? 'activé, fondu seulement' : 'désactivé'}.
        </Text>
      </ScrollView>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PulseMascotMover placement={placement} mood={placement?.pose === 'happy' ? 'happy' : 'calm'} />
      </View>
    </View>
  );
}

export default function MascotLabRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <MascotLab />;
}

function makeStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surface.base },
    content: { paddingHorizontal: 16, gap: 12 },
    title: { ...Typography.displayMedium, color: theme.onSurface.primary },
    note: { ...Typography.bodySmall, color: theme.onSurface.variant },
    section: { ...Typography.headlineMedium, color: theme.onSurface.primary, marginTop: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8 },
    cell: { alignItems: 'center', gap: 4, padding: 4 },
    caption: { ...Typography.labelSmall, color: theme.onSurface.variant },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexShrink: 1 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    chipSelected: { backgroundColor: theme.primary.container, borderColor: theme.primary.default },
    chipLabel: { ...Typography.labelMedium, color: theme.onSurface.variant },
    chipLabelSelected: { color: theme.primary.onContainer },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  });
}

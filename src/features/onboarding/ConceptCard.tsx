/**
 * One of the five things of Junix Pulse as a card: icon, name, one sentence and an example
 * (sheet 021). Shared by the onboarding and any screen that explains them; what it says lives
 * in constants/pulse-concepts.ts. Read as one item by a screen reader.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PULSE_CONCEPT_DEFINITIONS, pulseConceptColor, type PulseConcept } from '@/constants/pulse-concepts';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

export function ConceptCard({ concept }: { concept: PulseConcept }) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeConceptCardStyles);
  const definition = PULSE_CONCEPT_DEFINITIONS[concept];
  const color = pulseConceptColor(palette, concept);
  const title = t(definition.titleKey);
  const desc = t(definition.descKey);
  const example = t(definition.exampleKey);

  return (
    <View style={styles.card} accessible accessibilityLabel={`${title}. ${desc} ${example}`}>
      <View style={[styles.icon, { backgroundColor: color + '26' }]}>
        <Ionicons name={definition.icon} size={20} color={color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
        <Text style={[styles.example, { color }]}>{example}</Text>
      </View>
    </View>
  );
}

const makeConceptCardStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    body: {
      flex: 1,
    },
    title: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginBottom: 2,
    },
    desc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      lineHeight: 18,
      marginBottom: 2,
    },
    example: {
      ...Typography.labelSmall,
    },
  });

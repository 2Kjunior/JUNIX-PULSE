/**
 * Onglet Pulse — Suggestions, habitudes, objectifs et insights.
 * Étapes 13–15 construiront les modules complets.
 */
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Surface, Primary, Tertiary, OnSurface, Outline, Spacing, Radius, Typography,
} from '@/constants/theme';

export default function PulseScreen() {
  const insets = useSafeAreaInsets();

  const SECTIONS = [
    {
      icon: 'bulb-outline' as const,
      label: 'Suggestions',
      desc: 'Propositions basées sur votre activité.',
      color: Primary.default,
      route: null, // Étape 15
    },
    {
      icon: 'repeat-outline' as const,
      label: 'Habitudes',
      desc: 'Suivez vos pratiques quotidiennes.',
      color: Tertiary.default,
      route: '/habits/index',
    },
    {
      icon: 'flag-outline' as const,
      label: 'Objectifs',
      desc: 'Progression liée à vos tâches.',
      color: '#6DD58C',
      route: '/goals/index',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
    >
      <Text style={styles.title}>Pulse</Text>
      <Text style={styles.subtitle}>
        Votre tableau de bord personnel.
      </Text>

      {SECTIONS.map(s => (
        <TouchableOpacity
          key={s.label}
          style={styles.sectionCard}
          onPress={() => s.route && router.push(s.route as never)}
          activeOpacity={s.route ? 0.8 : 1}
        >
          <View style={[styles.sectionIcon, { backgroundColor: s.color + '20' }]}>
            <Ionicons name={s.icon} size={24} color={s.color} />
          </View>
          <View style={styles.sectionBody}>
            <Text style={styles.sectionLabel}>{s.label}</Text>
            <Text style={styles.sectionDesc}>{s.desc}</Text>
          </View>
          {s.route ? (
            <Ionicons name="chevron-forward" size={18} color={OnSurface.disabled} />
          ) : (
            <View style={styles.comingSoon}>
              <Text style={styles.comingSoonText}>Bientôt</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>✦ Suggestions intelligentes</Text>
        <Text style={styles.placeholderDesc}>
          Le moteur de suggestions analysera vos rappels, tâches, habitudes et personnes
          pour vous proposer des actions pertinentes — jamais des décisions automatiques.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  title: { ...Typography.headlineLarge, color: OnSurface.primary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.bodyMedium, color: OnSurface.variant, marginBottom: Spacing.xl },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: { flex: 1 },
  sectionLabel: { ...Typography.titleMedium, color: OnSurface.primary },
  sectionDesc: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  comingSoon: {
    backgroundColor: Outline.variant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  comingSoonText: { ...Typography.labelSmall, color: OnSurface.disabled, fontSize: 9 },
  placeholder: {
    marginTop: Spacing.xl,
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Primary.default + '20',
  },
  placeholderTitle: {
    ...Typography.titleMedium,
    color: Primary.default,
    marginBottom: Spacing.sm,
  },
  placeholderDesc: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 20,
  },
});

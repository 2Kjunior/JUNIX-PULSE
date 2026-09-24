/**
 * Onboarding — Étape 2 : Découverte courte
 * Explique les 3 concepts clés sans raconter toute l'architecture.
 *
 * Corrections rebranding :
 * - Emojis (🔔, ✓, 📅, 💡) → icônes Ionicons (règle A.1)
 * - Titre en Outfit Bold (règle A.2)
 * - StepIndicator harmonisé (barre, pas dots)
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Surface,
  Primary,
  Tertiary,
  Success,
  OnSurface,
  Spacing,
  Radius,
  Typography,
  Outline,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/ui/StepIndicator';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Concept {
  icon: IoniconName;
  accentColor: string;
  bgColor: string;
  title: string;
  desc: string;
  example: string;
}

const CONCEPTS: Concept[] = [
  {
    icon: 'alarm-outline',
    accentColor: Primary.default,
    bgColor: 'rgba(208, 188, 255, 0.10)',
    title: 'Rappels',
    desc: 'Une chose à ne pas oublier à un moment précis. Peut être ponctuel ou récurrent, lié à une personne, avec un snooze si besoin.',
    example: 'Ex : Appeler maman vendredi 18h',
  },
  {
    icon: 'checkmark-circle-outline',
    accentColor: Tertiary.default,
    bgColor: 'rgba(123, 208, 255, 0.10)',
    title: 'Tâches',
    desc: "Une intention d'agir, avec ou sans date. Les tâches sans date vivent dans votre Inbox jusqu'à ce que vous les planifiiez.",
    example: 'Ex : Préparer la réunion de lundi',
  },
  {
    icon: 'calendar-outline',
    accentColor: Success.default,
    bgColor: 'rgba(109, 213, 140, 0.10)',
    title: 'Événements',
    desc: 'Un rendez-vous ou une occupation avec une durée. Peut inclure un lieu, des personnes et un temps de trajet.',
    example: "Ex : Réunion d'équipe 14h–15h30",
  },
];

export default function OnboardingDiscover() {
  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <StepIndicator total={5} current={2} />
        <Text style={styles.title}>Comment ça fonctionne</Text>
        <Text style={styles.subtitle}>Trois concepts, une cohérence.</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {CONCEPTS.map((c) => (
          <View key={c.title} style={styles.conceptCard}>
            <View style={[styles.conceptIcon, { backgroundColor: c.bgColor }]}>
              <Ionicons name={c.icon} size={22} color={c.accentColor} />
            </View>
            <View style={styles.conceptBody}>
              <Text style={styles.conceptTitle}>{c.title}</Text>
              <Text style={styles.conceptDesc}>{c.desc}</Text>
              <Text style={[styles.conceptExample, { color: c.accentColor }]}>
                {c.example}
              </Text>
            </View>
          </View>
        ))}

        {/* Note de distinction — sans emoji */}
        <View style={styles.distinction}>
          <View style={styles.distinctionIconRow}>
            <Ionicons name="information-circle-outline" size={16} color={Primary.default} />
            <Text style={styles.distinctionLabel}>À retenir</Text>
          </View>
          <Text style={styles.distinctionText}>
            Un rappel déclenche une attention.{'\n'}
            Une tâche attend d'être accomplie.{'\n'}
            Un événement occupe une période dans le temps.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label="Suivant"
          onPress={() => router.push('/(onboarding)/personalize')}
          variant="primary"
          size="lg"
          style={styles.btnPrimary}
          testID="onboarding-discover-next"
        />
        <Button
          label="Retour"
          onPress={() => router.back()}
          variant="ghost"
          size="md"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: OnSurface.primary,
    marginBottom: Spacing.xs,
    lineHeight: 34,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: OnSurface.variant,
  },
  scroll: {
    flex: 1,
  },
  conceptCard: {
    flexDirection: 'row',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  conceptIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  conceptBody: {
    flex: 1,
  },
  conceptTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.xs,
  },
  conceptDesc: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  conceptExample: {
    ...Typography.labelSmall,
    opacity: 0.9,
  },
  distinction: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.15)',
  },
  distinctionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  distinctionLabel: {
    ...Typography.labelMedium,
    color: Primary.default,
  },
  distinctionText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  btnPrimary: {
    width: '100%',
  },
});

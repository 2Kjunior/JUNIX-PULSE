/**
 * Onboarding — Étape 2 : Découverte courte
 * Explique les 3 concepts clés sans raconter toute l'architecture.
 */
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Surface, Primary, OnSurface, Spacing, Radius, Typography, Outline } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');

export default function OnboardingDiscover() {
  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          <View style={[styles.step, styles.stepDone]} />
          <View style={[styles.step, styles.stepActive]} />
          <View style={styles.step} />
          <View style={styles.step} />
        </View>
        <Text style={styles.title}>Comment ça fonctionne</Text>
        <Text style={styles.subtitle}>
          Trois concepts, une cohérence.
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {CONCEPTS.map((c) => (
          <View key={c.title} style={styles.conceptCard}>
            <View style={[styles.conceptIcon, { backgroundColor: c.bgColor }]}>
              <Text style={styles.conceptEmoji}>{c.icon}</Text>
            </View>
            <View style={styles.conceptBody}>
              <Text style={styles.conceptTitle}>{c.title}</Text>
              <Text style={styles.conceptDesc}>{c.desc}</Text>
              <Text style={styles.conceptExample}>{c.example}</Text>
            </View>
          </View>
        ))}

        <View style={styles.distinction}>
          <Text style={styles.distinctionText}>
            💡 Un rappel déclenche une attention.{'\n'}
            Une tâche attend d&apos;être accomplie.{'\n'}
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

const CONCEPTS = [
  {
    icon: '🔔',
    bgColor: 'rgba(208, 188, 255, 0.12)',
    title: 'Rappels',
    desc: 'Une chose à ne pas oublier à un moment précis. Peut être ponctuel ou récurrent, lié à une personne, avec un snooze si besoin.',
    example: 'Ex : Appeler maman vendredi 18h',
  },
  {
    icon: '✓',
    bgColor: 'rgba(123, 208, 255, 0.10)',
    title: 'Tâches',
    desc: "Une intention d'agir, avec ou sans date. Les tâches sans date vivent dans votre Inbox jusqu'à ce que vous les planifiiez.",
    example: 'Ex : Préparer la réunion de lundi',
  },
  {
    icon: '📅',
    bgColor: 'rgba(109, 213, 140, 0.10)',
    title: 'Événements',
    desc: 'Un rendez-vous ou une occupation avec une durée. Peut inclure un lieu, des personnes et un temps de trajet.',
    example: 'Ex : Réunion d\'équipe 14h–15h30',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  step: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: Outline.variant,
  },
  stepDone: {
    backgroundColor: Primary.default,
    opacity: 0.6,
  },
  stepActive: {
    backgroundColor: Primary.default,
  },
  title: {
    ...Typography.displayMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.sm,
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
  },
  conceptIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conceptEmoji: {
    fontSize: 22,
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
    color: Primary.default,
    opacity: 0.8,
  },
  distinction: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
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

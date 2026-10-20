/**
 * Onboarding — Étape 2 : Découverte courte
 * Explique les 3 concepts clés sans raconter toute l'architecture.
 *
 * Corrections rebranding :
 * - Emojis (🔔, ✓, 📅, 💡) → icônes Ionicons (règle A.1)
 * - Titre en Outfit Bold (règle A.2)
 * - StepIndicator harmonisé (barre, pas dots)
 */
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
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

export default function OnboardingDiscover() {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingDiscoverStyles);

  const concepts: Concept[] = [
    {
      icon: 'alarm-outline',
      accentColor: palette.primary.default,
      bgColor: palette.primary.container + '33',
      title: 'Rappels',
      desc: 'Une chose à ne pas oublier à un moment précis. Peut être ponctuel ou récurrent, lié à une personne, avec un snooze si besoin.',
      example: 'Ex\u00A0: Appeler maman vendredi 18h',
    },
    {
      icon: 'checkmark-circle-outline',
      accentColor: palette.tertiary.default,
      bgColor: palette.tertiary.container + '33',
      title: 'Tâches',
      desc: 'Une intention d’agir, avec ou sans date. Les tâches sans date vivent dans votre Inbox jusqu’à ce que vous les planifiiez.',
      example: 'Ex\u00A0: Préparer la réunion de lundi',
    },
    {
      icon: 'calendar-outline',
      accentColor: palette.success.default,
      bgColor: palette.success.container + '33',
      title: 'Événements',
      desc: 'Un rendez-vous ou une occupation avec une durée. Peut inclure un lieu, des personnes et un temps de trajet.',
      example: 'Ex\u00A0: Réunion d’équipe 14h–15h30',
    },
  ];

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <StepIndicator total={5} current={2} />
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/permissions')}
            style={styles.skipBtn}
            accessibilityLabel="Passer les étapes restantes"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Passer</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Comment ça fonctionne</Text>
        <Text style={styles.subtitle}>Trois concepts, une cohérence.</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {concepts.map((c) => (
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
            <Ionicons name="information-circle-outline" size={16} color={palette.primary.default} />
            <Text style={styles.distinctionLabel}>À retenir</Text>
          </View>
          <Text style={styles.distinctionText}>
            Un rappel déclenche une attention.{'\n'}
            Une tâche attend d’être accomplie.{'\n'}
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

const makeOnboardingDiscoverStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.xxl,
    },
    header: {
      marginBottom: Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    skipBtn: {
      paddingVertical: Spacing.xs,
      paddingLeft: Spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    skipText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.disabled,
    },
    title: {
      fontSize: 26,
      fontFamily: 'Outfit-Bold',
      color: theme.onSurface.primary,
      marginBottom: Spacing.xs,
      lineHeight: 34,
    },
    subtitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.variant,
    },
    scroll: {
      flex: 1,
    },
    conceptCard: {
      flexDirection: 'row',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
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
      color: theme.onSurface.primary,
      marginBottom: Spacing.xs,
    },
    conceptDesc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      lineHeight: 18,
      marginBottom: Spacing.xs,
    },
    conceptExample: {
      ...Typography.labelSmall,
      opacity: 0.9,
    },
    distinction: {
      backgroundColor: theme.surface.high,
      borderRadius: Radius.md,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: theme.primary.default + '26',
    },
    distinctionIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    distinctionLabel: {
      ...Typography.labelMedium,
      color: theme.primary.default,
    },
    distinctionText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
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


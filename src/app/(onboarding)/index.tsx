/**
 * Onboarding — Étape 1 : Bienvenue
 * Premier écran affiché au premier lancement.
 */
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Surface, Primary, Tertiary, OnSurface, Spacing, Radius, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const { height } = Dimensions.get('window');

export default function OnboardingWelcome() {
  return (
    <View style={styles.container}>
      {/* Logo / Identité visuelle */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoDot} />
          <View style={[styles.logoDot, styles.logoDotCyan]} />
        </View>
        <Text style={styles.appName}>Junix Pulse</Text>
        <Text style={styles.tagline}>Votre vie, organisée avec intention.</Text>
      </View>

      {/* Points forts */}
      <View style={styles.featuresSection}>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Commencer"
          onPress={() => router.push('/(onboarding)/discover')}
          variant="primary"
          size="lg"
          style={styles.btnPrimary}
          testID="onboarding-start-btn"
        />
        <Text style={styles.privacyNote}>
          Vos données restent sur votre appareil.{'\n'}Aucun compte requis.
        </Text>
      </View>
    </View>
  );
}

const FEATURES = [
  {
    icon: '🔔',
    label: 'Rappels intelligents',
    desc: 'Ponctuels ou récurrents, avec ou sans contact.',
  },
  {
    icon: '👥',
    label: 'Relations humaines',
    desc: 'Ne perdez plus le lien avec les personnes qui comptent.',
  },
  {
    icon: '📅',
    label: 'Calendrier & planning',
    desc: 'Visualisez votre temps et structurez vos semaines.',
  },
  {
    icon: '✦',
    label: 'Suggestions pertinentes',
    desc: 'Des propositions, jamais des décisions à votre place.',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.08,
    paddingBottom: Spacing.xxl,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
    gap: 8,
  },
  logoDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Primary.default,
  },
  logoDotCyan: {
    backgroundColor: Tertiary.default,
    marginTop: 8,
  },
  appName: {
    ...Typography.displayMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  tagline: {
    ...Typography.bodyLarge,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    gap: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  featureIcon: {
    fontSize: 22,
    lineHeight: 28,
  },
  featureText: {
    flex: 1,
  },
  featureLabel: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginBottom: 2,
  },
  featureDesc: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  btnPrimary: {
    width: '100%',
  },
  privacyNote: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
    textAlign: 'center',
    lineHeight: 18,
  },
});

/**
 * Onboarding — Étape 1 : Bienvenue (R-02)
 *
 * Structure : logo → accroche → 3 badges de valeur → CTA dégradé → lien restauration
 * Corrections vs source Stitch :
 * - Aucun emoji — icônes Ionicons uniquement (règle A.1)
 * - Titre en Outfit Bold (règle A.2)
 * - CTA dégradé pleine largeur (1 seul dégradé par écran)
 * - Badges pill avec icônes vectorielles (pas d'emojis)
 * - Navigation 5 destinations inchangée
 */
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Surface, Primary, Tertiary, OnSurface, Spacing, Radius, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { PulseLogo } from '@/components/ui/PulseLogo';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { ValueBadge } from '@/components/ui/ValueBadge';

const { height } = Dimensions.get('window');

export default function OnboardingWelcome() {
  return (
    <View style={styles.container}>
      {/* En-tête : étape + bouton passer */}
      <View style={styles.topRow}>
        <StepIndicator total={5} current={1} showLabel={true} />
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/personalize')}
          style={styles.skipBtn}
          accessibilityLabel="Passer l'onboarding"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Section hero : logo + accroche */}
      <View style={styles.heroSection}>
        {/* Cercle de fond subtil derrière le logo */}
        <View style={styles.logoOrb}>
          <PulseLogo size={88} mode="idle" />
        </View>

        <Text style={styles.headline}>
          Retrouvez votre{'\n'}
          <Text style={styles.headlineAccent}>rythme naturel</Text>
        </Text>

        <Text style={styles.subheadline}>
          Se souvenir. Planifier. Vivre.
        </Text>
        <Text style={styles.description}>
          Une gestion sereine de vos journées,{'\n'}
          pensée pour apaiser votre charge mentale.
        </Text>
      </View>

      {/* 3 badges de valeur */}
      <View style={styles.badges}>
        <ValueBadge
          icon="moon-outline"
          title="Serein"
          subtitle="Zéro surcharge"
          accentColor={Primary.default}
        />
        <ValueBadge
          icon="shield-checkmark-outline"
          title="Privé"
          subtitle="100 % Hors-ligne"
          accentColor={Tertiary.default}
        />
        <ValueBadge
          icon="pulse-outline"
          title="Rhythm"
          subtitle="IA au repos"
          accentColor="#A078FF"
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Commencer l'expérience"
          onPress={() => router.push('/(onboarding)/discover')}
          variant="primary"
          size="lg"
          style={styles.btnPrimary}
          testID="onboarding-start-btn"
          icon={undefined}
        />
        <TouchableOpacity
          onPress={() => {/* TODO : flux restauration V2 */}}
          accessibilityRole="button"
          accessibilityLabel="Restaurer une sauvegarde"
          style={styles.restoreBtn}
        >
          <Text style={styles.restoreText}>
            Déjà utilisateur de Junix Pulse ?{' '}
            <Text style={styles.restoreLink}>Restaurer une sauvegarde</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.06,
    paddingBottom: Spacing.xxl,
  },

  // ─── En-tête ──────────────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  skipBtn: {
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    ...Typography.bodyMedium,
    color: OnSurface.disabled,
  },

  // ─── Hero ─────────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoOrb: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(208, 188, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  headline: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: OnSurface.primary,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: Spacing.sm,
  },
  headlineAccent: {
    color: Primary.default,
    fontFamily: 'Outfit-Bold',
  },
  subheadline: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ─── Badges ───────────────────────────────────────────────────────────────
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },

  // ─── Actions ──────────────────────────────────────────────────────────────
  actions: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  btnPrimary: {
    width: '100%',
  },
  restoreBtn: {
    paddingVertical: Spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  restoreText: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
    textAlign: 'center',
  },
  restoreLink: {
    color: Primary.default,
    textDecorationLine: 'underline',
  },
});

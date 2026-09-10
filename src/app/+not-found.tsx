/**
 * Route de secours pour les URLs non reconnues.
 * Requise par Expo Router v4 pour éviter un crash sur route inconnue.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Surface, OnSurface, Primary, Spacing, Typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page introuvable</Text>
      <Text style={styles.subtitle}>Cette page n'existe pas dans Junix Pulse.</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Retour à l'accueil</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  title: { ...Typography.headlineMedium, color: OnSurface.primary },
  subtitle: { ...Typography.bodyMedium, color: OnSurface.variant, textAlign: 'center' },
  link: { marginTop: Spacing.md },
  linkText: { ...Typography.labelLarge, color: Primary.default },
});

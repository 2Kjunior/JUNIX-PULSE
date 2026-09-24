/**
 * Route de secours pour les URLs non reconnues (Vague 10 - Système).
 * Requise par Expo Router pour éviter un crash sur route inconnue.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Surface, OnSurface, Outline, Spacing, Radius, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="compass-outline" size={44} color={OnSurface.disabled} />
      </View>
      <Text style={styles.title}>Destination introuvable</Text>
      <Text style={styles.subtitle}>
        Cet écran n'existe pas ou a été déplacé dans Junix Pulse.
      </Text>
      <View style={styles.actionContainer}>
        <Button
          label="Retour à l'accueil"
          onPress={() => router.replace('/(tabs)' as any)}
          variant="primary"
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    maxWidth: 280,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 240,
  },
});

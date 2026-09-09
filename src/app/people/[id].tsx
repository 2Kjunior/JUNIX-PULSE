import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Surface, OnSurface, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Personne</Text>
      <Text style={styles.d}>ID : {id} — Détail complet à l'Étape 12.</Text>
      <Button label="Retour" onPress={() => router.back()} variant="secondary" />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: Surface.base, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  t: { ...Typography.headlineMedium, color: OnSurface.primary },
  d: { ...Typography.bodyMedium, color: OnSurface.variant, textAlign: 'center' },
});

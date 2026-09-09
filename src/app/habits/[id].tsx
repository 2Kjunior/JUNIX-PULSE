import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Surface, OnSurface, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={s.c}>
      <Text style={s.t}>Habitude</Text>
      <Text style={s.d}>ID : {id} — Détail complet à l'Étape 13.</Text>
      <Button label="Retour" onPress={() => router.back()} variant="secondary" />
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Surface.base, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  t: { ...Typography.headlineMedium, color: OnSurface.primary },
  d: { ...Typography.bodyMedium, color: OnSurface.variant, textAlign: 'center' },
});

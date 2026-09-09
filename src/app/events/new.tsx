import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Surface, OnSurface, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
export default function NewEventScreen() {
  return (
    <View style={s.c}>
      <Text style={s.t}>Nouvel événement</Text>
      <Text style={s.d}>Formulaire complet à l'Étape 10.</Text>
      <Button label="Retour" onPress={() => router.back()} variant="secondary" />
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Surface.base, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  t: { ...Typography.headlineMedium, color: OnSurface.primary },
  d: { ...Typography.bodyMedium, color: OnSurface.variant, textAlign: 'center' },
});

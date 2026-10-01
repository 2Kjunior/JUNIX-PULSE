/**
 * SummaryChip — Pill compteur utilisé dans l'en-tête de l'écran Aujourd'hui.
 * Affiche un compteur coloré avec icône et label.
 */

import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '@/app/(tabs)/today-styles';

interface SummaryChipProps {
  count: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export function SummaryChip({ count, label, color, icon, onPress }: SummaryChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: color + '30' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * SummaryChip — Filtre interactif et indicateur de volume pour l'écran Aujourd'hui.
 * Harmonisé pour les modes sombre Midnight Glow et clair crème chaleureuse.
 */

import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { makeTodayStyles } from '@/styles/tabs/today-styles';

interface SummaryChipProps {
  count?: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
}

export function SummaryChip({
  count,
  label,
  color,
  icon,
  selected = false,
  onPress,
}: SummaryChipProps) {
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeTodayStyles);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          borderColor: selected
            ? color
            : isDark
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 0, 0, 0.08)',
          backgroundColor: selected
            ? isDark
              ? color + '33'
              : color + '22'
            : isDark
            ? 'rgba(20, 24, 36, 0.85)'
            : 'rgba(255, 255, 255, 0.95)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${count !== undefined ? ` (${count})` : ''}${selected ? ', sélectionné' : ''}`}
    >
      <Ionicons
        name={icon}
        size={15}
        color={selected ? color : isDark ? color : color}
      />
      {count !== undefined && (
        <Text style={[styles.chipCount, { color }]}>{count}</Text>
      )}
      <Text
        style={[
          styles.chipLabel,
          selected && {
            fontWeight: '700',
            color: isDark ? '#FFFFFF' : '#1E1B4B',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

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
  const { isDark, palette } = useTheme();
  const styles = useThemedStyles(makeTodayStyles);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          borderColor: selected ? color : palette.glass.control.borderColor,
          backgroundColor: selected
            ? isDark
              ? color + '33'
              : color + '22'
            : palette.glass.control.backgroundColor,
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

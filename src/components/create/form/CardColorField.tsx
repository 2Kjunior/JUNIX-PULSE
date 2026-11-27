/**
 * CardColorField: the colour of one card (study 001, 16.11; sheet 043), under « Plus d'options ».
 *
 * The first circle is the colour of its family (« À faire » or « Moment », from the theme); then the
 * 8 colours of the themes. The card, the Planning and the notification take the chosen one.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SWATCH_IDS, SWATCHES, type SwatchId } from '@/constants/color-themes';
import { itemFamilyColor, type ItemFamily } from '@/constants/item-kinds';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

interface CardColorFieldProps {
  family: ItemFamily;
  /** null: the colour of the family. */
  value: SwatchId | null;
  onChange: (value: SwatchId | null) => void;
}

export function CardColorField({ family, value, onChange }: CardColorFieldProps) {
  const t = useT();
  const { palette } = useTheme();
  const familyColor = itemFamilyColor(palette, family);
  const ring = palette.onSurface.primary;

  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: palette.onSurface.primary }]}>{t('itemForm.cardColor')}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('itemForm.cardColor')}>
        <TouchableOpacity
          style={styles.touch}
          onPress={() => onChange(null)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === null }}
          accessibilityLabel={t('itemForm.cardColorFamily')}
          testID="card-color-family"
        >
          <View style={[styles.circle, { backgroundColor: familyColor }, value === null && { borderWidth: 2, borderColor: ring }]}>
            <Ionicons name={value === null ? 'checkmark' : 'sparkles-outline'} size={16} color={palette.mode === 'light' ? '#FFFFFF' : palette.surface.base} />
          </View>
        </TouchableOpacity>
        {SWATCH_IDS.map(id => {
          const selected = value === id;
          const tone = SWATCHES[id][palette.mode];
          return (
            <TouchableOpacity
              key={id}
              style={styles.touch}
              onPress={() => onChange(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(SWATCHES[id].labelKey)}
              testID={`card-color-${id}`}
            >
              <View style={[styles.circle, { backgroundColor: tone.default }, selected && { borderWidth: 2, borderColor: ring }]}>
                {selected ? <Ionicons name="checkmark" size={16} color={tone.on} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.titleMedium,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  touch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

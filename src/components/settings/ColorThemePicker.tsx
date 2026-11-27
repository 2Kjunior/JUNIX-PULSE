/**
 * ColorThemePicker: the colour themes of the settings (study 001, 16.11; sheet 042).
 *
 * Six themes, each a set of three colours (main, « À faire », « Moment »), then « Personnaliser »:
 * touching a line opens the 8 colours under it. The whole app changes at once, which is the preview.
 * « Revenir aux couleurs de Junix » shows only when something differs from Junix.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  COLOR_THEME_IDS,
  COLOR_THEMES,
  DEFAULT_COLOR_CHOICE,
  isDefaultColorChoice,
  resolveThemeColors,
  SWATCH_IDS,
  SWATCHES,
  type ColorChoice,
  type SwatchId,
  type ThemeColors,
} from '@/constants/color-themes';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT, type MessageKey } from '@/i18n';

type Slot = keyof ThemeColors;

const SLOTS: readonly { slot: Slot; labelKey: MessageKey }[] = [
  { slot: 'primary', labelKey: 'settingsScreen.mainColor' },
  { slot: 'todo', labelKey: 'settingsScreen.todoColor' },
  { slot: 'moment', labelKey: 'settingsScreen.momentColor' },
];

interface ColorThemePickerProps {
  choice: ColorChoice;
  onChange: (choice: ColorChoice) => void;
}

/** One colour changed by hand; back to the theme's own colour, it is no longer an exception. */
export function withSlot(choice: ColorChoice, slot: Slot, swatch: SwatchId): ColorChoice {
  const next: { -readonly [K in keyof ColorChoice]: ColorChoice[K] } = { ...choice, [slot]: swatch };
  if (COLOR_THEMES[choice.theme][slot] === swatch) delete next[slot];
  return next;
}

export function ColorThemePicker({ choice, onChange }: ColorThemePickerProps) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeColorThemePickerStyles);
  const [open, setOpen] = useState<Slot | null>(null);
  const colors = resolveThemeColors(choice);
  const tone = (id: SwatchId) => SWATCHES[id][palette.mode].default;

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{t('settingsScreen.theme')}</Text>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={t('settingsScreen.theme')}>
        {COLOR_THEME_IDS.map(id => {
          const theme = COLOR_THEMES[id];
          const selected = choice.theme === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.tile, selected && styles.tileActive]}
              onPress={() => onChange({ theme: id })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(theme.labelKey)}
              testID={`color-theme-${id}`}
            >
              <View style={styles.dots}>
                {[theme.primary, theme.todo, theme.moment].map((swatch, index) => (
                  <View key={index} style={[styles.dot, { backgroundColor: tone(swatch) }]} />
                ))}
              </View>
              <Text style={[styles.tileText, selected && styles.tileTextActive]} numberOfLines={1}>
                {t(theme.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, styles.labelApart]}>{t('settingsScreen.customize')}</Text>
      {SLOTS.map(({ slot, labelKey }) => {
        const expanded = open === slot;
        return (
          <View key={slot} style={styles.slot}>
            <TouchableOpacity
              style={styles.slotRow}
              onPress={() => setOpen(expanded ? null : slot)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${t(labelKey)}, ${t(SWATCHES[colors[slot]].labelKey)}`}
              testID={`color-slot-${slot}`}
            >
              <Text style={styles.slotLabel}>{t(labelKey)}</Text>
              <Text style={styles.slotValue}>{t(SWATCHES[colors[slot]].labelKey)}</Text>
              <View style={[styles.slotDot, { backgroundColor: tone(colors[slot]) }]} />
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.onSurface.variant} />
            </TouchableOpacity>
            {expanded ? (
              <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel={t(labelKey)}>
                {SWATCH_IDS.map(id => {
                  const selected = colors[slot] === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={styles.swatchTouch}
                      onPress={() => onChange(withSlot(choice, slot, id))}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(SWATCHES[id].labelKey)}
                      testID={`color-${slot}-${id}`}
                    >
                      <View style={[styles.swatch, { backgroundColor: tone(id) }, selected && styles.swatchActive]}>
                        {selected ? <Ionicons name="checkmark" size={18} color={SWATCHES[id][palette.mode].on} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}

      {!isDefaultColorChoice(choice) ? (
        <TouchableOpacity
          style={styles.reset}
          onPress={() => onChange(DEFAULT_COLOR_CHOICE)}
          accessibilityRole="button"
          testID="color-reset"
        >
          <Ionicons name="refresh" size={16} color={palette.primary.default} />
          <Text style={styles.resetText}>{t('settingsScreen.resetColors')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function makeColorThemePickerStyles(theme: ThemePalette) {
  const line = theme.mode === 'light' ? theme.outline.variant : 'rgba(255, 255, 255, 0.10)';
  return StyleSheet.create({
    root: {
      paddingTop: Spacing.md,
      marginTop: Spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: line,
    },
    label: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
      marginBottom: Spacing.sm,
    },
    labelApart: {
      marginTop: Spacing.md,
      marginBottom: 0,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    tile: {
      flexGrow: 1,
      flexBasis: '30%',
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: line,
    },
    tileActive: {
      borderWidth: 2,
      borderColor: theme.primary.default,
    },
    dots: {
      flexDirection: 'row',
      gap: 3,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    tileText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    tileTextActive: {
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    slot: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: line,
    },
    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 48,
    },
    slotLabel: {
      ...Typography.bodyMedium,
      color: theme.onSurface.primary,
      flex: 1,
    },
    slotValue: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    slotDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    swatches: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingBottom: Spacing.sm,
    },
    swatchTouch: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchActive: {
      borderWidth: 2,
      borderColor: theme.onSurface.primary,
    },
    reset: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      marginTop: Spacing.xs,
    },
    resetText: {
      ...Typography.labelLarge,
      color: theme.primary.default,
      fontWeight: '600',
    },
  });
}

/**
 * PersonTimeFields: where a person lives and when they accept to be called.
 *
 * A timezone (a city from the list) and, once it is set, an optional window: the days of the
 * week and an hour range, in the local time of the person. Used by the form that adds a person
 * and by the card on the person screen. It only edits a value: the caller saves it.
 */

import { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COMMON_TIMEZONES, timezoneCity, timezoneLabel } from '@/constants/timezones';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { PersonAvailability } from '@/domain/entities';
import { DEFAULT_AVAILABILITY, formatMinutes } from '@/domain/rules/person-availability-rules';
import { useLanguage, useT } from '@/i18n';
import { WEEKDAY_KEYS, WEEKDAY_SHORT_KEYS } from '@/i18n/weekdays';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export interface PersonTimeValue {
  timezone?: string;
  availability?: PersonAvailability;
}

interface PersonTimeFieldsProps {
  value: PersonTimeValue;
  onChange: (next: PersonTimeValue) => void;
}

/** Monday first, as the days are numbered. */
const DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

const STEP_MINUTES = 30;
const MIN_WINDOW_MINUTES = STEP_MINUTES;

export function PersonTimeFields({ value, onChange }: PersonTimeFieldsProps) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const styles = useThemedStyles(makePersonTimeStyles);
  const [listOpen, setListOpen] = useState(false);

  const { timezone, availability } = value;

  const setZone = (zone: string | undefined) => {
    // Without a zone a window means nothing
    onChange(zone ? { timezone: zone, availability } : { timezone: undefined, availability: undefined });
    setListOpen(false);
  };

  const setWindow = (next: PersonAvailability | undefined) => onChange({ timezone, availability: next });

  const toggleDay = (day: number) => {
    if (!availability) return;
    const has = availability.days.includes(day);
    // At least one day stays: a window with no day would never open
    if (has && availability.days.length === 1) return;
    const days = has ? availability.days.filter(item => item !== day) : [...availability.days, day].sort((a, b) => a - b);
    setWindow({ ...availability, days });
  };

  const moveStart = (delta: number) => {
    if (!availability) return;
    const start = Math.max(0, Math.min(availability.endMinutes - MIN_WINDOW_MINUTES, availability.startMinutes + delta));
    setWindow({ ...availability, startMinutes: start });
  };

  const moveEnd = (delta: number) => {
    if (!availability) return;
    const end = Math.min(24 * 60, Math.max(availability.startMinutes + MIN_WINDOW_MINUTES, availability.endMinutes + delta));
    setWindow({ ...availability, endMinutes: end });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('personTime.where')}</Text>
      <TouchableOpacity
        style={styles.select}
        onPress={() => setListOpen(open => !open)}
        accessibilityRole="button"
        accessibilityLabel={t('personTime.pickA11y')}
        testID="person-timezone-select"
      >
        <Ionicons name="earth-outline" size={20} color={palette.primary.default} />
        <Text style={[styles.selectText, !timezone && styles.selectPlaceholder]}>
          {timezone ? timezoneLabel(timezone, language) : t('personTime.pick')}
        </Text>
        <Ionicons name={listOpen ? 'chevron-up' : 'chevron-down'} size={16} color={palette.onSurface.variant} />
      </TouchableOpacity>

      {listOpen && (
        <View style={styles.chipWrap}>
          {COMMON_TIMEZONES.map(option => {
            const selected = option.value === timezone;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setZone(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{timezoneCity(option, language)}</Text>
              </TouchableOpacity>
            );
          })}
          {!!timezone && (
            <TouchableOpacity style={styles.chip} onPress={() => setZone(undefined)} accessibilityRole="button">
              <Text style={styles.chipText}>{t('personTime.none')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!!timezone && (
        <View style={styles.windowBlock}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('personTime.specify')}</Text>
              <Text style={styles.hint}>{t('personTime.specifyHint')}</Text>
            </View>
            <Switch
              value={!!availability}
              onValueChange={on => setWindow(on ? DEFAULT_AVAILABILITY : undefined)}
              trackColor={{ false: palette.outline.variant, true: palette.primary.container }}
              thumbColor={availability ? palette.primary.default : palette.onSurface.disabled}
              testID="person-availability-switch"
            />
          </View>

          {!!availability && (
            <>
              <View style={styles.dayRow}>
                {DAYS.map(day => {
                  const selected = availability.days.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, selected && styles.chipActive]}
                      onPress={() => toggleDay(day)}
                      accessibilityRole="button"
                      accessibilityLabel={t(WEEKDAY_KEYS[day - 1])}
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {t(WEEKDAY_SHORT_KEYS[day - 1])}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.hoursRow}>
                <Stepper
                  label={t('personTime.from')}
                  text={formatMinutes(availability.startMinutes)}
                  onLess={() => moveStart(-STEP_MINUTES)}
                  onMore={() => moveStart(STEP_MINUTES)}
                />
                <Stepper
                  label={t('personTime.to')}
                  text={formatMinutes(availability.endMinutes)}
                  onLess={() => moveEnd(-STEP_MINUTES)}
                  onMore={() => moveEnd(STEP_MINUTES)}
                />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

interface StepperProps {
  label: string;
  text: string;
  onLess: () => void;
  onMore: () => void;
}

function Stepper({ label, text, onLess, onMore }: StepperProps) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makePersonTimeStyles);
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onLess}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${t('personTime.earlier')}`}
      >
        <Ionicons name="remove" size={18} color={palette.primary.default} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{text}</Text>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${t('personTime.later')}`}
      >
        <Ionicons name="add" size={18} color={palette.primary.default} />
      </TouchableOpacity>
    </View>
  );
}

export const makePersonTimeStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    wrap: { gap: Spacing.sm },
    label: { ...Typography.labelMedium, color: theme.onSurface.variant },
    select: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      minHeight: 48,
    },
    selectText: { ...Typography.bodyMedium, color: theme.onSurface.primary, flex: 1 },
    selectPlaceholder: { color: theme.onSurface.disabled },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    chipActive: {
      backgroundColor: theme.primary.container,
      borderColor: theme.primary.default,
    },
    chipText: { ...Typography.labelMedium, color: theme.onSurface.variant },
    chipTextActive: { color: theme.primary.onContainer, fontWeight: '700' },
    windowBlock: { gap: Spacing.md, marginTop: Spacing.xs },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    switchLabel: { ...Typography.bodyMedium, color: theme.onSurface.primary },
    hint: { ...Typography.labelSmall, color: theme.onSurface.variant },
    dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    hoursRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    stepperLabel: { ...Typography.labelMedium, color: theme.onSurface.variant, width: 20 },
    stepperBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    stepperValue: { ...Typography.bodyMedium, color: theme.onSurface.primary, minWidth: 52, textAlign: 'center' },
  });

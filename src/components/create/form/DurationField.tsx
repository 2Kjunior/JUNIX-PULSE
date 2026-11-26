/**
 * "Temps pour le faire" (study 001, 16.8 C; sheet 033): Aucun, four shortcuts (30 min, 1 h, 2 h,
 * 4 h) and "Autre", which opens a glass window to set hours and minutes, up to 12 h. A time that
 * is not a shortcut (5 h, or 45 min from before) shows on "Autre".
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import { GlassDialog } from '@/components/feedback/GlassDialog';
import { Button } from '@/components/ui/Button';
import type { ThemePalette } from '@/constants/palettes';
import { Spacing, Typography } from '@/constants/theme';
import { DURATION_SHORTCUTS, durationParts, isShortcut, stepDuration } from '@/domain/rules/duration-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

const OTHER = -1;

/** "45 min", "1 h", "1 h 30", "5 h". */
export function useDurationLabel() {
  const t = useT();
  return (minutes: number | undefined) => {
    if (minutes === undefined) return t('form.none');
    const parts = durationParts(minutes);
    if (parts.hours === 0) return t('duration.minutes', { m: parts.minutes });
    if (parts.minutes === 0) return t('duration.hours', { h: parts.hours });
    return t('duration.hoursMinutes', { h: parts.hours, m: String(parts.minutes).padStart(2, '0') });
  };
}

export function DurationField({
  value,
  onChange,
  accent,
  hint,
  testIDPrefix = 'todo-duration',
}: {
  value: number | undefined;
  onChange: (minutes: number | undefined) => void;
  accent: string;
  hint?: string;
  testIDPrefix?: string;
}) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const label = useDurationLabel();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? 90);

  const custom = !isShortcut(value);
  const options: Choice<number | undefined>[] = [
    { value: undefined, label: t('form.none') },
    ...DURATION_SHORTCUTS.map(minutes => ({ value: minutes, label: label(minutes) })),
    { value: OTHER, label: custom && value !== undefined ? label(value) : t('duration.other'), icon: 'create-outline' },
  ];

  const parts = durationParts(draft);
  const stepper = (part: 'hours' | 'minutes', shown: string) => (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{t(part === 'hours' ? 'duration.hoursLabel' : 'duration.minutesLabel')}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => setDraft(current => stepDuration(current, part, -1))}
          accessibilityRole="button"
          accessibilityLabel={t('duration.less')}
          testID={`${testIDPrefix}-${part}-less`}
        >
          <Ionicons name="remove" size={22} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{shown}</Text>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => setDraft(current => stepDuration(current, part, 1))}
          accessibilityRole="button"
          accessibilityLabel={t('duration.more')}
          testID={`${testIDPrefix}-${part}-more`}
        >
          <Ionicons name="add" size={22} color={palette.onSurface.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View>
      <FieldLabel label={t('taskNew.durationHeader')} hint={hint} />
      <ChoiceChips
        options={options}
        value={custom ? OTHER : value}
        onChange={next => {
          if (next === OTHER) {
            setDraft(value ?? 90);
            setOpen(true);
          } else onChange(next);
        }}
        accent={accent}
        testIDPrefix={testIDPrefix}
      />
      <GlassDialog visible={open} onDismiss={() => setOpen(false)} testID={`${testIDPrefix}-other`}>
        <Text style={styles.title}>{t('taskNew.durationHeader')}</Text>
        <View style={styles.steppers}>
          {stepper('hours', String(parts.hours))}
          {stepper('minutes', String(parts.minutes).padStart(2, '0'))}
        </View>
        <Text style={styles.total}>{draft > 0 ? label(draft) : t('form.none')}</Text>
        <Text style={styles.note}>{t('duration.longer')}</Text>
        <View style={styles.actions}>
          <Button label={t('common.cancel')} onPress={() => setOpen(false)} variant="secondary" style={styles.action} />
          <Button
            label={t('soundSettings.choose')}
            onPress={() => {
              onChange(draft > 0 ? draft : undefined);
              setOpen(false);
            }}
            style={styles.action}
            testID={`${testIDPrefix}-other-choose`}
          />
        </View>
      </GlassDialog>
    </View>
  );
}

function makeStyles(theme: ThemePalette) {
  return StyleSheet.create({
    title: { ...Typography.titleMedium, color: theme.onSurface.primary, marginBottom: Spacing.md },
    steppers: { flexDirection: 'row', gap: Spacing.md },
    stepper: { flex: 1, alignItems: 'center', gap: Spacing.xs },
    stepperLabel: { ...Typography.bodyMedium, color: theme.onSurface.variant },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    stepButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    stepValue: { fontSize: 28, fontWeight: '600', minWidth: 44, textAlign: 'center', color: theme.onSurface.primary, fontVariant: ['tabular-nums'] },
    total: { ...Typography.bodyLarge, textAlign: 'center', color: theme.primary.default, marginTop: Spacing.md },
    note: { ...Typography.bodyMedium, textAlign: 'center', color: theme.onSurface.variant, marginTop: Spacing.xs, marginBottom: Spacing.md },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    action: { flex: 1 },
  });
}

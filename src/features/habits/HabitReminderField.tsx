/**
 * "Remind me" on a habit (sheet 019): a switch and the time it rings, every day it is still due.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { SwitchRow } from '@/components/create/form/FormBricks';
import { Spacing, Typography } from '@/constants/theme';
import { parseReminderTime } from '@/domain/rules/habit-notification-rules';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';

const pad = (value: number) => String(value).padStart(2, '0');
const DEFAULT_TIME = '08:00';

export function HabitReminderField({ value, onChange }: { value?: string; onChange: (value: string | undefined) => void }) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const [picking, setPicking] = useState(false);
  const time = parseReminderTime(value) ?? parseReminderTime(DEFAULT_TIME)!;

  return (
    <View style={{ gap: Spacing.xs, marginTop: Spacing.sm }} testID="habit-reminder">
      <SwitchRow
        label={t('habitReminder.label')}
        hint={t('habitReminder.hint')}
        value={Boolean(value)}
        onChange={on => onChange(on ? (value ?? DEFAULT_TIME) : undefined)}
        accent={palette.primary.default}
        testID="habit-reminder-switch"
      />
      {value ? (
        <TouchableOpacity
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={t('habitReminder.at', { time: value })}
          testID="habit-reminder-time"
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
        >
          <Ionicons name="time-outline" size={18} color={palette.primary.default} />
          <Text style={{ ...Typography.bodyLarge, color: palette.onSurface.primary }}>{t('habitReminder.at', { time: value })}</Text>
          <Ionicons name="chevron-forward" size={16} color={palette.onSurface.variant} />
        </TouchableOpacity>
      ) : null}
      <DateTimePickerModal
        isVisible={picking}
        mode="time"
        date={new Date(2000, 0, 1, time.hour, time.minute)}
        onConfirm={picked => {
          setPicking(false);
          onChange(`${pad(picked.getHours())}:${pad(picked.getMinutes())}`);
        }}
        onCancel={() => setPicking(false)}
        locale={language === 'fr' ? 'fr_FR' : 'en_US'}
      />
    </View>
  );
}

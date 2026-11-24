/**
 * The default level of each family in the settings (study 001, 12.8; sheet 023): reminders,
 * deadlines, moments and habits, each Discrète · Normale · Alarme. What is chosen on an item
 * comes first; the type of a moment, the urgency and the night move these defaults.
 */
import React from 'react';
import { View } from 'react-native';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import { Spacing } from '@/constants/theme';
import type { AlertLevel } from '@/domain/entities';
import { ALERT_FAMILIES, type AlertDefaults, type AlertFamily } from '@/domain/rules/notification-level-rules';
import { useTheme } from '@/hooks/use-theme';
import { useT, type MessageKey } from '@/i18n';

const FAMILY_LABELS: Readonly<Record<AlertFamily, MessageKey>> = {
  reminder: 'alertDefaults.reminder',
  deadline: 'alertDefaults.deadline',
  moment: 'alertDefaults.moment',
  habit: 'alertDefaults.habit',
};

export function AlertDefaultsSetting({
  value,
  onChange,
}: {
  value: AlertDefaults;
  onChange: (family: AlertFamily, level: AlertLevel) => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const options: Choice<AlertLevel>[] = [
    { value: 'discreet', label: t('alertLevel.discreet'), icon: 'notifications-off-outline' },
    { value: 'normal', label: t('alertLevel.normal'), icon: 'notifications-outline' },
    { value: 'alarm', label: t('alertLevel.alarm'), icon: 'alarm-outline' },
  ];
  return (
    <View style={{ gap: Spacing.sm }}>
      {ALERT_FAMILIES.map(family => (
        <View key={family}>
          <FieldLabel label={t(FAMILY_LABELS[family])} />
          <ChoiceChips
            options={options}
            value={value[family]}
            onChange={level => onChange(family, level)}
            accent={palette.primary.default}
            testIDPrefix={`alert-default-${family}`}
          />
        </View>
      ))}
    </View>
  );
}

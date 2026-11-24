/**
 * "How it warns you": Auto · Discrète · Normale · Alarme (study 001, 6-B; sheet 023). Shared by
 * the "To do" form (a reminder) and the "Moment" form. Auto follows the settings, the type of the
 * moment, the urgency and the night; a chosen level is kept, except that the night lowers it
 * one step (not the alarm).
 */
import React from 'react';
import { View } from 'react-native';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import type { AlertLevel } from '@/domain/entities';
import { useT } from '@/i18n';

type Value = AlertLevel | 'auto';

export function AlertLevelField({
  value,
  onChange,
  accent,
  testIDPrefix,
}: {
  value: AlertLevel | null;
  onChange: (level: AlertLevel | null) => void;
  accent: string;
  testIDPrefix?: string;
}) {
  const t = useT();
  const current: Value = value ?? 'auto';
  const options: Choice<Value>[] = [
    { value: 'auto', label: t('alertLevel.auto'), icon: 'sparkles-outline' },
    { value: 'discreet', label: t('alertLevel.discreet'), icon: 'notifications-off-outline' },
    { value: 'normal', label: t('alertLevel.normal'), icon: 'notifications-outline' },
    { value: 'alarm', label: t('alertLevel.alarm'), icon: 'alarm-outline' },
  ];
  return (
    <View>
      <FieldLabel label={t('alertLevel.label')} hint={t('alertLevel.hint')} />
      <ChoiceChips
        options={options}
        value={current}
        onChange={next => onChange(next === 'auto' ? null : next)}
        accent={accent}
        testIDPrefix={testIDPrefix}
      />
    </View>
  );
}

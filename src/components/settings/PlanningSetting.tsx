/**
 * The Planning setting (sheets 028 and 029): the step a card moves by, saved at once.
 * The first day of the week follows the language of the app, and the Planning opens on the view
 * used last: the app takes care of them, nothing to choose.
 */
import React from 'react';
import { View } from 'react-native';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import { DRAG_STEPS, type DragStep, type PlanningPrefs } from '@/domain/rules/planning-settings-rules';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export function PlanningSetting({ value, onChange }: { value: PlanningPrefs; onChange: (next: PlanningPrefs) => void }) {
  const t = useT();
  const { palette } = useTheme();
  const steps: Choice<`${DragStep}`>[] = DRAG_STEPS.map(step => ({
    value: `${step}` as `${DragStep}`,
    label: t('planningSettings.minutes', { minutes: step }),
  }));
  return (
    <View>
      <FieldLabel label={t('planningSettings.dragStep')} />
      <ChoiceChips
        options={steps}
        value={`${value.dragStep}` as `${DragStep}`}
        onChange={step => onChange({ ...value, dragStep: Number(step) as DragStep })}
        accent={palette.primary.default}
        testIDPrefix="planning-drag-step"
      />
    </View>
  );
}

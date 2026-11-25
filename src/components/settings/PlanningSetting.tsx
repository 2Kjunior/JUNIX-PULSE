/**
 * The Planning settings (study 001, 12.8; sheet 028): the view it opens on, the first day of the
 * week, and the step a card moves by. Each choice is saved at once; the Planning reads them the
 * next time it is shown.
 */
import React from 'react';
import { View } from 'react-native';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import { Spacing } from '@/constants/theme';
import { DRAG_STEPS, type DragStep, type PlanningPrefs, type PlanningView } from '@/domain/rules/planning-settings-rules';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export function PlanningSetting({ value, onChange }: { value: PlanningPrefs; onChange: (next: PlanningPrefs) => void }) {
  const t = useT();
  const { palette } = useTheme();
  const views: Choice<PlanningView>[] = [
    { value: 'agenda', label: t('calendar.view.agenda'), icon: 'list-outline' },
    { value: 'timetable', label: t('calendar.view.day'), icon: 'today-outline' },
    { value: 'week', label: t('calendar.view.week'), icon: 'calendar-outline' },
    { value: 'month', label: t('planning.view.month'), icon: 'grid-outline' },
  ];
  const starts: Choice<'1' | '0'>[] = [
    { value: '1', label: t('planningSettings.monday') },
    { value: '0', label: t('planningSettings.sunday') },
  ];
  const steps: Choice<`${DragStep}`>[] = DRAG_STEPS.map(step => ({
    value: `${step}` as `${DragStep}`,
    label: t('planningSettings.minutes', { minutes: step }),
  }));
  return (
    <View style={{ gap: Spacing.sm }}>
      <View>
        <FieldLabel label={t('planningSettings.openView')} />
        <ChoiceChips
          options={views}
          value={value.openView}
          onChange={openView => onChange({ ...value, openView })}
          accent={palette.primary.default}
          testIDPrefix="planning-open-view"
        />
      </View>
      <View>
        <FieldLabel label={t('planningSettings.weekStart')} />
        <ChoiceChips
          options={starts}
          value={`${value.weekStart}` as '1' | '0'}
          onChange={start => onChange({ ...value, weekStart: start === '0' ? 0 : 1 })}
          accent={palette.primary.default}
          testIDPrefix="planning-week-start"
        />
      </View>
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
    </View>
  );
}

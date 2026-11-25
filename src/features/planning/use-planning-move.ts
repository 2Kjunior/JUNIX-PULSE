/**
 * What happens when a card is let go in the Planning (study 001, 12.4; sheet 026):
 * a repeating reminder asks first ("Déplacer toutes les répétitions ?"), then the move is saved
 * at once and a banner "Déplacé à 19:15 · Annuler" stays a few seconds. Nothing is lost.
 */
import { format } from 'date-fns';
import { useCallback } from 'react';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import type { Event, Reminder, Task } from '@/domain/entities';
import { useDateLocale, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { moveEvent, moveReminder, moveTask, repeatOf, type Undo } from '@/use-cases/planning-move-use-cases';

/** How long the banner with "Annuler" stays. */
export const MOVE_UNDO_MS = 6000;

export function usePlanningMove(reload: () => void | Promise<void>, step?: number) {
  const t = useT();
  const dateLocale = useDateLocale();
  const { showSnackbar } = useAppStore();

  const done = useCallback(
    async (result: { undo: Undo; start: Date } | null, withTime: boolean) => {
      if (!result) return;
      await reload();
      const when = withTime
        ? format(result.start, 'EEE d MMM, HH:mm', { locale: dateLocale })
        : format(result.start, 'EEEE d MMMM', { locale: dateLocale });
      showSnackbar(t('planning.moved', { when }), {
        actionLabel: t('planning.undo'),
        durationMs: MOVE_UNDO_MS,
        onAction: () => {
          void result
            .undo()
            .then(() => reload())
            .catch(() => showSnackbar(t('common.genericError')));
        },
      });
    },
    [reload, showSnackbar, t, dateLocale]
  );

  const failed = useCallback(() => {
    showSnackbar(t('common.genericError'));
    void reload();
  }, [reload, showSnackbar, t]);

  const moveEventBy = useCallback(
    (event: Event, minutes: number, days: number) => {
      moveEvent(event, minutes, days, step).then(result => done(result, true), failed);
    },
    [done, failed, step]
  );

  const moveReminderBy = useCallback(
    (reminder: Reminder, minutes: number, days: number) => {
      void repeatOf(reminder)
        .then(repeat => {
          const go = () => moveReminder(reminder, minutes, days, repeat, step).then(result => done(result, true), failed);
          if (!repeat) return go();
          GlassAlert.alert(t('planning.seriesTitle'), t('planning.seriesBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('planning.seriesMove'), onPress: () => void go() },
          ]);
        })
        .catch(failed);
    },
    [done, failed, t, step]
  );

  const moveTaskTo = useCallback(
    (task: Task, day: Date) => {
      moveTask(task, day).then(result => done(result, false), failed);
    },
    [done, failed]
  );

  return { moveEventBy, moveReminderBy, moveTaskTo };
}

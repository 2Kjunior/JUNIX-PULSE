/**
 * The gestures of "Maintenant", the same on the home card and on the full screen: Fait, Plus
 * tard and Alléger, each said back in a snackbar; Alléger asks first and can be undone.
 */

import { format, isToday } from 'date-fns';
import { useCallback } from 'react';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import type { NowItem } from '@/domain/rules/now-rules';
import { useDateLocale, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { NowUseCases } from '@/use-cases/now-use-cases';

export function useNowActions(onChanged: () => void) {
  const t = useT();
  const showSnackbar = useAppStore(state => state.showSnackbar);

  const done = useCallback(
    async (item: NowItem) => {
      try {
        await NowUseCases.done(item);
        showSnackbar(t('now.doneSnack', { title: item.title }));
      } catch {
        showSnackbar(t('now.error'));
      }
      onChanged();
    },
    [onChanged, showSnackbar, t]
  );

  const later = useCallback(
    async (item: NowItem) => {
      try {
        await NowUseCases.later(item);
        showSnackbar(t(item.kind === 'reminder' ? 'now.laterReminderSnack' : 'now.laterTaskSnack', { title: item.title }));
      } catch {
        showSnackbar(t('now.error'));
      }
      onChanged();
    },
    [onChanged, showSnackbar, t]
  );

  const lighten = useCallback(
    (count: number) => {
      GlassAlert.alert(
        t('now.lightenTitle'),
        t(count === 1 ? 'now.lightenBodyOne' : 'now.lightenBodyMany', { count }),
        [
          { text: t('form.cancel'), style: 'cancel' },
          {
            text: t('now.lighten'),
            onPress: async () => {
              try {
                const result = await NowUseCases.lighten();
                showSnackbar(t(result.count === 1 ? 'now.lightenedOne' : 'now.lightenedMany', { count: result.count }), {
                  actionLabel: t('common.undo30'),
                  onAction: async () => {
                    await result.undo();
                    onChanged();
                  },
                  durationMs: 30000,
                });
              } catch {
                showSnackbar(t('now.error'));
              }
              onChanged();
            },
          },
        ]
      );
    },
    [onChanged, showSnackbar, t]
  );

  return { done, later, lighten };
}

/** "Rappel · 10:30", "En retard · 9:00", "En retard · 5 nov." or "Tâche du jour". */
export function useNowSubtitle() {
  const t = useT();
  const locale = useDateLocale();
  return useCallback(
    (item: NowItem) => {
      if (item.kind === 'task') return t('now.task');
      if (!item.overdue) return t('now.reminder', { time: format(item.at, 'HH:mm') });
      return isToday(item.at)
        ? t('now.reminderLate', { time: format(item.at, 'HH:mm') })
        : t('now.reminderOtherDay', { day: format(item.at, 'd MMM', { locale }) });
    },
    [locale, t]
  );
}

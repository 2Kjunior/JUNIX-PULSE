/**
 * The time-driven message the mascot has for the home screen right now, if any: the morning
 * briefing, the evening review, and the warnings before an event. Each is shown once a day.
 * It re-checks when the screen is focused and every minute while it stays focused, never in
 * the background.
 *
 * It follows the user's settings: nothing when the mascot is off, no briefings when they are off.
 * The planning blocks are not shown here yet.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { format } from 'date-fns';

import { dueMascotTimeTriggers, MascotTimeTrigger } from '@/domain/rules/mascot-time-rules';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { triggerToMascotMessage } from '@/domain/rules/mascot-trigger-message-rules';
import { EventRepository } from '@/repositories/event-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { loadFiredKeys, markTriggerFired } from '@/services/mascot/mascot-fired-store';
import { getMascotFocusState, getMascotPreferences, getMascotSettings } from '@/services/mascot/mascot-runtime';

const CHECK_EVERY_MS = 60 * 1000;

export interface MascotTimeMessage {
  key: string;
  text: string;
}

export interface UseMascotTimeTriggerResult {
  message: MascotTimeMessage | null;
  /** The user has seen it: it will not come back today. */
  dismiss: () => void;
}

export function useMascotTimeTrigger(displayName: string | null | undefined): UseMascotTimeTriggerResult {
  const [message, setMessage] = useState<MascotTimeMessage | null>(null);
  const dayRef = useRef('');
  const nameRef = useRef(displayName);
  nameRef.current = displayName;

  const evaluate = useCallback(async () => {
    try {
      const now = new Date();
      const day = format(now, 'yyyy-MM-dd');
      dayRef.current = day;

      // A silent mascot says nothing, and keeps its triggers for when it is switched back on
      const { presence, briefings } = getMascotSettings();
      if (presence === 'off') {
        setMessage(null);
        return;
      }

      const [settings, events, reminders, tasks, firedKeys] = await Promise.all([
        SettingsRepository.get(),
        EventRepository.findForDate(day),
        ReminderRepository.findAll(),
        TaskRepository.findAllForDate(day),
        loadFiredKeys(day),
      ]);

      const remindersToday = reminders.filter(
        r => r.status !== 'DELETED' && r.status !== 'COMPLETED' && format(new Date(r.scheduledAt), 'yyyy-MM-dd') === day
      ).length;
      const tasksDone = tasks.filter(task => task.status === 'COMPLETED').length;

      const due = dueMascotTimeTriggers({
        now: now.getTime(),
        hour: now.getHours(),
        dayKey: day,
        morningBriefingHour: settings.morningBriefingHour,
        endOfDayHour: settings.endOfDayHour,
        briefingsEnabled: briefings,
        focusState: getMascotFocusState(),
        events: events.map(event => ({
          id: event.id,
          startAt: new Date(event.startAt).getTime(),
          travelBufferMinutes: event.travelBufferMinutes ?? 0,
          hasLocation: Boolean(event.location),
        })),
        blocks: [],
        todayTaskTotal: tasks.length,
        todayTaskCompleted: tasksDone,
        firedKeys,
      });

      const context = {
        remindersToday,
        tasksTotal: tasks.length,
        tasksDone,
        events: Object.fromEntries(
          events.map(event => [
            event.id,
            { title: event.title, startAt: new Date(event.startAt).getTime(), location: event.location },
          ])
        ),
      };

      // A trigger with nothing to say is settled, so it does not hold the next one back
      let chosen: MascotTimeMessage | null = null;
      for (const trigger of due as MascotTimeTrigger[]) {
        const spoken = triggerToMascotMessage(trigger, context);
        if (!spoken) {
          await markTriggerFired(day, trigger.key);
          continue;
        }
        const text = resolveMascotMessage(spoken.id, spoken.params, getMascotPreferences(), nameRef.current);
        if (text) {
          chosen = { key: trigger.key, text };
          break;
        }
      }
      setMessage(current => (current?.key === chosen?.key ? current : chosen));
    } catch {
      // The mascot is decoration: on any failure it simply says nothing
      setMessage(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      evaluate();
      const timer = setInterval(evaluate, CHECK_EVERY_MS);
      return () => clearInterval(timer);
    }, [evaluate])
  );

  const dismiss = useCallback(() => {
    setMessage(current => {
      if (current) void markTriggerFired(dayRef.current, current.key);
      return null;
    });
    // Another trigger may be waiting
    setTimeout(() => void evaluate(), 0);
  }, [evaluate]);

  return { message, dismiss };
}

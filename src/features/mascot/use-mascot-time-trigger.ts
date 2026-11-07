/**
 * The time-driven message the mascot has for the home screen right now, if any: the morning
 * briefing, the evening review, and the warnings before an event. Each is shown once a day.
 * It re-checks when the screen is focused and every minute while it stays focused, never in
 * the background.
 *
 * It follows the user's settings: nothing when the mascot is off, no briefings when they are off.
 * The planning blocks of today announce their start: a Focus for work and study, sport for sport.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { format } from 'date-fns';

import { dueMascotTimeTriggers, MascotTimeTrigger } from '@/domain/rules/mascot-time-rules';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { triggerToMascotMessage } from '@/domain/rules/mascot-trigger-message-rules';
import { EventRepository } from '@/repositories/event-repository';
import { PersonalScheduleRepository } from '@/repositories/personal-schedule-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { loadFiredKeys, markTriggerFired } from '@/services/mascot/mascot-fired-store';
import { deadlineInfo, isDeadlineToAnnounce } from '@/domain/rules/deadline-rules';
import { getMascotFocusState, getMascotPreferences, getMascotSettings } from '@/services/mascot/mascot-runtime';

const CHECK_EVERY_MS = 60 * 1000;

/** The blocks of the active timetable for today, with their start as an instant. */
async function loadTodayBlocks(now: Date) {
  const schedule = await PersonalScheduleRepository.findActiveSchedule();
  if (!schedule) return [];
  const blocks = await PersonalScheduleRepository.getBlocksForDay(schedule.id, now.getDay());
  return blocks.map(block => {
    const [hours, minutes] = block.startTime.split(':').map(Number);
    const startAt = new Date(now);
    startAt.setHours(hours, minutes, 0, 0);
    return { ...block, startAt: startAt.getTime() };
  });
}

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

      const [settings, events, reminders, tasks, firedKeys, blocks, openTasks] = await Promise.all([
        SettingsRepository.get(),
        EventRepository.findForDate(day),
        ReminderRepository.findAll(),
        TaskRepository.findAllForDate(day),
        loadFiredKeys(day),
        loadTodayBlocks(now),
        TaskRepository.findAllActive(),
      ]);
      const dueSoon = openTasks.filter(task => isDeadlineToAnnounce(task.dueDate, false, now));

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
        blocks: blocks.map(block => ({ id: block.id, kind: block.type, startAt: block.startAt })),
        deadlines: dueSoon.map(task => ({ id: task.id, dueDate: task.dueDate as string })),
        todayTaskTotal: tasks.length,
        todayTaskCompleted: tasksDone,
        firedKeys,
      });

      const context = {
        remindersToday,
        tasksTotal: tasks.length,
        tasksDone,
        blocks: Object.fromEntries(blocks.map(block => [block.id, { label: block.label, kind: block.type }])),
        deadlines: Object.fromEntries(
          dueSoon.map(task => [task.id, { title: task.title, daysLeft: deadlineInfo(task.dueDate, now)?.daysLeft ?? 0 }])
        ),
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
        const spoken = triggerToMascotMessage(trigger, context, getMascotPreferences().language);
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

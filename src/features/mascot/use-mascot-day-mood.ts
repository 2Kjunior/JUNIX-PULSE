/**
 * Resting mood of the mascot, computed from the day's local data each time the screen is focused.
 *
 * Not available yet, so they take their neutral value: the running Focus session (the timer is
 * local to its screen) and the days since the last opening (it needs the small persisted store
 * planned for the settings step).
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { format } from 'date-fns';

import {
  buildMascotMoodInput,
  pendingUrgentReminders,
} from '@/domain/rules/mascot-day-rules';
import { deriveMascotMood, MascotMood } from '@/domain/rules/mascot-mood-rules';
import { PersonRepository } from '@/repositories/person-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';

export interface MascotDayMood {
  mood: MascotMood;
  /** The oldest urgent reminder nobody has settled, which a tap on the mascot opens. */
  urgentReminderId: string | null;
}

const NEUTRAL: MascotDayMood = { mood: 'calm', urgentReminderId: null };

export function useMascotDayMood(): MascotDayMood {
  const [state, setState] = useState<MascotDayMood>(NEUTRAL);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const now = new Date();
          const [reminders, todayTasks, persons] = await Promise.all([
            ReminderRepository.findAll(),
            // All of today's tasks, done ones included: the mood needs to know the day is cleared
            TaskRepository.findAllForDate(format(now, 'yyyy-MM-dd')),
            PersonRepository.findAll(),
          ]);

          const input = {
            now,
            focusState: 'idle' as const,
            reminders,
            todayTasks,
            persons,
            daysSinceLastOpen: null,
          };
          const urgent = pendingUrgentReminders(reminders, now);

          if (active) {
            setState({
              mood: deriveMascotMood(buildMascotMoodInput(input)).mood,
              urgentReminderId: urgent.length > 0 ? urgent[0].id : null,
            });
          }
        } catch {
          // The mascot is decoration: on any failure it simply stays calm
          if (active) setState(NEUTRAL);
        }
      }

      load();
      return () => {
        active = false;
      };
    }, [])
  );

  return state;
}

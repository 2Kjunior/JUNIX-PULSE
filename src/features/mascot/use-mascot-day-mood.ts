/**
 * Resting mood of the mascot, computed from the day's local data each time the screen is focused,
 * with the Focus session in progress and, in the first minutes after a launch, the days the app
 * was left unopened.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { format } from 'date-fns';

import {
  birthdaysToWish,
  buildMascotMoodInput,
  pendingUrgentReminders,
} from '@/domain/rules/mascot-day-rules';
import { absenceDaysForMood, deriveMascotMood, MascotMood } from '@/domain/rules/mascot-mood-rules';
import { getMascotFocusState } from '@/services/mascot/mascot-runtime';
import { SessionManager } from '@/services/session/SessionManager';
import { PersonRepository } from '@/repositories/person-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';

export interface MascotDayMood {
  mood: MascotMood;
  /** The oldest urgent reminder nobody has settled, which a tap on the mascot opens. */
  urgentReminderId: string | null;
  /** Someone whose birthday is today and who has not been wished it yet: a tap opens their page. */
  birthdayPerson: { id: string; name: string } | null;
}

const NEUTRAL: MascotDayMood = { mood: 'calm', urgentReminderId: null, birthdayPerson: null };

/** The mood of the day and the urgent reminder, read from the local data now. */
export async function loadMascotDayMood(): Promise<MascotDayMood> {
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
      focusState: getMascotFocusState(),
      reminders,
      todayTasks,
      persons,
      daysSinceLastOpen: absenceDaysForMood(
        SessionManager.getDaysSinceLastOpen(now.getTime()),
        SessionManager.getLaunchedAt(),
        now.getTime()
      ),
    };
    const urgent = pendingUrgentReminders(reminders, now);
    const birthday = birthdaysToWish(persons, now)[0];

    return {
      mood: deriveMascotMood(buildMascotMoodInput(input)).mood,
      urgentReminderId: urgent.length > 0 ? urgent[0].id : null,
      birthdayPerson: birthday ? { id: birthday.id, name: birthday.displayName } : null,
    };
  } catch {
    // The mascot is decoration: on any failure it simply stays calm
    return NEUTRAL;
  }
}

export function useMascotDayMood(): MascotDayMood {
  const [state, setState] = useState<MascotDayMood>(NEUTRAL);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadMascotDayMood().then(next => {
        if (active) setState(next);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  return state;
}

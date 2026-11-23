/**
 * "Make it a habit" (study 001, 15.2; sheet 020): what comes back often becomes a habit, if the
 * user wants. A reminder repeated every day or week, or a task done at least 3 times in 14 days,
 * and not a habit already. One proposal at a time. Pure: tested alone.
 */

import type { SuggestionCandidate } from './mascot-candidate-rules';

export const MAKE_HABIT_MIN_TASKS = 3;
export const MAKE_HABIT_WINDOW_DAYS = 14;

export interface RepeatedReminderFact {
  id: string;
  title: string;
  /** "HH:mm" */
  time: string;
  frequency: 'DAILY' | 'WEEKLY';
}

export interface DoneTaskFact {
  id: string;
  title: string;
  completedAt: string;
}

/** A title as compared: lower case, no accents, single spaces. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeHabitCandidates({
  now,
  repeatedReminders = [],
  recentDoneTasks = [],
  habitTitles = [],
}: {
  now: Date;
  repeatedReminders?: readonly RepeatedReminderFact[];
  recentDoneTasks?: readonly DoneTaskFact[];
  habitTitles?: readonly string[];
}): SuggestionCandidate[] {
  const habits = new Set(habitTitles.map(normalizeTitle));

  // A reminder that repeats: the habit rings at the same time, and replaces it
  const reminder = repeatedReminders.find(item => !habits.has(normalizeTitle(item.title)));
  if (reminder) {
    return [
      {
        type: 'MAKE_HABIT',
        targetId: `reminder:${reminder.id}`,
        targetType: 'reminder',
        title: `Faire de "${reminder.title}" une habitude`,
        explanation: 'Ce rappel revient souvent. Pulse peut en faire une habitude qui sonne à la même heure, et retirer le rappel répété.',
        proposedData: JSON.stringify({
          title: reminder.title,
          source: 'reminder',
          reminderId: reminder.id,
          frequency: reminder.frequency,
          targetDaysPerWeek: reminder.frequency === 'WEEKLY' ? 1 : undefined,
          time: reminder.time,
        }),
      },
    ];
  }

  // A task done often: the same title at least 3 times in 14 days
  const since = now.getTime() - MAKE_HABIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const groups = new Map<string, DoneTaskFact[]>();
  for (const task of recentDoneTasks) {
    const doneAt = new Date(task.completedAt).getTime();
    if (Number.isNaN(doneAt) || doneAt < since || doneAt > now.getTime()) continue;
    const key = normalizeTitle(task.title);
    if (!key || habits.has(key)) continue;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  const often = [...groups.values()]
    .filter(group => group.length >= MAKE_HABIT_MIN_TASKS)
    .sort((a, b) => b.length - a.length)[0];
  if (!often) return [];
  const latest = [...often].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  return [
    {
      type: 'MAKE_HABIT',
      targetId: `task:${normalizeTitle(latest.title)}`,
      targetType: 'task',
      title: `Faire de "${latest.title}" une habitude`,
      explanation: `Cette tâche a été faite ${often.length} fois en ${MAKE_HABIT_WINDOW_DAYS} jours. En faire une habitude ?`,
      proposedData: JSON.stringify({
        title: latest.title,
        source: 'task',
        frequency: 'WEEKLY',
        targetDaysPerWeek: Math.min(7, Math.ceil(often.length / 2)),
      }),
    },
  ];
}

/**
 * Moteur de suggestions proactives.
 * BR-001 : Les suggestions proposent des ajustements (replanification, relance contact, validation).
 * L'utilisateur garde toujours le contrôle final via Accepter / Refuser.
 *
 * À chaque appel, le moteur charge les faits locaux du jour, en déduit les propositions qui ont
 * lieu d'être (règles pures de mascot-candidate-rules), crée les nouvelles et fait expirer celles
 * qui ne sont plus vraies. Une proposition tranchée récemment n'est pas refaite le jour même.
 */

import { addDays, format, startOfDay } from 'date-fns';
import { t } from '../i18n';
import { SuggestionRepository } from '../repositories/suggestion-repository';
import { PersonRepository } from '../repositories/person-repository';
import { ReminderRepository } from '../repositories/reminder-repository';
import { TaskRepository } from '../repositories/task-repository';
import { EventRepository } from '../repositories/event-repository';
import { SettingsRepository } from '../repositories/settings-repository';
import { PersonUseCases } from './person-use-cases';
import { HabitUseCases } from './habit-use-cases';
import { GoalUseCases } from './goal-use-cases';
import { TaskUseCases } from './task-use-cases';
import { createReminder, snoozeReminder } from './reminder-use-cases';
import { Suggestion } from '../domain/entities';
import {
  buildSuggestionCandidates,
  CandidateFacts,
  DECISION_COOLDOWN_MS,
  reconcileSuggestions,
} from '../domain/rules/mascot-candidate-rules';
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
import { SessionManager } from '../services/session/SessionManager';

const DEFAULT_END_OF_DAY_HOUR = 20;
const BIRTHDAY_REMINDER_HOUR = 9;

/** Lit un champ de proposedData, ou undefined si le JSON est absent ou invalide. */
function readProposedData(suggestion: Suggestion): Record<string, unknown> {
  if (!suggestion.proposedData) return {};
  try {
    const value: unknown = JSON.parse(suggestion.proposedData);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

interface LoadedFacts {
  facts: CandidateFacts;
  /** Faux si une lecture a échoué : on ne fait alors rien expirer, par prudence. */
  complete: boolean;
}

/** Charge les faits du jour. Une lecture qui échoue donne une valeur vide, jamais une erreur. */
async function loadCandidateFacts(now: Date): Promise<LoadedFacts> {
  let complete = true;
  const safe = async <T>(read: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await read();
    } catch {
      complete = false;
      return fallback;
    }
  };

  const today = format(now, 'yyyy-MM-dd');
  const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd');

  const [settings, persons, missed, habits, allReminders, todayTasks, tomorrowTasks, inbox, tomorrowEvents, goals] =
    await Promise.all([
      safe(() => SettingsRepository.get(), null),
      safe(() => PersonRepository.findAll(), []),
      safe(() => ReminderRepository.findMissed(), []),
      safe(() => HabitUseCases.getAllHabitsWithStats(), []),
      safe(() => ReminderRepository.findAll(), []),
      safe(() => TaskRepository.findAllForDate(today), []),
      safe(() => TaskRepository.findAllForDate(tomorrow), []),
      safe(() => TaskRepository.findInbox(), []),
      safe(() => EventRepository.findForDate(tomorrow), []),
      safe(() => GoalUseCases.getAllGoalsWithDetails(), []),
    ]);

  const activeReminders = allReminders.filter(r => r.status !== 'DELETED' && r.status !== 'COMPLETED');
  const tomorrowReminders = activeReminders.filter(r => format(new Date(r.scheduledAt), 'yyyy-MM-dd') === tomorrow);
  const waitingReminders = activeReminders.filter(r => r.status === 'MISSED' || r.status === 'TRIGGERED');

  const facts: CandidateFacts = {
    now,
    endOfDayHour: settings?.endOfDayHour ?? DEFAULT_END_OF_DAY_HOUR,
    persons,
    missedReminders: missed,
    habits: habits.map(item => ({
      id: item.habit.id,
      title: item.habit.title,
      active: item.habit.status === 'ACTIVE',
      currentStreak: item.currentStreak,
      completedToday: item.completedToday,
      weekly: item.habit.frequency === 'WEEKLY',
    })),
    todayTasks,
    inboxTasks: inbox.filter(task => !task.scheduledDate),
    tomorrowItemCount:
      tomorrowEvents.length + tomorrowReminders.length + tomorrowTasks.filter(t => t.status !== 'COMPLETED').length,
    tomorrowEvents,
    goals: goals.map(item => ({
      id: item.goal.id,
      title: item.goal.title,
      active: item.goal.status === 'ACTIVE',
      daysLeft: item.daysLeft,
      progress: item.progress,
    })),
    daysSinceLastOpen: SessionManager.getDaysSinceLastOpen(now.getTime()),
    waitingReminderCount: waitingReminders.length,
  };

  return { facts, complete };
}

export const SuggestionUseCases = {
  /**
   * Analyse l'état de l'application, crée les nouvelles suggestions et fait expirer
   * celles qui ne sont plus vraies. Retourne les suggestions en attente.
   */
  async generateSuggestions(): Promise<Suggestion[]> {
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      const { facts, complete } = await loadCandidateFacts(now);
      const candidates = buildSuggestionCandidates(facts);

      const [pending, decided] = await Promise.all([
        SuggestionRepository.findPending(),
        SuggestionRepository.findDecidedSince(new Date(now.getTime() - DECISION_COOLDOWN_MS).toISOString()),
      ]);

      const { toCreate, toExpire } = reconcileSuggestions({ candidates, pending, decided, now });

      if (complete) {
        for (const id of toExpire) {
          await SuggestionRepository.updateStatus(id, 'EXPIRED', nowIso);
        }
      }

      // La plus pressante est créée en dernier : elle ressort en premier (tri par date décroissante)
      for (const [index, candidate] of toCreate.entries()) {
        const generatedAt = new Date(now.getTime() + (toCreate.length - index)).toISOString();
        await SuggestionRepository.create({
          id: `sugg_${candidate.type.toLowerCase()}_${candidate.targetId.replace(/[^A-Za-z0-9]/g, '')}_${now.getTime()}`,
          type: candidate.type,
          status: 'PENDING',
          title: candidate.title,
          explanation: candidate.explanation,
          targetId: candidate.targetId,
          targetType: candidate.targetType,
          proposedData: candidate.proposedData,
          expiresAt: candidate.expiresAt,
          generatedAt,
          createdAt: nowIso,
        });
      }
    } catch {
      // Échec temporaire : on retombe sur ce qui est déjà en attente
    }

    return SuggestionRepository.findPending();
  },

  async acceptSuggestion(id: string): Promise<void> {
    const now = new Date().toISOString();
    const pending = await SuggestionRepository.findPending();
    const sugg = pending.find(s => s.id === id);

    if (sugg) {
      // Exécuter l'action associée si nécessaire
      if (sugg.type === 'FORGOTTEN_CONTACT' && sugg.targetId) {
        await PersonUseCases.logInteraction({
          personId: sugg.targetId,
          type: 'SMS',
          notes: t('useCase.fromSuggestion'),
        });
      } else if (sugg.type === 'HABIT_REMINDER' && sugg.targetId) {
        await HabitUseCases.toggleHabitCompletion(sugg.targetId);
      } else if (sugg.type === 'RESCHEDULE_REMINDER' && sugg.targetId) {
        const rem = await ReminderRepository.findById(sugg.targetId);
        if (rem) {
          await snoozeReminder(rem, { kind: 'tomorrow' });
        }
      } else if (sugg.type === 'POSTPONE_TASK') {
        const ids = readProposedData(sugg).taskIds;
        if (Array.isArray(ids)) {
          const taskIds = ids.filter((item): item is string => typeof item === 'string');
          await TaskUseCases.rescheduleTasks(taskIds, format(addDays(new Date(), 1), 'yyyy-MM-dd'));
        }
      } else if (sugg.type === 'LINGERING_TASK' && sugg.targetId) {
        await TaskUseCases.rescheduleTasks([sugg.targetId], format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      } else if (sugg.type === 'BIRTHDAY_REMINDER') {
        const data = readProposedData(sugg);
        // Le jour même, accepter ouvre la fiche (voir suggestionDestination) : pas de rappel à créer
        if (typeof data.days === 'number' && data.days > 0 && typeof data.person === 'string') {
          const settings = await SettingsRepository.get();
          const date = addDays(startOfDay(new Date()), data.days);
          date.setHours(BIRTHDAY_REMINDER_HOUR, 0, 0, 0);
          await createReminder({
            title: `Anniversaire de ${data.person}`,
            scheduledAt: date,
            timezone: settings.timezone,
            personId: typeof data.personId === 'string' ? data.personId : undefined,
          });
        }
      }
    }

    await SuggestionRepository.updateStatus(id, 'ACCEPTED', now);
    emitMascotEvent({ type: 'SUGGESTION_ACCEPTED' });
  },

  async refuseSuggestion(id: string): Promise<void> {
    const now = new Date().toISOString();
    await SuggestionRepository.updateStatus(id, 'REFUSED', now);
    emitMascotEvent({ type: 'SUGGESTION_DISMISSED' });
  },

  async getPendingSuggestions(): Promise<Suggestion[]> {
    return SuggestionRepository.findPending();
  },
};

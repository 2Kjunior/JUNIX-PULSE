/**
 * Moteur de suggestions proactives.
 * BR-001 : Les suggestions proposent des ajustements (replanification, relance contact, validation).
 * L'utilisateur garde toujours le contrôle final via Accepter / Refuser.
 */

import { SuggestionRepository } from '../repositories/suggestion-repository';
import { PersonRepository } from '../repositories/person-repository';
import { ReminderRepository } from '../repositories/reminder-repository';
import { PersonUseCases } from './person-use-cases';
import { HabitUseCases } from './habit-use-cases';
import { snoozeReminder } from './reminder-use-cases';
import { Suggestion } from '../domain/entities';

export const SuggestionUseCases = {
  /**
   * Analyse l'état de l'application et génère de nouvelles suggestions si besoin.
   */
  async generateSuggestions(): Promise<Suggestion[]> {
    const existingPending = await SuggestionRepository.findPending();
    const existingTargetIds = new Set(existingPending.map(s => s.targetId).filter(Boolean));
    const now = new Date().toISOString();

    const newSuggestions: Suggestion[] = [];

    // 1. Détecter les personnes à recontacter (Contacts oubliés — BR-012)
    try {
      const forgottenPeople = await PersonRepository.findForgotten();
      for (const person of forgottenPeople) {
        if (!existingTargetIds.has(person.id)) {
          const sugg: Suggestion = {
            id: `sugg_person_${person.id}_${Date.now()}`,
            type: 'FORGOTTEN_CONTACT',
            status: 'PENDING',
            title: `Prendre des nouvelles de ${person.displayName}`,
            explanation: `Vous n'avez pas interagi avec ${person.displayName} depuis plus de ${person.forgottenThresholdDays} jours.`,
            targetId: person.id,
            targetType: 'person',
            generatedAt: now,
            createdAt: now,
          };
          await SuggestionRepository.create(sugg);
          newSuggestions.push(sugg);
        }
      }
    } catch {
      // Ignorer si échec temporaire
    }

    // 2. Détecter les rappels manqués à replanifier
    try {
      const missedReminders = await ReminderRepository.findMissed();
      for (const rem of missedReminders) {
        if (!existingTargetIds.has(rem.id)) {
          const sugg: Suggestion = {
            id: `sugg_rem_${rem.id}_${Date.now()}`,
            type: 'RESCHEDULE_REMINDER',
            status: 'PENDING',
            title: `Replanifier le rappel "${rem.title}"`,
            explanation: `Ce rappel n'a pas été validé à l'heure prévue. Voulez-vous le reporter à demain même heure ?`,
            targetId: rem.id,
            targetType: 'reminder',
            generatedAt: now,
            createdAt: now,
          };
          await SuggestionRepository.create(sugg);
          newSuggestions.push(sugg);
        }
      }
    } catch {
      // Ignorer
    }

    // 3. Détecter les habitudes en danger de perte de streak
    try {
      const habitStats = await HabitUseCases.getAllHabitsWithStats();
      for (const item of habitStats) {
        if (
          item.habit.status === 'ACTIVE' &&
          !item.completedToday &&
          item.currentStreak > 0 &&
          !existingTargetIds.has(item.habit.id)
        ) {
          const sugg: Suggestion = {
            id: `sugg_habit_${item.habit.id}_${Date.now()}`,
            type: 'HABIT_REMINDER',
            status: 'PENDING',
            title: `Maintenir la série sur "${item.habit.title}"`,
            explanation: `Vous avez actuellement une série de ${item.currentStreak} jours. N'oubliez pas de la valider aujourd'hui !`,
            targetId: item.habit.id,
            targetType: 'habit',
            generatedAt: now,
            createdAt: now,
          };
          await SuggestionRepository.create(sugg);
          newSuggestions.push(sugg);
        }
      }
    } catch {
      // Ignorer
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
          notes: 'Interaction initiée suite à suggestion',
        });
      } else if (sugg.type === 'HABIT_REMINDER' && sugg.targetId) {
        await HabitUseCases.toggleHabitCompletion(sugg.targetId);
      } else if (sugg.type === 'RESCHEDULE_REMINDER' && sugg.targetId) {
        const rem = await ReminderRepository.findById(sugg.targetId);
        if (rem) {
          await snoozeReminder(rem, { kind: 'tomorrow' }, true);
        }
      }
    }

    await SuggestionRepository.updateStatus(id, 'ACCEPTED', now);
  },

  async refuseSuggestion(id: string): Promise<void> {
    const now = new Date().toISOString();
    await SuggestionRepository.updateStatus(id, 'REFUSED', now);
  },

  async getPendingSuggestions(): Promise<Suggestion[]> {
    return SuggestionRepository.findPending();
  },
};

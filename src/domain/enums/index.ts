/**
 * Enums de statut des rappels.
 * BR-002 : un rappel manqué est distinct d'un rappel terminé.
 * BR-003 : un snooze crée une nouvelle échéance pour l'occurrence concernée.
 */
export type ReminderStatus =
  | 'UPCOMING'    // Programmé, pas encore déclenché
  | 'TRIGGERED'   // L'heure est passée, la notification a été envoyée
  | 'SNOOZED'     // Reporté par l'utilisateur
  | 'MISSED'      // Déclenché mais ignoré (app fermée, pas d'action)
  | 'COMPLETED'   // Terminé consciemment par l'utilisateur
  | 'DELETED';    // Supprimé logiquement (soft delete)

export type ReminderPriority =
  | 'URGENT'   // Rouge
  | 'HIGH'     // Orange
  | 'NORMAL'   // Cyan/Bleu
  | 'LOW';     // Blanc/Neutre

export type ActionType =
  | 'NONE'
  | 'CALL'
  | 'MESSAGE'   // SMS, WhatsApp, autre message
  | 'EMAIL'
  | 'MEET'      // Rencontrer physiquement
  | 'TASK';     // Faire quelque chose (action générique)


export type RecurrenceType =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'CUSTOM_INTERVAL';  // ex: tous les 3 jours

export type WeekPosition =
  | 'FIRST'
  | 'SECOND'
  | 'THIRD'
  | 'FOURTH'
  | 'LAST';

export type TaskStatus =
  | 'INBOX'       // Sans date, dans la liste générale (BR-005)
  | 'SCHEDULED'   // Planifiée à une date précise
  | 'IN_PROGRESS' // En cours
  | 'COMPLETED'
  | 'POSTPONED';

export type EventType =
  | 'FREE'        // Temps libre (n'affecte pas les calculs de disponibilité)
  | 'BUSY';       // Occupé

export type HabitFrequency =
  | 'DAILY'
  | 'WEEKLY';     // X fois par semaine

export type HabitStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'ARCHIVED';

export type GoalStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED';

export type SuggestionType =
  | 'RESCHEDULE_REMINDER'    // Rappel manqué → replanifier
  | 'POSTPONE_TASK'          // Tâche non terminée en fin de journée
  | 'FORGOTTEN_CONTACT'      // Personne non contactée depuis X jours
  | 'BIRTHDAY_REMINDER'      // Anniversaire à venir
  | 'OVERLOADED_DAY'         // Journée surchargée → alléger
  | 'HABIT_REMINDER'         // Habitude non validée
  | 'PLANNING_CONFLICT';     // Conflit emploi du temps / événement

export type SuggestionStatus =
  | 'PENDING'    // Affichée, en attente de décision
  | 'ACCEPTED'
  | 'MODIFIED'   // Acceptée après modification
  | 'REFUSED'
  | 'EXPIRED';   // Obsolète car la situation a changé

export type PlanningBlockType =
  | 'WORK'
  | 'STUDY'
  | 'REST'
  | 'SPORT'
  | 'HOUSE'
  | 'FREE'
  | 'OTHER';

export type PlanningStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DELETED';

export type InteractionType =
  | 'CALL'
  | 'SMS'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'IN_PERSON'
  | 'OTHER';

/**
 * Entités du domaine Junix Pulse.
 * Ces types représentent le modèle métier pur — indépendants de la couche SQLite.
 * Les repositories traduisent entre ces types et les lignes de base de données.
 */

import {
  ReminderStatus,
  ReminderPriority,
  ActionType,
  RecurrenceType,
  WeekPosition,
  TaskStatus,
  EventType,
  HabitFrequency,
  HabitStatus,
  GoalStatus,
  SuggestionType,
  SuggestionStatus,
  PlanningBlockType,
  PlanningStatus,
  InteractionType,
} from '../enums';

// ─── Règle de récurrence ──────────────────────────────────────────────────────
export interface RecurrenceRule {
  id: string;
  type: RecurrenceType;
  interval: number;        // 1 = chaque occurrence, 3 = tous les 3 jours, etc.
  daysOfWeek?: number[];   // 0=dimanche … 6=samedi, pour WEEKLY
  dayOfMonth?: number;     // Pour MONTHLY
  weekPosition?: WeekPosition; // ex: "dernier vendredi du mois"
  endDate?: string;        // ISO date (incluse) après laquelle la récurrence s'arrête
}

// ─── Rappel ──────────────────────────────────────────────────────────────────
export interface Reminder {
  id: string;
  title: string;
  notes?: string;
  scheduledAt: string;         // ISO 8601 avec offset — instant absolu
  timezone: string;            // ex: 'Europe/Paris' — pour l'affichage et la récurrence locale
  priority: ReminderPriority;
  status: ReminderStatus;
  actionType: ActionType;
  personId?: string;
  recurrenceRuleId?: string;
  notificationId?: string;     // ID fourni par expo-notifications (pour annulation)
  snoozedUntil?: string;       // ISO 8601 si snooze actif
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
}

// ─── Item de checklist d'un rappel ───────────────────────────────────────────
export interface ReminderChecklistItem {
  id: string;
  reminderId: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

// ─── Tâche ───────────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  scheduledDate?: string;      // ISO date (YYYY-MM-DD) — pas d'heure, c'est une journée
  estimatedMinutes?: number;   // Estimation en minutes (15, 30, 60, etc.)
  priority: ReminderPriority;
  goalId?: string;
  personId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
}

// ─── Sous-tâche (niveau 1 uniquement) ───────────────────────────────────────
export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
  completedAt?: string;
}

// ─── Événement ───────────────────────────────────────────────────────────────
export interface Event {
  id: string;
  title: string;
  notes?: string;
  startAt: string;             // ISO 8601 avec offset
  endAt: string;               // ISO 8601 avec offset
  timezone: string;
  location?: string;
  type: EventType;
  travelBufferMinutes?: number; // Marge de déplacement avant l'événement (V1: valeur fixe)
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ─── Lien personne ↔ événement ───────────────────────────────────────────────
export interface EventPerson {
  eventId: string;
  personId: string;
}

// ─── Personne ────────────────────────────────────────────────────────────────
export interface Person {
  id: string;
  displayName: string;
  relationship?: string;       // Texte libre : "Maman", "Ami", "Collègue", etc.
  phone?: string;
  email?: string;
  birthDate?: string;          // ISO date (YYYY-MM-DD)
  notes?: string;
  lastInteractionAt?: string;  // ISO 8601 — mis à jour automatiquement
  forgottenThresholdDays: number; // Seuil en jours pour suggestion "longtemps" (défaut: 30)
  importedFromContacts: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ─── Interaction avec une personne ───────────────────────────────────────────
export interface Interaction {
  id: string;
  personId: string;
  type: InteractionType;
  occurredAt: string;          // ISO 8601
  notes?: string;
  reminderId?: string;         // Si l'interaction est liée à un rappel complété
  createdAt: string;
}

// ─── Habitude ────────────────────────────────────────────────────────────────
export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  targetDaysPerWeek?: number;  // Pour WEEKLY : combien de fois par semaine
  status: HabitStatus;
  color?: string;              // Couleur personnalisée d'affichage
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ─── Complétion d'une habitude ───────────────────────────────────────────────
export interface HabitCompletion {
  id: string;
  habitId: string;
  completedDate: string;       // ISO date (YYYY-MM-DD) — pas d'heure
  createdAt: string;
}

// ─── Période de pause d'une habitude ─────────────────────────────────────────
// BR-011 : une habitude en pause ne doit pas être traitée comme un échec.
// Le streak est calculé en excluant les jours couverts par une pause active.
export interface HabitPause {
  id: string;
  habitId: string;
  startDate: string;           // ISO date incluse
  endDate?: string;            // ISO date incluse, null = pause en cours
  reason?: string;
  createdAt: string;
}

// ─── Objectif ────────────────────────────────────────────────────────────────
export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  deadline?: string;           // ISO date recommandée
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ─── Association objectif ↔ tâche ────────────────────────────────────────────
// BR-012 : la progression est calculée à partir des tâches associées.
export interface GoalTask {
  goalId: string;
  taskId: string;
  addedAt: string;
}

// ─── Emploi du temps personnel ───────────────────────────────────────────────
// BR-013 : le planning est une intention de structure, pas une autorité.
// BR-014 : un planning temporaire doit avoir une période de validité.
export interface PersonalSchedule {
  id: string;
  name: string;                // ex: "Emploi du temps maison", "Semaine normale"
  validFrom: string;           // ISO date — début de la période de validité
  validUntil?: string;         // ISO date — fin optionnelle
  status: PlanningStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Bloc de planning récurrent ───────────────────────────────────────────────
export interface PlanningBlock {
  id: string;
  scheduleId: string;
  label: string;               // Ce que représente le bloc
  type: PlanningBlockType;
  dayOfWeek: number;           // 0=dimanche … 6=samedi
  startTime: string;           // HH:MM (heure locale)
  endTime: string;             // HH:MM (heure locale)
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Suggestion ──────────────────────────────────────────────────────────────
// BR-001 : une suggestion n'est jamais une décision automatique.
export interface Suggestion {
  id: string;
  type: SuggestionType;
  status: SuggestionStatus;
  title: string;
  explanation: string;         // Pourquoi cette suggestion ? Toujours présent.
  targetId?: string;           // ID de l'objet cible (reminder, task, person, etc.)
  targetType?: string;         // Type de l'objet cible
  proposedData?: string;       // JSON sérialisé des données proposées
  generatedAt: string;
  expiresAt?: string;          // Après cette date, la suggestion devient EXPIRED
  decidedAt?: string;
  createdAt: string;
}

// ─── Paramètres utilisateur ──────────────────────────────────────────────────
export interface Settings {
  id: string;                  // Toujours '1' (ligne unique)
  displayName?: string;
  timezone: string;            // ex: 'Europe/Paris'
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  forgottenContactThresholdDays: number;
  endOfDayHour: number;        // Heure à laquelle Junix propose de gérer les tâches restantes (ex: 20)
  morningBriefingHour: number; // Heure du résumé matin (ex: 8)
  appearanceDark: boolean;
  createdAt: string;
  updatedAt: string;
}

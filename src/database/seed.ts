/**
 * seed.ts — Données de démonstration pour Junix Pulse.
 *
 * Insère un jeu de données réalistes en français couvrant TOUS les modules :
 * Personnes, Rappels, Tâches, Événements, Habitudes, Objectifs, Interactions.
 *
 * Usage : appeler seedDatabase() depuis les Paramètres (bouton "Charger démo").
 * Idempotent : vérifie d'abord si des données existent déjà.
 */

import { getDatabase } from './sqlite';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { PersonRepository } from '@/repositories/person-repository';
import { EventRepository } from '@/repositories/event-repository';
import { HabitRepository } from '@/repositories/habit-repository';
import { GoalRepository } from '@/repositories/goal-repository';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

/** ISO datetime avec décalage depuis aujourd'hui (en heures) */
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

/** ISO date (YYYY-MM-DD) depuis aujourd'hui (en jours) */
function daysFromNow(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

/** YYYY-MM-DD pour une date passée */
function daysAgo(d: number): string {
  return daysFromNow(-d);
}

// ─── Vérification idempotente ─────────────────────────────────────────────────

export async function isSeedAlreadyLoaded(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM persons WHERE deleted_at IS NULL'
  );
  return (row?.count ?? 0) > 0;
}

// ─── Effacer TOUTES les données existantes ────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  const tables = [
    'habit_completions', 'habit_pauses', 'habits',
    'goal_tasks', 'goals',
    'reminder_checklist_items', 'reminders',
    'subtasks', 'tasks',
    'event_persons', 'events',
    'interactions', 'persons',
    'suggestions',
  ];
  for (const t of tables) {
    await db.runAsync(`DELETE FROM ${t}`);
  }
}

// ─── Seed principal ───────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<void> {
  const n = now();
  const db = await getDatabase();

  // ════════════════════════════════════════════════════════
  // 1. PERSONNES
  // ════════════════════════════════════════════════════════

  const personIds = {
    lucas:   uid(),
    camille: uid(),
    thomas:  uid(),
    sophie:  uid(),
    marc:    uid(),
  };

  await PersonRepository.create({
    id: personIds.lucas,
    displayName: 'Lucas Moreau',
    relationship: 'Meilleur ami',
    phone: '+33 6 12 34 56 78',
    email: 'lucas.moreau@gmail.com',
    birthDate: '1998-03-15',
    notes: 'Fan de randonnée, travaille chez une startup à Lyon. Se souvenir de lui demander des nouvelles de son projet.',
    lastInteractionAt: daysAgo(3) + 'T18:30:00.000Z',
    forgottenThresholdDays: 14,
    importedFromContacts: false,
    createdAt: n, updatedAt: n,
  });

  await PersonRepository.create({
    id: personIds.camille,
    displayName: 'Camille Dubois',
    relationship: 'Sœur',
    phone: '+33 6 98 76 54 32',
    email: 'camille.dubois@outlook.fr',
    birthDate: '2001-11-08',
    notes: 'Étudiante en médecine à Paris. Anniversaire en novembre — ne pas oublier !',
    lastInteractionAt: daysAgo(12) + 'T20:00:00.000Z',
    forgottenThresholdDays: 7,
    importedFromContacts: false,
    createdAt: n, updatedAt: n,
  });

  await PersonRepository.create({
    id: personIds.thomas,
    displayName: 'Thomas Bernard',
    relationship: 'Collègue',
    phone: '+33 7 11 22 33 44',
    email: 'thomas.b@entreprise.fr',
    birthDate: '1995-06-22',
    notes: 'Chef de projet. Préfère les messages WhatsApp aux appels. À relancer pour le dossier client.',
    lastInteractionAt: daysAgo(1) + 'T09:15:00.000Z',
    forgottenThresholdDays: 30,
    importedFromContacts: false,
    createdAt: n, updatedAt: n,
  });

  await PersonRepository.create({
    id: personIds.sophie,
    displayName: 'Sophie Lefèvre',
    relationship: 'Coach sportif',
    phone: '+33 6 55 44 33 22',
    email: 'sophie.coaching@gmail.com',
    notes: 'Coach à la salle de sport. Séance chaque lundi et jeudi à 7h.',
    lastInteractionAt: daysAgo(4) + 'T07:30:00.000Z',
    forgottenThresholdDays: 10,
    importedFromContacts: false,
    createdAt: n, updatedAt: n,
  });

  await PersonRepository.create({
    id: personIds.marc,
    displayName: 'Marc Petit',
    relationship: 'Mentor',
    phone: '+33 6 77 88 99 00',
    email: 'marc.petit@conseil.fr',
    birthDate: '1972-09-04',
    notes: 'Entrepreneur expérimenté. Disponible pour des cafés le vendredi. Conseils précieux sur la gestion du temps.',
    lastInteractionAt: daysAgo(35) + 'T14:00:00.000Z',
    forgottenThresholdDays: 21,
    importedFromContacts: false,
    createdAt: n, updatedAt: n,
  });

  // Interactions passées
  await db.runAsync(
    `INSERT INTO interactions (id, person_id, type, occurred_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    uid(), personIds.lucas, 'MESSAGE', daysAgo(3) + 'T18:30:00Z', 'Textos — a bien aimé la rando qu\'on a planifiée', n
  );
  await db.runAsync(
    `INSERT INTO interactions (id, person_id, type, occurred_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    uid(), personIds.camille, 'CALL', daysAgo(12) + 'T20:00:00Z', 'Appel vidéo — ses examens se passent bien', n
  );
  await db.runAsync(
    `INSERT INTO interactions (id, person_id, type, occurred_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    uid(), personIds.thomas, 'MESSAGE', daysAgo(1) + 'T09:15:00Z', 'Réunion de demain confirmée', n
  );

  // ════════════════════════════════════════════════════════
  // 2. RAPPELS
  // ════════════════════════════════════════════════════════

  // Rappel URGENT — dans 2h
  await ReminderRepository.create({
    id: uid(),
    title: 'Appeler le cabinet du docteur Faure',
    notes: 'Renouvellement ordonnance — demander créneau avant vendredi',
    scheduledAt: hoursFromNow(2),
    timezone: 'Europe/Paris',
    priority: 'URGENT',
    actionType: 'CALL',
    createdAt: n, updatedAt: n,
  });

  // Rappel HIGH — ce soir
  await ReminderRepository.create({
    id: uid(),
    title: 'Envoyer le rapport mensuel à Thomas',
    notes: 'Version finale — ne pas oublier les slides du Q3',
    scheduledAt: hoursFromNow(5),
    timezone: 'Europe/Paris',
    priority: 'HIGH',
    actionType: 'EMAIL',
    personId: personIds.thomas,
    createdAt: n, updatedAt: n,
  });

  // Rappel NORMAL — demain matin
  await ReminderRepository.create({
    id: uid(),
    title: 'Prendre rendez-vous avec le dentiste',
    notes: 'Rappel annuel — cabinet Rousseau, tel: 04 72 33 44 55',
    scheduledAt: hoursFromNow(14),
    timezone: 'Europe/Paris',
    priority: 'NORMAL',
    actionType: 'CALL',
    createdAt: n, updatedAt: n,
  });

  // Rappel NORMAL — dans 3 jours — lié à Lucas
  await ReminderRepository.create({
    id: uid(),
    title: 'Réserver le refuge pour la randonnée avec Lucas',
    notes: 'Vérifier disponibilités sur le site du parc national',
    scheduledAt: hoursFromNow(72),
    timezone: 'Europe/Paris',
    priority: 'NORMAL',
    actionType: 'TASK',
    personId: personIds.lucas,
    createdAt: n, updatedAt: n,
  });

  // Rappel MANQUÉ — hier
  const missedId = uid();
  await ReminderRepository.create({
    id: missedId,
    title: 'Payer la facture EDF',
    scheduledAt: hoursFromNow(-20),
    timezone: 'Europe/Paris',
    priority: 'HIGH',
    actionType: 'TASK',
    createdAt: n, updatedAt: n,
  });
  await ReminderRepository.update({
    id: missedId,
    status: 'MISSED',
    updatedAt: n,
  });

  // Rappel LOW — dans une semaine
  await ReminderRepository.create({
    id: uid(),
    title: 'Souhaiter l\'anniversaire de Camille',
    notes: 'Né le 8 novembre — penser à un cadeau',
    scheduledAt: hoursFromNow(7 * 24),
    timezone: 'Europe/Paris',
    priority: 'LOW',
    actionType: 'MESSAGE',
    personId: personIds.camille,
    createdAt: n, updatedAt: n,
  });

  // Rappel COMPLETED — avant-hier
  const doneRemId = uid();
  await ReminderRepository.create({
    id: doneRemId,
    title: 'Confirmer présence réunion d\'équipe',
    scheduledAt: hoursFromNow(-48),
    timezone: 'Europe/Paris',
    priority: 'NORMAL',
    actionType: 'MESSAGE',
    personId: personIds.thomas,
    createdAt: n, updatedAt: n,
  });
  await ReminderRepository.update({
    id: doneRemId,
    status: 'COMPLETED',
    completedAt: hoursFromNow(-47),
    updatedAt: n,
  });

  // ════════════════════════════════════════════════════════
  // 3. OBJECTIFS
  // ════════════════════════════════════════════════════════

  const goalIds = {
    fitness:     uid(),
    freelance:   uid(),
    learning:    uid(),
  };

  await GoalRepository.create({
    id: goalIds.fitness,
    title: 'Courir un semi-marathon',
    description: 'Objectif santé — préparer le semi-marathon de Lyon en avril. Programme sur 16 semaines.',
    status: 'ACTIVE',
    deadline: daysFromNow(120),
    createdAt: n, updatedAt: n,
  });

  await GoalRepository.create({
    id: goalIds.freelance,
    title: 'Lancer mon activité freelance',
    description: 'Développement web — 3 clients récurrents d\'ici 6 mois. Commencer par le portfolio et la présence LinkedIn.',
    status: 'ACTIVE',
    deadline: daysFromNow(180),
    createdAt: n, updatedAt: n,
  });

  await GoalRepository.create({
    id: goalIds.learning,
    title: 'Maîtriser TypeScript avancé',
    description: 'Terminer 2 cours en ligne et contribuer à un projet open source.',
    status: 'ACTIVE',
    deadline: daysFromNow(60),
    createdAt: n, updatedAt: n,
  });

  // ════════════════════════════════════════════════════════
  // 4. TÂCHES
  // ════════════════════════════════════════════════════════

  // Tâches d'aujourd'hui
  const taskT1 = uid();
  await TaskRepository.create({
    id: taskT1,
    title: 'Préparer la présentation client vendredi',
    description: 'Slides sur les résultats Q3 + proposition Q4. Faire valider par Thomas.',
    status: 'SCHEDULED',
    scheduledDate: daysFromNow(0),
    estimatedMinutes: 90,
    priority: 'HIGH',
    goalId: goalIds.freelance,
    personId: personIds.thomas,
    createdAt: n, updatedAt: n,
  });

  await db.runAsync(
    `INSERT OR IGNORE INTO goal_tasks (goal_id, task_id, added_at) VALUES (?, ?, ?)`,
    goalIds.freelance, taskT1, n
  );

  const taskT2 = uid();
  await TaskRepository.create({
    id: taskT2,
    title: 'Séance de course 5km',
    description: 'Semaine 3 du programme — allure 6:00/km, 3 séries d\'intervalles',
    status: 'SCHEDULED',
    scheduledDate: daysFromNow(0),
    estimatedMinutes: 45,
    priority: 'NORMAL',
    goalId: goalIds.fitness,
    createdAt: n, updatedAt: n,
  });
  await db.runAsync(
    `INSERT OR IGNORE INTO goal_tasks (goal_id, task_id, added_at) VALUES (?, ?, ?)`,
    goalIds.fitness, taskT2, n
  );

  await TaskRepository.create({
    id: uid(),
    title: 'Répondre aux emails en attente',
    description: '6 emails non traités dans la boîte pro',
    status: 'SCHEDULED',
    scheduledDate: daysFromNow(0),
    estimatedMinutes: 30,
    priority: 'NORMAL',
    createdAt: n, updatedAt: n,
  });

  // Tâche terminée aujourd'hui
  const doneTask = uid();
  await TaskRepository.create({
    id: doneTask,
    title: 'Faire les courses',
    description: 'Liste : légumes, pâtes, poulet, yaourts',
    status: 'COMPLETED',
    scheduledDate: daysFromNow(0),
    estimatedMinutes: 30,
    priority: 'NORMAL',
    createdAt: n, updatedAt: n,
  });
  await TaskRepository.update({ id: doneTask, status: 'COMPLETED', completedAt: hoursFromNow(-1), updatedAt: n });

  // Tâches inbox (sans date)
  await TaskRepository.create({
    id: uid(),
    title: 'Mettre à jour le CV',
    description: 'Ajouter les projets récents et les compétences TypeScript/React Native',
    status: 'INBOX',
    priority: 'HIGH',
    goalId: goalIds.freelance,
    createdAt: n, updatedAt: n,
  });

  await TaskRepository.create({
    id: uid(),
    title: 'Lire le livre "Atomic Habits"',
    description: 'Chapitre 5 à 8 ce soir',
    status: 'INBOX',
    priority: 'LOW',
    estimatedMinutes: 60,
    goalId: goalIds.learning,
    createdAt: n, updatedAt: n,
  });

  await TaskRepository.create({
    id: uid(),
    title: 'Créer le portfolio en ligne',
    description: 'Choisir une stack : Next.js + Vercel. 3 projets à mettre en avant.',
    status: 'INBOX',
    priority: 'HIGH',
    goalId: goalIds.freelance,
    createdAt: n, updatedAt: n,
  });

  // Tâche demain
  const taskTomorrow = uid();
  await TaskRepository.create({
    id: taskTomorrow,
    title: 'Réviser le module TypeScript Generics',
    description: 'Cours Udemy — section 12. Faire les exercices.',
    status: 'SCHEDULED',
    scheduledDate: daysFromNow(1),
    estimatedMinutes: 60,
    priority: 'NORMAL',
    goalId: goalIds.learning,
    createdAt: n, updatedAt: n,
  });
  await db.runAsync(
    `INSERT OR IGNORE INTO goal_tasks (goal_id, task_id, added_at) VALUES (?, ?, ?)`,
    goalIds.learning, taskTomorrow, n
  );

  // ════════════════════════════════════════════════════════
  // 5. ÉVÉNEMENTS
  // ════════════════════════════════════════════════════════

  // Événement dans 1h
  await EventRepository.create({
    id: uid(),
    title: 'Appel stratégie avec Marc',
    notes: 'Faire le point sur le lancement freelance — questions préparées',
    startAt: hoursFromNow(1),
    endAt: hoursFromNow(2),
    timezone: 'Europe/Paris',
    type: 'BUSY',
    travelBufferMinutes: 0,
    createdAt: n, updatedAt: n,
  }, [personIds.marc]);

  // Réunion ce soir
  await EventRepository.create({
    id: uid(),
    title: 'Réunion d\'équipe hebdo',
    notes: 'Présentation avancement projet Junix. Thomas préside.',
    startAt: hoursFromNow(4),
    endAt: hoursFromNow(5),
    timezone: 'Europe/Paris',
    location: 'Salle Confluent, 3ème étage',
    type: 'BUSY',
    travelBufferMinutes: 15,
    createdAt: n, updatedAt: n,
  }, [personIds.thomas]);

  // Demain — séance sport
  await EventRepository.create({
    id: uid(),
    title: 'Séance cardio avec Sophie',
    notes: 'Intervalles sur tapis + gainage. Prévoir une bouteille d\'eau.',
    startAt: hoursFromNow(24) + '',
    endAt: hoursFromNow(25) + '',
    timezone: 'Europe/Paris',
    location: 'Urban Sport Club, Lyon 2',
    type: 'BUSY',
    travelBufferMinutes: 10,
    createdAt: n, updatedAt: n,
  }, [personIds.sophie]);

  // Dans 3 jours — déjeuner
  await EventRepository.create({
    id: uid(),
    title: 'Déjeuner d\'anniversaire Lucas',
    notes: 'Restaurant "Le Bouchon Lyonnais" — réservation confirmée. Cadeau dans le sac.',
    startAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 3 * 86400000 + 7200000).toISOString(),
    timezone: 'Europe/Paris',
    location: 'Le Bouchon Lyonnais, Place des Jacobins',
    type: 'BUSY',
    travelBufferMinutes: 20,
    createdAt: n, updatedAt: n,
  }, [personIds.lucas, personIds.camille]);

  // Dans 5 jours — libre
  await EventRepository.create({
    id: uid(),
    title: 'Week-end randonnée — Mont Pilat',
    notes: 'Départ vendredi 17h. Réservation auberge confirmée. Équipement à préparer jeudi.',
    startAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    timezone: 'Europe/Paris',
    location: 'Mont Pilat, Loire',
    type: 'FREE',
    createdAt: n, updatedAt: n,
  }, [personIds.lucas]);

  // ════════════════════════════════════════════════════════
  // 6. HABITUDES
  // ════════════════════════════════════════════════════════

  const habitIds = {
    meditation: uid(),
    lecture:    uid(),
    sport:      uid(),
    journal:    uid(),
    vitamines:  uid(),
  };

  await HabitRepository.create({
    id: habitIds.meditation,
    title: 'Méditation matinale',
    description: '10 minutes au réveil, avant de regarder le téléphone',
    frequency: 'DAILY',
    status: 'ACTIVE',
    color: '#D0BCFF',
    createdAt: n, updatedAt: n,
  });

  await HabitRepository.create({
    id: habitIds.lecture,
    title: 'Lecture 20 minutes',
    description: 'Livre papier uniquement — pas d\'écran',
    frequency: 'DAILY',
    status: 'ACTIVE',
    color: '#7BD0FF',
    createdAt: n, updatedAt: n,
  });

  await HabitRepository.create({
    id: habitIds.sport,
    title: 'Activité physique',
    description: 'Course, natation ou musculation — minimum 30 min',
    frequency: 'WEEKLY',
    targetDaysPerWeek: 4,
    status: 'ACTIVE',
    color: '#6DD58C',
    createdAt: n, updatedAt: n,
  });

  await HabitRepository.create({
    id: habitIds.journal,
    title: 'Journal du soir',
    description: '3 gratitudes + 1 apprentissage du jour',
    frequency: 'DAILY',
    status: 'ACTIVE',
    color: '#FBBF24',
    createdAt: n, updatedAt: n,
  });

  await HabitRepository.create({
    id: habitIds.vitamines,
    title: 'Vitamines & compléments',
    description: 'Vit D3 + Magnésium — au petit-déjeuner',
    frequency: 'DAILY',
    status: 'ACTIVE',
    color: '#F97316',
    createdAt: n, updatedAt: n,
  });

  // Complétions réalistes (streak) pour les 14 derniers jours
  for (let d = 13; d >= 0; d--) {
    const dateStr = daysAgo(d);
    const createdAt = new Date(Date.now() - d * 86400000).toISOString();

    // Méditation — streak de 12 jours (manqué j-6 et j-1)
    if (d !== 6 && d !== 1) {
      await HabitRepository.addCompletion({
        id: uid(), habitId: habitIds.meditation, completedDate: dateStr, createdAt,
      });
    }

    // Lecture — streak de 14 jours (parfait)
    await HabitRepository.addCompletion({
      id: uid(), habitId: habitIds.lecture, completedDate: dateStr, createdAt,
    });

    // Journal — streak de 8 jours (les 8 derniers jours)
    if (d < 8) {
      await HabitRepository.addCompletion({
        id: uid(), habitId: habitIds.journal, completedDate: dateStr, createdAt,
      });
    }

    // Vitamines — 10 jours sur 14
    if (d !== 4 && d !== 9 && d !== 11 && d !== 13) {
      await HabitRepository.addCompletion({
        id: uid(), habitId: habitIds.vitamines, completedDate: dateStr, createdAt,
      });
    }
  }

  // Sport — 3 séances les 7 derniers jours
  await HabitRepository.addCompletion({
    id: uid(), habitId: habitIds.sport, completedDate: daysAgo(6), createdAt: n,
  });
  await HabitRepository.addCompletion({
    id: uid(), habitId: habitIds.sport, completedDate: daysAgo(4), createdAt: n,
  });
  await HabitRepository.addCompletion({
    id: uid(), habitId: habitIds.sport, completedDate: daysAgo(1), createdAt: n,
  });

  // ════════════════════════════════════════════════════════
  // 7. SUGGESTION — Exemple de contact oublié
  // ════════════════════════════════════════════════════════

  await db.runAsync(
    `INSERT OR IGNORE INTO suggestions (
      id, type, status, title, explanation,
      target_id, target_type, generated_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    uid(),
    'FORGOTTEN_CONTACT',
    'PENDING',
    'Marc n\'a pas eu de nouvelles depuis 35 jours',
    'Vous n\'avez pas eu de contact avec Marc Petit depuis plus de 5 semaines. Un café vendredi ?',
    personIds.marc,
    'person',
    n,
    n
  );
}

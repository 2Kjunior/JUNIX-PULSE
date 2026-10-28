/**
 * Migrations SQLite pour Junix Pulse.
 * Chaque migration est numérotée et immuable après son application.
 *
 * Ordre des migrations :
 * 001 – persons
 * 002 – recurrence_rules
 * 003 – reminders
 * 004 – reminder_checklist_items
 * 005 – tasks
 * 006 – subtasks
 * 007 – events
 * 008 – event_persons
 * 009 – habits
 * 010 – habit_completions
 * 011 – habit_pauses
 * 012 – goals
 * 013 – goal_tasks
 * 014 – personal_schedules
 * 015 – planning_blocks
 * 016 – interactions
 * 017 – suggestions
 * 018 – settings
 * 019 – indexes
 * 020 – sanctum_notes
 * 021 – sanctum_notes_multi_notebooks
 * 022 – add_appearance_mode
 * 023 – add_notification_sound_enabled
 */

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_persons',
    sql: `
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY NOT NULL,
        display_name TEXT NOT NULL,
        relationship TEXT,
        phone TEXT,
        email TEXT,
        birth_date TEXT,
        notes TEXT,
        last_interaction_at TEXT,
        forgotten_threshold_days INTEGER NOT NULL DEFAULT 30,
        imported_from_contacts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
    `,
  },
  {
    version: 2,
    name: 'create_recurrence_rules',
    sql: `
      CREATE TABLE IF NOT EXISTS recurrence_rules (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        interval_val INTEGER NOT NULL DEFAULT 1,
        days_of_week TEXT,
        day_of_month INTEGER,
        week_position TEXT,
        end_date TEXT
      );
    `,
  },
  {
    version: 3,
    name: 'create_reminders',
    sql: `
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        scheduled_at TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        status TEXT NOT NULL DEFAULT 'UPCOMING',
        action_type TEXT NOT NULL DEFAULT 'NONE',
        person_id TEXT,
        recurrence_rule_id TEXT,
        notification_id TEXT,
        snoozed_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY (person_id) REFERENCES persons(id),
        FOREIGN KEY (recurrence_rule_id) REFERENCES recurrence_rules(id)
      );
    `,
  },
  {
    version: 4,
    name: 'create_reminder_checklist_items',
    sql: `
      CREATE TABLE IF NOT EXISTS reminder_checklist_items (
        id TEXT PRIMARY KEY NOT NULL,
        reminder_id TEXT NOT NULL,
        title TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 5,
    name: 'create_tasks',
    sql: `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'INBOX',
        scheduled_date TEXT,
        estimated_minutes INTEGER,
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        goal_id TEXT,
        person_id TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY (person_id) REFERENCES persons(id)
        -- goal_id est une référence dénormalisée optionnelle vers goals.
        -- La relation canonique est dans goal_tasks (migration 13).
      );
    `,
  },
  {
    version: 6,
    name: 'create_subtasks',
    sql: `
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 7,
    name: 'create_events',
    sql: `
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        location TEXT,
        type TEXT NOT NULL DEFAULT 'BUSY',
        travel_buffer_minutes INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
    `,
  },
  {
    version: 8,
    name: 'create_event_persons',
    sql: `
      CREATE TABLE IF NOT EXISTS event_persons (
        event_id TEXT NOT NULL,
        person_id TEXT NOT NULL,
        PRIMARY KEY (event_id, person_id),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 9,
    name: 'create_habits',
    sql: `
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        frequency TEXT NOT NULL DEFAULT 'DAILY',
        target_days_per_week INTEGER,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        color TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
    `,
  },
  {
    version: 10,
    name: 'create_habit_completions',
    sql: `
      CREATE TABLE IF NOT EXISTS habit_completions (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT NOT NULL,
        completed_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(habit_id, completed_date),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 11,
    name: 'create_habit_pauses',
    sql: `
      CREATE TABLE IF NOT EXISTS habit_pauses (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        reason TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 12,
    name: 'create_goals',
    sql: `
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        deadline TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
    `,
  },
  {
    version: 13,
    name: 'create_goal_tasks',
    sql: `
      CREATE TABLE IF NOT EXISTS goal_tasks (
        goal_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        added_at TEXT NOT NULL,
        PRIMARY KEY (goal_id, task_id),
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 14,
    name: 'create_personal_schedules',
    sql: `
      CREATE TABLE IF NOT EXISTS personal_schedules (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_until TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 15,
    name: 'create_planning_blocks',
    sql: `
      CREATE TABLE IF NOT EXISTS planning_blocks (
        id TEXT PRIMARY KEY NOT NULL,
        schedule_id TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'FREE',
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (schedule_id) REFERENCES personal_schedules(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 16,
    name: 'create_interactions',
    sql: `
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY NOT NULL,
        person_id TEXT NOT NULL,
        type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        notes TEXT,
        reminder_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
        FOREIGN KEY (reminder_id) REFERENCES reminders(id)
      );
    `,
  },
  {
    version: 17,
    name: 'create_suggestions',
    sql: `
      CREATE TABLE IF NOT EXISTS suggestions (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        title TEXT NOT NULL,
        explanation TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        proposed_data TEXT,
        generated_at TEXT NOT NULL,
        expires_at TEXT,
        decided_at TEXT,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 18,
    name: 'create_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY NOT NULL DEFAULT '1',
        display_name TEXT,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        forgotten_contact_threshold_days INTEGER NOT NULL DEFAULT 30,
        end_of_day_hour INTEGER NOT NULL DEFAULT 20,
        morning_briefing_hour INTEGER NOT NULL DEFAULT 8,
        appearance_dark INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Insérer les paramètres par défaut s'ils n'existent pas encore
      INSERT OR IGNORE INTO settings (id, timezone, created_at, updated_at)
      VALUES ('1', 'UTC', datetime('now'), datetime('now'));
    `,
  },
  {
    version: 19,
    name: 'create_indexes',
    sql: `
      -- Index pour les requêtes fréquentes

      -- Rappels par statut et date (Today, liste)
      CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
      CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_reminders_person_id ON reminders(person_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_deleted_at ON reminders(deleted_at);

      -- Tâches par statut et date planifiée (Inbox, Today)
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

      -- Événements par date de début (Calendrier, Today)
      CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
      CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

      -- Habitudes et leurs données de suivi
      CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, completed_date);
      CREATE INDEX IF NOT EXISTS idx_habit_pauses_habit_id ON habit_pauses(habit_id);

      -- Interactions par personne et date
      CREATE INDEX IF NOT EXISTS idx_interactions_person_id ON interactions(person_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at ON interactions(occurred_at);

      -- Suggestions par statut
      CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
      CREATE INDEX IF NOT EXISTS idx_suggestions_type ON suggestions(type);

      -- Planning par statut et période
      CREATE INDEX IF NOT EXISTS idx_personal_schedules_status ON personal_schedules(status);
      CREATE INDEX IF NOT EXISTS idx_planning_blocks_schedule_id ON planning_blocks(schedule_id);
      CREATE INDEX IF NOT EXISTS idx_planning_blocks_day_of_week ON planning_blocks(day_of_week);
    `,
  },
  {
    version: 20,
    name: 'create_sanctum_notes',
    sql: `
      CREATE TABLE IF NOT EXISTS sanctum_notes (
        id TEXT PRIMARY KEY NOT NULL,
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 21,
    name: 'sanctum_notes_multi_notebooks',
    sql: `
      -- Ajout des colonnes pour le mode multi-carnets
      ALTER TABLE sanctum_notes ADD COLUMN title TEXT NOT NULL DEFAULT '';
      ALTER TABLE sanctum_notes ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
      ALTER TABLE sanctum_notes ADD COLUMN folder TEXT NOT NULL DEFAULT 'Général';

      -- Index pour le tri et le filtrage par dossier
      CREATE INDEX IF NOT EXISTS idx_sanctum_notes_folder ON sanctum_notes(folder);
      CREATE INDEX IF NOT EXISTS idx_sanctum_notes_updated_at ON sanctum_notes(updated_at);
    `,
  },
  {
    version: 22,
    name: 'add_appearance_mode',
    sql: `
      -- Ajout de la colonne appearance_mode ('system' | 'light' | 'dark')
      ALTER TABLE settings ADD COLUMN appearance_mode TEXT NOT NULL DEFAULT 'dark';

      -- Initialisation cohérente depuis l'ancien booléen appearance_dark
      UPDATE settings SET appearance_mode = CASE WHEN appearance_dark = 1 THEN 'dark' ELSE 'light' END;
    `,
  },
  {
    version: 23,
    name: 'add_notification_sound_enabled',
    sql: `
      -- Adds the per-user notification sound toggle (default: enabled).
      ALTER TABLE settings ADD COLUMN notification_sound_enabled INTEGER NOT NULL DEFAULT 1;
    `,
  },
];


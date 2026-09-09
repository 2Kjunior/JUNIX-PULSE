export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relationship TEXT,
  birth_date TEXT,
  notes TEXT,
  last_interaction_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS recurrence_rules (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  interval INTEGER NOT NULL,
  days_of_week TEXT,
  day_of_month INTEGER,
  week_position TEXT,
  end_date TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  scheduled_at TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  action_type TEXT NOT NULL,
  person_id TEXT,
  recurrence_rule_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (recurrence_rule_id) REFERENCES recurrence_rules(id)
);

CREATE TABLE IF NOT EXISTS reminder_checklist_items (
  id TEXT PRIMARY KEY NOT NULL,
  reminder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id)
);
`;

# FICHE OPÉRATOIRE N° 019 — Une habitude qui sonne, et « Fait » dans la notification

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 018](FICHE-018-progres-habitudes-et-objectifs.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 15.2

---

## 1. Objectif

Une habitude peut maintenant **sonner à une heure** (« Méditer, tous les jours à 7 h »). Sa notification a un bouton **« Fait »** qui **coche l'habitude du jour**, même l'appli fermée. Plus besoin d'un rappel répété **et** d'une habitude à côté : c'est une seule chose.

| Quand ça sonne | Règle |
|---|---|
| Habitude **de chaque jour** | Chaque jour à l'heure choisie, **sauf** si elle est déjà cochée ce jour-là |
| Habitude **« X fois par semaine »** | Chaque jour à l'heure choisie, jusqu'à ce que l'objectif de la semaine soit atteint ; reprend le lundi |
| Habitude **en pause** | Ne sonne pas |
| Niveau | **Normal** (fiche 011) : la nuit, il descend à Discret |

Les 7 prochains jours sont programmés (20 notifications au plus) ; la synchronisation suivante complète.

**Où le régler** : dans le formulaire d'une nouvelle habitude, et sur la page d'une habitude : **« Me le rappeler »** + l'heure.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 018 est enregistrée | `git log --oneline -1` | `feat(progress): …` |
| La base est en version 35 | `src/database/migrations.ts` | `version: 35` |
| Tout passe | `npx jest` | `Tests: 1956 passed` |

## 3. Hypothèses

- « Fait » coche le **jour où la notification est arrivée** (une notification d'hier touchée ce matin coche hier).
- Toucher « Fait » deux fois, ou cocher aussi dans l'appli : l'habitude n'est jamais décochée par le bouton (il coche seulement).
- Le bouton marche appli fermée sur Android grâce à la tâche de fond déjà utilisée par les rappels.

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/database/migrations.ts` | **version 36** : colonne `reminder_time` des habitudes |
| `src/domain/entities/index.ts`, `src/repositories/habit-repository.ts`, `src/services/backup-service.ts` | la nouvelle colonne |
| `src/domain/rules/notification-level-rules.ts` | le moment `habit` |
| `src/domain/rules/habit-notification-rules.ts` | **créé** : quelles notifications |
| `src/services/notification-service.ts` | le bouton « Fait » et `scheduleHabit` |
| `src/services/habit-notification-service.ts` | **créé** : la synchronisation |
| `src/services/reminder-notification-service.ts` | entraîne la synchronisation des habitudes |
| `src/use-cases/habit-use-cases.ts` | l'heure, et resynchroniser après chaque changement |
| `src/domain/rules/reminder-notification-rules.ts` | l'action `habitDone`, et ce qu'ouvre la notification |
| `src/services/notification-action-service.ts` | « Fait » coche l'habitude (appli ouverte ou fermée) |
| `src/app/_layout.tsx` | « Fait » appli ouverte |
| `src/features/habits/HabitReminderField.tsx` | **créé** : « Me le rappeler » + l'heure |
| `src/app/habits/new.tsx`, `src/app/habits/[id].tsx` | le champ |
| `src/i18n/messages-rest-fr.ts` et `-en.ts` | 6 textes chacun |
| `src/domain/rules/__tests__/habit-notification-rules.test.ts` | **créé** : 6 tests |

## 5. Sauvegarde

La migration 36 **ajoute** une colonne vide ; rien n'est modifié. Les sauvegardes emportent l'heure ; une plus ancienne se restaure sans elle.

## 6. Étapes

### Étape 1 — Les données

Dans `src/database/migrations.ts` :

<!-- bloc: mig-avant -->

```ts
      CREATE INDEX IF NOT EXISTS idx_goal_habits_habit ON goal_habits(habit_id);
    `,
  },
];
```

<!-- bloc: mig-apres -->

```ts
      CREATE INDEX IF NOT EXISTS idx_goal_habits_habit ON goal_habits(habit_id);
    `,
  },
  {
    version: 36,
    name: 'add_habit_reminder_time',
    sql: `
      -- Une habitude peut sonner a une heure, au format HH:mm (fiche 019, etude 15.2).
      ALTER TABLE habits ADD COLUMN reminder_time TEXT;
    `,
  },
];
```

Dans `src/domain/entities/index.ts` :

<!-- bloc: ent-avant -->

```ts
  color?: string;              // Couleur personnalisée d'affichage
```

<!-- bloc: ent-apres -->

```ts
  color?: string;              // Couleur personnalisée d'affichage
  /** "HH:mm": the habit rings at this time on the days it is still due (sheet 019). */
  reminderTime?: string;
```

Dans `src/repositories/habit-repository.ts`, la lecture, la création et la modification :

<!-- bloc: repo-1-avant -->

```ts
    color: (row.color as string | null) ?? undefined,
    createdAt: row.created_at as string,
```

<!-- bloc: repo-1-apres -->

```ts
    color: (row.color as string | null) ?? undefined,
    reminderTime: (row.reminder_time as string | null) ?? undefined,
    createdAt: row.created_at as string,
```

<!-- bloc: repo-2-avant -->

```ts
      `INSERT INTO habits (id, title, description, frequency, target_days_per_week, status, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      habit.id,
      habit.title,
      habit.description ?? null,
      habit.frequency,
      habit.targetDaysPerWeek ?? null,
      habit.status,
      habit.color ?? null,
```

<!-- bloc: repo-2-apres -->

```ts
      `INSERT INTO habits (id, title, description, frequency, target_days_per_week, status, color, reminder_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      habit.id,
      habit.title,
      habit.description ?? null,
      habit.frequency,
      habit.targetDaysPerWeek ?? null,
      habit.status,
      habit.color ?? null,
      habit.reminderTime ?? null,
```

<!-- bloc: repo-3-avant -->

```ts
    if (params.color !== undefined) { fields.push('color = ?'); values.push(params.color ?? null); }
```

<!-- bloc: repo-3-apres -->

```ts
    if (params.color !== undefined) { fields.push('color = ?'); values.push(params.color ?? null); }
    // An empty time removes the alarm of the habit
    if (params.reminderTime !== undefined) { fields.push('reminder_time = ?'); values.push(params.reminderTime || null); }
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-avant -->

```ts
  habits: ['id', 'title', 'description', 'frequency', 'target_days_per_week', 'status', 'color', 'created_at', 'updated_at', 'deleted_at'],
```

<!-- bloc: bk-apres -->

```ts
  habits: ['id', 'title', 'description', 'frequency', 'target_days_per_week', 'status', 'color', 'reminder_time', 'created_at', 'updated_at', 'deleted_at'],
```

### Étape 2 — Le niveau d'une habitude qui sonne

Dans `src/domain/rules/notification-level-rules.ts` :

<!-- bloc: level-1-avant -->

```ts
export type NotificationMoment = 'reminder' | 'taskEve' | 'taskDay' | 'momentBefore' | 'momentLeave';
```

<!-- bloc: level-1-apres -->

```ts
export type NotificationMoment = 'reminder' | 'taskEve' | 'taskDay' | 'momentBefore' | 'momentLeave' | 'habit';
```

<!-- bloc: level-2-avant -->

```ts
  momentLeave: 'normal',
};
```

<!-- bloc: level-2-apres -->

```ts
  momentLeave: 'normal',
  habit: 'normal',
};
```

### Étape 3 — Quelles notifications pour les habitudes

Créer `src/domain/rules/habit-notification-rules.ts` :

<!-- bloc: rules -->

```ts
/**
 * Which notifications the phone should hold for the habits that ring (study 001, 15.2; sheet 019):
 * every day at their time, unless already ticked that day; a weekly habit stops for the week once
 * its target is reached. Their notification has one button, "Fait", which ticks the day.
 */

import type { Habit } from '../entities';
import { translate } from '../../i18n/translate';
import { doneThisWeek, weeklyTarget } from './goal-rules';
import type { AppLanguage } from './language-rules';
import { DEFAULT_QUIET_HOURS, NotificationLevel, notificationLevelFor, QuietHours } from './notification-level-rules';

export const HABIT_IDENTIFIER_PREFIX = 'habit-';
/** Category of the habit notifications and its button. Neither ":" nor "-" in them. */
export const HABIT_CATEGORY_ID = 'habit_actions';
export const HABIT_ACTION_DONE = 'habit_done';
export const HABIT_DAYS_AHEAD = 7;
export const MAX_SCHEDULED_HABITS = 20;

export interface HabitToPlan {
  habit: Habit;
  completedDates: readonly string[];
}

export interface PlannedHabitNotification {
  identifier: string;
  habitId: string;
  title: string;
  body: string;
  scheduledAt: Date;
  level: NotificationLevel;
}

const pad = (value: number) => String(value).padStart(2, '0');
const ymd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** "07:30" as hour and minute, or null for a time that does not read. */
export function parseReminderTime(value?: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

export function planHabitNotifications({
  habits,
  now,
  language = 'fr',
  quietHours = DEFAULT_QUIET_HOURS,
}: {
  habits: readonly HabitToPlan[];
  now: Date;
  language?: AppLanguage;
  quietHours?: QuietHours;
}): PlannedHabitNotification[] {
  const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + 7);
  const planned: PlannedHabitNotification[] = [];
  for (const { habit, completedDates } of habits) {
    const time = parseReminderTime(habit.reminderTime);
    if (!time || habit.status !== 'ACTIVE' || habit.deletedAt) continue;
    const done = new Set(completedDates);
    // A weekly habit rings no more this week once its target is reached
    const weekReached =
      habit.frequency !== 'DAILY' &&
      doneThisWeek(completedDates.map(completedDate => ({ completedDate })), now) >= weeklyTarget(habit);
    for (let offset = 0; offset < HABIT_DAYS_AHEAD; offset += 1) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, time.hour, time.minute, 0, 0);
      if (at <= now || done.has(ymd(at)) || (weekReached && at < nextMonday)) continue;
      planned.push({
        identifier: `${HABIT_IDENTIFIER_PREFIX}${habit.id}-${at.getTime()}`,
        habitId: habit.id,
        title: habit.title,
        body: translate(language, 'habitNotif.body'),
        scheduledAt: at,
        level: notificationLevelFor({ moment: 'habit', at, quietHours }),
      });
    }
  }
  return planned.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()).slice(0, MAX_SCHEDULED_HABITS);
}
```

### Étape 4 — Le bouton « Fait » et la programmation

Dans `src/services/notification-service.ts`, quatre remplacements.

<!-- bloc: ns-1-avant -->

```ts
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_SOUND_WAV_FILENAME } from "@/services/sound/notification-sound-constants";
```

<!-- bloc: ns-1-apres -->

```ts
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_SOUND_WAV_FILENAME } from "@/services/sound/notification-sound-constants";
import { HABIT_ACTION_DONE, HABIT_CATEGORY_ID } from "@/domain/rules/habit-notification-rules";
```

<!-- bloc: ns-2-avant -->

```ts
  level: NotificationLevel;
  soundOn: boolean;
}
```

<!-- bloc: ns-2-apres -->

```ts
  level: NotificationLevel;
  soundOn: boolean;
}

export interface ScheduleHabitParams {
  identifier: string;
  habitId: string;
  title: string;
  body: string;
  scheduledAt: Date;
  level: NotificationLevel;
  soundOn: boolean;
}
```

<!-- bloc: ns-3-avant -->

```ts
        ]);
      }
      if (Platform.OS === "android") {
```

<!-- bloc: ns-3-apres -->

```ts
        ]);
        // A habit that rings (sheet 019): one button, "Fait", which ticks the habit of the day
        await Notifications.setNotificationCategoryAsync(HABIT_CATEGORY_ID, [
          {
            identifier: HABIT_ACTION_DONE,
            buttonTitle: t('notifAction.habitDone'),
            options: { opensAppToForeground: opensApp },
          },
        ]);
      }
      if (Platform.OS === "android") {
```

<!-- bloc: ns-4-avant -->

```ts
      logger.error("[NotificationService] Erreur lors de scheduleItem");
      return null;
    }
  },
```

<!-- bloc: ns-4-apres -->

```ts
      logger.error("[NotificationService] Erreur lors de scheduleItem");
      return null;
    }
  },

  /**
   * Plans the notification of a habit that rings (sheet 019), with its "Fait" button, on the
   * channel of its level. Returns its identifier, or null when its time is past or planning failed.
   */
  async scheduleHabit(params: ScheduleHabitParams): Promise<string | null> {
    if (!Notifications || params.scheduledAt <= new Date()) return null;
    try {
      return await Notifications.scheduleNotificationAsync({
        identifier: params.identifier,
        content: {
          title: params.title,
          body: params.body,
          data: { type: "HABIT", habitId: params.habitId, level: params.level },
          sound: params.soundOn && params.level !== "discreet" ? NOTIFICATION_SOUND_WAV_FILENAME : false,
          categoryIdentifier: HABIT_CATEGORY_ID,
          priority:
            params.level === "discreet"
              ? Notifications.AndroidNotificationPriority.LOW
              : Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: params.scheduledAt,
          channelId: Platform.OS === "android" ? channelIdFor(params.level, params.soundOn) : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleHabit");
      return null;
    }
  },
```

### Étape 5 — La synchronisation

Créer `src/services/habit-notification-service.ts` :

<!-- bloc: service -->

```ts
/**
 * Keeps the notifications of the habits that ring in line with the database (sheet 019), like the
 * reminders and the items: it compares both sides and only touches what differs.
 */

import { HABIT_IDENTIFIER_PREFIX, planHabitNotifications, type HabitToPlan } from '@/domain/rules/habit-notification-rules';
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { HabitRepository } from '@/repositories/habit-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';

let queue: Promise<unknown> = Promise.resolve();

async function sync(force: boolean): Promise<void> {
  try {
    const settings = await SettingsRepository.get();
    const toPlan: HabitToPlan[] = [];
    if (settings.notificationsEnabled) {
      for (const habit of await HabitRepository.findAllActive()) {
        if (!habit.reminderTime) continue;
        const completions = await HabitRepository.getCompletions(habit.id);
        toPlan.push({ habit, completedDates: completions.map(completion => completion.completedDate) });
      }
    }
    const planned = planHabitNotifications({
      habits: toPlan,
      now: new Date(),
      language: useAppStore.getState().language,
      quietHours: quietHoursOf(settings),
    });

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(HABIT_IDENTIFIER_PREFIX)
    );
    const plannedById = new Map(planned.map(item => [item.identifier, item]));
    const upToDate = new Set<string>();
    for (const request of held) {
      const item = plannedById.get(request.identifier);
      if (
        !force &&
        item &&
        item.title === request.content.title &&
        item.body === request.content.body &&
        levelOf(request.content.data?.level) === item.level
      ) {
        upToDate.add(request.identifier);
      } else {
        await NotificationService.cancelReminder(request.identifier);
      }
    }

    const missing = planned.filter(item => !upToDate.has(item.identifier));
    if (missing.length === 0 || !(await NotificationService.checkPermissions())) return;
    for (const item of missing) {
      await NotificationService.scheduleHabit({ ...item, soundOn: settings.notificationSoundEnabled });
    }
  } catch {
    logger.error('[HabitNotificationService] Erreur lors de la synchronisation');
  }
}

/** Runs one sync at a time, so that two quick changes end on the latest data. */
export function syncHabitNotifications(options: { force?: boolean } = {}): Promise<void> {
  const run = queue.then(() => sync(options.force ?? false));
  queue = run;
  return run;
}
```

Dans `src/services/reminder-notification-service.ts` (lancement, réglages, langue : les habitudes suivent aussi) :

<!-- bloc: rs-1-avant -->

```ts
import { syncItemNotifications } from '@/services/item-notification-service';
```

<!-- bloc: rs-1-apres -->

```ts
import { syncItemNotifications } from '@/services/item-notification-service';
import { syncHabitNotifications } from '@/services/habit-notification-service';
```

<!-- bloc: rs-2-avant -->

```ts
  void syncItemNotifications({ force: options.force });
```

<!-- bloc: rs-2-apres -->

```ts
  void syncItemNotifications({ force: options.force });
  void syncHabitNotifications({ force: options.force });
```

### Étape 6 — L'heure d'une habitude, et resynchroniser

Dans `src/use-cases/habit-use-cases.ts`, dix remplacements.

<!-- bloc: uc-1-avant -->

```ts
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
```

<!-- bloc: uc-1-apres -->

```ts
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
import { syncHabitNotifications } from '../services/habit-notification-service';
```

<!-- bloc: uc-2-avant -->

```ts
  targetDaysPerWeek?: number;
  color?: string;
}

export interface UpdateHabitParams {
```

<!-- bloc: uc-2-apres -->

```ts
  targetDaysPerWeek?: number;
  color?: string;
  /** "HH:mm": the habit rings at this time (sheet 019). */
  reminderTime?: string;
}

export interface UpdateHabitParams {
```

<!-- bloc: uc-3-avant -->

```ts
  status?: HabitStatus;
  color?: string;
}
```

<!-- bloc: uc-3-apres -->

```ts
  status?: HabitStatus;
  color?: string;
  /** "HH:mm", or "" to stop the habit ringing (sheet 019). */
  reminderTime?: string;
}
```

<!-- bloc: uc-4-avant -->

```ts
      color: params.color,
      createdAt: now,
```

<!-- bloc: uc-4-apres -->

```ts
      color: params.color,
      reminderTime: params.reminderTime,
      createdAt: now,
```

<!-- bloc: uc-5-avant -->

```ts
    await HabitRepository.create(habit);
    emitMascotEvent({ type: 'ITEM_CREATED' });
```

<!-- bloc: uc-5-apres -->

```ts
    await HabitRepository.create(habit);
    emitMascotEvent({ type: 'ITEM_CREATED' });
    void syncHabitNotifications();
```

<!-- bloc: uc-6-avant -->

```ts
    return HabitRepository.findById(params.id);
```

<!-- bloc: uc-6-apres -->

```ts
    void syncHabitNotifications();
    return HabitRepository.findById(params.id);
```

<!-- bloc: uc-7-avant -->

```ts
    await HabitRepository.delete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
```

<!-- bloc: uc-7-apres -->

```ts
    await HabitRepository.delete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
    void syncHabitNotifications();
```

<!-- bloc: uc-8-avant -->

```ts
      await HabitRepository.removeCompletion(habitId, targetDate);
      return false; // Désormais non complétée
```

<!-- bloc: uc-8-apres -->

```ts
      await HabitRepository.removeCompletion(habitId, targetDate);
      void syncHabitNotifications();
      return false; // Désormais non complétée
```

<!-- bloc: uc-9-avant -->

```ts
      await announceHabitCompleted(habitId);
      return true; // Désormais complétée
```

<!-- bloc: uc-9-apres -->

```ts
      await announceHabitCompleted(habitId);
      // Done today: today's ring is withdrawn, and a weekly target reached stops the week
      void syncHabitNotifications();
      return true; // Désormais complétée
```

<!-- bloc: uc-10-avant -->

```ts
    await HabitRepository.update({ id: habitId, status: 'PAUSED', updatedAt: now });
    return pause;
```

<!-- bloc: uc-10-apres -->

```ts
    await HabitRepository.update({ id: habitId, status: 'PAUSED', updatedAt: now });
    void syncHabitNotifications();
    return pause;
```

<!-- bloc: uc-11-avant -->

```ts
    emitMascotEvent({ type: 'HABIT_RESUMED' });
```

<!-- bloc: uc-11-apres -->

```ts
    emitMascotEvent({ type: 'HABIT_RESUMED' });
    void syncHabitNotifications();
```

### Étape 7 — « Fait » coche l'habitude

Dans `src/domain/rules/reminder-notification-rules.ts`, quatre remplacements.

<!-- bloc: rr-1-avant -->

```ts
import { getNextOccurrence } from './reminder-rules';
```

<!-- bloc: rr-1-apres -->

```ts
import { getNextOccurrence } from './reminder-rules';
import { HABIT_ACTION_DONE } from './habit-notification-rules';
```

<!-- bloc: rr-2-avant -->

```ts
export type ReminderNotificationAction = 'complete' | 'snooze' | 'open';
```

<!-- bloc: rr-2-apres -->

```ts
export type ReminderNotificationAction = 'complete' | 'snooze' | 'habitDone' | 'open';
```

<!-- bloc: rr-3-avant -->

```ts
  if (actionIdentifier === REMINDER_ACTION_SNOOZE) return 'snooze';
```

<!-- bloc: rr-3-apres -->

```ts
  if (actionIdentifier === REMINDER_ACTION_SNOOZE) return 'snooze';
  if (actionIdentifier === HABIT_ACTION_DONE) return 'habitDone';
```

<!-- bloc: rr-4-avant -->

```ts
  if (data?.type === 'EVENT' && typeof data.eventId === 'string') return `/events/${data.eventId}`;
```

<!-- bloc: rr-4-apres -->

```ts
  if (data?.type === 'EVENT' && typeof data.eventId === 'string') return `/events/${data.eventId}`;
  if (data?.type === 'HABIT' && typeof data.habitId === 'string') return `/habits/${data.habitId}`;
```

Dans `src/services/notification-action-service.ts`, quatre remplacements.

<!-- bloc: na-1-avant -->

```ts
import { ReminderRepository } from '@/repositories/reminder-repository';
```

<!-- bloc: na-1-apres -->

```ts
import { format } from 'date-fns';
import { HabitRepository } from '@/repositories/habit-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { HabitUseCases } from '@/use-cases/habit-use-cases';
```

<!-- bloc: na-2-avant -->

```ts
  if (action === 'open') return 'skipped';
```

<!-- bloc: na-2-apres -->

```ts
  // Only the buttons of a reminder are handled here ("Fait" of a habit: runHabitAction)
  if (action !== 'complete' && action !== 'snooze') return 'skipped';
```

<!-- bloc: na-3-avant -->

```ts
/** Body of the background task: never throws, the system would only retry. */
export async function handleBackgroundResponse(data: unknown): Promise<void> {
  const request = parseBackgroundResponse(data);
```

<!-- bloc: na-3-apres -->

```ts
export interface HabitActionRequest {
  actionIdentifier: string;
  notificationIdentifier: string;
  habitId: string;
  /** When the notification was shown: the day it ticks. */
  date: number;
}

/** "Fait" on the notification of a habit (sheet 019): ticks the day it rang, once per tap. */
export async function runHabitAction(request: HabitActionRequest): Promise<'completed' | 'skipped'> {
  if (notificationActionFor(request.actionIdentifier) !== 'habitDone') return 'skipped';
  const key = `${request.notificationIdentifier}:${request.actionIdentifier}:${request.date}`;
  if (handled.has(key)) return 'skipped';
  handled.add(key);
  await NotificationService.dismiss(request.notificationIdentifier);
  const day = format(new Date(request.date || Date.now()), 'yyyy-MM-dd');
  // Already ticked, from the app or a second tap: the button never unticks
  if (await HabitRepository.isCompletedOn(request.habitId, day)) return 'skipped';
  await HabitUseCases.toggleHabitCompletion(request.habitId, day);
  return 'completed';
}

/** A text field of the data of a notification: an object, or JSON text from Android. */
function dataField(content: unknown, name: string): string | null {
  const fields = record(content);
  if (!fields) return null;
  const value = record(fields.data)?.[name];
  if (typeof value === 'string') return value;
  if (typeof fields.dataString === 'string') {
    try {
      const parsed = record(JSON.parse(fields.dataString))?.[name];
      return typeof parsed === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** What the background task receives for "Fait" on a habit, or null for anything else. */
export function parseBackgroundHabit(data: unknown): HabitActionRequest | null {
  const response = record(data);
  const notification = record(response?.notification);
  const request = record(notification?.request);
  if (typeof response?.actionIdentifier !== 'string' || typeof request?.identifier !== 'string') return null;
  const habitId = dataField(request.content, 'habitId');
  if (!habitId) return null;
  return {
    actionIdentifier: response.actionIdentifier,
    notificationIdentifier: request.identifier,
    habitId,
    date: typeof notification?.date === 'number' ? notification.date : 0,
  };
}

/** Body of the background task: never throws, the system would only retry. */
export async function handleBackgroundResponse(data: unknown): Promise<void> {
  const habit = parseBackgroundHabit(data);
  if (habit) {
    try {
      await runHabitAction(habit);
    } catch (error) {
      logger.error('[NotificationAction] Action de l habitude impossible', error);
    }
    return;
  }
  const request = parseBackgroundResponse(data);
```

Dans `src/app/_layout.tsx` (appli ouverte) :

<!-- bloc: lay-1-avant -->

```tsx
import { runReminderAction } from "@/services/notification-action-service";
```

<!-- bloc: lay-1-apres -->

```tsx
import { runHabitAction, runReminderAction } from "@/services/notification-action-service";
```

<!-- bloc: lay-2-avant -->

```tsx
    if (atLaunch && Platform.OS === "android") return;
    if (typeof data?.reminderId !== "string") return;
```

<!-- bloc: lay-2-apres -->

```tsx
    if (atLaunch && Platform.OS === "android") return;
    // "Fait" on a habit that rang (sheet 019)
    if (action === "habitDone") {
      if (typeof data?.habitId !== "string") return;
      const outcome = await runHabitAction({
        actionIdentifier: response.actionIdentifier,
        notificationIdentifier: response.notification.request.identifier,
        habitId: data.habitId,
        date: response.notification.date,
      });
      if (outcome === "completed") useAppStore.getState().showSnackbar(tNow("notifAction.habitDoneSnack"));
      return;
    }
    if (typeof data?.reminderId !== "string") return;
```

### Étape 8 — « Me le rappeler » dans les écrans

Créer `src/features/habits/HabitReminderField.tsx` :

<!-- bloc: field -->

```tsx
/**
 * "Remind me" on a habit (sheet 019): a switch and the time it rings, every day it is still due.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { SwitchRow } from '@/components/create/form/FormBricks';
import { Spacing, Typography } from '@/constants/theme';
import { parseReminderTime } from '@/domain/rules/habit-notification-rules';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';

const pad = (value: number) => String(value).padStart(2, '0');
const DEFAULT_TIME = '08:00';

export function HabitReminderField({ value, onChange }: { value?: string; onChange: (value: string | undefined) => void }) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const [picking, setPicking] = useState(false);
  const time = parseReminderTime(value) ?? parseReminderTime(DEFAULT_TIME)!;

  return (
    <View style={{ gap: Spacing.xs, marginTop: Spacing.sm }} testID="habit-reminder">
      <SwitchRow
        label={t('habitReminder.label')}
        hint={t('habitReminder.hint')}
        value={Boolean(value)}
        onChange={on => onChange(on ? (value ?? DEFAULT_TIME) : undefined)}
        accent={palette.primary.default}
        testID="habit-reminder-switch"
      />
      {value ? (
        <TouchableOpacity
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={t('habitReminder.at', { time: value })}
          testID="habit-reminder-time"
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
        >
          <Ionicons name="time-outline" size={18} color={palette.primary.default} />
          <Text style={{ ...Typography.bodyLarge, color: palette.onSurface.primary }}>{t('habitReminder.at', { time: value })}</Text>
          <Ionicons name="chevron-forward" size={16} color={palette.onSurface.variant} />
        </TouchableOpacity>
      ) : null}
      <DateTimePickerModal
        isVisible={picking}
        mode="time"
        date={new Date(2000, 0, 1, time.hour, time.minute)}
        onConfirm={picked => {
          setPicking(false);
          onChange(`${pad(picked.getHours())}:${pad(picked.getMinutes())}`);
        }}
        onCancel={() => setPicking(false)}
        locale={language === 'fr' ? 'fr_FR' : 'en_US'}
      />
    </View>
  );
}
```

Dans `src/app/habits/new.tsx`, quatre remplacements :

<!-- bloc: new-1-avant -->

```tsx
import { HabitUseCases } from '@/use-cases/habit-use-cases';
```

<!-- bloc: new-1-apres -->

```tsx
import { HabitUseCases } from '@/use-cases/habit-use-cases';
import { HabitReminderField } from '@/features/habits/HabitReminderField';
```

<!-- bloc: new-2-avant -->

```tsx
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(3);
```

<!-- bloc: new-2-apres -->

```tsx
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(3);
  const [reminderTime, setReminderTime] = useState<string | undefined>(undefined);
```

<!-- bloc: new-3-avant -->

```tsx
        targetDaysPerWeek: frequency === 'WEEKLY' ? targetDaysPerWeek : undefined,
        color,
```

<!-- bloc: new-3-apres -->

```tsx
        targetDaysPerWeek: frequency === 'WEEKLY' ? targetDaysPerWeek : undefined,
        color,
        reminderTime,
```

<!-- bloc: new-4-avant -->

```tsx
          )}
        </View>

        {/* Carte 3 : Thème Couleur */}
```

<!-- bloc: new-4-apres -->

```tsx
          )}
          {/* Me le rappeler (fiche 019) */}
          <HabitReminderField value={reminderTime} onChange={setReminderTime} />
        </View>

        {/* Carte 3 : Thème Couleur */}
```

Dans `src/app/habits/[id].tsx` :

<!-- bloc: detail-1-avant -->

```tsx
import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
```

<!-- bloc: detail-1-apres -->

```tsx
import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
import { HabitReminderField } from '@/features/habits/HabitReminderField';
```

<!-- bloc: detail-2-avant -->

```tsx
        {/* Actions (Pause / Reprise) */}
```

<!-- bloc: detail-2-apres -->

```tsx
        {/* Me le rappeler (fiche 019) */}
        <View style={{ marginBottom: Spacing.lg }}>
          <HabitReminderField
            value={stats.habit.reminderTime}
            onChange={async value => {
              await HabitUseCases.updateHabit({ id, reminderTime: value ?? '' });
              loadData();
            }}
          />
        </View>

        {/* Actions (Pause / Reprise) */}
```

### Étape 9 — Les textes

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'notifAction.completed': "Rappel terminé",
```

<!-- bloc: fr-apres -->

```ts
  'notifAction.completed': "Rappel terminé",
  'notifAction.habitDone': "Fait",
  'notifAction.habitDoneSnack': "Habitude cochée pour aujourd'hui",
  'habitNotif.body': "C'est le moment. Touche « Fait » quand c'est fait.",
  'habitReminder.label': "Me le rappeler",
  'habitReminder.hint': "Le téléphone sonne à cette heure les jours où c'est encore à faire.",
  'habitReminder.at': "À {time}",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'notifAction.completed': "Reminder done",
```

<!-- bloc: en-apres -->

```ts
  'notifAction.completed': "Reminder done",
  'notifAction.habitDone': "Done",
  'notifAction.habitDoneSnack': "Habit ticked for today",
  'habitNotif.body': "It's time. Tap “Done” once it's done.",
  'habitReminder.label': "Remind me",
  'habitReminder.hint': "The phone rings at this time on the days it is still to do.",
  'habitReminder.at': "At {time}",
```

### Étape 10 — Les tests

Créer `src/domain/rules/__tests__/habit-notification-rules.test.ts` :

<!-- bloc: test -->

```ts
import type { Habit } from '../../entities';
import { notificationActionFor, notificationRoute } from '../reminder-notification-rules';
import { HABIT_ACTION_DONE, parseReminderTime, planHabitNotifications } from '../habit-notification-rules';

/** Wednesday 25 November 2026, 10:00. */
const now = new Date(2026, 10, 25, 10, 0);

const habit = (over: Partial<Habit> = {}): Habit =>
  ({
    id: 'h1',
    title: 'Méditer',
    frequency: 'DAILY',
    status: 'ACTIVE',
    reminderTime: '08:00',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '',
    ...over,
  }) as Habit;

const days = (planned: ReturnType<typeof planHabitNotifications>) =>
  planned.map(item => `${item.scheduledAt.getDate()} ${item.scheduledAt.getHours()}:${item.scheduledAt.getMinutes()}`);

describe('a habit that rings', () => {
  it('rings every day at its time, from the next one', () => {
    const planned = planHabitNotifications({ habits: [{ habit: habit(), completedDates: [] }], now });
    expect(days(planned)).toEqual(['26 8:0', '27 8:0', '28 8:0', '29 8:0', '30 8:0', '1 8:0']);
    expect(planned[0].body).toBe('C’est le moment. Touche « Fait » quand c’est fait.'.replace(/’/g, "'"));
  });

  it('does not ring a day already ticked', () => {
    const planned = planHabitNotifications({ habits: [{ habit: habit(), completedDates: ['2026-11-26'] }], now });
    expect(days(planned)[0]).toBe('27 8:0');
  });

  it('stops for the week once a weekly target is reached, and starts again on Monday', () => {
    const weekly = habit({ frequency: 'WEEKLY', targetDaysPerWeek: 2 });
    const planned = planHabitNotifications({ habits: [{ habit: weekly, completedDates: ['2026-11-23', '2026-11-24'] }], now });
    expect(days(planned)).toEqual(['30 8:0', '1 8:0']);
  });

  it('stays silent without a time, in a pause, or once deleted', () => {
    const silent = [habit({ reminderTime: undefined }), habit({ id: 'h2', status: 'PAUSED' }), habit({ id: 'h3', deletedAt: 'x' })];
    expect(planHabitNotifications({ habits: silent.map(item => ({ habit: item, completedDates: [] })), now })).toEqual([]);
  });

  it('is quieter at night', () => {
    const planned = planHabitNotifications({ habits: [{ habit: habit({ reminderTime: '23:00' }), completedDates: [] }], now });
    expect(planned[0].level).toBe('discreet');
  });

  it('reads its time, and its button ticks it and opens it', () => {
    expect(parseReminderTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseReminderTime('25:00')).toBeNull();
    expect(notificationActionFor(HABIT_ACTION_DONE)).toBe('habitDone');
    expect(notificationRoute({ type: 'HABIT', habitId: 'h1' })).toBe('/habits/h1');
  });
});
```

## 7. Test final

```bash
npx jest src/domain/rules/__tests__/habit-notification-rules.test.ts
npx jest
npx tsc --noEmit
npx eslint src/domain/rules/habit-notification-rules.ts src/services/habit-notification-service.ts src/services/notification-service.ts src/services/notification-action-service.ts src/use-cases/habit-use-cases.ts src/features/habits src/app/habits src/app/_layout.tsx src/domain/rules/reminder-notification-rules.ts src/repositories/habit-repository.ts
```

Attendu : `Tests: 6 passed` ; toute la suite passe ; `tsc` et `eslint` n'affichent rien.

**Sur le téléphone** : une habitude avec « Me le rappeler » à dans 2 minutes : la notification arrive avec « Fait » ; le toucher (appli fermée) coche l'habitude du jour (visible dans Progrès).

## 8. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Pas de bouton « Fait » | La catégorie n'a pas été recréée | Relancer l'appli (elle la crée au démarrage) |
| « Fait » ne coche pas, appli fermée | La tâche de fond n'est pas enregistrée | Vérifier `src/background/tasks.ts` : la même tâche que les rappels reçoit aussi les habitudes |
| Un ancien test d'action de rappel échoue | Il attend `'open'` pour un bouton inconnu | Les boutons de rappel sont inchangés ; seul `habit_done` est nouveau |

## Compte rendu d'exécution (23 novembre 2026)

- Lu avant d'écrire : les boutons des notifications de rappel (« Terminer », « Dans 1 h ») et la tâche de fond qui les reçoit appli fermée ; la création, la modification et le cochage des habitudes ; le formulaire et la page d'une habitude.
- Étapes 1 à 10 appliquées **à partir des blocs de cette fiche** (`docs/fiches/outils/appliquer-fiche-019.js`), du premier coup.
- Tests : `Tests: 6 passed` ; toute la suite `Test Suites: 94 passed`, `Tests: 1963 passed` ; `tsc` et `eslint` sans erreur.
- **Pas vérifié** : la notification, le bouton « Fait » et le champ « Me le rappeler » à l'écran (le web n'a pas de notifications locales). À voir sur le téléphone. Rien n'est encore enregistré dans git.

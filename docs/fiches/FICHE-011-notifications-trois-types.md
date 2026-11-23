# FICHE OPÉRATOIRE N° 011 — Les notifications des trois types, avec trois niveaux

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 010](FICHE-010-animation-lancement-orbe.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 12.6 (avec les précisions du 23 novembre) et 12.10 (chantier n° 2)

---

## 1. Objectif

Aujourd'hui, seuls les **rappels** notifient, et toujours de la même façon. Après cette fiche :

| Ce qui notifie | Quand | Niveau de départ |
|---|---|---|
| Un **rappel** (À faire avec alerte) | à son heure (inchangé) | Normal |
| Une **tâche avec une échéance** (À faire) | la **veille à 18 h** | Discret |
| | le **jour même à 9 h** | Normal |
| Un **Moment** | **15 min avant** le début | Normal |
| | à l'**heure de partir**, s'il a un lieu et un temps de trajet (« Partir … min avant ») | Normal |

Puis le niveau change selon les critères décidés (étude 12.6) :

- **urgent** (priorité « Urgente ») : **monte d'un niveau** (Normal → Alarme, Discret → Normal) ;
- **la nuit** (22 h à 7 h par défaut, **réglable** dans Réglages › Notifications) : **tout descend d'un niveau, sauf l'Alarme**.

Les trois niveaux sont trois **canaux Android** :

| Niveau | Canal | Ce que ça fait |
|---|---|---|
| **Discret** | `junix-pulse-level-discreet-v1` (nouveau) | Dans la liste des notifications, sans son, sans vibration, sans bandeau |
| **Normal** | le canal actuel des rappels | Son Junix Pulse, vibration, bandeau |
| **Alarme** | `junix-pulse-level-alarm-v1` (nouveau) | Importance maximale, vibration longue, visible sur l'écran verrouillé |

Si le son des notifications est coupé dans les Réglages, Normal et Alarme passent sur le canal silencieux qui existe déjà (comme aujourd'hui).

**Pas dans cette fiche** (décidé le 23 novembre) : les sons au choix et l'alarme qui sonne en continu (chantier n° 9) ; le critère « type de moment » (chantier n° 5, les types de moments n'existent pas encore).

**Pour que rien ne casse demain** : le choix du niveau est **une seule règle pure** (`notification-level-rules.ts`). Ajouter un critère (le type de moment au chantier 5), un niveau ou un moment, c'est modifier ce fichier et son test.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 010 est enregistrée | `git log --oneline -3` | `feat(launch): …` présent |
| La base est en version 33 | `src/database/migrations.ts`, dernière entrée | `version: 33` |
| Tout passe | `npx jest` | `Tests: 1904 passed` |

## 3. Matériel

Aucune bibliothèque ajoutée : `expo-notifications` est déjà là. Les noms des options des canaux (`importance`, `lockscreenVisibility`, `bypassDnd`, `AndroidNotificationVisibility`) ont été vérifiés dans les types d'`expo-notifications` installés (SDK 58) par `tsc`.

## 4. Hypothèses

- **Le téléphone visé est Android.** iOS ne garde que 64 notifications en attente : les rappels en prennent déjà 60 au plus. Les tâches et moments en ajoutent 40 au plus ; sur iOS, les plus lointaines attendraient la synchronisation suivante.
- Les heures (18 h, 9 h, la nuit) sont celles de **l'horloge du téléphone**, qui suit déjà le fuseau de l'utilisateur.
- **Ne pas déranger** n'est jamais contourné : le canal Alarme a `bypassDnd: false`. L'utilisateur peut l'autoriser lui-même dans les réglages Android du canal.
- Les notifications déjà programmées des rappels **changent de canal** à la première synchronisation (au lancement) : le niveau est rangé dans la notification, et une notification sans niveau compte comme « normale ».

## 5. Carte de l'intervention

| Fichier | Action | Rôle |
|---|---|---|
| `src/domain/rules/notification-level-rules.ts` | **créé** | La règle des niveaux, la nuit, le canal d'un niveau |
| `src/domain/rules/item-notification-rules.ts` | **créé** | Quelles notifications pour les tâches et les moments |
| `src/services/item-notification-service.ts` | **créé** | Garde le téléphone en accord avec la base, comme pour les rappels |
| `src/services/notification-service.ts` | modifié | Les deux nouveaux canaux, le niveau des rappels, `scheduleItem` |
| `src/domain/rules/reminder-notification-rules.ts` | modifié | Le niveau de chaque rappel ; toucher une notification ouvre la tâche ou le moment |
| `src/services/reminder-notification-service.ts` | modifié | Range le niveau, et relance aussi la synchronisation des tâches et moments |
| `src/database/migrations.ts` | modifié | **Version 34** : deux colonnes de réglages pour la nuit |
| `src/domain/entities/index.ts` | modifié | `quietHoursStart`, `quietHoursEnd` dans les réglages |
| `src/repositories/settings-repository.ts` | modifié | Lire et écrire ces deux réglages |
| `src/services/backup-service.ts` | modifié | Les sauvegardes emportent la nuit |
| `src/app/settings/index.tsx` | modifié | Le choix de la nuit dans Réglages › Notifications |
| `src/i18n/messages-rest-fr.ts` et `-en.ts` | modifiés | 13 textes, en français et en anglais |
| `src/use-cases/task-use-cases.ts` et `event-use-cases.ts` | modifiés | Resynchroniser après chaque changement |
| `src/app/_layout.tsx` | modifié | Appli ouverte : une notification discrète ne joue pas de son |
| `src/domain/rules/__tests__/notification-level-rules.test.ts` | **créé** | 5 tests |
| `src/domain/rules/__tests__/item-notification-rules.test.ts` | **créé** | 8 tests |

## 6. Sauvegarde

La migration 34 **ajoute** deux colonnes avec une valeur par défaut : aucune donnée n'est modifiée ni supprimée. Une ancienne sauvegarde (sans ces colonnes) se restaure toujours : les valeurs par défaut s'appliquent. Pour annuler avant le commit : `git restore` des fichiers modifiés et suppression des fichiers créés (la colonne ajoutée à la base du téléphone ou du web reste, sans gêner).

## 7. Étapes

### Étape 1 — La règle des niveaux

Créer `src/domain/rules/notification-level-rules.ts` :

<!-- bloc: level-rules -->

```ts
/**
 * How loud a notification is: discreet, normal or alarm (study 001, 12.6; sheet 011).
 * The level depends on what rings, its priority and the time of day. Pure: no phone, no
 * database, so every case is tested. A new criterion (the type of a moment) belongs here.
 */

import type { ReminderPriority } from '../entities';

export type NotificationLevel = 'discreet' | 'normal' | 'alarm';

/** From the quietest to the loudest: one level up or down is one step in this list. */
export const NOTIFICATION_LEVELS: readonly NotificationLevel[] = ['discreet', 'normal', 'alarm'];

/** What rings: a reminder, a deadline (the day before, the day itself), a moment (before it, time to leave). */
export type NotificationMoment = 'reminder' | 'taskEve' | 'taskDay' | 'momentBefore' | 'momentLeave';

/** The level of each moment before the criteria. The evening before a deadline only informs. */
export const BASE_LEVELS: Readonly<Record<NotificationMoment, NotificationLevel>> = {
  reminder: 'normal',
  taskEve: 'discreet',
  taskDay: 'normal',
  momentBefore: 'normal',
  momentLeave: 'normal',
};

/** The night, in whole hours of the phone's clock. The same start and end: no night. */
export interface QuietHours {
  startHour: number;
  endHour: number;
}

export const DEFAULT_QUIET_HOURS: QuietHours = { startHour: 22, endHour: 7 };

/** The night chosen in the settings, or the default one for settings saved before it existed. */
export function quietHoursOf(settings: { quietHoursStart?: number; quietHoursEnd?: number }): QuietHours {
  return {
    startHour: settings.quietHoursStart ?? DEFAULT_QUIET_HOURS.startHour,
    endHour: settings.quietHoursEnd ?? DEFAULT_QUIET_HOURS.endHour,
  };
}

export function isQuietTime(at: Date, quiet: QuietHours): boolean {
  const { startHour, endHour } = quiet;
  if (startHour === endHour) return false;
  const hour = at.getHours();
  // 22 to 7 goes past midnight; 1 to 6 does not
  return startHour > endHour ? hour >= startHour || hour < endHour : hour >= startHour && hour < endHour;
}

export interface NotificationLevelInput {
  moment: NotificationMoment;
  priority?: ReminderPriority;
  at: Date;
  quietHours?: QuietHours;
}

export function notificationLevelFor({
  moment,
  priority,
  at,
  quietHours = DEFAULT_QUIET_HOURS,
}: NotificationLevelInput): NotificationLevel {
  const loudest = NOTIFICATION_LEVELS.length - 1;
  let index = NOTIFICATION_LEVELS.indexOf(BASE_LEVELS[moment]);
  // Urgent goes up one level
  if (priority === 'URGENT') index = Math.min(index + 1, loudest);
  // At night everything goes down one level, except the alarm
  if (index < loudest && isQuietTime(at, quietHours)) index = Math.max(index - 1, 0);
  return NOTIFICATION_LEVELS[index];
}

/** The kind of Android channel of a level. With the sound switched off, nothing rings. */
export type NotificationChannelKind = 'discreet' | 'normal' | 'alarm' | 'silent';

export function notificationChannelFor(level: NotificationLevel, soundOn: boolean): NotificationChannelKind {
  if (level === 'discreet') return 'discreet';
  return soundOn ? level : 'silent';
}

/** The level kept in a notification; one planned before the levels existed was normal. */
export function levelOf(value: unknown): NotificationLevel {
  return NOTIFICATION_LEVELS.includes(value as NotificationLevel) ? (value as NotificationLevel) : 'normal';
}
```

| Passage | Ce qu'il fait |
|---|---|
| `NOTIFICATION_LEVELS` | Les niveaux rangés du plus calme au plus fort : « monter d'un niveau », c'est avancer d'une case |
| `BASE_LEVELS` | Le niveau de départ de chaque moment, avant les critères (la veille d'une échéance est seulement une information : Discret) |
| `quietHoursOf` | La nuit des réglages, ou 22 h - 7 h si le réglage n'existe pas encore (vieux réglages, tests) |
| `isQuietTime` | Vrai si l'heure est dans la nuit ; gère la nuit qui passe minuit (22 h → 7 h) ; début = fin veut dire « pas de nuit » |
| `priority === 'URGENT'` | Seule « Urgente » monte d'un niveau (« Haute » ne change rien) |
| `index < loudest && isQuietTime` | La nuit fait descendre, sauf ce qui est déjà une Alarme |
| `notificationChannelFor` | Le canal : Discret reste discret ; son coupé = canal silencieux |
| `levelOf` | Relit le niveau rangé dans une notification ; une ancienne sans niveau compte comme Normal |

### Étape 2 — Les notifications des tâches et des moments

Créer `src/domain/rules/item-notification-rules.ts` :

<!-- bloc: item-rules -->

```ts
/**
 * Which notifications the phone should hold for the tasks with a deadline and for the moments
 * (study 001, 12.6; sheet 011). The reminders keep their own rule (reminder-notification-rules).
 * - a task with a deadline: the day before at 18:00 and the day itself at 9:00;
 * - a moment: 15 minutes before it starts, and the time to leave when it has a place and a
 *   travel time (the "Leave … min before" of the form).
 */

import { Event, Task } from '../entities';
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import {
  DEFAULT_QUIET_HOURS,
  NotificationLevel,
  NotificationMoment,
  notificationLevelFor,
  QuietHours,
} from './notification-level-rules';

export const ITEM_IDENTIFIER_PREFIX = 'item-';
export const TASK_EVE_HOUR = 18;
export const TASK_DAY_HOUR = 9;
export const MOMENT_BEFORE_MINUTES = 15;
/** Places on the phone for these notifications, the nearest first; the reminders keep theirs. */
export const MAX_SCHEDULED_ITEMS = 40;
/** Moments further away are planned by a later sync. */
export const MOMENT_HORIZON_DAYS = 30;

export type ItemNotificationType = 'TASK' | 'EVENT';

export interface PlannedItemNotification {
  identifier: string;
  itemType: ItemNotificationType;
  itemId: string;
  moment: NotificationMoment;
  title: string;
  body: string;
  scheduledAt: Date;
  level: NotificationLevel;
}

export interface ItemPlanInput {
  tasks: readonly Task[];
  events: readonly Event[];
  now: Date;
  language?: AppLanguage;
  quietHours?: QuietHours;
}

const MINUTE = 60 * 1000;

/** A 'YYYY-MM-DD' day at an hour of the phone's clock, or null for a date that does not read. */
function dayAt(ymd: string, hour: number, dayShift = 0): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayShift, hour, 0, 0, 0);
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function planItemNotifications({
  tasks,
  events,
  now,
  language = 'fr',
  quietHours = DEFAULT_QUIET_HOURS,
}: ItemPlanInput): PlannedItemNotification[] {
  const planned: PlannedItemNotification[] = [];
  const add = (item: Omit<PlannedItemNotification, 'identifier' | 'level'>, priority?: Task['priority']) => {
    if (item.scheduledAt <= now) return;
    planned.push({
      ...item,
      // The time is in the identifier: a new date gives a new notification, and the old one is cancelled
      identifier: `${ITEM_IDENTIFIER_PREFIX}${item.itemType.toLowerCase()}-${item.itemId}-${item.moment}-${item.scheduledAt.getTime()}`,
      level: notificationLevelFor({ moment: item.moment, priority, at: item.scheduledAt, quietHours }),
    });
  };

  for (const task of tasks) {
    if (task.deletedAt || task.status === 'COMPLETED' || !task.dueDate) continue;
    const base = { itemType: 'TASK' as const, itemId: task.id, title: task.title };
    const eve = dayAt(task.dueDate, TASK_EVE_HOUR, -1);
    const day = dayAt(task.dueDate, TASK_DAY_HOUR);
    if (eve) add({ ...base, moment: 'taskEve', scheduledAt: eve, body: translate(language, 'itemNotif.taskEve') }, task.priority);
    if (day) add({ ...base, moment: 'taskDay', scheduledAt: day, body: translate(language, 'itemNotif.taskDay') }, task.priority);
  }

  const horizon = now.getTime() + MOMENT_HORIZON_DAYS * 24 * 60 * MINUTE;
  for (const event of events) {
    const start = new Date(event.startAt);
    if (event.deletedAt || Number.isNaN(start.getTime()) || start.getTime() > horizon) continue;
    const base = { itemType: 'EVENT' as const, itemId: event.id, title: event.title };
    const place = event.location?.trim() ?? '';
    const travel = event.travelBufferMinutes ?? 0;
    const leaves = place !== '' && travel > 0;
    if (leaves) {
      add({
        ...base,
        moment: 'momentLeave',
        scheduledAt: new Date(start.getTime() - travel * MINUTE),
        body: translate(language, 'itemNotif.momentLeave', { place, time: clock(start) }),
      });
    }
    // Leaving already warns this early or earlier: a second notice would only repeat it
    if (!leaves || travel < MOMENT_BEFORE_MINUTES) {
      add({
        ...base,
        moment: 'momentBefore',
        scheduledAt: new Date(start.getTime() - MOMENT_BEFORE_MINUTES * MINUTE),
        body: translate(language, 'itemNotif.momentBefore', { time: clock(start) }),
      });
    }
  }

  return planned.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()).slice(0, MAX_SCHEDULED_ITEMS);
}
```

| Passage | Ce qu'il fait |
|---|---|
| `ITEM_IDENTIFIER_PREFIX = 'item-'` | Toutes ces notifications commencent par `item-` : la synchronisation ne touche qu'elles, jamais celles des rappels (`reminder-`) |
| `dayAt('2026-11-25', 18, -1)` | Le 24 novembre à 18 h sur l'horloge du téléphone. Une échéance est un jour sans heure : on choisit l'heure ici |
| `add(…)` | Ignore ce qui est déjà passé, fabrique l'identifiant, calcule le niveau |
| identifiant avec l'heure | Si l'échéance change, l'identifiant change : l'ancienne notification est annulée, la nouvelle programmée |
| `task.status === 'COMPLETED'` | Une tâche faite ne prévient plus |
| `leaves` | « Partir » seulement s'il y a un lieu **et** un temps de trajet |
| `travel < MOMENT_BEFORE_MINUTES` | Avec 30 min de trajet, l'alerte de départ (T − 30) suffit ; avec 10 min, on garde aussi celle de T − 15 |
| `MOMENT_HORIZON_DAYS` | Seulement les moments des 30 prochains jours : la place sur le téléphone est limitée |
| `.slice(0, MAX_SCHEDULED_ITEMS)` | Les 40 plus proches ; les suivantes viendront aux synchronisations suivantes |

### Étape 3 — Le service qui synchronise

Créer `src/services/item-notification-service.ts` :

<!-- bloc: item-service -->

```ts
/**
 * Keeps the notifications of the tasks and moments held by the phone in line with the database
 * (sheet 011), as reminder-notification-service does for the reminders: it compares both sides
 * and only touches what differs, so it is safe to call after any change.
 */

import { ITEM_IDENTIFIER_PREFIX, planItemNotifications } from '@/domain/rules/item-notification-rules';
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { EventRepository } from '@/repositories/event-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';

let queue: Promise<unknown> = Promise.resolve();

async function sync(force: boolean): Promise<void> {
  try {
    const settings = await SettingsRepository.get();
    const planned = settings.notificationsEnabled
      ? planItemNotifications({
          tasks: await TaskRepository.findAllActive(),
          events: await EventRepository.findAll(),
          now: new Date(),
          language: useAppStore.getState().language,
          quietHours: quietHoursOf(settings),
        })
      : [];

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(ITEM_IDENTIFIER_PREFIX)
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
    // Never asks for the permission here: the reminders ask for it after an action of the user
    if (missing.length === 0 || !(await NotificationService.checkPermissions())) return;

    for (const item of missing) {
      await NotificationService.scheduleItem({
        identifier: item.identifier,
        itemType: item.itemType,
        itemId: item.itemId,
        title: item.title,
        body: item.body,
        scheduledAt: item.scheduledAt,
        level: item.level,
        soundOn: settings.notificationSoundEnabled,
      });
    }
  } catch {
    logger.error('[ItemNotificationService] Erreur lors de la synchronisation');
  }
}

/** Runs one sync at a time, so that two quick changes end on the latest data. */
export function syncItemNotifications(options: { force?: boolean } = {}): Promise<void> {
  const run = queue.then(() => sync(options.force ?? false));
  queue = run;
  return run;
}
```

| Passage | Ce qu'il fait |
|---|---|
| `findAllActive()` | Les tâches non supprimées et non faites |
| `EventRepository.findAll()` | Tous les moments ; la règle garde seulement ceux des 30 prochains jours (comparer des dates avec fuseau sous forme de texte, en SQL, serait faux) |
| boucle `held` | Ce que le téléphone garde déjà : si c'est encore juste (titre, texte, niveau), on n'y touche pas ; sinon on l'annule |
| `checkPermissions()` | Ne **demande** jamais la permission : ce sont les rappels qui la demandent après une action de l'utilisateur |
| `queue` | Une synchronisation à la fois : deux changements rapides finissent sur les données les plus récentes |

### Étape 4 — Les canaux et la programmation (`notification-service.ts`)

Six remplacements dans `src/services/notification-service.ts`.

**4a.** L'import de la règle :

<!-- bloc: ns-1-avant -->

```ts
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_SOUND_WAV_FILENAME } from "@/services/sound/notification-sound-constants";
```

<!-- bloc: ns-1-apres -->

```ts
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_SOUND_WAV_FILENAME } from "@/services/sound/notification-sound-constants";
import {
  notificationChannelFor,
  type NotificationChannelKind,
  type NotificationLevel,
} from "@/domain/rules/notification-level-rules";
```

**4b.** Les deux nouveaux canaux, et le canal de chaque niveau :

<!-- bloc: ns-2-avant -->

```ts
const NOTIFICATION_SILENT_CHANNEL_ID = "junix-pulse-reminders-silent-v1";
```

<!-- bloc: ns-2-apres -->

```ts
const NOTIFICATION_SILENT_CHANNEL_ID = "junix-pulse-reminders-silent-v1";
// The levels of study 001 (12.6). A channel's sound and importance are fixed when it is created:
// other settings mean a new identifier, never a change to these
const NOTIFICATION_DISCREET_CHANNEL_ID = "junix-pulse-level-discreet-v1";
const NOTIFICATION_ALARM_CHANNEL_ID = "junix-pulse-level-alarm-v1";

/** The Android channel of a level, given whether the notifications have their sound. */
export function channelIdFor(level: NotificationLevel, soundOn: boolean): string {
  const channels: Record<NotificationChannelKind, string> = {
    discreet: NOTIFICATION_DISCREET_CHANNEL_ID,
    normal: NOTIFICATION_CHANNEL_ID,
    alarm: NOTIFICATION_ALARM_CHANNEL_ID,
    silent: NOTIFICATION_SILENT_CHANNEL_ID,
  };
  return channels[notificationChannelFor(level, soundOn)];
}
```

**4c.** Le niveau d'un rappel, et les paramètres d'une tâche ou d'un moment :

<!-- bloc: ns-3-avant -->

```ts
  scheduledAt: Date;
  data?: Record<string, unknown>;
}
```

<!-- bloc: ns-3-apres -->

```ts
  scheduledAt: Date;
  data?: Record<string, unknown>;
  /** How loud it rings (sheet 011); normal when not given. */
  level?: NotificationLevel;
}

export interface ScheduleItemParams {
  identifier: string;
  itemType: "TASK" | "EVENT";
  itemId: string;
  title: string;
  body: string;
  scheduledAt: Date;
  level: NotificationLevel;
  soundOn: boolean;
}
```

**4d.** Créer les deux canaux au démarrage, juste après le canal silencieux :

<!-- bloc: ns-4-avant -->

```ts
          sound: null,
        });

        await Notifications.setNotificationChannelAsync(DAILY_RECAP_CHANNEL_ID, {
```

<!-- bloc: ns-4-apres -->

```ts
          sound: null,
        });

        // Discreet: in the list of notifications, without sound, vibration or banner
        await Notifications.setNotificationChannelAsync(NOTIFICATION_DISCREET_CHANNEL_ID, {
          name: t('notifChannel.discreetName'),
          description: t('notifChannel.discreetDesc'),
          importance: Notifications.AndroidImportance.LOW,
          enableVibrate: false,
          lightColor: "#8B3DF0",
          showBadge: false,
          sound: null,
        });

        // Alarm: the loudest, shown on the locked screen. It does not bypass Do not disturb: the user
        // can allow it in the settings of the phone
        await Notifications.setNotificationChannelAsync(NOTIFICATION_ALARM_CHANNEL_ID, {
          name: t('notifChannel.alarmName'),
          description: t('notifChannel.alarmDesc'),
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 600, 300, 600, 300, 600],
          lightColor: "#FFB4AB",
          enableVibrate: true,
          showBadge: false,
          sound: NOTIFICATION_SOUND_WAV_FILENAME,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
        });

        await Notifications.setNotificationChannelAsync(DAILY_RECAP_CHANNEL_ID, {
```

**4e.** Un rappel part sur le canal de son niveau, et garde son niveau dans ses données :

<!-- bloc: ns-5-avant -->

```ts
            reminderId: params.id,
            type: "REMINDER",
            ...params.data,
          },
          // iOS uses the filename; Android uses the channel's configured sound.
          sound: params.silent ? false : NOTIFICATION_SOUND_WAV_FILENAME,
          categoryIdentifier: REMINDER_CATEGORY_ID,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId:
            Platform.OS === "android"
              ? params.silent ? NOTIFICATION_SILENT_CHANNEL_ID : NOTIFICATION_CHANNEL_ID
              : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleReminder");
      return null;
    }
  },
```

<!-- bloc: ns-5-apres -->

```ts
            reminderId: params.id,
            type: "REMINDER",
            level: params.level ?? "normal",
            ...params.data,
          },
          // iOS uses the filename; Android uses the channel's configured sound.
          sound: params.silent || params.level === "discreet" ? false : NOTIFICATION_SOUND_WAV_FILENAME,
          categoryIdentifier: REMINDER_CATEGORY_ID,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: Platform.OS === "android" ? channelIdFor(params.level ?? "normal", !params.silent) : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleReminder");
      return null;
    }
  },

  /**
   * Plans the notification of a task or a moment (sheet 011), on the channel of its level.
   * Returns its identifier, or null when its time is past or planning failed.
   */
  async scheduleItem(params: ScheduleItemParams): Promise<string | null> {
    if (!Notifications || params.scheduledAt <= new Date()) return null;
    const priorities = {
      discreet: Notifications.AndroidNotificationPriority.LOW,
      normal: Notifications.AndroidNotificationPriority.HIGH,
      alarm: Notifications.AndroidNotificationPriority.MAX,
    };
    try {
      return await Notifications.scheduleNotificationAsync({
        identifier: params.identifier,
        content: {
          title: params.title,
          body: params.body,
          data: {
            type: params.itemType,
            [params.itemType === "TASK" ? "taskId" : "eventId"]: params.itemId,
            level: params.level,
          },
          sound: params.soundOn && params.level !== "discreet" ? NOTIFICATION_SOUND_WAV_FILENAME : false,
          priority: priorities[params.level],
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: params.scheduledAt,
          channelId: Platform.OS === "android" ? channelIdFor(params.level, params.soundOn) : undefined,
        } as import("expo-notifications").DateTriggerInput,
      });
    } catch {
      logger.error("[NotificationService] Erreur lors de scheduleItem");
      return null;
    }
  },
```

| Passage | Ce qu'il fait |
|---|---|
| `channelIdFor` | Traduit un niveau en identifiant de canal Android |
| `AndroidImportance.LOW` | Discret : la notification arrive dans la liste, sans bandeau ni son |
| `AndroidImportance.MAX` + `PUBLIC` | Alarme : la plus forte, lisible écran verrouillé |
| `bypassDnd: false` | On ne contourne **pas** « Ne pas déranger » (règle de sécurité du projet) |
| `level: params.level ?? "normal"` | Le niveau est rangé dans la notification : la synchronisation sait ainsi s'il a changé (la nuit, l'urgence) |
| `scheduleItem` | La même programmation que pour un rappel, sans les boutons « Terminer » et « Dans 1 h » (propres aux rappels) |
| `[… ? "taskId" : "eventId"]` | La notification garde l'identifiant de la tâche ou du moment, pour l'ouvrir quand on la touche |

### Étape 5 — Le niveau des rappels, et ce qu'ouvre une notification

Huit remplacements dans `src/domain/rules/reminder-notification-rules.ts`.

<!-- bloc: rr-1-avant -->

```ts
import { getNextOccurrence } from './reminder-rules';
```

<!-- bloc: rr-1-apres -->

```ts
import { getNextOccurrence } from './reminder-rules';
import { DEFAULT_QUIET_HOURS, NotificationLevel, notificationLevelFor, QuietHours } from './notification-level-rules';
```

<!-- bloc: rr-2-avant -->

```ts
  scheduledAt: Date;
}

export interface ReminderToPlan {
```

<!-- bloc: rr-2-apres -->

```ts
  scheduledAt: Date;
  /** How loud it rings (sheet 011). */
  level: NotificationLevel;
}

export interface ReminderToPlan {
```

<!-- bloc: rr-3-avant -->

```ts
function confirmationRepeats(item: ReminderToPlan, now: Date, language: AppLanguage): PlannedReminderNotification[] {
```

<!-- bloc: rr-3-apres -->

```ts
function confirmationRepeats(
  item: ReminderToPlan,
  now: Date,
  language: AppLanguage,
  quietHours: QuietHours
): PlannedReminderNotification[] {
```

<!-- bloc: rr-4-avant -->

```ts
        body: translate(language, 'reminderNotif.confirmAgain'),
        scheduledAt,
      });
```

<!-- bloc: rr-4-apres -->

```ts
        body: translate(language, 'reminderNotif.confirmAgain'),
        scheduledAt,
        level: notificationLevelFor({ moment: 'reminder', priority: item.reminder.priority, at: scheduledAt, quietHours }),
      });
```

<!-- bloc: rr-5-avant -->

```ts
  language: AppLanguage = 'fr'
): PlannedReminderNotification[] {
```

<!-- bloc: rr-5-apres -->

```ts
  language: AppLanguage = 'fr',
  quietHours: QuietHours = DEFAULT_QUIET_HOURS
): PlannedReminderNotification[] {
```

<!-- bloc: rr-6-avant -->

```ts
          body: bodyOf(item.reminder, language),
          scheduledAt,
        };
```

<!-- bloc: rr-6-apres -->

```ts
          body: bodyOf(item.reminder, language),
          scheduledAt,
          level: notificationLevelFor({ moment: 'reminder', priority: item.reminder.priority, at: scheduledAt, quietHours }),
        };
```

<!-- bloc: rr-7-avant -->

```ts
    .flatMap(item => confirmationRepeats(item, now, language))
```

<!-- bloc: rr-7-apres -->

```ts
    .flatMap(item => confirmationRepeats(item, now, language, quietHours))
```

<!-- bloc: rr-8-avant -->

```ts
  if (typeof data?.reminderId === 'string') return `/reminders/${data.reminderId}`;
```

<!-- bloc: rr-8-apres -->

```ts
  if (typeof data?.reminderId === 'string') return `/reminders/${data.reminderId}`;
  // A deadline or a moment (sheet 011): its own screen
  if (data?.type === 'TASK' && typeof data.taskId === 'string') return `/tasks/${data.taskId}`;
  if (data?.type === 'EVENT' && typeof data.eventId === 'string') return `/events/${data.eventId}`;
```

| Remplacement | Rôle |
|---|---|
| 1 | Importe la règle des niveaux |
| 2 | Chaque notification de rappel prévue porte son niveau |
| 3, 7 | Les relances (« Toujours à faire ») connaissent la nuit choisie |
| 4, 6 | Le niveau de chaque notification, calculé à **son** heure (une relance de 22 h 05 est de nuit) |
| 5 | La nuit devient un paramètre, 22 h - 7 h par défaut : les appels existants (et leurs tests) marchent sans changer |
| 8 | Toucher la notification d'une tâche ouvre la tâche, celle d'un moment ouvre le moment |

### Étape 6 — La synchronisation des rappels range le niveau, et entraîne celle des tâches et moments

Quatre remplacements dans `src/services/reminder-notification-service.ts`.

<!-- bloc: rs-1-avant -->

```ts
import { NotificationService } from '@/services/notification-service';
```

<!-- bloc: rs-1-apres -->

```ts
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { NotificationService } from '@/services/notification-service';
import { syncItemNotifications } from '@/services/item-notification-service';
```

<!-- bloc: rs-2-avant -->

```ts
      ? planReminderNotifications(await loadReminders(), new Date(), useAppStore.getState().language)
```

<!-- bloc: rs-2-apres -->

```ts
      ? planReminderNotifications(
          await loadReminders(),
          new Date(),
          useAppStore.getState().language,
          quietHoursOf(settings)
        )
```

<!-- bloc: rs-3-avant -->

```ts
        item.body === request.content.body &&
```

<!-- bloc: rs-3-apres -->

```ts
        item.body === request.content.body &&
        // A reminder whose level changed (night, urgency) moves to the channel of its new level
        levelOf(request.content.data?.level) === item.level &&
```

<!-- bloc: rs-4-avant -->

```ts
        scheduledAt: item.scheduledAt,
        silent: !settings.notificationSoundEnabled,
```

<!-- bloc: rs-4-apres -->

```ts
        scheduledAt: item.scheduledAt,
        silent: !settings.notificationSoundEnabled,
        level: item.level,
```

<!-- bloc: rs-5-avant -->

```ts
  const run = queue.then(() => sync(options));
  queue = run;
  return run.then(report => {
```

<!-- bloc: rs-5-apres -->

```ts
  const run = queue.then(() => sync(options));
  queue = run;
  // The tasks and moments follow the same changes (settings, language, permission, launch)
  void syncItemNotifications({ force: options.force });
  return run.then(report => {
```

| Remplacement | Rôle |
|---|---|
| 2 | La nuit des réglages entre dans le calcul |
| 3 | Un rappel déjà programmé dont le niveau a changé est reprogrammé sur le bon canal |
| 4 | Le niveau part avec le rappel |
| 5 | **Partout** où les rappels se resynchronisent (lancement, réglages, langue, alarmes exactes), les tâches et moments suivent, sans toucher à ces écrans |

### Étape 7 — La nuit dans les réglages (base, entité, dépôt, sauvegarde)

**7a. Migration 34** — dans `src/database/migrations.ts`, à la fin de la liste :

<!-- bloc: mig-avant -->

```ts
      CREATE INDEX IF NOT EXISTS idx_event_tags_tag ON event_tags(tag_id);
    `,
  },
];
```

<!-- bloc: mig-apres -->

```ts
      CREATE INDEX IF NOT EXISTS idx_event_tags_tag ON event_tags(tag_id);
    `,
  },
  {
    version: 34,
    name: 'add_quiet_hours',
    sql: `
      -- La nuit des notifications (fiche 011) : entre ces deux heures, tout descend
      -- d un niveau sauf les alarmes. 22 et 7 par defaut, reglables dans les Parametres.
      ALTER TABLE settings ADD COLUMN quiet_hours_start INTEGER NOT NULL DEFAULT 22;
      ALTER TABLE settings ADD COLUMN quiet_hours_end INTEGER NOT NULL DEFAULT 7;
    `,
  },
];
```

> Les commentaires SQL n'ont **ni apostrophe ni accent** (« d un niveau », « reglables ») : c'est la règle du projet, vérifiée par un test.

Un ancien test (`src/__tests__/coloured-tags.test.ts`) vérifiait que la migration 33 était **la dernière** : il échouerait à chaque nouvelle migration. On garde ce qu'il protège vraiment (33 à sa place, les versions dans l'ordre) :

<!-- bloc: tag-test-avant -->

```ts
  it('is the last migration', () => {
    expect(Math.max(...MIGRATIONS.map(m => m.version))).toBe(33);
  });
```

<!-- bloc: tag-test-apres -->

```ts
  // Later sheets add migrations after it (34: the night of the notifications, sheet 011)
  it('keeps its place, right after 32, with the versions in order', () => {
    const versions = MIGRATIONS.map(m => m.version);
    expect(versions.indexOf(33)).toBe(versions.indexOf(32) + 1);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
  });
```

**7b. L'entité** — dans `src/domain/entities/index.ts` :

<!-- bloc: ent-avant -->

```ts
  morningBriefingHour: number; // Heure du résumé matin (ex: 8)
```

<!-- bloc: ent-apres -->

```ts
  morningBriefingHour: number; // Heure du résumé matin (ex: 8)
  /**
   * The night of the notifications, in hours (sheet 011): everything goes down one level,
   * except alarms. 22 and 7 by default; absent from settings built before it existed.
   */
  quietHoursStart?: number;
  quietHoursEnd?: number;
```

**7c. Le dépôt** — dans `src/repositories/settings-repository.ts`, la lecture :

<!-- bloc: repo-1-avant -->

```ts
    morningBriefingHour: (row.morning_briefing_hour as number) ?? 8,
```

<!-- bloc: repo-1-apres -->

```ts
    morningBriefingHour: (row.morning_briefing_hour as number) ?? 8,
    quietHoursStart: (row.quiet_hours_start as number | undefined) ?? 22,
    quietHoursEnd: (row.quiet_hours_end as number | undefined) ?? 7,
```

puis l'écriture :

<!-- bloc: repo-2-avant -->

```ts
    if (params.morningBriefingHour !== undefined) {
      setClauses.push('morning_briefing_hour = ?');
      values.push(params.morningBriefingHour);
    }
```

<!-- bloc: repo-2-apres -->

```ts
    if (params.morningBriefingHour !== undefined) {
      setClauses.push('morning_briefing_hour = ?');
      values.push(params.morningBriefingHour);
    }
    if (params.quietHoursStart !== undefined) {
      setClauses.push('quiet_hours_start = ?');
      values.push(params.quietHoursStart);
    }
    if (params.quietHoursEnd !== undefined) {
      setClauses.push('quiet_hours_end = ?');
      values.push(params.quietHoursEnd);
    }
```

**7d. La sauvegarde** — dans `src/services/backup-service.ts`, la liste des colonnes exportées des réglages, puis celle des nombres entiers :

<!-- bloc: bk-1-avant -->

```ts
'language', 'notification_sound_enabled', 'haptics_enabled', 'created_at', 'updated_at'],
```

<!-- bloc: bk-1-apres -->

```ts
'language', 'notification_sound_enabled', 'haptics_enabled', 'quiet_hours_start', 'quiet_hours_end', 'created_at', 'updated_at'],
```

<!-- bloc: bk-2-avant -->

```ts
'mascot_briefings', 'notification_sound_enabled', 'haptics_enabled'],
```

<!-- bloc: bk-2-apres -->

```ts
'mascot_briefings', 'notification_sound_enabled', 'haptics_enabled', 'quiet_hours_start', 'quiet_hours_end'],
```

> Ces deux colonnes ne sont **pas** dans la liste des colonnes obligatoires : une sauvegarde faite avant cette fiche se restaure toujours, avec 22 h et 7 h.

### Étape 8 — Le choix de la nuit dans Réglages › Notifications

Dans `src/app/settings/index.tsx`, la fonction qui enregistre, juste après celle de l'heure du soir :

<!-- bloc: set-1-avant -->

```tsx
      showSnackbar(t('settingsScreen.eveningSet', { hour }));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };
```

<!-- bloc: set-1-apres -->

```tsx
      showSnackbar(t('settingsScreen.eveningSet', { hour }));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  // The night of the notifications (sheet 011): the planned notifications follow at once
  const handleUpdateQuietHours = async (change: { quietHoursStart?: number; quietHoursEnd?: number }) => {
    try {
      await SettingsRepository.update({ ...change, updatedAt: new Date().toISOString() });
      setSettings(s => (s ? { ...s, ...change } : s));
      await syncReminderNotifications();
      showSnackbar(t('settingsScreen.nightSaved'));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };
```

puis les heures, sous l'interrupteur du son :

<!-- bloc: set-2-avant -->

```tsx
            accessibilityLabel={t('settingsScreen.soundLabel')}
          />
        </View>
      )}
```

<!-- bloc: set-2-apres -->

```tsx
            accessibilityLabel={t('settingsScreen.soundLabel')}
          />
        </View>
      )}

      {settings.notificationsEnabled && (
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>{t('settingsScreen.nightLabel')}</Text>
          <Text style={styles.rowSub}>{t('settingsScreen.nightHint')}</Text>
          <Text style={styles.rowSub}>{t('settingsScreen.nightStart')}</Text>
          {renderHourPills([21, 22, 23], settings.quietHoursStart ?? 22, hour =>
            handleUpdateQuietHours({ quietHoursStart: hour })
          )}
          <Text style={styles.rowSub}>{t('settingsScreen.nightEnd')}</Text>
          {renderHourPills([6, 7, 8], settings.quietHoursEnd ?? 7, hour => handleUpdateQuietHours({ quietHoursEnd: hour }))}
        </View>
      )}
```

| Passage | Ce qu'il fait |
|---|---|
| `handleUpdateQuietHours` | Enregistre, met l'écran à jour, puis reprogramme tout (rappels, tâches, moments) avec la nouvelle nuit |
| `renderHourPills([21, 22, 23], …)` | Les mêmes boutons d'heure que pour le point du matin : début de la nuit à 21 h, 22 h ou 23 h ; fin à 6 h, 7 h ou 8 h |

### Étape 9 — Les textes (français et anglais)

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'reminderNotif.confirmAgain': "Toujours à faire : touchez « Terminer » ou « Dans 1 h ».",
```

<!-- bloc: fr-apres -->

```ts
  'reminderNotif.confirmAgain': "Toujours à faire : touchez « Terminer » ou « Dans 1 h ».",
  'itemNotif.taskEve': "À rendre demain.",
  'itemNotif.taskDay': "À rendre aujourd'hui.",
  'itemNotif.momentBefore': "Commence à {time}.",
  'itemNotif.momentLeave': "Il est temps de partir : {place}, à {time}.",
  'notifChannel.discreetName': "Notifications discrètes",
  'notifChannel.discreetDesc': "Sans son ni vibration : la veille d'une échéance, et la nuit.",
  'notifChannel.alarmName': "Alarmes",
  'notifChannel.alarmDesc': "Les choses urgentes : son, vibration longue, visibles écran verrouillé.",
  'settingsScreen.nightLabel': "Nuit plus calme",
  'settingsScreen.nightHint': "Entre ces heures, les notifications sont plus discrètes. Les alarmes sonnent toujours.",
  'settingsScreen.nightStart': "Début",
  'settingsScreen.nightEnd': "Fin",
  'settingsScreen.nightSaved': "Horaires de nuit enregistrés",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'reminderNotif.confirmAgain': "Still to do: tap “Done” or “In 1 h”.",
```

<!-- bloc: en-apres -->

```ts
  'reminderNotif.confirmAgain': "Still to do: tap “Done” or “In 1 h”.",
  'itemNotif.taskEve': "Due tomorrow.",
  'itemNotif.taskDay': "Due today.",
  'itemNotif.momentBefore': "Starts at {time}.",
  'itemNotif.momentLeave': "Time to leave: {place}, at {time}.",
  'notifChannel.discreetName': "Quiet notifications",
  'notifChannel.discreetDesc': "No sound or vibration: the day before a deadline, and at night.",
  'notifChannel.alarmName': "Alarms",
  'notifChannel.alarmDesc': "Urgent things: sound, long vibration, shown on the lock screen.",
  'settingsScreen.nightLabel': "Quieter night",
  'settingsScreen.nightHint': "Between these hours, notifications are quieter. Alarms still ring.",
  'settingsScreen.nightStart': "Start",
  'settingsScreen.nightEnd': "End",
  'settingsScreen.nightSaved': "Night hours saved",
```

### Étape 10 — Resynchroniser après chaque changement de tâche ou de moment

Dans `src/use-cases/task-use-cases.ts` (7 remplacements) :

<!-- bloc: tu-1-avant -->

```ts
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';

// ─── Interfaces d'entrée
```

<!-- bloc: tu-1-apres -->

```ts
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
import { syncItemNotifications } from '../services/item-notification-service';

// ─── Interfaces d'entrée
```

<!-- bloc: tu-2-avant -->

```ts
    emitMascotEvent({ type: 'ITEM_CREATED' });
    return taskId;
```

<!-- bloc: tu-2-apres -->

```ts
    emitMascotEvent({ type: 'ITEM_CREATED' });
    void syncItemNotifications();
    return taskId;
```

<!-- bloc: tu-3-avant -->

```ts
    if (tagIds !== undefined) await TagRepository.setFor('task', input.id, tagIds);
  },
```

<!-- bloc: tu-3-apres -->

```ts
    if (tagIds !== undefined) await TagRepository.setFor('task', input.id, tagIds);
    void syncItemNotifications();
  },
```

<!-- bloc: tu-4-avant -->

```ts
    await GoalUseCases.refreshGoalsOfTask(id).catch(() => {});
    return newStatus;
```

<!-- bloc: tu-4-apres -->

```ts
    await GoalUseCases.refreshGoalsOfTask(id).catch(() => {});
    void syncItemNotifications();
    return newStatus;
```

<!-- bloc: tu-5-avant -->

```ts
    await TaskRepository.softDelete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
```

<!-- bloc: tu-5-apres -->

```ts
    await TaskRepository.softDelete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
    void syncItemNotifications();
```

<!-- bloc: tu-6-avant -->

```ts
        await TaskRepository.undoDelete(id, undoNow);
```

<!-- bloc: tu-6-apres -->

```ts
        await TaskRepository.undoDelete(id, undoNow);
        void syncItemNotifications();
```

<!-- bloc: tu-7-avant -->

```ts
    await TaskRepository.undoDelete(id, now);
  },
```

<!-- bloc: tu-7-apres -->

```ts
    await TaskRepository.undoDelete(id, now);
    void syncItemNotifications();
  },
```

Dans `src/use-cases/event-use-cases.ts` (5 remplacements) :

<!-- bloc: eu-1-avant -->

```ts
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
```

<!-- bloc: eu-1-apres -->

```ts
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';
import { syncItemNotifications } from '../services/item-notification-service';
```

<!-- bloc: eu-2-avant -->

```ts
    emitMascotEvent({ type: 'ITEM_CREATED' });
    return eventId;
```

<!-- bloc: eu-2-apres -->

```ts
    emitMascotEvent({ type: 'ITEM_CREATED' });
    void syncItemNotifications();
    return eventId;
```

<!-- bloc: eu-3-avant -->

```ts
    if (input.tagIds !== undefined) await TagRepository.setFor('event', input.id, input.tagIds);
  },
```

<!-- bloc: eu-3-apres -->

```ts
    if (input.tagIds !== undefined) await TagRepository.setFor('event', input.id, input.tagIds);
    void syncItemNotifications();
  },
```

<!-- bloc: eu-4-avant -->

```ts
    await EventRepository.softDelete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
```

<!-- bloc: eu-4-apres -->

```ts
    await EventRepository.softDelete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
    void syncItemNotifications();
```

<!-- bloc: eu-5-avant -->

```ts
    await EventRepository.undoDelete(id, now);
  },
};
```

<!-- bloc: eu-5-apres -->

```ts
    await EventRepository.undoDelete(id, now);
    void syncItemNotifications();
  },
};
```

> `void syncItemNotifications()` : on lance la synchronisation **sans l'attendre**. L'écran ne ralentit pas, et une erreur de notification ne bloque jamais l'enregistrement d'une tâche (elle est attrapée dans le service).

### Étape 11 — Appli ouverte : une notification discrète reste silencieuse

Dans `src/app/_layout.tsx` :

<!-- bloc: lay-avant -->

```tsx
      NotificationSoundService.play(!splashFinishedRef.current);
```

<!-- bloc: lay-apres -->

```tsx
      // A discreet notification stays silent, in the app too (sheet 011)
      if (data?.level !== "discreet") NotificationSoundService.play(!splashFinishedRef.current);
```

### Étape 12 — Les tests

Créer `src/domain/rules/__tests__/notification-level-rules.test.ts` :

<!-- bloc: test-levels -->

```ts
import {
  DEFAULT_QUIET_HOURS,
  isQuietTime,
  levelOf,
  notificationChannelFor,
  notificationLevelFor,
  quietHoursOf,
} from '../notification-level-rules';

/** A day of November 2026 at this hour and a half, on the phone's clock. */
const at = (hour: number) => new Date(2026, 10, 25, hour, 30);

describe('notification levels', () => {
  it('gives each moment its level by day', () => {
    expect(notificationLevelFor({ moment: 'reminder', at: at(10) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'taskEve', at: at(18) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'taskDay', at: at(9) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', at: at(14) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentLeave', at: at(14) })).toBe('normal');
  });

  it('raises what is urgent by one level, up to the alarm', () => {
    expect(notificationLevelFor({ moment: 'reminder', priority: 'URGENT', at: at(10) })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'taskEve', priority: 'URGENT', at: at(18) })).toBe('normal');
    expect(notificationLevelFor({ moment: 'reminder', priority: 'HIGH', at: at(10) })).toBe('normal');
  });

  it('lowers everything at night, except the alarm', () => {
    expect(notificationLevelFor({ moment: 'reminder', at: at(23) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'reminder', at: at(3) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'taskEve', at: at(23) })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'reminder', priority: 'URGENT', at: at(23) })).toBe('alarm');
  });

  it('follows the night chosen in the settings', () => {
    const quiet = { startHour: 23, endHour: 6 };
    expect(isQuietTime(at(22), quiet)).toBe(false);
    expect(isQuietTime(at(23), quiet)).toBe(true);
    expect(isQuietTime(at(5), quiet)).toBe(true);
    expect(isQuietTime(at(6), quiet)).toBe(false);
    expect(isQuietTime(at(3), { startHour: 1, endHour: 6 })).toBe(true);
    expect(isQuietTime(at(3), { startHour: 7, endHour: 7 })).toBe(false);
    expect(notificationLevelFor({ moment: 'reminder', at: at(22), quietHours: quiet })).toBe('normal');
    expect(quietHoursOf({})).toEqual(DEFAULT_QUIET_HOURS);
    expect(quietHoursOf({ quietHoursStart: 23, quietHoursEnd: 6 })).toEqual(quiet);
  });

  it('gives each level its channel, silent when the sound is off', () => {
    expect(notificationChannelFor('alarm', true)).toBe('alarm');
    expect(notificationChannelFor('alarm', false)).toBe('silent');
    expect(notificationChannelFor('normal', false)).toBe('silent');
    expect(notificationChannelFor('discreet', true)).toBe('discreet');
    expect(levelOf(undefined)).toBe('normal');
    expect(levelOf('alarm')).toBe('alarm');
    expect(levelOf('loud')).toBe('normal');
  });
});
```

Créer `src/domain/rules/__tests__/item-notification-rules.test.ts` :

<!-- bloc: test-items -->

```ts
import { Event, Task } from '../../entities';
import { MAX_SCHEDULED_ITEMS, planItemNotifications } from '../item-notification-rules';

const now = new Date(2026, 10, 20, 12, 0);

const task = (over: Partial<Task> = {}): Task =>
  ({
    id: 't1',
    title: 'Rendre le dossier',
    status: 'SCHEDULED',
    priority: 'NORMAL',
    dueDate: '2026-11-25',
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Task;

const event = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  title: 'Dîner chez Léa',
  startAt: new Date(2026, 10, 22, 19, 0).toISOString(),
  endAt: new Date(2026, 10, 22, 21, 0).toISOString(),
  timezone: 'Europe/Paris',
  type: 'BUSY',
  createdAt: '',
  updatedAt: '',
  ...over,
});

const summary = (items: ReturnType<typeof planItemNotifications>) =>
  items.map(item => [item.moment, item.scheduledAt.getDate(), item.scheduledAt.getHours(), item.scheduledAt.getMinutes(), item.level]);

describe('notifications of tasks and moments', () => {
  it('warns of a deadline the day before at 18:00, quietly, and the day itself at 9:00', () => {
    const planned = planItemNotifications({ tasks: [task()], events: [], now });
    expect(summary(planned)).toEqual([
      ['taskEve', 24, 18, 0, 'discreet'],
      ['taskDay', 25, 9, 0, 'normal'],
    ]);
    expect(planned[0].body).toBe('À rendre demain.');
    expect(planned[1].body).toBe("À rendre aujourd'hui.");
    expect(planned[1].identifier.startsWith('item-task-t1-taskDay-')).toBe(true);
  });

  it('rings the alarm on the day of an urgent deadline', () => {
    const planned = planItemNotifications({ tasks: [task({ priority: 'URGENT' })], events: [], now });
    expect(planned.map(item => item.level)).toEqual(['normal', 'alarm']);
  });

  it('forgets the tasks done, deleted, without a deadline, or already past', () => {
    const tasks = [
      task({ status: 'COMPLETED' }),
      task({ id: 't2', deletedAt: '2026-11-19T10:00:00Z' }),
      task({ id: 't3', dueDate: undefined }),
      task({ id: 't4', dueDate: '2026-11-20' }),
      task({ id: 't5', dueDate: 'demain' }),
    ];
    expect(planItemNotifications({ tasks, events: [], now })).toEqual([]);
  });

  it('warns 15 minutes before a moment', () => {
    const planned = planItemNotifications({ tasks: [], events: [event()], now });
    expect(summary(planned)).toEqual([['momentBefore', 22, 18, 45, 'normal']]);
    expect(planned[0].body).toBe('Commence à 19:00.');
  });

  it('says when to leave for a moment with a place, instead of a second early notice', () => {
    const far = planItemNotifications({ tasks: [], events: [event({ location: 'Chez Léa', travelBufferMinutes: 30 })], now });
    expect(summary(far)).toEqual([['momentLeave', 22, 18, 30, 'normal']]);
    expect(far[0].body).toBe('Il est temps de partir : Chez Léa, à 19:00.');

    const near = planItemNotifications({ tasks: [], events: [event({ location: 'Chez Léa', travelBufferMinutes: 10 })], now });
    expect(summary(near)).toEqual([
      ['momentBefore', 22, 18, 45, 'normal'],
      ['momentLeave', 22, 18, 50, 'normal'],
    ]);

    const noPlace = planItemNotifications({ tasks: [], events: [event({ travelBufferMinutes: 30 })], now });
    expect(summary(noPlace)).toEqual([['momentBefore', 22, 18, 45, 'normal']]);
  });

  it('gives a new identifier when the date moves, so the old notification is cancelled', () => {
    const before = planItemNotifications({ tasks: [task()], events: [], now });
    const after = planItemNotifications({ tasks: [task({ dueDate: '2026-11-26' })], events: [], now });
    expect(after[0].identifier).not.toBe(before[0].identifier);
  });

  it('plans only the moments of the next 30 days, and at most 40 notifications', () => {
    const later = event({ startAt: new Date(2026, 11, 31, 19, 0).toISOString() });
    expect(planItemNotifications({ tasks: [], events: [later], now })).toEqual([]);

    const many = Array.from({ length: 30 }, (_, n) => task({ id: `t${n}` }));
    expect(planItemNotifications({ tasks: many, events: [], now })).toHaveLength(MAX_SCHEDULED_ITEMS);
  });

  it('speaks English when the app does', () => {
    const planned = planItemNotifications({ tasks: [task()], events: [], now, language: 'en' });
    expect(planned.map(item => item.body)).toEqual(['Due tomorrow.', 'Due today.']);
  });
});
```

| Test | Ce qu'il prouve |
|---|---|
| niveaux de jour, urgent, nuit | Chaque critère de l'étude 12.6, un par un |
| nuit réglée | 23 h - 6 h marche, la nuit qui ne passe pas minuit aussi, et « début = fin » veut dire pas de nuit |
| canal | Discret reste discret ; son coupé = silencieux ; un niveau inconnu redevient Normal |
| échéance | La veille 18 h (Discret) et le jour 9 h (Normal), avec les bons textes |
| urgent | Le jour d'une échéance urgente sonne en Alarme |
| oublis | Tâche faite, supprimée, sans échéance, passée, ou date illisible : aucune notification |
| moment | 15 min avant ; « partir » remplace l'avertissement si le trajet dure 15 min ou plus ; pas de « partir » sans lieu |
| nouvel identifiant | Changer l'échéance annule l'ancienne notification |
| limites | 30 jours, 40 notifications |
| anglais | Les textes suivent la langue de l'appli |

## 8. Test final

```bash
npx jest src/domain/rules/__tests__/notification-level-rules.test.ts src/domain/rules/__tests__/item-notification-rules.test.ts
npx jest
npx tsc --noEmit
npx eslint src/domain/rules/notification-level-rules.ts src/domain/rules/item-notification-rules.ts src/services/item-notification-service.ts src/services/notification-service.ts src/domain/rules/reminder-notification-rules.ts src/services/reminder-notification-service.ts src/app/settings/index.tsx src/use-cases/task-use-cases.ts src/use-cases/event-use-cases.ts src/app/_layout.tsx src/repositories/settings-repository.ts src/services/backup-service.ts src/database/migrations.ts
```

Résultat attendu : `Tests: 13 passed` pour les deux nouveaux fichiers ; toute la suite passe ; `tsc` et `eslint` n'affichent rien.

**Sur le web** : Réglages › Notifications montre « Nuit plus calme » avec Début (21, 22, 23) et Fin (6, 7, 8) ; un choix affiche « Horaires de nuit enregistrés ». (Le web n'a pas de notifications locales.)

**Sur le téléphone** (nouvel APK, fiche 003) :
1. Une tâche avec une échéance **demain** : à 18 h, une notification discrète (sans son) ; demain 9 h, une notification normale. La toucher ouvre la tâche.
2. Un moment dans 20 min : notification 15 min avant. Avec un lieu et « Partir 30 min avant » : la notification « Il est temps de partir ».
3. Un rappel **Urgent** : vibration longue, visible écran verrouillé.
4. Réglages Android › Applis › Junix Pulse › Notifications : les canaux « Notifications discrètes » et « Alarmes » existent.
5. Un rappel normal programmé à 23 h : il arrive sans son.

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Aucune notification pour une tâche | Pas d'échéance (seule la date d'échéance compte, pas la date prévue), ou tâche faite | Mettre une échéance dans la fiche de la tâche |
| Les notifications de tâches n'arrivent pas, celles des rappels oui | La permission n'a jamais été donnée (seuls les rappels la demandent) | Créer un rappel une fois, ou Réglages Android › Notifications |
| Le canal Alarme ne sonne pas en « Ne pas déranger » | Voulu : on ne contourne pas ce mode | Réglages Android du canal « Alarmes » › Ignorer Ne pas déranger |
| Un test ancien des rappels attend une liste sans `level` | Les notifications prévues portent maintenant leur niveau | Ajouter `level` à l'objet attendu, ou comparer avec `expect.objectContaining` |
| `Property 'quietHoursStart' does not exist` | Étape 7b oubliée | Ajouter les deux champs à l'entité `Settings` |
| `Cannot find name 'AndroidNotificationVisibility'` | Nom différent dans cette version d'Expo | Chercher `lockscreenVisibility` dans `node_modules/expo-notifications/build/NotificationChannelManager.types.d.ts` |

## 10. Lexique

- **Canal** (Android) : une catégorie de notifications avec son importance, son son et sa vibration, fixés à sa création. L'utilisateur peut les modifier dans les réglages du téléphone.
- **Importance** : LOW (dans la liste, sans bandeau), HIGH (bandeau et son), MAX (le plus fort).
- **Synchronisation** : comparer ce que le téléphone garde avec ce que la base demande, puis annuler ou programmer seulement la différence.
- **Échéance** (`dueDate`) : le jour où une tâche doit être rendue au plus tard. Différente de la date prévue (`scheduledDate`).

## 11. Et après

1. Voir sur le téléphone (nouvel APK, fiche 003).
2. Le chantier n° 3 de l'étude (12.10) : les formulaires 2-B.
3. Au chantier n° 5 (types de moments) : ajouter le critère « type de moment » dans `notificationLevelFor`.
4. Au chantier n° 9 : les sons au choix et l'alarme qui sonne en continu, avec Arrêter et Plus tard.

## Compte rendu d'exécution (23 novembre 2026)

- Décisions prises avant d'écrire (les quatre réponses du 23 novembre) et notées dans l'étude 001, section 12.6 : nuit 22 h - 7 h réglable, échéances la veille 18 h et le jour 9 h, moments 15 min avant, découpage « niveaux et trois types d'abord ».
- Code lu avant d'écrire : `notification-service.ts`, `reminder-notification-service.ts`, `reminder-notification-rules.ts`, les entités, les cas d'usage des tâches et des moments, les réglages, la sauvegarde. Le champ « Partir … min avant » existait déjà (`travelBufferMinutes`).
- Étapes 1 à 12 appliquées **à partir des blocs de cette fiche** (`docs/tutoriel-suite/outils/appliquer-fiche-011.js`) : les 47 remplacements ont été trouvés une seule fois chacun.
- Tests : les deux nouveaux fichiers `Tests: 13 passed` ; `tsc --noEmit` sans erreur (les options des canaux existent bien dans cette version d'Expo) ; eslint sans erreur sur les fichiers touchés.
- **Écart corrigé** : `src/__tests__/coloured-tags.test.ts` exigeait que la migration 33 soit la dernière ; remplacé par ce qu'il protège vraiment (33 juste après 32, versions dans l'ordre), ajouté à l'étape 7a. Ensuite toute la suite : `Test Suites: 88 passed`, `Tests: 1918 passed`.
- **Vu sur le web** : Réglages › Notifications montre « Nuit plus calme », Début 21/22/23 h et Fin 6/7/8 h, 22 h et 7 h choisis par défaut ; 23 h choisi puis la page rechargée : 23 h est resté (la migration 34 a tourné, le réglage est bien écrit et relu) ; remis à 22 h ensuite. Aucune erreur dans la console.
- Incident sans lien avec la fiche : le serveur web s'est arrêté au démarrage (`0xC0000005`) ; le cache de Metro était abîmé (« Unable to deserialize cloned data »). Relancé avec `npx expo start --web --clear`, il a marché.
- **Pas encore vu sur le téléphone** (les notifications locales n'existent pas sur le web) : il faut un nouvel APK (fiche 003). Rien n'est encore enregistré dans git.

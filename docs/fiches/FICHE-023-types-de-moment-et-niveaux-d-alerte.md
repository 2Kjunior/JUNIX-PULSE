# FICHE OPÉRATOIRE N° 023 — Les types de moment et la hiérarchie des alertes

Projet : **Junix Pulse** · Date : 24 novembre 2026 · Suite de : [FICHE 022](FICHE-022-modifier-avec-les-memes-formulaires.md) · Prolonge : [FICHE 011](FICHE-011-notifications-trois-types.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), 6-B, 6-C, 12.6 et 12.8 · Chantier n° 5 de la feuille de route (12.10)

---

## 1. Objectif

Deux choses que l'étude demandait ensemble :

**1. Les types de moment (6-C)**

Un moment a désormais un **type**, choisi sous son titre : *Rendez-vous, Travail, Santé, Anniversaire, Fête, Religieux / cérémonie, Deuil, Voyage, Autre*.

- Chaque type a son **icône** et sa **couleur**, et un **ton** pour Pulse et, plus tard, les sons. Un deuil reste gris et sobre.
- Le type est **deviné du titre** pendant qu'on l'écrit (« Dentiste » → Santé, « Anniversaire de Léa » → Anniversaire, « Vol pour Dakar » → Voyage), jusqu'à ce qu'on en choisisse un. « Dicter tout » le devine aussi.
- On le voit sur la **page du moment** et dans le **Planning** (couleur du créneau, pastille de la carte).

**2. La hiérarchie des alertes (6-B)**

Chaque rappel et chaque moment a un réglage **« Comment il te prévient » : Auto · Discrète · Normale · Alarme**. Le niveau d'une notification se décide ainsi :

1. le niveau **choisi** pour l'élément, s'il y en a un ;
2. sinon (**Auto**) :
   - le **niveau par défaut** de sa famille, réglé dans **Paramètres → Notifications** (Rappels, Échéances des tâches, Moments, Habitudes ; « Normale » partout au départ) ;
   - la veille d'une échéance, **un cran en dessous** ;
   - le **type** déplace d'un cran : un **deuil** reste discret, le **départ** d'un voyage devient une **alarme** ;
   - **urgent** monte d'un cran ;
3. **la nuit**, tout descend d'un cran, **sauf l'Alarme**, même un niveau choisi (le sommeil d'abord).

Avec les réglages de départ et sans type, **rien ne change** par rapport à la fiche 011 (un test le vérifie).

**Ce qui n'est pas dans cette fiche** :

- les **sons** par niveau et par type ;
- l'**alarme qui sonne en continu** et le **plein écran** (chantier n° 9) ;
- le ton de Pulse selon le type : le registre est prêt (`MOMENT_KIND_TONES`), mais Pulse ne s'en sert pas encore ;
- un niveau choisi pour l'**échéance d'une tâche** : elle suit le niveau par défaut « Échéances ».

**Pour que rien ne casse demain** :

- Les types sont **une liste** (`MOMENT_KINDS`), avec deux registres indexés par elle : ce que fait un type (`moment-kind-rules.ts`) et à quoi il ressemble (`moment-kinds.ts`). Ajouter un type = une ligne dans la liste, une dans chaque registre, ses deux noms. TypeScript signale ce qui manque.
- Un type **inconnu** (sauvegarde d'une autre version, type retiré) se lit **« Autre »**, et les sauvegardes ne le refusent pas.
- La **migration 37** ne fait qu'**ajouter** des colonnes vides : vide = Autre, vide = Auto. Les données existantes ne bougent pas.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 022 est appliquée | `git status` | les fichiers de la fiche 022 |
| Tout passe | `npx jest` | `Tests: 2017 passed` |

## 3. Hypothèses (décisions du 24 novembre 2026, à changer dans les registres si besoin)

| Type | Effet sur l'alerte | Ton |
|---|---|---|
| Deuil | avant et départ : un cran **en dessous** | sobre |
| Voyage | départ : un cran **au-dessus** | neutre |
| Religieux / cérémonie | aucun | sobre |
| Anniversaire, Fête | aucun | festif |
| Rendez-vous, Travail, Santé, Autre | aucun | neutre |

- Un niveau **choisi** n'est pas modifié par l'urgence ni par le type ; seule la nuit le baisse (sauf l'Alarme).
- Le niveau choisi d'une tâche n'existe pas (son échéance suit le réglage « Échéances des tâches »).

## 4. Carte de l'intervention

| Étape | Fichiers |
|---|---|
| 1. Les règles pures | `moment-kind-rules.ts` (+ test), `notification-level-rules.ts` (+ test `alert-hierarchy`) |
| 2. Les données | `enums`, `entities`, migration 37 |
| 3. Lire et écrire | dépôts des rappels, moments, réglages ; sauvegardes |
| 4. Les actions | `reminder-use-cases`, `event-use-cases` |
| 5. Les notifications | règles des rappels, moments, habitudes ; les trois services |
| 6. Les formulaires | `item-forms`, `moment-kinds.ts`, `AlertLevelField`, `edit-loaders`, `TodoForm`, `MomentForm` |
| 7. Où on le voit | page d'un moment, Planning, Paramètres (`AlertDefaultsSetting`) |
| 8. Les mots | `messages-rest-fr.ts`, `-en.ts` |

## 5. Pas à pas

### Étape 1 — Les règles pures et leurs tests

Fichier `src/domain/rules/moment-kind-rules.ts` (remplacé en entier) :

<!-- bloc: kind-rules -->

```ts
/**
 * The types of a moment (study 001, 6-C; sheet 023): what each one does to its notifications,
 * and the words that tell it in a sentence. Pure: the icons, colours and names live in
 * constants/moment-kinds.ts, keyed by the same ids, so TypeScript asks for both when a type is added.
 */

import { MOMENT_KINDS, type MomentKind } from '../enums';
import type { AppLanguage } from './language-rules';

export { MOMENT_KINDS, type MomentKind };

/** A moment saved before the types, or with a type this version does not know, is "Autre". */
export const DEFAULT_MOMENT_KIND: MomentKind = 'other';

export function momentKindOf(value: unknown): MomentKind {
  return (MOMENT_KINDS as readonly string[]).includes(value as string) ? (value as MomentKind) : DEFAULT_MOMENT_KIND;
}

/** The tone of a type: Pulse and, later, the sounds follow it (a funeral is not a party). */
export type MomentTone = 'festive' | 'neutral' | 'sober';

export const MOMENT_KIND_TONES: Readonly<Record<MomentKind, MomentTone>> = {
  appointment: 'neutral',
  work: 'neutral',
  health: 'neutral',
  birthday: 'festive',
  party: 'festive',
  ceremony: 'sober',
  mourning: 'sober',
  travel: 'neutral',
  other: 'neutral',
};

/**
 * How a type moves the level of its notifications, one step at most: a mourning stays discreet,
 * the time to leave for a journey is an alarm (a plane does not wait). The other types keep the
 * level of the settings.
 */
export const MOMENT_KIND_ALERT_SHIFT: Readonly<Record<MomentKind, { before: -1 | 0 | 1; leave: -1 | 0 | 1 }>> = {
  appointment: { before: 0, leave: 0 },
  work: { before: 0, leave: 0 },
  health: { before: 0, leave: 0 },
  birthday: { before: 0, leave: 0 },
  party: { before: 0, leave: 0 },
  ceremony: { before: 0, leave: 0 },
  mourning: { before: -1, leave: -1 },
  travel: { before: 0, leave: 1 },
  other: { before: 0, leave: 0 },
};

/**
 * The words that tell a type, in the order they are tried: the most precise first, so that
 * "fête d'anniversaire" is a birthday and "rendez-vous chez le médecin" is health.
 * Written without accents, as the sentence is read without them.
 */
const KIND_WORDS: readonly { kind: MomentKind; fr: readonly string[]; en: readonly string[] }[] = [
  { kind: 'mourning', fr: ['enterrement', 'obseques', 'funerailles', 'deuil', 'veillee funebre', 'inhumation'], en: ['funeral', 'burial', 'wake', 'memorial'] },
  { kind: 'birthday', fr: ['anniversaire', 'anniv'], en: ['birthday', 'bday'] },
  { kind: 'health', fr: ['medecin', 'docteur', 'dentiste', 'hopital', 'clinique', 'kine', 'kinesitherapeute', 'ophtalmo', 'gyneco', 'pediatre', 'vaccin', 'prise de sang', 'pharmacie'], en: ['doctor', 'dentist', 'hospital', 'clinic', 'physio', 'vaccine', 'blood test', 'pharmacy'] },
  { kind: 'ceremony', fr: ['messe', 'eglise', 'mosquee', 'temple', 'culte', 'priere', 'bapteme', 'mariage', 'communion', 'ceremonie', 'synagogue'], en: ['church', 'mass', 'mosque', 'temple', 'prayer', 'wedding', 'baptism', 'ceremony', 'synagogue'] },
  { kind: 'travel', fr: ['vol', 'avion', 'aeroport', 'train', 'gare', 'voyage', 'bus', 'depart en vacances'], en: ['flight', 'plane', 'airport', 'train', 'station', 'trip', 'journey', 'travel'] },
  { kind: 'party', fr: ['fete', 'soiree', 'diner', 'apero', 'barbecue', 'pot de depart', 'concert'], en: ['party', 'dinner', 'drinks', 'barbecue', 'concert', 'celebration'] },
  { kind: 'work', fr: ['reunion', 'travail', 'bureau', 'boulot', 'client', 'entretien', 'seminaire', 'conference'], en: ['meeting', 'work', 'office', 'client', 'interview', 'seminar', 'conference'] },
  { kind: 'appointment', fr: ['rendez-vous', 'rdv', 'coiffeur', 'banque', 'mairie', 'notaire', 'garage'], en: ['appointment', 'hairdresser', 'bank', 'town hall', 'garage'] },
];

function plain(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ');
}

/** The type a title or a sentence speaks of, or null when it says none. Whole words only. */
export function guessMomentKind(text: string, language: AppLanguage = 'fr'): MomentKind | null {
  const words = ` ${plain(text).replace(/[^a-z0-9- ]/g, ' ').replace(/\s+/g, ' ')} `;
  for (const entry of KIND_WORDS) {
    // Both languages are read: a French title may say "meeting"
    const list = language === 'en' ? [...entry.en, ...entry.fr] : [...entry.fr, ...entry.en];
    if (list.some(word => words.includes(` ${word} `))) return entry.kind;
  }
  return null;
}
```

Fichier `src/domain/rules/__tests__/moment-kind-rules.test.ts` (remplacé en entier) :

<!-- bloc: kind-test -->

```ts
import { guessMomentKind, MOMENT_KIND_ALERT_SHIFT, MOMENT_KIND_TONES, MOMENT_KINDS, momentKindOf } from '../moment-kind-rules';

describe('the types of a moment (study 001, 6-C)', () => {
  it('has the nine types of the study, "Autre" last', () => {
    expect(MOMENT_KINDS).toEqual(['appointment', 'work', 'health', 'birthday', 'party', 'ceremony', 'mourning', 'travel', 'other']);
  });

  it('gives every type a tone and an alert shift', () => {
    for (const kind of MOMENT_KINDS) {
      expect(MOMENT_KIND_TONES[kind]).toBeDefined();
      expect(MOMENT_KIND_ALERT_SHIFT[kind]).toBeDefined();
    }
    expect(MOMENT_KIND_TONES.mourning).toBe('sober');
    expect(MOMENT_KIND_TONES.birthday).toBe('festive');
  });

  it('reads an unknown or missing type as "Autre"', () => {
    expect(momentKindOf(undefined)).toBe('other');
    expect(momentKindOf(null)).toBe('other');
    expect(momentKindOf('concert')).toBe('other');
    expect(momentKindOf('health')).toBe('health');
  });
});

describe('guessMomentKind', () => {
  it.each([
    ['Enterrement de Mamie', 'mourning'],
    ["Fête d'anniversaire de Léa", 'birthday'],
    ['Rendez-vous chez le médecin', 'health'],
    ['Dentiste', 'health'],
    ['Messe de Noël', 'ceremony'],
    ['Mariage de Paul', 'ceremony'],
    ['Vol pour Dakar', 'travel'],
    ["Train à la gare de Lyon", 'travel'],
    ['Soirée chez Awa', 'party'],
    ['Réunion d’équipe', 'work'],
    ['RDV banque', 'appointment'],
  ])('reads « %s » as %s', (title, kind) => {
    expect(guessMomentKind(title, 'fr')).toBe(kind);
  });

  it('reads English too', () => {
    expect(guessMomentKind("Mom's birthday dinner", 'en')).toBe('birthday');
    expect(guessMomentKind('Team meeting', 'en')).toBe('work');
    expect(guessMomentKind('Flight to Lagos', 'en')).toBe('travel');
  });

  it('takes whole words only, and says nothing when nothing is said', () => {
    expect(guessMomentKind('Volley avec Paul', 'fr')).toBeNull();
    expect(guessMomentKind('Café avec Marc', 'fr')).toBeNull();
    expect(guessMomentKind('', 'fr')).toBeNull();
  });
});
```

Fichier `src/domain/rules/notification-level-rules.ts` (remplacé en entier) :

<!-- bloc: level-rules -->

```ts
/**
 * How loud a notification is: discreet, normal or alarm (study 001, 6-B and 12.6; sheets 011 and 023).
 * In order:
 * 1. the level the person chose for this item, if any ("Auto" chooses none);
 * 2. otherwise the default level of its family, set in the settings (normal for all at first),
 *    the evening before a deadline one step quieter, moved one step by the type of a moment
 *    (a mourning stays discreet, leaving for a journey is an alarm), and urgent one step up;
 * 3. at night, everything goes down one step, except the alarm.
 * Pure: no phone, no database, so every case is tested. A new criterion belongs here.
 */

import type { AlertLevel, MomentKind, ReminderPriority } from '../entities';
import { ALERT_LEVELS } from '../enums';
import { MOMENT_KIND_ALERT_SHIFT } from './moment-kind-rules';

export type NotificationLevel = AlertLevel;

/** From the quietest to the loudest: one level up or down is one step in this list. */
export const NOTIFICATION_LEVELS: readonly NotificationLevel[] = ALERT_LEVELS;

/** What rings: a reminder, a deadline (the day before, the day itself), a moment (before it, time to leave). */
export type NotificationMoment = 'reminder' | 'taskEve' | 'taskDay' | 'momentBefore' | 'momentLeave' | 'habit';

/** The level of each moment before the criteria, with the default settings. The evening before a deadline only informs. */
export const BASE_LEVELS: Readonly<Record<NotificationMoment, NotificationLevel>> = {
  reminder: 'normal',
  taskEve: 'discreet',
  taskDay: 'normal',
  momentBefore: 'normal',
  momentLeave: 'normal',
  habit: 'normal',
};

// ─── Default level of each family, in the settings (sheet 023) ─────────────────────────────

/** The families whose default level the settings choose. */
export const ALERT_FAMILIES = ['reminder', 'deadline', 'moment', 'habit'] as const;
export type AlertFamily = (typeof ALERT_FAMILIES)[number];
export type AlertDefaults = Readonly<Record<AlertFamily, NotificationLevel>>;

export const DEFAULT_ALERT_DEFAULTS: AlertDefaults = { reminder: 'normal', deadline: 'normal', moment: 'normal', habit: 'normal' };

export function alertFamilyOf(moment: NotificationMoment): AlertFamily {
  switch (moment) {
    case 'taskEve':
    case 'taskDay':
      return 'deadline';
    case 'momentBefore':
    case 'momentLeave':
      return 'moment';
    default:
      return moment;
  }
}

function isLevel(value: unknown): value is NotificationLevel {
  return NOTIFICATION_LEVELS.includes(value as NotificationLevel);
}

/**
 * The defaults kept in the settings as "reminder=normal;deadline=alarm…". Anything missing or
 * unknown keeps its default, so settings saved before (or by another version) always read.
 */
export function alertDefaultsOf(text: string | null | undefined): AlertDefaults {
  const defaults: Record<AlertFamily, NotificationLevel> = { ...DEFAULT_ALERT_DEFAULTS };
  for (const pair of (text ?? '').split(';')) {
    const [family, level] = pair.split('=').map(part => part.trim());
    if ((ALERT_FAMILIES as readonly string[]).includes(family) && isLevel(level)) defaults[family as AlertFamily] = level;
  }
  return defaults;
}

export function alertDefaultsText(defaults: AlertDefaults): string {
  return ALERT_FAMILIES.map(family => `${family}=${defaults[family]}`).join(';');
}

// ─── The night ────────────────────────────────────────────────────────────────────────────

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

// ─── The level of one notification ───────────────────────────────────────────────────────

export interface NotificationLevelInput {
  moment: NotificationMoment;
  priority?: ReminderPriority;
  at: Date;
  quietHours?: QuietHours;
  /** The level chosen for this item; null or absent is "Auto". */
  chosen?: NotificationLevel | null;
  /** The type of the moment, for momentBefore and momentLeave. */
  momentKind?: MomentKind;
  /** The default level of each family, from the settings. */
  defaults?: AlertDefaults;
}

const step = (index: number, by: number) => Math.min(Math.max(index + by, 0), NOTIFICATION_LEVELS.length - 1);

export function notificationLevelFor({
  moment,
  priority,
  at,
  quietHours = DEFAULT_QUIET_HOURS,
  chosen,
  momentKind,
  defaults = DEFAULT_ALERT_DEFAULTS,
}: NotificationLevelInput): NotificationLevel {
  const loudest = NOTIFICATION_LEVELS.length - 1;
  let index: number;
  if (chosen && isLevel(chosen)) {
    index = NOTIFICATION_LEVELS.indexOf(chosen);
  } else {
    index = NOTIFICATION_LEVELS.indexOf(defaults[alertFamilyOf(moment)]);
    // The evening before a deadline only informs: one step below the day itself
    if (moment === 'taskEve') index = step(index, -1);
    if (momentKind && (moment === 'momentBefore' || moment === 'momentLeave')) {
      const shift = MOMENT_KIND_ALERT_SHIFT[momentKind];
      index = step(index, moment === 'momentLeave' ? shift.leave : shift.before);
    }
    // Urgent goes up one level
    if (priority === 'URGENT') index = step(index, 1);
  }
  // At night everything goes down one level, except the alarm
  if (index < loudest && isQuietTime(at, quietHours)) index = step(index, -1);
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
  return isLevel(value) ? value : 'normal';
}

/** A level chosen for an item, as saved: null for "Auto" or anything unknown. */
export function chosenLevelOf(value: unknown): NotificationLevel | null {
  return isLevel(value) ? value : null;
}
```

Fichier `src/domain/rules/__tests__/alert-hierarchy.test.ts` (remplacé en entier) :

<!-- bloc: level-test -->

```ts
import {
  alertDefaultsOf,
  alertDefaultsText,
  alertFamilyOf,
  chosenLevelOf,
  DEFAULT_ALERT_DEFAULTS,
  notificationLevelFor,
} from '../notification-level-rules';

// 15:00 is day, 23:00 is night with the default night (22 to 7)
const DAY = new Date('2026-11-24T15:00:00');
const NIGHT = new Date('2026-11-24T23:00:00');

describe('the alert hierarchy (study 001, 6-B; sheet 023)', () => {
  it('gives the same levels as before with the default settings', () => {
    expect(notificationLevelFor({ moment: 'reminder', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'taskEve', at: DAY })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'taskDay', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'reminder', priority: 'URGENT', at: DAY })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'reminder', at: NIGHT })).toBe('discreet');
  });

  it('follows the default level of each family', () => {
    const defaults = { ...DEFAULT_ALERT_DEFAULTS, reminder: 'alarm' as const, moment: 'discreet' as const, deadline: 'alarm' as const };
    expect(notificationLevelFor({ moment: 'reminder', at: DAY, defaults })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'momentBefore', at: DAY, defaults })).toBe('discreet');
    // The evening before stays one step below the day itself
    expect(notificationLevelFor({ moment: 'taskDay', at: DAY, defaults })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'taskEve', at: DAY, defaults })).toBe('normal');
    expect(notificationLevelFor({ moment: 'habit', at: DAY, defaults })).toBe('normal');
  });

  it('moves a moment by its type', () => {
    expect(notificationLevelFor({ moment: 'momentBefore', momentKind: 'mourning', at: DAY })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'momentLeave', momentKind: 'mourning', at: DAY })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'momentLeave', momentKind: 'travel', at: DAY })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'momentBefore', momentKind: 'travel', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', momentKind: 'birthday', at: DAY })).toBe('normal');
    // The type of a moment says nothing of a reminder
    expect(notificationLevelFor({ moment: 'reminder', momentKind: 'mourning', at: DAY })).toBe('normal');
  });

  it('keeps the level chosen for an item, whatever the settings, the type or the urgency', () => {
    const defaults = { ...DEFAULT_ALERT_DEFAULTS, reminder: 'alarm' as const };
    expect(notificationLevelFor({ moment: 'reminder', chosen: 'discreet', priority: 'URGENT', at: DAY, defaults })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'momentLeave', chosen: 'normal', momentKind: 'travel', at: DAY })).toBe('normal');
    expect(notificationLevelFor({ moment: 'momentBefore', chosen: 'alarm', momentKind: 'mourning', at: DAY })).toBe('alarm');
  });

  it('lowers everything at night but the alarm, even a chosen level', () => {
    expect(notificationLevelFor({ moment: 'reminder', chosen: 'normal', at: NIGHT })).toBe('discreet');
    expect(notificationLevelFor({ moment: 'reminder', chosen: 'alarm', at: NIGHT })).toBe('alarm');
    expect(notificationLevelFor({ moment: 'momentLeave', momentKind: 'travel', at: NIGHT })).toBe('alarm');
  });
});

describe('the default levels in the settings', () => {
  it('reads what was saved, and the default for anything missing or unknown', () => {
    expect(alertDefaultsOf(undefined)).toEqual(DEFAULT_ALERT_DEFAULTS);
    expect(alertDefaultsOf('')).toEqual(DEFAULT_ALERT_DEFAULTS);
    expect(alertDefaultsOf('reminder=alarm;moment=loud;sound=alarm')).toEqual({ ...DEFAULT_ALERT_DEFAULTS, reminder: 'alarm' });
  });

  it('writes what it reads', () => {
    const defaults = { reminder: 'alarm', deadline: 'discreet', moment: 'normal', habit: 'discreet' } as const;
    expect(alertDefaultsOf(alertDefaultsText(defaults))).toEqual(defaults);
  });

  it('groups what rings in four families', () => {
    expect(alertFamilyOf('taskEve')).toBe('deadline');
    expect(alertFamilyOf('momentLeave')).toBe('moment');
    expect(alertFamilyOf('habit')).toBe('habit');
  });

  it('reads a saved choice, Auto being none', () => {
    expect(chosenLevelOf('alarm')).toBe('alarm');
    expect(chosenLevelOf(null)).toBeNull();
    expect(chosenLevelOf('loud')).toBeNull();
  });
});
```

### Étape 2 — Les données : deux listes, trois champs, une migration

Dans `src/domain/enums/index.ts` :

<!-- bloc: enums-avant -->

```ts
export type EventType =
  | 'FREE'        // Temps libre (n'affecte pas les calculs de disponibilité)
  | 'BUSY';       // Occupé

```

devient :

<!-- bloc: enums-apres -->

```ts
export type EventType =
  | 'FREE'        // Temps libre (n'affecte pas les calculs de disponibilité)
  | 'BUSY';       // Occupé

/**
 * The types of a moment (study 001, 6-C; sheet 023), in the order the form shows them.
 * What they do: domain/rules/moment-kind-rules.ts; how they look: constants/moment-kinds.ts.
 */
export const MOMENT_KINDS = ['appointment', 'work', 'health', 'birthday', 'party', 'ceremony', 'mourning', 'travel', 'other'] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];

/** How loud a notification is (study 001, 6-B), from the quietest to the loudest. */
export const ALERT_LEVELS = ['discreet', 'normal', 'alarm'] as const;
export type AlertLevel = (typeof ALERT_LEVELS)[number];

```

Dans `src/domain/entities/index.ts` :

<!-- bloc: ent-enums-avant -->

```ts
  MascotProposalsLevel,
} from '../enums';
```

devient :

<!-- bloc: ent-enums-apres -->

```ts
  MascotProposalsLevel,
  AlertLevel,
  MomentKind,
} from '../enums';
```

Dans `src/domain/entities/index.ts` :

<!-- bloc: ent-import-avant -->

```ts
import type { LanguageSetting } from '../rules/language-rules';
```

devient :

<!-- bloc: ent-import-apres -->

```ts
import type { LanguageSetting } from '../rules/language-rules';
import type { AlertDefaults } from '../rules/notification-level-rules';
```

Dans `src/domain/entities/index.ts` :

<!-- bloc: ent-reminder-avant -->

```ts
  requiresConfirmation?: boolean;
  recurrenceRuleId?: string;
  notificationId?: string;     // ID fourni par expo-notifications (pour annulation)
```

devient :

<!-- bloc: ent-reminder-apres -->

```ts
  requiresConfirmation?: boolean;
  /** The level chosen for it (sheet 023); absent is "Auto". */
  alertLevel?: AlertLevel;
  recurrenceRuleId?: string;
  notificationId?: string;     // ID fourni par expo-notifications (pour annulation)
```

Dans `src/domain/entities/index.ts` :

<!-- bloc: ent-event-avant -->

```ts
  travelBufferMinutes?: number; // Marge de déplacement avant l'événement (V1: valeur fixe)
  createdAt: string;
```

devient :

<!-- bloc: ent-event-apres -->

```ts
  travelBufferMinutes?: number; // Marge de déplacement avant l'événement (V1: valeur fixe)
  /** Its type (sheet 023); absent is "Autre". */
  momentKind?: MomentKind;
  /** The level chosen for it (sheet 023); absent is "Auto". */
  alertLevel?: AlertLevel;
  createdAt: string;
```

Dans `src/domain/entities/index.ts` :

<!-- bloc: ent-settings-avant -->

```ts
  quietHoursStart?: number;
  quietHoursEnd?: number;
```

devient :

<!-- bloc: ent-settings-apres -->

```ts
  quietHoursStart?: number;
  quietHoursEnd?: number;
  /** The default level of reminders, deadlines, moments and habits (sheet 023); all normal at first. */
  alertLevels?: AlertDefaults;
```

Dans `src/database/migrations.ts` :

<!-- bloc: migration-avant -->

```ts
      ALTER TABLE habits ADD COLUMN reminder_time TEXT;
    `,
  },
];
```

devient :

<!-- bloc: migration-apres -->

```ts
      ALTER TABLE habits ADD COLUMN reminder_time TEXT;
    `,
  },
  {
    version: 37,
    name: 'add_moment_kinds_and_alert_levels',
    sql: `
      -- Le type d un moment, et le niveau d alerte choisi pour un moment ou un rappel (fiche 023, etude 6-B et 6-C).
      -- Vide = Autre pour le type, Auto pour le niveau : rien ne change pour ce qui existe deja.
      ALTER TABLE events ADD COLUMN moment_kind TEXT;
      ALTER TABLE events ADD COLUMN alert_level TEXT;
      ALTER TABLE reminders ADD COLUMN alert_level TEXT;
      -- Le niveau par defaut de chaque famille, ecrit reminder=normal;deadline=normal;...
      ALTER TABLE settings ADD COLUMN alert_levels TEXT;
    `,
  },
];
```

### Étape 3 — Les dépôts et les sauvegardes

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: rr-create-type-avant -->

```ts
  requiresConfirmation?: boolean;
  recurrenceRuleId?: string;
  createdAt: string;
  updatedAt: string;
}
```

devient :

<!-- bloc: rr-create-type-apres -->

```ts
  requiresConfirmation?: boolean;
  alertLevel?: AlertLevel | null;
  recurrenceRuleId?: string;
  createdAt: string;
  updatedAt: string;
}
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: rr-update-type-avant -->

```ts
  /** null: it no longer repeats. */
  recurrenceRuleId?: string | null;
```

devient :

<!-- bloc: rr-update-type-apres -->

```ts
  /** null: it no longer repeats. */
  recurrenceRuleId?: string | null;
  /** null: "Auto". */
  alertLevel?: AlertLevel | null;
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: rr-import-avant -->

```ts
import { Reminder, ReminderChecklistItem, RecurrenceRule } from '../domain/entities';
```

devient :

<!-- bloc: rr-import-apres -->

```ts
import { AlertLevel, Reminder, ReminderChecklistItem, RecurrenceRule } from '../domain/entities';
import { chosenLevelOf } from '../domain/rules/notification-level-rules';
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: rr-row-avant -->

```ts
    requiresConfirmation: (row.requires_confirmation as number | null) === 1,
    recurrenceRuleId:
```

devient :

<!-- bloc: rr-row-apres -->

```ts
    requiresConfirmation: (row.requires_confirmation as number | null) === 1,
    alertLevel: chosenLevelOf(row.alert_level) ?? undefined,
    recurrenceRuleId:
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: rr-insert-avant -->

```ts
        person_id, recurrence_rule_id, requires_confirmation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'UPCOMING', ?, ?, ?, ?, ?, ?)`,
```

devient :

<!-- bloc: rr-insert-apres -->

```ts
        person_id, recurrence_rule_id, requires_confirmation, alert_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'UPCOMING', ?, ?, ?, ?, ?, ?, ?)`,
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: rr-insert-2-avant -->

```ts
      params.requiresConfirmation ? 1 : 0,
      params.createdAt,
```

devient :

<!-- bloc: rr-insert-2-apres -->

```ts
      params.requiresConfirmation ? 1 : 0,
      params.alertLevel ?? null,
      params.createdAt,
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: rr-update-avant -->

```ts
    if (params.recurrenceRuleId !== undefined) {
      setClauses.push('recurrence_rule_id = ?');
      values.push(params.recurrenceRuleId);
    }
```

devient :

<!-- bloc: rr-update-apres -->

```ts
    if (params.recurrenceRuleId !== undefined) {
      setClauses.push('recurrence_rule_id = ?');
      values.push(params.recurrenceRuleId);
    }
    if (params.alertLevel !== undefined) {
      setClauses.push('alert_level = ?');
      values.push(params.alertLevel);
    }
```

Dans `src/repositories/event-repository.ts` :

<!-- bloc: er-row-avant -->

```ts
    travelBufferMinutes: (row.travel_buffer_minutes as number | null) ?? undefined,
    createdAt: row.created_at as string,
```

devient :

<!-- bloc: er-row-apres -->

```ts
    travelBufferMinutes: (row.travel_buffer_minutes as number | null) ?? undefined,
    momentKind: (row.moment_kind as Event['momentKind'] | null) ?? undefined,
    alertLevel: chosenLevelOf(row.alert_level) ?? undefined,
    createdAt: row.created_at as string,
```

Dans `src/repositories/event-repository.ts` :

<!-- bloc: er-insert-avant -->

```ts
      `INSERT INTO events (id, title, notes, start_at, end_at, timezone, location, type, travel_buffer_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
```

devient :

<!-- bloc: er-insert-apres -->

```ts
      `INSERT INTO events (id, title, notes, start_at, end_at, timezone, location, type, travel_buffer_minutes, moment_kind, alert_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
```

Dans `src/repositories/event-repository.ts` :

<!-- bloc: er-insert-2-avant -->

```ts
      event.travelBufferMinutes ?? 0,
      event.createdAt,
```

devient :

<!-- bloc: er-insert-2-apres -->

```ts
      event.travelBufferMinutes ?? 0,
      event.momentKind ?? null,
      event.alertLevel ?? null,
      event.createdAt,
```

Dans `src/repositories/event-repository.ts` :

<!-- bloc: er-update-avant -->

```ts
    if (params.travelBufferMinutes !== undefined) {
      setClauses.push('travel_buffer_minutes = ?');
      values.push(params.travelBufferMinutes);
    }
```

devient :

<!-- bloc: er-update-apres -->

```ts
    if (params.travelBufferMinutes !== undefined) {
      setClauses.push('travel_buffer_minutes = ?');
      values.push(params.travelBufferMinutes);
    }
    if (params.momentKind !== undefined) {
      setClauses.push('moment_kind = ?');
      values.push(params.momentKind);
    }
    if (params.alertLevel !== undefined) {
      setClauses.push('alert_level = ?');
      values.push(params.alertLevel);
    }
```

Dans `src/repositories/settings-repository.ts` :

<!-- bloc: sr-row-avant -->

```ts
    quietHoursEnd: (row.quiet_hours_end as number | undefined) ?? 7,
```

devient :

<!-- bloc: sr-row-apres -->

```ts
    quietHoursEnd: (row.quiet_hours_end as number | undefined) ?? 7,
    alertLevels: alertDefaultsOf(row.alert_levels as string | null | undefined),
```

Dans `src/repositories/settings-repository.ts` :

<!-- bloc: sr-update-avant -->

```ts
    if (params.quietHoursEnd !== undefined) {
      setClauses.push('quiet_hours_end = ?');
      values.push(params.quietHoursEnd);
    }
```

devient :

<!-- bloc: sr-update-apres -->

```ts
    if (params.quietHoursEnd !== undefined) {
      setClauses.push('quiet_hours_end = ?');
      values.push(params.quietHoursEnd);
    }
    if (params.alertLevels !== undefined) {
      setClauses.push('alert_levels = ?');
      values.push(alertDefaultsText(params.alertLevels));
    }
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-rem-avant -->

```ts
'recurrence_rule_id', 'requires_confirmation', 'notification_id',
```

devient :

<!-- bloc: bk-rem-apres -->

```ts
'recurrence_rule_id', 'requires_confirmation', 'alert_level', 'notification_id',
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-ev-avant -->

```ts
  events: ['id', 'title', 'notes', 'start_at', 'end_at', 'timezone', 'location', 'type', 'travel_buffer_minutes', 'created_at', 'updated_at', 'deleted_at'],
```

devient :

<!-- bloc: bk-ev-apres -->

```ts
  events: ['id', 'title', 'notes', 'start_at', 'end_at', 'timezone', 'location', 'type', 'travel_buffer_minutes', 'moment_kind', 'alert_level', 'created_at', 'updated_at', 'deleted_at'],
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-set-avant -->

```ts
'quiet_hours_start', 'quiet_hours_end', 'created_at', 'updated_at'],
```

devient :

<!-- bloc: bk-set-apres -->

```ts
'quiet_hours_start', 'quiet_hours_end', 'alert_levels', 'created_at', 'updated_at'],
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-enum-avant -->

```ts
    action_type: ['NONE', 'CALL', 'MESSAGE', 'EMAIL', 'MEET', 'TASK'],
  },
```

devient :

<!-- bloc: bk-enum-apres -->

```ts
    action_type: ['NONE', 'CALL', 'MESSAGE', 'EMAIL', 'MEET', 'TASK'],
    alert_level: ['discreet', 'normal', 'alarm'],
  },
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-enum-ev-avant -->

```ts
  events: { type: ['FREE', 'BUSY'] },
```

devient :

<!-- bloc: bk-enum-ev-apres -->

```ts
  events: { type: ['FREE', 'BUSY'], alert_level: ['discreet', 'normal', 'alarm'] },
```

Dans `src/repositories/event-repository.ts` :

<!-- bloc: er-import-avant -->

```ts
import { Event, Person } from '../domain/entities';
```

devient :

<!-- bloc: er-import-apres -->

```ts
import { Event, Person } from '../domain/entities';
import { chosenLevelOf } from '../domain/rules/notification-level-rules';
```

Dans `src/repositories/settings-repository.ts` :

<!-- bloc: sr-import-avant -->

```ts
import { isAppLockDelay } from '../domain/rules/app-lock-rules';
```

devient :

<!-- bloc: sr-import-apres -->

```ts
import { isAppLockDelay } from '../domain/rules/app-lock-rules';
import { alertDefaultsOf, alertDefaultsText } from '../domain/rules/notification-level-rules';
```

### Étape 4 — Les actions

Dans `src/use-cases/reminder-use-cases.ts` :

<!-- bloc: ru-create-type-avant -->

```ts
  /** Rings again every few minutes until completed or snoozed. */
  requiresConfirmation?: boolean;
  recurrenceRule?: Omit<RecurrenceRule, 'id'>;
```

devient :

<!-- bloc: ru-create-type-apres -->

```ts
  /** Rings again every few minutes until completed or snoozed. */
  requiresConfirmation?: boolean;
  /** How it warns (sheet 023); null or absent is "Auto". */
  alertLevel?: AlertLevel | null;
  recurrenceRule?: Omit<RecurrenceRule, 'id'>;
```

Dans `src/use-cases/reminder-use-cases.ts` :

<!-- bloc: ru-create-avant -->

```ts
    requiresConfirmation: input.requiresConfirmation,
    recurrenceRuleId,
    createdAt: now,
```

devient :

<!-- bloc: ru-create-apres -->

```ts
    requiresConfirmation: input.requiresConfirmation,
    alertLevel: input.alertLevel ?? null,
    recurrenceRuleId,
    createdAt: now,
```

Dans `src/use-cases/reminder-use-cases.ts` :

<!-- bloc: ru-update-type-avant -->

```ts
  /** A new repeat (a new rule; the old one stays in the data), null to stop it, undefined to keep it. */
```

devient :

<!-- bloc: ru-update-type-apres -->

```ts
  /** How it warns (sheet 023): null is "Auto", undefined keeps it. */
  alertLevel?: AlertLevel | null;
  /** A new repeat (a new rule; the old one stays in the data), null to stop it, undefined to keep it. */
```

Dans `src/use-cases/reminder-use-cases.ts` :

<!-- bloc: ru-update-avant -->

```ts
    requiresConfirmation: input.requiresConfirmation,
    recurrenceRuleId,
    updatedAt: now,
```

devient :

<!-- bloc: ru-update-apres -->

```ts
    requiresConfirmation: input.requiresConfirmation,
    recurrenceRuleId,
    alertLevel: input.alertLevel,
    updatedAt: now,
```

Dans `src/use-cases/reminder-use-cases.ts` :

<!-- bloc: ru-import-avant -->

```ts
import { Reminder, RecurrenceRule } from '../domain/entities';
```

devient :

<!-- bloc: ru-import-apres -->

```ts
import { AlertLevel, Reminder, RecurrenceRule } from '../domain/entities';
```

Dans `src/use-cases/event-use-cases.ts` :

<!-- bloc: eu-create-type-avant -->

```ts
  travelBufferMinutes?: number;
  personIds?: string[];
  /** Its coloured tags. */
  tagIds?: string[];
}
```

devient :

<!-- bloc: eu-create-type-apres -->

```ts
  travelBufferMinutes?: number;
  /** Its type (sheet 023); absent is "Autre". */
  momentKind?: MomentKind;
  /** How it warns (sheet 023); null or absent is "Auto". */
  alertLevel?: AlertLevel | null;
  personIds?: string[];
  /** Its coloured tags. */
  tagIds?: string[];
}
```

Dans `src/use-cases/event-use-cases.ts` :

<!-- bloc: eu-update-type-avant -->

```ts
  travelBufferMinutes?: number;
  personIds?: string[];
  /** Its coloured tags: replaces the ones it had. */
  tagIds?: string[];
}
```

devient :

<!-- bloc: eu-update-type-apres -->

```ts
  travelBufferMinutes?: number;
  momentKind?: MomentKind;
  /** null is "Auto", undefined keeps it. */
  alertLevel?: AlertLevel | null;
  personIds?: string[];
  /** Its coloured tags: replaces the ones it had. */
  tagIds?: string[];
}
```

Dans `src/use-cases/event-use-cases.ts` :

<!-- bloc: eu-create-avant -->

```ts
        travelBufferMinutes: input.travelBufferMinutes ?? 0,
        createdAt: now,
```

devient :

<!-- bloc: eu-create-apres -->

```ts
        travelBufferMinutes: input.travelBufferMinutes ?? 0,
        // "Autre" is kept as nothing: a moment of before the types reads the same
        momentKind: input.momentKind && input.momentKind !== 'other' ? input.momentKind : undefined,
        alertLevel: input.alertLevel ?? undefined,
        createdAt: now,
```

Dans `src/use-cases/event-use-cases.ts` :

<!-- bloc: eu-update-avant -->

```ts
        travelBufferMinutes: input.travelBufferMinutes,
        updatedAt: now,
```

devient :

<!-- bloc: eu-update-apres -->

```ts
        travelBufferMinutes: input.travelBufferMinutes,
        momentKind: input.momentKind === undefined ? undefined : input.momentKind === 'other' ? null : input.momentKind,
        alertLevel: input.alertLevel,
        updatedAt: now,
```

Dans `src/use-cases/event-use-cases.ts` :

<!-- bloc: eu-import-avant -->

```ts
import { EventType } from '../domain/entities';
```

devient :

<!-- bloc: eu-import-apres -->

```ts
import { AlertLevel, EventType, MomentKind } from '../domain/entities';
```

### Étape 5 — Les notifications suivent le choix, le type et les réglages

Dans `src/domain/rules/reminder-notification-rules.ts` :

<!-- bloc: rn-repeat-sig-avant -->

```ts
  language: AppLanguage,
  quietHours: QuietHours
): PlannedReminderNotification[] {
  if (!item.reminder.requiresConfirmation) return [];
```

devient :

<!-- bloc: rn-repeat-sig-apres -->

```ts
  language: AppLanguage,
  quietHours: QuietHours,
  defaults: AlertDefaults
): PlannedReminderNotification[] {
  if (!item.reminder.requiresConfirmation) return [];
```

Dans `src/domain/rules/reminder-notification-rules.ts` :

<!-- bloc: rn-repeat-level-avant -->

```ts
        body: translate(language, 'reminderNotif.confirmAgain'),
        scheduledAt,
        level: notificationLevelFor({ moment: 'reminder', priority: item.reminder.priority, at: scheduledAt, quietHours }),
```

devient :

<!-- bloc: rn-repeat-level-apres -->

```ts
        body: translate(language, 'reminderNotif.confirmAgain'),
        scheduledAt,
        level: levelOfReminder(item.reminder, scheduledAt, quietHours, defaults),
```

Dans `src/domain/rules/reminder-notification-rules.ts` :

<!-- bloc: rn-plan-sig-avant -->

```ts
  language: AppLanguage = 'fr',
  quietHours: QuietHours = DEFAULT_QUIET_HOURS
): PlannedReminderNotification[] {
```

devient :

<!-- bloc: rn-plan-sig-apres -->

```ts
  language: AppLanguage = 'fr',
  quietHours: QuietHours = DEFAULT_QUIET_HOURS,
  defaults: AlertDefaults = DEFAULT_ALERT_DEFAULTS
): PlannedReminderNotification[] {
```

Dans `src/domain/rules/reminder-notification-rules.ts` :

<!-- bloc: rn-plan-level-avant -->

```ts
          body: bodyOf(item.reminder, language),
          scheduledAt,
          level: notificationLevelFor({ moment: 'reminder', priority: item.reminder.priority, at: scheduledAt, quietHours }),
```

devient :

<!-- bloc: rn-plan-level-apres -->

```ts
          body: bodyOf(item.reminder, language),
          scheduledAt,
          level: levelOfReminder(item.reminder, scheduledAt, quietHours, defaults),
```

Dans `src/domain/rules/reminder-notification-rules.ts` :

<!-- bloc: rn-repeat-call-avant -->

```ts
    .flatMap(item => confirmationRepeats(item, now, language, quietHours))
```

devient :

<!-- bloc: rn-repeat-call-apres -->

```ts
    .flatMap(item => confirmationRepeats(item, now, language, quietHours, defaults))
```

Dans `src/domain/rules/reminder-notification-rules.ts` :

<!-- bloc: rn-helper-avant -->

```ts
function bodyOf(reminder: Reminder, language: AppLanguage): string {
```

devient :

<!-- bloc: rn-helper-apres -->

```ts
/** The level of a reminder: the one chosen for it, or its priority and the settings (sheet 023). */
function levelOfReminder(reminder: Reminder, at: Date, quietHours: QuietHours, defaults: AlertDefaults) {
  return notificationLevelFor({ moment: 'reminder', priority: reminder.priority, at, quietHours, chosen: reminder.alertLevel, defaults });
}

function bodyOf(reminder: Reminder, language: AppLanguage): string {
```

Dans `src/domain/rules/item-notification-rules.ts` :

<!-- bloc: in-import-avant -->

```ts
import {
  DEFAULT_QUIET_HOURS,
  NotificationLevel,
```

devient :

<!-- bloc: in-import-apres -->

```ts
import {
  AlertDefaults,
  DEFAULT_ALERT_DEFAULTS,
  DEFAULT_QUIET_HOURS,
  NotificationLevel,
```

Dans `src/domain/rules/item-notification-rules.ts` :

<!-- bloc: in-input-avant -->

```ts
  language?: AppLanguage;
  quietHours?: QuietHours;
}

const MINUTE
```

devient :

<!-- bloc: in-input-apres -->

```ts
  language?: AppLanguage;
  quietHours?: QuietHours;
  /** The default level of each family, from the settings (sheet 023). */
  alertDefaults?: AlertDefaults;
}

const MINUTE
```

Dans `src/domain/rules/item-notification-rules.ts` :

<!-- bloc: in-sig-avant -->

```ts
  quietHours = DEFAULT_QUIET_HOURS,
}: ItemPlanInput): PlannedItemNotification[] {
  const planned: PlannedItemNotification[] = [];
  const add = (item: Omit<PlannedItemNotification, 'identifier' | 'level'>, priority?: Task['priority']) => {
```

devient :

<!-- bloc: in-sig-apres -->

```ts
  quietHours = DEFAULT_QUIET_HOURS,
  alertDefaults = DEFAULT_ALERT_DEFAULTS,
}: ItemPlanInput): PlannedItemNotification[] {
  const planned: PlannedItemNotification[] = [];
  const add = (
    item: Omit<PlannedItemNotification, 'identifier' | 'level'>,
    priority?: Task['priority'],
    // A moment: its type and the level chosen for it (sheet 023)
    moment?: Pick<Event, 'momentKind' | 'alertLevel'>
  ) => {
```

Dans `src/domain/rules/item-notification-rules.ts` :

<!-- bloc: in-level-avant -->

```ts
      level: notificationLevelFor({ moment: item.moment, priority, at: item.scheduledAt, quietHours }),
```

devient :

<!-- bloc: in-level-apres -->

```ts
      level: notificationLevelFor({
        moment: item.moment,
        priority,
        at: item.scheduledAt,
        quietHours,
        defaults: alertDefaults,
        chosen: moment?.alertLevel,
        momentKind: moment?.momentKind,
      }),
```

Dans `src/domain/rules/item-notification-rules.ts` :

<!-- bloc: in-leave-avant -->

```ts
        body: translate(language, 'itemNotif.momentLeave', { place, time: clock(start) }),
      });
```

devient :

<!-- bloc: in-leave-apres -->

```ts
        body: translate(language, 'itemNotif.momentLeave', { place, time: clock(start) }),
      }, undefined, event);
```

Dans `src/domain/rules/item-notification-rules.ts` :

<!-- bloc: in-before-avant -->

```ts
        body: translate(language, 'itemNotif.momentBefore', { time: clock(start) }),
      });
```

devient :

<!-- bloc: in-before-apres -->

```ts
        body: translate(language, 'itemNotif.momentBefore', { time: clock(start) }),
      }, undefined, event);
```

Dans `src/domain/rules/habit-notification-rules.ts` :

<!-- bloc: hn-sig-avant -->

```ts
  quietHours = DEFAULT_QUIET_HOURS,
}: {
  habits: readonly HabitToPlan[];
  now: Date;
  language?: AppLanguage;
  quietHours?: QuietHours;
}): PlannedHabitNotification[] {
```

devient :

<!-- bloc: hn-sig-apres -->

```ts
  quietHours = DEFAULT_QUIET_HOURS,
  alertDefaults,
}: {
  habits: readonly HabitToPlan[];
  now: Date;
  language?: AppLanguage;
  quietHours?: QuietHours;
  /** The default level of each family, from the settings (sheet 023). */
  alertDefaults?: AlertDefaults;
}): PlannedHabitNotification[] {
```

Dans `src/domain/rules/habit-notification-rules.ts` :

<!-- bloc: hn-level-avant -->

```ts
        level: notificationLevelFor({ moment: 'habit', at, quietHours }),
```

devient :

<!-- bloc: hn-level-apres -->

```ts
        level: notificationLevelFor({ moment: 'habit', at, quietHours, defaults: alertDefaults }),
```

Dans `src/services/item-notification-service.ts` :

<!-- bloc: svc-item-avant -->

```ts
          quietHours: quietHoursOf(settings),
        })
      : [];
```

devient :

<!-- bloc: svc-item-apres -->

```ts
          quietHours: quietHoursOf(settings),
          alertDefaults: settings.alertLevels,
        })
      : [];
```

Dans `src/services/habit-notification-service.ts` :

<!-- bloc: svc-habit-avant -->

```ts
      quietHours: quietHoursOf(settings),
    });
```

devient :

<!-- bloc: svc-habit-apres -->

```ts
      quietHours: quietHoursOf(settings),
      alertDefaults: settings.alertLevels,
    });
```

Dans `src/services/reminder-notification-service.ts` :

<!-- bloc: svc-rem-avant -->

```ts
          useAppStore.getState().language,
          quietHoursOf(settings)
        )
```

devient :

<!-- bloc: svc-rem-apres -->

```ts
          useAppStore.getState().language,
          quietHoursOf(settings),
          settings.alertLevels
        )
```

Dans `src/domain/rules/reminder-notification-rules.ts` :

<!-- bloc: rn-import-avant -->

```ts
import { DEFAULT_QUIET_HOURS, NotificationLevel, notificationLevelFor, QuietHours } from './notification-level-rules';
```

devient :

<!-- bloc: rn-import-apres -->

```ts
import {
  AlertDefaults,
  DEFAULT_ALERT_DEFAULTS,
  DEFAULT_QUIET_HOURS,
  NotificationLevel,
  notificationLevelFor,
  QuietHours,
} from './notification-level-rules';
```

Dans `src/domain/rules/habit-notification-rules.ts` :

<!-- bloc: hn-import-avant -->

```ts
import { DEFAULT_QUIET_HOURS, NotificationLevel, notificationLevelFor, QuietHours } from './notification-level-rules';
```

devient :

<!-- bloc: hn-import-apres -->

```ts
import { AlertDefaults, DEFAULT_QUIET_HOURS, NotificationLevel, notificationLevelFor, QuietHours } from './notification-level-rules';
```

### Étape 6 — Les formulaires

Fichier `src/constants/moment-kinds.ts` (remplacé en entier) :

<!-- bloc: kind-looks -->

```ts
/**
 * How each type of moment looks (study 001, 6-C; sheet 023): its icon, its name and its colour
 * in each theme. What a type does lives in domain/rules/moment-kind-rules.ts; both are keyed by
 * the same ids (MOMENT_KINDS), so adding a type is one line here, one there, and its two names.
 * The colours are readable on every surface; the mourning one stays grey and quiet.
 */

import type { Ionicons } from '@expo/vector-icons';

import type { ThemePalette } from '@/constants/palettes';
import { momentKindOf, type MomentKind } from '@/domain/rules/moment-kind-rules';
import type { MessageKey } from '@/i18n';

export interface MomentKindLook {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: MessageKey;
  color: { dark: string; light: string };
}

export const MOMENT_KIND_LOOKS: Readonly<Record<MomentKind, MomentKindLook>> = {
  appointment: { icon: 'calendar-outline', labelKey: 'momentKind.appointment', color: { dark: '#F5B942', light: '#B45309' } },
  work: { icon: 'briefcase-outline', labelKey: 'momentKind.work', color: { dark: '#7AA2F7', light: '#1D4ED8' } },
  health: { icon: 'medkit-outline', labelKey: 'momentKind.health', color: { dark: '#5EEAD4', light: '#0F766E' } },
  birthday: { icon: 'gift-outline', labelKey: 'momentKind.birthday', color: { dark: '#F9A8D4', light: '#BE185D' } },
  party: { icon: 'sparkles-outline', labelKey: 'momentKind.party', color: { dark: '#C4B5FD', light: '#6D28D9' } },
  ceremony: { icon: 'flower-outline', labelKey: 'momentKind.ceremony', color: { dark: '#E9D8A6', light: '#854D0E' } },
  mourning: { icon: 'leaf-outline', labelKey: 'momentKind.mourning', color: { dark: '#A8A29E', light: '#57534E' } },
  travel: { icon: 'airplane-outline', labelKey: 'momentKind.travel', color: { dark: '#93C5FD', light: '#0369A1' } },
  // "Autre" keeps the amber of the Moment family, as before the types
  other: { icon: 'ellipse-outline', labelKey: 'momentKind.other', color: { dark: '#F5B942', light: '#B45309' } },
};

/** The look of a saved type; an unknown one looks like "Autre". */
export function momentKindLook(kind: unknown): MomentKindLook {
  return MOMENT_KIND_LOOKS[momentKindOf(kind)];
}

export function momentKindColor(palette: Pick<ThemePalette, 'mode'>, kind: unknown): string {
  const look = momentKindLook(kind);
  return palette.mode === 'light' ? look.color.light : look.color.dark;
}
```

Fichier `src/components/create/form/AlertLevelField.tsx` (remplacé en entier) :

<!-- bloc: level-field -->

```tsx
/**
 * "How it warns you": Auto · Discrète · Normale · Alarme (study 001, 6-B; sheet 023). Shared by
 * the "To do" form (a reminder) and the "Moment" form. Auto follows the settings, the type of the
 * moment, the urgency and the night; a chosen level is kept, except that the night lowers it
 * one step (not the alarm).
 */
import React from 'react';
import { View } from 'react-native';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import type { AlertLevel } from '@/domain/entities';
import { useT } from '@/i18n';

type Value = AlertLevel | 'auto';

export function AlertLevelField({
  value,
  onChange,
  accent,
  testIDPrefix,
}: {
  value: AlertLevel | null;
  onChange: (level: AlertLevel | null) => void;
  accent: string;
  testIDPrefix?: string;
}) {
  const t = useT();
  const current: Value = value ?? 'auto';
  const options: Choice<Value>[] = [
    { value: 'auto', label: t('alertLevel.auto'), icon: 'sparkles-outline' },
    { value: 'discreet', label: t('alertLevel.discreet'), icon: 'notifications-off-outline' },
    { value: 'normal', label: t('alertLevel.normal'), icon: 'notifications-outline' },
    { value: 'alarm', label: t('alertLevel.alarm'), icon: 'alarm-outline' },
  ];
  return (
    <View>
      <FieldLabel label={t('alertLevel.label')} hint={t('alertLevel.hint')} />
      <ChoiceChips
        options={options}
        value={current}
        onChange={next => onChange(next === 'auto' ? null : next)}
        accent={accent}
        testIDPrefix={testIDPrefix}
      />
    </View>
  );
}
```

Dans `src/constants/item-forms.ts` :

<!-- bloc: if-types-avant -->

```ts
export type FormSectionId = 'what' | 'when' | 'alert' | 'slot' | 'where' | 'leave' | 'who' | 'more';
export type MoreFieldId = 'priority' | 'deadline' | 'duration' | 'subtasks' | 'tags' | 'availability';
```

devient :

<!-- bloc: if-types-apres -->

```ts
export type FormSectionId = 'what' | 'kind' | 'when' | 'alert' | 'slot' | 'where' | 'leave' | 'who' | 'more';
export type MoreFieldId = 'priority' | 'deadline' | 'duration' | 'subtasks' | 'tags' | 'availability' | 'alertLevel';
```

Dans `src/constants/item-forms.ts` :

<!-- bloc: if-moment-avant -->

```ts
    sections: ['what', 'slot', 'where', 'leave', 'who', 'more'],
    more: ['availability', 'tags'],
```

devient :

<!-- bloc: if-moment-apres -->

```ts
    // The type right under the title (sheet 023): it is often guessed from it
    sections: ['what', 'kind', 'slot', 'where', 'leave', 'who', 'more'],
    more: ['alertLevel', 'availability', 'tags'],
```

Dans `src/__tests__/item-forms.test.ts` :

<!-- bloc: if-test-avant -->

```ts
    expect(ITEM_FORMS.moment.sections).toEqual(['what', 'slot', 'where', 'leave', 'who', 'more']);
```

devient :

<!-- bloc: if-test-apres -->

```ts
    expect(ITEM_FORMS.moment.sections).toEqual(['what', 'kind', 'slot', 'where', 'leave', 'who', 'more']);
```

Dans `src/__tests__/item-forms.test.ts` :

<!-- bloc: if-test-2-avant -->

```ts
    expect(visibleMoreFields('moment', { alert: true })).toEqual(['availability', 'tags']);
```

devient :

<!-- bloc: if-test-2-apres -->

```ts
    expect(visibleMoreFields('moment', { alert: true })).toEqual(['alertLevel', 'availability', 'tags']);
```

Dans `src/features/create/edit-loaders.ts` :

<!-- bloc: ld-import-avant -->

```ts
import type { EventType, Reminder, ReminderPriority, TaskStatus } from '@/domain/entities';
import { simpleRecurrenceOf, splitAlertMoment, type SimpleRecurrence } from '@/domain/rules/item-edit-rules';
```

devient :

<!-- bloc: ld-import-apres -->

```ts
import type { AlertLevel, EventType, MomentKind, Reminder, ReminderPriority, TaskStatus } from '@/domain/entities';
import { simpleRecurrenceOf, splitAlertMoment, type SimpleRecurrence } from '@/domain/rules/item-edit-rules';
import { momentKindOf } from '@/domain/rules/moment-kind-rules';
import { chosenLevelOf } from '@/domain/rules/notification-level-rules';
```

Dans `src/features/create/edit-loaders.ts` :

<!-- bloc: ld-todo-type-avant -->

```ts
  confirm: boolean;
  dueDate: string | undefined;
```

devient :

<!-- bloc: ld-todo-type-apres -->

```ts
  confirm: boolean;
  /** The level chosen for a reminder (sheet 023), null for "Auto". */
  alertLevel: AlertLevel | null;
  dueDate: string | undefined;
```

Dans `src/features/create/edit-loaders.ts` :

<!-- bloc: ld-rem-avant -->

```ts
      confirm: Boolean(reminder.requiresConfirmation),
      dueDate: undefined,
```

devient :

<!-- bloc: ld-rem-apres -->

```ts
      confirm: Boolean(reminder.requiresConfirmation),
      alertLevel: chosenLevelOf(reminder.alertLevel),
      dueDate: undefined,
```

Dans `src/features/create/edit-loaders.ts` :

<!-- bloc: ld-task-avant -->

```ts
    confirm: false,
    dueDate: task.dueDate,
```

devient :

<!-- bloc: ld-task-apres -->

```ts
    confirm: false,
    alertLevel: null,
    dueDate: task.dueDate,
```

Dans `src/features/create/edit-loaders.ts` :

<!-- bloc: ld-moment-type-avant -->

```ts
  type: EventType;
  personIds: string[];
  tagIds: string[];
}

export async function loadMomentForEdit
```

devient :

<!-- bloc: ld-moment-type-apres -->

```ts
  type: EventType;
  momentKind: MomentKind;
  alertLevel: AlertLevel | null;
  personIds: string[];
  tagIds: string[];
}

export async function loadMomentForEdit
```

Dans `src/features/create/edit-loaders.ts` :

<!-- bloc: ld-moment-avant -->

```ts
    type: event.type,
    personIds: persons.map(person => person.id),
```

devient :

<!-- bloc: ld-moment-apres -->

```ts
    type: event.type,
    momentKind: momentKindOf(event.momentKind),
    alertLevel: chosenLevelOf(event.alertLevel),
    personIds: persons.map(person => person.id),
```

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: tf-import-avant -->

```tsx
} from '@/components/create/form/FormBricks';
import { LoadingState } from '@/components/feedback/States';
```

devient :

<!-- bloc: tf-import-apres -->

```tsx
} from '@/components/create/form/FormBricks';
import { AlertLevelField } from '@/components/create/form/AlertLevelField';
import { LoadingState } from '@/components/feedback/States';
```

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: tf-types-avant -->

```tsx
import type { Person, Reminder, ReminderPriority, TaskStatus } from '@/domain/entities';
```

devient :

<!-- bloc: tf-types-apres -->

```tsx
import type { AlertLevel, Person, Reminder, ReminderPriority, TaskStatus } from '@/domain/entities';
```

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: tf-state-avant -->

```tsx
  const [confirm, setConfirm] = useState(false);
  const [dueDate, setDueDate]
```

devient :

<!-- bloc: tf-state-apres -->

```tsx
  const [confirm, setConfirm] = useState(false);
  // How it warns (sheet 023): null is "Auto"
  const [alertLevel, setAlertLevel] = useState<AlertLevel | null>(null);
  const [dueDate, setDueDate]
```

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: tf-load-avant -->

```tsx
        setConfirm(values.confirm);
        setDueDate(values.dueDate);
```

devient :

<!-- bloc: tf-load-apres -->

```tsx
        setConfirm(values.confirm);
        setAlertLevel(values.alertLevel);
        setDueDate(values.dueDate);
```

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: tf-update-avant -->

```tsx
          recurrenceRule: recurrenceToSave(scheduledAt),
        });
        showSnackbar(t('remEdit.updated'));
```

devient :

<!-- bloc: tf-update-apres -->

```tsx
          recurrenceRule: recurrenceToSave(scheduledAt),
          alertLevel,
        });
        showSnackbar(t('remEdit.updated'));
```

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: tf-create-avant -->

```tsx
          recurrenceRule: recurrenceToSave(scheduledAt) ?? undefined,
        });
```

devient :

<!-- bloc: tf-create-apres -->

```tsx
          recurrenceRule: recurrenceToSave(scheduledAt) ?? undefined,
          alertLevel,
        });
```

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: tf-field-avant -->

```tsx
                  testID="reminder-confirmation"
                />
              </View>
```

devient :

<!-- bloc: tf-field-apres -->

```tsx
                  testID="reminder-confirmation"
                />
                <AlertLevelField value={alertLevel} onChange={setAlertLevel} accent={accent} testIDPrefix="todo-alert-level" />
              </View>
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-import-avant -->

```tsx
} from '@/components/create/form/FormBricks';
import { LoadingState } from '@/components/feedback/States';
```

devient :

<!-- bloc: mf-import-apres -->

```tsx
} from '@/components/create/form/FormBricks';
import { AlertLevelField } from '@/components/create/form/AlertLevelField';
import { LoadingState } from '@/components/feedback/States';
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-import-2-avant -->

```tsx
import { itemFamilyColor } from '@/constants/item-kinds';
import { Spacing } from '@/constants/theme';
import type { EventType, Person } from '@/domain/entities';
import { momentFromSentence } from '@/domain/rules/form-dictation-rules';
```

devient :

<!-- bloc: mf-import-2-apres -->

```tsx
import { itemFamilyColor } from '@/constants/item-kinds';
import { MOMENT_KIND_LOOKS } from '@/constants/moment-kinds';
import { Spacing } from '@/constants/theme';
import type { AlertLevel, EventType, MomentKind, Person } from '@/domain/entities';
import { momentFromSentence } from '@/domain/rules/form-dictation-rules';
import { guessMomentKind, MOMENT_KINDS } from '@/domain/rules/moment-kind-rules';
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-state-avant -->

```tsx
  const [eventType, setEventType] = useState<EventType>('BUSY');
```

devient :

<!-- bloc: mf-state-apres -->

```tsx
  const [eventType, setEventType] = useState<EventType>('BUSY');
  // Its type (sheet 023): guessed from the title until the person picks one
  const [momentKind, setMomentKind] = useState<MomentKind>('other');
  const [kindPicked, setKindPicked] = useState(Boolean(editingId));
  const [alertLevel, setAlertLevel] = useState<AlertLevel | null>(null);
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-load-avant -->

```tsx
        setEventType(values.type);
        setPersonIds(values.personIds);
```

devient :

<!-- bloc: mf-load-apres -->

```tsx
        setEventType(values.type);
        setMomentKind(values.momentKind);
        setAlertLevel(values.alertLevel);
        setPersonIds(values.personIds);
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-dictate-avant -->

```tsx
    const fill = momentFromSentence(sentence, persons, new Date(), language);
    setTitle(fill.title);
```

devient :

<!-- bloc: mf-dictate-apres -->

```tsx
    const fill = momentFromSentence(sentence, persons, new Date(), language);
    const kind = guessMomentKind(sentence, language);
    if (kind) {
      setMomentKind(kind);
      setKindPicked(true);
    }
    setTitle(fill.title);
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-understood-avant -->

```tsx
        `${format(fill.start, 'EEE d MMM HH:mm', { locale: dateLocale })} – ${format(fill.end, 'HH:mm')}`,
```

devient :

<!-- bloc: mf-understood-apres -->

```tsx
        `${format(fill.start, 'EEE d MMM HH:mm', { locale: dateLocale })} – ${format(fill.end, 'HH:mm')}`,
        kind && kind !== 'other' ? t(MOMENT_KIND_LOOKS[kind].labelKey) : '',
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-update-avant -->

```tsx
          type: eventType,
          travelBufferMinutes: place ? travelBufferMinutes : 0,
          personIds,
          tagIds,
        });
        showSnackbar(t('itemForm.saved'));
```

devient :

<!-- bloc: mf-update-apres -->

```tsx
          type: eventType,
          travelBufferMinutes: place ? travelBufferMinutes : 0,
          momentKind,
          alertLevel,
          personIds,
          tagIds,
        });
        showSnackbar(t('itemForm.saved'));
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-create-avant -->

```tsx
          // Leaving only means something with a place
          travelBufferMinutes: place ? travelBufferMinutes : 0,
          personIds,
          tagIds,
        });
        showSnackbar(t('eventNew.created'));
```

devient :

<!-- bloc: mf-create-apres -->

```tsx
          // Leaving only means something with a place
          travelBufferMinutes: place ? travelBufferMinutes : 0,
          momentKind,
          alertLevel,
          personIds,
          tagIds,
        });
        showSnackbar(t('eventNew.created'));
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-title-avant -->

```tsx
              onChangeText={text => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
              accent={accent}
              placeholder={t('itemForm.momentPlaceholder')}
```

devient :

<!-- bloc: mf-title-apres -->

```tsx
              onChangeText={text => {
                setTitle(text);
                if (titleError) setTitleError('');
                // "Dentiste", "Anniversaire de Léa": the type follows the title until one is picked
                if (!kindPicked) setMomentKind(guessMomentKind(text, language) ?? 'other');
              }}
              accent={accent}
              placeholder={t('itemForm.momentPlaceholder')}
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-more-avant -->

```tsx
      case 'tags':
        return <TagField key={field} selectedIds={tagIds} onChange={setTagIds} />;
      default:
        return null;
    }
  };

  const renderSection
```

devient :

<!-- bloc: mf-more-apres -->

```tsx
      case 'alertLevel':
        return <AlertLevelField key={field} value={alertLevel} onChange={setAlertLevel} accent={accent} testIDPrefix="moment-alert-level" />;
      case 'tags':
        return <TagField key={field} selectedIds={tagIds} onChange={setTagIds} />;
      default:
        return null;
    }
  };

  const renderSection
```

Dans `src/features/create/MomentForm.tsx` :

<!-- bloc: mf-section-avant -->

```tsx
      case 'slot':
        return (
          <FormSection icon="time-outline" title={t('itemForm.slot')} accent={accent}>
```

devient :

<!-- bloc: mf-section-apres -->

```tsx
      case 'kind':
        return (
          <FormSection icon="pricetag-outline" title={t('itemForm.kind')} accent={accent}>
            <ChoiceChips
              options={MOMENT_KINDS.map(kind => ({
                value: kind,
                label: t(MOMENT_KIND_LOOKS[kind].labelKey),
                icon: MOMENT_KIND_LOOKS[kind].icon,
              }))}
              value={momentKind}
              onChange={kind => {
                setMomentKind(kind);
                setKindPicked(true);
              }}
              accent={accent}
              testIDPrefix="moment-kind"
            />
          </FormSection>
        );
      case 'slot':
        return (
          <FormSection icon="time-outline" title={t('itemForm.slot')} accent={accent}>
```

### Étape 7 — La page d'un moment, le Planning, les Paramètres

Fichier `src/components/settings/AlertDefaultsSetting.tsx` (remplacé en entier) :

<!-- bloc: defaults-setting -->

```tsx
/**
 * The default level of each family in the settings (study 001, 12.8; sheet 023): reminders,
 * deadlines, moments and habits, each Discrète · Normale · Alarme. What is chosen on an item
 * comes first; the type of a moment, the urgency and the night move these defaults.
 */
import React from 'react';
import { View } from 'react-native';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import { Spacing } from '@/constants/theme';
import type { AlertLevel } from '@/domain/entities';
import { ALERT_FAMILIES, type AlertDefaults, type AlertFamily } from '@/domain/rules/notification-level-rules';
import { useTheme } from '@/hooks/use-theme';
import { useT, type MessageKey } from '@/i18n';

const FAMILY_LABELS: Readonly<Record<AlertFamily, MessageKey>> = {
  reminder: 'alertDefaults.reminder',
  deadline: 'alertDefaults.deadline',
  moment: 'alertDefaults.moment',
  habit: 'alertDefaults.habit',
};

export function AlertDefaultsSetting({
  value,
  onChange,
}: {
  value: AlertDefaults;
  onChange: (family: AlertFamily, level: AlertLevel) => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const options: Choice<AlertLevel>[] = [
    { value: 'discreet', label: t('alertLevel.discreet'), icon: 'notifications-off-outline' },
    { value: 'normal', label: t('alertLevel.normal'), icon: 'notifications-outline' },
    { value: 'alarm', label: t('alertLevel.alarm'), icon: 'alarm-outline' },
  ];
  return (
    <View style={{ gap: Spacing.sm }}>
      {ALERT_FAMILIES.map(family => (
        <View key={family}>
          <FieldLabel label={t(FAMILY_LABELS[family])} />
          <ChoiceChips
            options={options}
            value={value[family]}
            onChange={level => onChange(family, level)}
            accent={palette.primary.default}
            testIDPrefix={`alert-default-${family}`}
          />
        </View>
      ))}
    </View>
  );
}
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-import-avant -->

```tsx
import { mapsDirectionsUrl } from '@/domain/rules/maps-links';
```

devient :

<!-- bloc: ev-import-apres -->

```tsx
import { mapsDirectionsUrl } from '@/domain/rules/maps-links';
import { momentKindColor, momentKindLook } from '@/constants/moment-kinds';
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-kind-avant -->

```tsx
          {/* Date & Horaires */}
          <View style={styles.infoRow}>
```

devient :

<!-- bloc: ev-kind-apres -->

```tsx
          {/* Its type (sheet 023), shown when it has one */}
          {event.momentKind && event.momentKind !== 'other' ? (
            <View style={styles.infoRow} testID="event-kind">
              <Ionicons name={momentKindLook(event.momentKind).icon} size={20} color={momentKindColor(theme, event.momentKind)} />
              <Text style={[styles.infoTitle, { color: momentKindColor(theme, event.momentKind) }]}>
                {t(momentKindLook(event.momentKind).labelKey)}
              </Text>
            </View>
          ) : null}

          {/* Date & Horaires */}
          <View style={styles.infoRow}>
```

Dans `src/app/(tabs)/calendar.tsx` :

<!-- bloc: ca-import-avant -->

```tsx
import { makeCalendarStyles } from '@/styles/tabs/calendar-styles';
```

devient :

<!-- bloc: ca-import-apres -->

```tsx
import { makeCalendarStyles } from '@/styles/tabs/calendar-styles';
import { momentKindColor } from '@/constants/moment-kinds';
```

Dans `src/app/(tabs)/calendar.tsx` :

<!-- bloc: ca-color-avant -->

```tsx
            endTime: format(end, 'HH:mm'),
            color: theme.primary.default,
```

devient :

<!-- bloc: ca-color-apres -->

```tsx
            endTime: format(end, 'HH:mm'),
            // The colour of its type (sheet 023); "Autre" keeps the amber of the moments
            color: momentKindColor(theme, e.momentKind),
```

Dans `src/components/calendar/CalendarTimetable.tsx` :

<!-- bloc: tt-import-avant -->

```tsx
import { ThemePalette } from '@/constants/palettes';
```

devient :

<!-- bloc: tt-import-apres -->

```tsx
import { ThemePalette } from '@/constants/palettes';
import { momentKindColor, momentKindLook } from '@/constants/moment-kinds';
```

Dans `src/components/calendar/CalendarTimetable.tsx` :

<!-- bloc: tt-badge-avant -->

```tsx
                              <Ionicons name="calendar" size={11} color={eventAccentColor} />
                              <Text style={[styles.eventBadgeText, { color: eventAccentColor }]}>
                                {t('timetable.eventBadge')}
                              </Text>
```

devient :

<!-- bloc: tt-badge-apres -->

```tsx
                              {/* The icon, colour and name of its type (sheet 023); "Événement" for "Autre" */}
                              <Ionicons
                                name={e.momentKind && e.momentKind !== 'other' ? momentKindLook(e.momentKind).icon : 'calendar'}
                                size={11}
                                color={e.momentKind && e.momentKind !== 'other' ? momentKindColor(theme, e.momentKind) : eventAccentColor}
                              />
                              <Text
                                style={[
                                  styles.eventBadgeText,
                                  { color: e.momentKind && e.momentKind !== 'other' ? momentKindColor(theme, e.momentKind) : eventAccentColor },
                                ]}
                              >
                                {e.momentKind && e.momentKind !== 'other' ? t(momentKindLook(e.momentKind).labelKey) : t('timetable.eventBadge')}
                              </Text>
```

Dans `src/app/settings/index.tsx` :

<!-- bloc: st-import-avant -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
```

devient :

<!-- bloc: st-import-apres -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AlertDefaultsSetting } from '@/components/settings/AlertDefaultsSetting';
import { DEFAULT_ALERT_DEFAULTS, type AlertFamily } from '@/domain/rules/notification-level-rules';
import type { AlertLevel } from '@/domain/entities';
```

Dans `src/app/settings/index.tsx` :

<!-- bloc: st-handler-avant -->

```tsx
  const handleExportData = async () => {
```

devient :

<!-- bloc: st-handler-apres -->

```tsx
  // The default level of each family (sheet 023): the planned notifications follow at once
  const handleUpdateAlertDefault = async (family: AlertFamily, level: AlertLevel) => {
    if (!settings) return;
    const alertLevels = { ...(settings.alertLevels ?? DEFAULT_ALERT_DEFAULTS), [family]: level };
    try {
      await SettingsRepository.update({ alertLevels, updatedAt: new Date().toISOString() });
      setSettings(s => (s ? { ...s, alertLevels } : s));
      await syncReminderNotifications();
      showSnackbar(t('alertDefaults.saved'));
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const handleExportData = async () => {
```

Dans `src/app/settings/index.tsx` :

<!-- bloc: st-row-avant -->

```tsx
          {renderHourPills([6, 7, 8], settings.quietHoursEnd ?? 7, hour => handleUpdateQuietHours({ quietHoursEnd: hour }))}
        </View>
      )}
```

devient :

<!-- bloc: st-row-apres -->

```tsx
          {renderHourPills([6, 7, 8], settings.quietHoursEnd ?? 7, hour => handleUpdateQuietHours({ quietHoursEnd: hour }))}
        </View>
      )}

      {settings.notificationsEnabled && (
        <View style={styles.rowCol}>
          <Text style={styles.rowLabel}>{t('alertDefaults.title')}</Text>
          <Text style={styles.rowSub}>{t('alertDefaults.hint')}</Text>
          <AlertDefaultsSetting value={settings.alertLevels ?? DEFAULT_ALERT_DEFAULTS} onChange={handleUpdateAlertDefault} />
        </View>
      )}
```

### Étape 8 — Les mots

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'itemForm.customRepeatKept':
```

devient :

<!-- bloc: fr-apres -->

```ts
  'momentKind.appointment': "Rendez-vous",
  'momentKind.work': "Travail",
  'momentKind.health': "Santé",
  'momentKind.birthday': "Anniversaire",
  'momentKind.party': "Fête",
  'momentKind.ceremony': "Religieux / cérémonie",
  'momentKind.mourning': "Deuil",
  'momentKind.travel': "Voyage",
  'momentKind.other': "Autre",
  'itemForm.kind': "Type",
  'alertLevel.label': "Comment il te prévient",
  'alertLevel.hint': "Auto suit tes réglages, le type et l'urgence. La nuit, tout baisse d'un cran, sauf l'Alarme.",
  'alertLevel.auto': "Auto",
  'alertLevel.discreet': "Discrète",
  'alertLevel.normal': "Normale",
  'alertLevel.alarm': "Alarme",
  'alertDefaults.title': "Niveau par défaut",
  'alertDefaults.hint': "Pour tout ce qui sonne en « Auto ». Un deuil reste discret, le départ d'un voyage devient une alarme.",
  'alertDefaults.reminder': "Rappels",
  'alertDefaults.deadline': "Échéances des tâches",
  'alertDefaults.moment': "Moments",
  'alertDefaults.habit': "Habitudes",
  'alertDefaults.saved': "Niveau enregistré",
  'itemForm.customRepeatKept':
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'itemForm.customRepeatKept':
```

devient :

<!-- bloc: en-apres -->

```ts
  'momentKind.appointment': "Appointment",
  'momentKind.work': "Work",
  'momentKind.health': "Health",
  'momentKind.birthday': "Birthday",
  'momentKind.party': "Party",
  'momentKind.ceremony': "Religious / ceremony",
  'momentKind.mourning': "Mourning",
  'momentKind.travel': "Travel",
  'momentKind.other': "Other",
  'itemForm.kind': "Type",
  'alertLevel.label': "How it warns you",
  'alertLevel.hint': "Auto follows your settings, the type and the urgency. At night everything goes one step down, except the Alarm.",
  'alertLevel.auto': "Auto",
  'alertLevel.discreet': "Discreet",
  'alertLevel.normal': "Normal",
  'alertLevel.alarm': "Alarm",
  'alertDefaults.title': "Default level",
  'alertDefaults.hint': "For everything that rings on \"Auto\". A mourning stays discreet, leaving for a journey becomes an alarm.",
  'alertDefaults.reminder': "Reminders",
  'alertDefaults.deadline': "Task deadlines",
  'alertDefaults.moment': "Moments",
  'alertDefaults.habit': "Habits",
  'alertDefaults.saved': "Level saved",
  'itemForm.customRepeatKept':
```

### Étape 9 — Appliquer d'un coup, puis vérifier

```powershell
node docs/tutoriel-suite/outils/appliquer-fiche-023.js .
```

```powershell
npx jest
```

```powershell
npx tsc --noEmit
```

```powershell
npx eslint src
```

## 6. Vérification

| Contrôle | Résultat attendu |
|---|---|
| `npx jest` | tout passe, dont `moment-kind-rules` et `alert-hierarchy` |
| Nouveau moment, titre « Dentiste » | le type passe à **Santé** tout seul |
| Moment de type Deuil | page : « Deuil » en gris ; Planning : créneau gris |
| Rappel → Plus d'options de l'alerte | « Comment il te prévient » : Auto · Discrète · Normale · Alarme |
| Paramètres → Notifications | « Niveau par défaut » : quatre lignes |
| Sur le téléphone | un rappel en « Alarme » arrive sur le canal Alarme |

## 7. Retour en arrière

`git checkout -- <fichiers modifiés>` et supprimer les fichiers nouveaux. La migration 37 ne s'annule pas (SQLite), mais ses colonnes vides sont sans effet sur une version d'avant.

## Compte rendu d'exécution (24 novembre 2026)

- Lu avant d'écrire : l'étude (6-B, 6-C, 12.6, 12.8), la règle des niveaux (fiche 011), les trois règles de notifications et leurs services, les dépôts, les sauvegardes, le Planning et sa vue « emploi du temps », la page Paramètres → Notifications.
- Décisions prises pour avancer (section 3, notées dans l'étude 12.6) : les neuf types de l'étude ; deuil un cran en dessous, départ d'un voyage un cran au-dessus ; un niveau choisi n'est changé que par la nuit (sauf l'Alarme) ; pas de niveau choisi pour l'échéance d'une tâche.
- Appliquée **à partir des blocs de cette fiche** (`appliquer-fiche-023.js`).
- **Écarts corrigés** :
  - TypeScript : les entités n'importaient pas `AlertLevel` ni `MomentKind` (bloc `ent-enums` ajouté) ;
  - dans `AlertLevelField`, la valeur « Auto » doit être typée (`current`).

  Ces corrections ont été faites dans les fichiers, puis la fiche a été réécrite. Les fiches 022 et 023, **rejouées sur une copie propre** du code enregistré, donnent un résultat identique fichier par fichier.
- Tests : `Test Suites: 99 passed`, `Tests: 2043 passed` (dont `moment-kind-rules` et `alert-hierarchy`, qui vérifie aussi que rien ne change avec les réglages de départ) ; `tsc` et `eslint` sans erreur.
- **Vérifié à l'écran** (web, 360 px) :
  - un nouveau moment titré « Dentiste » passe tout seul en **Santé** ;
  - « Comment il te prévient » apparaît dans « Plus d'options » ;
  - Paramètres → Notifications montre « Niveau par défaut » (quatre lignes). Rappels → Alarme reste après rechargement (la migration 37 a tourné), puis je l'ai remis à Normale.
- **Pas vérifié** : sur le téléphone, qu'une notification arrive sur le bon canal (Alarme, Discrète) ; la couleur d'un type dans le Planning (aucun moment typé dans les données d'essai). Rien n'est encore enregistré dans git.

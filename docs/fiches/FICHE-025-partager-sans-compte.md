# FICHE OPÉRATOIRE N° 025 — Partager sans compte

Projet : **Junix Pulse** · Date : 24 novembre 2026 · Suite de : [FICHE 024](FICHE-024-gestes-decouvrables.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), 5-A et 12.5 · Chantier n° 7 de la feuille de route (12.10)

---

## 1. Objectif

Envoyer une tâche, un rappel ou un moment à quelqu'un, **sans compte et sans serveur** (5-A). Décisions du 24 novembre 2026 :

| Question | Choix |
|---|---|
| Ce que contient l'invitation | un **texte lisible par tous** (qui, quoi, quand, où) et un **lien Junix** |
| Ce qu'on envoie | **moments, tâches et rappels** |
| QR code | **plus tard** (le partage du téléphone couvre déjà WhatsApp, SMS, e-mail, Bluetooth, Quick Share) |
| Après l'envoi | chaque personne de l'élément passe à **« Invitation envoyée »** ; un toucher la marque **« Participe »** (sans serveur, Junix ne peut pas le savoir seul) |

**Chez l'envoyeur**, la page d'une tâche, d'un rappel ou d'un moment a un bloc **« Envoyer »** (« Envoyer à Paul » quand l'élément a une seule personne). Le bouton ouvre le partage du téléphone, avec un message comme :

```text
Simon t'invite : Dîner chez Paul
samedi 28 nov., 20:00 – 22:00
12 rue des Lilas

Pour l'ajouter dans Junix Pulse :
junixpulse://invite?k=event&t=D%C3%AEner%20chez%20Paul&s=…
```

Ajouter une personne **n'envoie rien tout seul** : c'est toujours un geste de la personne.

**Chez le destinataire** :

- si son appli de messagerie rend le lien cliquable, un toucher ouvre **« Invitation reçue »** ;
- sinon, il copie le message et le colle dans **« + » → « Invitation reçue ? Colle le message »**.

Junix montre l'élément et ne l'ajoute qu'après **« Ajouter à mon Junix »**. L'envoyeur :

- est **lié** s'il est déjà dans les proches (même nom, sans tenir compte des accents) ;
- sinon, un interrupteur **éteint au départ** propose de l'ajouter aux proches. Jamais sans accord.

**Ce qui n'est pas envoyé** : les **notes** (elles peuvent être privées), les autres personnes, les étiquettes.

**Limite, dite honnêtement** : WhatsApp et la plupart des applis SMS ne rendent cliquables que les liens `https://`. Le lien `junixpulse://` y est souvent du simple texte, d'où le « coller ». Un lien toujours cliquable demande une petite page web, donc un serveur : ce sera l'étape 5-B (comptes), à décider ensemble (étude 5).

**Sécurité** : un lien reçu vient de l'extérieur. Il est lu strictement :

- seules les clés connues sont lues ;
- les longueurs sont coupées et les dates vérifiées ;
- un type de moment inconnu devient « Autre » ;
- rien n'est ajouté sans le geste de la personne.

**Pour que rien ne casse demain** :

- les règles du lien et du message sont **pures et testées** (`invite-rules.ts`) ;
- un seul bloc **« Envoyer »** (`ShareItemCard`) est posé sur les trois pages ;
- la migration 38 **ajoute** une table (`item_invites`), sauvegardée et restaurée ; une ancienne sauvegarde sans elle se restaure toujours.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 024 est enregistrée | `git log --oneline -1` | `feat(gestures): …` |
| Tout passe | `npx jest` | `Tests: 2060 passed` |

## 3. Hypothèses

- Sur Android, le partage ne dit pas si le message est vraiment parti : ouvrir le partage compte comme « envoyé ».
- Un rappel reçu dont l'heure est passée est ajouté comme **tâche** ce jour-là (il ne peut plus sonner).
- Le nom de l'envoyeur est le prénom des Paramètres (« Comment t'appeler ? »). Sans prénom, le message dit « Invitation : … ».

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/domain/rules/invite-rules.ts` (+ test) | **nouveau** : le lien, sa lecture stricte, le message, les statuts |
| `src/database/migrations.ts` | migration 38 : table `item_invites` |
| `src/services/backup-service.ts` | la table dans les sauvegardes |
| `src/repositories/invite-repository.ts` | **nouveau** |
| `src/use-cases/invite-use-cases.ts` | **nouveau** : préparer, marquer envoyé, accepter |
| `src/features/share/ShareItemCard.tsx` | **nouveau** : le bloc « Envoyer » |
| `src/app/invite.tsx` | **nouveau** : « Invitation reçue » |
| `src/app/_layout.tsx` | la route `invite` |
| pages d'une tâche, d'un rappel, d'un moment | le bloc « Envoyer » |
| `src/components/create/NewItemChooser.tsx` | « Invitation reçue ? Colle le message » |
| `messages-rest-fr.ts`, `-en.ts` | les textes |

## 5. Pas à pas

### Étape 1 — Les règles du lien et du message

Fichier `src/domain/rules/invite-rules.ts` (nouveau) :

<!-- bloc: rules -->

```ts
/**
 * Sending a task, a reminder or a moment without an account (study 001, 5-A and 12.5; sheet 025).
 * Nothing goes through a server: everything is in the message. The message has a text anyone can
 * read and a Junix link (junixpulse://invite?…) that adds the item in one touch for whoever has
 * Junix, or that Junix finds again in a pasted message.
 *
 * What is sent: the type, the title, when, where, the type of a moment and the sender's name.
 * Not the notes (they may be private), nor the people, nor the tags.
 *
 * A received link is data from outside: it is read strictly (known keys, lengths, real dates),
 * and nothing is added without the person's "Ajouter".
 */

import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';

import type { MomentKind } from '../enums';
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import { momentKindOf } from './moment-kind-rules';

export const INVITE_SCHEME_PREFIX = 'junixpulse://invite?';

export type InviteKind = 'task' | 'reminder' | 'event';

export interface Invite {
  kind: InviteKind;
  title: string;
  /** A task: its day, YYYY-MM-DD, if it has one. */
  day?: string;
  /** A reminder: when it rings (ISO). */
  at?: string;
  /** A moment: its start and end (ISO). */
  start?: string;
  end?: string;
  place?: string;
  momentKind?: MomentKind;
  /** The name of who sends it. */
  from?: string;
}

export const INVITE_LIMITS = { title: 120, place: 200, from: 60 } as const;

/** The short keys of the link, so that it stays short in an SMS. */
const KEYS: Readonly<Record<keyof Invite, string>> = {
  kind: 'k',
  title: 't',
  day: 'd',
  at: 'a',
  start: 's',
  end: 'e',
  place: 'p',
  momentKind: 'mk',
  from: 'f',
};

export function inviteLink(invite: Invite): string {
  const parts = (Object.keys(KEYS) as (keyof Invite)[])
    .filter(field => invite[field] !== undefined && invite[field] !== '')
    .map(field => `${KEYS[field]}=${encodeURIComponent(String(invite[field]))}`);
  return INVITE_SCHEME_PREFIX + parts.join('&');
}

const clip = (value: string | undefined, max: number) => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : undefined;
};

const validIso = (value: string | undefined): string | undefined => {
  if (!value || value.length > 40) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

/**
 * The invite of a link's parameters (by their short keys), or null when it is not a complete
 * invite: unknown type, no title, a reminder without its time, a moment without a start before
 * its end. Lengths are cut, unknown keys ignored.
 */
export function parseInviteParams(params: Readonly<Record<string, string | string[] | undefined>>): Invite | null {
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const kind = read(KEYS.kind);
  if (kind !== 'task' && kind !== 'reminder' && kind !== 'event') return null;
  const title = clip(read(KEYS.title), INVITE_LIMITS.title);
  if (!title) return null;
  const invite: Invite = { kind, title, from: clip(read(KEYS.from), INVITE_LIMITS.from) };

  if (kind === 'task') {
    const day = read(KEYS.day);
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(new Date(`${day}T12:00:00`).getTime())) invite.day = day;
  } else if (kind === 'reminder') {
    invite.at = validIso(read(KEYS.at));
    if (!invite.at) return null;
  } else {
    invite.start = validIso(read(KEYS.start));
    invite.end = validIso(read(KEYS.end));
    if (!invite.start || !invite.end || invite.end <= invite.start) return null;
    invite.place = clip(read(KEYS.place), INVITE_LIMITS.place);
    const momentKind = read(KEYS.momentKind);
    if (momentKind) invite.momentKind = momentKindOf(momentKind);
  }
  return invite;
}

/** The invite of the first Junix link found in a text (a pasted message), or null. */
export function findInvite(text: string): Invite | null {
  const at = text.indexOf(INVITE_SCHEME_PREFIX);
  if (at < 0) return null;
  const query = text.slice(at + INVITE_SCHEME_PREFIX.length).split(/\s/)[0];
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const cut = pair.indexOf('=');
    if (cut <= 0) continue;
    try {
      params[pair.slice(0, cut)] = decodeURIComponent(pair.slice(cut + 1));
    } catch {
      return null; // A broken link is not read halfway
    }
  }
  return parseInviteParams(params);
}

/** When an invite is, as the message says it ("samedi 28 nov., 20:00 – 22:00"), or '' for a task without a day. */
export function inviteWhen(invite: Invite, language: AppLanguage): string {
  const locale = language === 'en' ? enUS : fr;
  const day = (date: Date) => format(date, 'EEEE d MMM', { locale });
  const clock = (date: Date) => format(date, 'HH:mm');
  if (invite.kind === 'event' && invite.start && invite.end) {
    const start = new Date(invite.start);
    const end = new Date(invite.end);
    const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
    return sameDay ? `${day(start)}, ${clock(start)} – ${clock(end)}` : `${day(start)} ${clock(start)} – ${day(end)} ${clock(end)}`;
  }
  if (invite.kind === 'reminder' && invite.at) {
    const at = new Date(invite.at);
    return translate(language, 'invite.whenAt', { day: day(at), time: clock(at) });
  }
  if (invite.kind === 'task' && invite.day) return translate(language, 'invite.whenDay', { day: day(new Date(`${invite.day}T12:00:00`)) });
  return '';
}

/** The message sent: a text anyone can read, then the Junix link. */
export function inviteMessage(invite: Invite, language: AppLanguage): string {
  const when = inviteWhen(invite, language);
  const head = invite.from
    ? translate(language, 'invite.messageFrom', { name: invite.from, title: invite.title })
    : translate(language, 'invite.message', { title: invite.title });
  const lines = [head, when, invite.place ?? ''].filter(line => line !== '');
  return [...lines, '', translate(language, 'invite.messageLink'), inviteLink(invite)].join('\n');
}

// ─── What the sender sees after sending ──────────────────────────────────────────────────

/** No server tells when the other accepts: "Invitée" comes with the sending, "Participe" by hand. */
export type InviteStatus = 'invited' | 'joined';

/** A touch on the status: invited → takes part → invited. Before any sending, nothing to touch. */
export function nextInviteStatus(status: InviteStatus | null): InviteStatus | null {
  if (status === 'invited') return 'joined';
  if (status === 'joined') return 'invited';
  return null;
}

export function inviteStatusOf(value: unknown): InviteStatus | null {
  return value === 'invited' || value === 'joined' ? value : null;
}

/** A received reminder whose time has passed is added as a task on its day: it can no longer ring. */
export function receivedKind(invite: Invite, now: Date): InviteKind {
  if (invite.kind === 'reminder' && invite.at && new Date(invite.at).getTime() <= now.getTime()) return 'task';
  return invite.kind;
}

/** The person of the sender among the people, by name (no account: no phone or e-mail is sent). */
export function senderAmong<T extends { id: string; displayName: string }>(name: string | undefined, people: readonly T[]): T | null {
  const plain = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  if (!name) return null;
  const wanted = plain(name);
  return people.find(person => plain(person.displayName) === wanted) ?? null;
}
```

Fichier `src/domain/rules/__tests__/invite-rules.test.ts` (nouveau) :

<!-- bloc: rules-test -->

```ts
import {
  findInvite,
  inviteLink,
  inviteMessage,
  nextInviteStatus,
  parseInviteParams,
  receivedKind,
  senderAmong,
  type Invite,
} from '../invite-rules';

const MOMENT: Invite = {
  kind: 'event',
  title: 'Dîner chez Paul & Léa',
  start: '2026-11-28T19:00:00.000Z',
  end: '2026-11-28T21:00:00.000Z',
  place: '12 rue des Lilas',
  momentKind: 'party',
  from: 'Simon',
};

describe('the invite link (study 001, 5-A; sheet 025)', () => {
  it('reads back what it writes, accents and signs included', () => {
    expect(findInvite(inviteLink(MOMENT))).toEqual(MOMENT);
    const task: Invite = { kind: 'task', title: 'Rapporter le livre', day: '2026-11-30', from: 'Awa' };
    expect(findInvite(inviteLink(task))).toEqual(task);
    const reminder: Invite = { kind: 'reminder', title: 'Appeler maman ?', at: '2026-11-27T17:00:00.000Z' };
    expect(findInvite(inviteLink(reminder))).toEqual(reminder);
  });

  it('finds the link in a whole pasted message', () => {
    expect(findInvite(`Simon t'invite.\n\nPour l'ajouter : ${inviteLink(MOMENT)}\nÀ bientôt`)).toEqual(MOMENT);
    expect(findInvite('Rien à voir ici')).toBeNull();
  });

  it('refuses what is not a complete invite', () => {
    expect(parseInviteParams({ k: 'party', t: 'x' })).toBeNull();
    expect(parseInviteParams({ k: 'task', t: '   ' })).toBeNull();
    expect(parseInviteParams({ k: 'reminder', t: 'x', a: 'demain' })).toBeNull();
    expect(parseInviteParams({ k: 'event', t: 'x', s: '2026-11-28T21:00:00Z', e: '2026-11-28T19:00:00Z' })).toBeNull();
    expect(findInvite('junixpulse://invite?k=task&t=%E0%A4%A')).toBeNull();
  });

  it('cuts what is too long and ignores what it does not know', () => {
    const invite = parseInviteParams({ k: 'task', t: 'a'.repeat(500), d: '28/11/2026', x: 'drop table', f: 'b'.repeat(200) });
    expect(invite?.title).toHaveLength(120);
    expect(invite?.from).toHaveLength(60);
    expect(invite?.day).toBeUndefined();
    expect(Object.keys(invite ?? {})).not.toContain('x');
  });

  it('reads an unknown type of moment as "Autre"', () => {
    expect(parseInviteParams({ k: 'event', t: 'x', s: MOMENT.start, e: MOMENT.end, mk: 'rave' })?.momentKind).toBe('other');
  });

  it('writes a message anyone can read, then the link', () => {
    const message = inviteMessage(MOMENT, 'fr');
    expect(message).toContain('Simon');
    expect(message).toContain('Dîner chez Paul & Léa');
    expect(message).toContain('12 rue des Lilas');
    expect(message.trim().endsWith(inviteLink(MOMENT))).toBe(true);
    expect(inviteMessage({ kind: 'task', title: 'Rapporter le livre' }, 'en')).toContain('Rapporter le livre');
  });
});

describe('after sending and on receiving', () => {
  it('goes from invited to takes part and back, by hand', () => {
    expect(nextInviteStatus(null)).toBeNull();
    expect(nextInviteStatus('invited')).toBe('joined');
    expect(nextInviteStatus('joined')).toBe('invited');
  });

  it('adds a reminder already past as a task', () => {
    const now = new Date('2026-11-28T12:00:00Z');
    expect(receivedKind({ kind: 'reminder', title: 'x', at: '2026-11-27T10:00:00Z' }, now)).toBe('task');
    expect(receivedKind({ kind: 'reminder', title: 'x', at: '2026-11-29T10:00:00Z' }, now)).toBe('reminder');
    expect(receivedKind(MOMENT, now)).toBe('event');
  });

  it('knows the sender among the people by name, without accents or capitals', () => {
    const people = [{ id: '1', displayName: 'Zoé Martin' }, { id: '2', displayName: 'Simon' }];
    expect(senderAmong('zoe martin', people)?.id).toBe('1');
    expect(senderAmong('Paul', people)).toBeNull();
    expect(senderAmong(undefined, people)).toBeNull();
  });
});
```

### Étape 2 — Les données : migration 38 et sauvegardes

Dans `src/database/migrations.ts` :

<!-- bloc: migration-avant -->

```ts
      ALTER TABLE settings ADD COLUMN alert_levels TEXT;
    `,
  },
];
```

devient :

<!-- bloc: migration-apres -->

```ts
      ALTER TABLE settings ADD COLUMN alert_levels TEXT;
    `,
  },
  {
    version: 38,
    name: 'add_item_invites',
    sql: `
      -- A qui un element a ete envoye, et qui participe (fiche 025, etude 5-A et 12.5).
      -- item_type : task, reminder ou event ; status : invited ou joined. Pas de ligne : jamais envoye.
      CREATE TABLE IF NOT EXISTS item_invites (
        item_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        person_id TEXT NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (item_type, item_id, person_id),
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
      );
    `,
  },
];
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-table-avant -->

```ts
  'goal_habits',
  'personal_schedules',
```

devient :

<!-- bloc: bk-table-apres -->

```ts
  'goal_habits',
  // Since sheet 025: who an item was sent to
  'item_invites',
  'personal_schedules',
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-cols-avant -->

```ts
  goal_habits: ['goal_id', 'habit_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'valid_until',
```

devient :

<!-- bloc: bk-cols-apres -->

```ts
  goal_habits: ['goal_id', 'habit_id', 'added_at'],
  item_invites: ['item_type', 'item_id', 'person_id', 'status', 'updated_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'valid_until',
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-required-avant -->

```ts
  goal_habits: ['goal_id', 'habit_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'status',
```

devient :

<!-- bloc: bk-required-apres -->

```ts
  goal_habits: ['goal_id', 'habit_id', 'added_at'],
  item_invites: ['item_type', 'item_id', 'person_id', 'status', 'updated_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'status',
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-enum-avant -->

```ts
  goals: { status: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] },
```

devient :

<!-- bloc: bk-enum-apres -->

```ts
  goals: { status: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] },
  item_invites: { item_type: ['task', 'reminder', 'event'], status: ['invited', 'joined'] },
```

Dans `src/services/backup-service.ts` :

<!-- bloc: bk-zod-avant -->

```ts
  goal_habits: z.array(BackupRowSchema).default([]),
```

devient :

<!-- bloc: bk-zod-apres -->

```ts
  goal_habits: z.array(BackupRowSchema).default([]),
  // Since sheet 025: an older backup has none, and still restores
  item_invites: z.array(BackupRowSchema).default([]),
```

### Étape 3 — Lire, écrire, accepter

Fichier `src/repositories/invite-repository.ts` (nouveau) :

<!-- bloc: repo -->

```ts
/**
 * Who was sent an item, and who takes part (sheet 025): one row per item and person, in the
 * item_invites table (migration 38). No row: never sent to them.
 */

import { getDatabase } from '../database/sqlite';
import { inviteStatusOf, type InviteKind, type InviteStatus } from '../domain/rules/invite-rules';

export const InviteRepository = {
  /** The status of each person of an item, by person id. */
  async findFor(kind: InviteKind, itemId: string): Promise<Record<string, InviteStatus>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ person_id: string; status: string }>(
      'SELECT person_id, status FROM item_invites WHERE item_type = ? AND item_id = ?',
      kind,
      itemId
    );
    const statuses: Record<string, InviteStatus> = {};
    for (const row of rows) {
      const status = inviteStatusOf(row.status);
      if (status) statuses[row.person_id] = status;
    }
    return statuses;
  },

  async setStatus(kind: InviteKind, itemId: string, personId: string, status: InviteStatus): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO item_invites (item_type, item_id, person_id, status, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (item_type, item_id, person_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
      kind,
      itemId,
      personId,
      status,
      new Date().toISOString()
    );
  },
};
```

Fichier `src/use-cases/invite-use-cases.ts` (nouveau) :

<!-- bloc: use-cases -->

```ts
/**
 * Sending and receiving an item without an account (study 001, 5-A and 12.5; sheet 025).
 * The rules of the link live in domain/rules/invite-rules.ts; here, what is read and saved.
 */

import { format } from 'date-fns';

import type { Person } from '../domain/entities';
import { receivedKind, senderAmong, type Invite, type InviteKind, type InviteStatus } from '../domain/rules/invite-rules';
import { momentKindOf } from '../domain/rules/moment-kind-rules';
import { EventRepository } from '../repositories/event-repository';
import { InviteRepository } from '../repositories/invite-repository';
import { PersonRepository } from '../repositories/person-repository';
import { ReminderRepository } from '../repositories/reminder-repository';
import { SettingsRepository } from '../repositories/settings-repository';
import { TaskRepository } from '../repositories/task-repository';
import { EventUseCases } from './event-use-cases';
import { PersonUseCases } from './person-use-cases';
import { createReminder } from './reminder-use-cases';
import { TaskUseCases } from './task-use-cases';

export interface InvitePerson {
  person: Person;
  status: InviteStatus | null;
}

async function personIdsOf(kind: InviteKind, itemId: string): Promise<string[]> {
  if (kind === 'task') return TaskRepository.findPersonIds(itemId);
  if (kind === 'reminder') return ReminderRepository.findPersonIds(itemId);
  return (await EventRepository.findEventPersons(itemId)).map(person => person.id);
}

export const InviteUseCases = {
  /** The invite of a saved item, with the sender's name; null when the item no longer exists. */
  async inviteOf(kind: InviteKind, itemId: string): Promise<Invite | null> {
    const from = (await SettingsRepository.get()).displayName?.trim() || undefined;
    if (kind === 'task') {
      const task = await TaskRepository.findById(itemId);
      return task ? { kind, title: task.title, day: task.scheduledDate, from } : null;
    }
    if (kind === 'reminder') {
      const reminder = await ReminderRepository.findById(itemId);
      return reminder ? { kind, title: reminder.title, at: new Date(reminder.scheduledAt).toISOString(), from } : null;
    }
    const event = await EventRepository.findById(itemId);
    if (!event) return null;
    return {
      kind,
      title: event.title,
      start: new Date(event.startAt).toISOString(),
      end: new Date(event.endAt).toISOString(),
      place: event.location?.trim() || undefined,
      momentKind: event.momentKind && event.momentKind !== 'other' ? event.momentKind : undefined,
      from,
    };
  },

  /** The people of an item, with what the sender knows of them. */
  async peopleOf(kind: InviteKind, itemId: string): Promise<InvitePerson[]> {
    const [ids, statuses] = await Promise.all([personIdsOf(kind, itemId), InviteRepository.findFor(kind, itemId)]);
    const people = await Promise.all(ids.map(id => PersonRepository.findById(id)));
    return people
      .filter((person): person is Person => person !== null)
      .map(person => ({ person, status: statuses[person.id] ?? null }));
  },

  /** After sending: everyone of the item not yet marked becomes "Invitée". */
  async markSent(kind: InviteKind, itemId: string): Promise<void> {
    for (const { person, status } of await InviteUseCases.peopleOf(kind, itemId)) {
      if (status === null) await InviteRepository.setStatus(kind, itemId, person.id, 'invited');
    }
  },

  async setStatus(kind: InviteKind, itemId: string, personId: string, status: InviteStatus): Promise<void> {
    await InviteRepository.setStatus(kind, itemId, personId, status);
  },

  /** The sender among the people, by name, or null. */
  async senderOf(invite: Invite): Promise<Person | null> {
    return senderAmong(invite.from, await PersonRepository.findAll());
  },

  /**
   * Adds a received item. The sender is linked when already among the people, or added to them
   * when the person asked for it ("Ajouter … à mes proches"), never otherwise. Returns where it opens.
   */
  async accept(invite: Invite, addSender: boolean): Promise<string> {
    let senderId = (await InviteUseCases.senderOf(invite))?.id;
    if (!senderId && addSender && invite.from) senderId = await PersonUseCases.createPerson({ displayName: invite.from });
    const personIds = senderId ? [senderId] : [];
    const kind = receivedKind(invite, new Date());

    if (kind === 'event' && invite.start && invite.end) {
      const settings = await SettingsRepository.get();
      const id = await EventUseCases.createEvent({
        title: invite.title,
        startAt: new Date(invite.start),
        endAt: new Date(invite.end),
        timezone: settings.timezone,
        location: invite.place,
        momentKind: momentKindOf(invite.momentKind),
        personIds,
      });
      return `/events/${id}`;
    }
    if (kind === 'reminder' && invite.at) {
      const settings = await SettingsRepository.get();
      const id = await createReminder({ title: invite.title, scheduledAt: new Date(invite.at), timezone: settings.timezone, personIds });
      return `/reminders/${id}`;
    }
    // A task, or a reminder already past: on its day
    const day = invite.day ?? (invite.at ? format(new Date(invite.at), 'yyyy-MM-dd') : undefined);
    const id = await TaskUseCases.createTask({ title: invite.title, scheduledDate: day, personIds });
    return `/tasks/${id}`;
  },
};
```

### Étape 4 — Le bloc « Envoyer » et l'écran « Invitation reçue »

Fichier `src/features/share/ShareItemCard.tsx` (nouveau) :

<!-- bloc: share-card -->

```tsx
/**
 * "Partager" on the page of a task, a reminder or a moment (study 001, 5-A and 12.5; sheet 025).
 * "Envoyer" opens the phone's share sheet (WhatsApp, SMS, e-mail, Bluetooth, Quick Share…) with
 * a message anyone can read and a Junix link. Nothing is sent by itself, and nothing goes through
 * a server. Afterwards each person of the item shows "Invitée"; a touch marks "Participe".
 * The page passes its kind and id; the card reads the rest and reads it again on coming back.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Share, Text, TouchableOpacity, View } from 'react-native';

import { PersonAvatar } from '@/components/people/PersonAvatar';
import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { inviteMessage, nextInviteStatus, type InviteKind } from '@/domain/rules/invite-rules';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { InviteUseCases, type InvitePerson } from '@/use-cases/invite-use-cases';

export function ShareItemCard({
  kind,
  itemId,
  refreshKey,
}: {
  kind: InviteKind;
  itemId: string;
  /** Changes when the page changes the item's people itself, so the list follows. */
  refreshKey?: unknown;
}) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const [people, setPeople] = useState<InvitePerson[]>([]);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setPeople(await InviteUseCases.peopleOf(kind, itemId).catch(() => []));
  }, [kind, itemId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  useEffect(() => {
    if (refreshKey !== undefined) void load();
  }, [refreshKey, load]);

  const send = async () => {
    setSending(true);
    try {
      const invite = await InviteUseCases.inviteOf(kind, itemId);
      if (!invite) return;
      await Share.share({ message: inviteMessage(invite, language) });
      // Android does not say whether the message left: opening the share sheet counts as sending
      await InviteUseCases.markSent(kind, itemId);
      await load();
    } catch {
      showSnackbar(t('common.genericError'));
    } finally {
      setSending(false);
    }
  };

  const touchStatus = async (entry: InvitePerson) => {
    const next = nextInviteStatus(entry.status);
    if (!next) return;
    setPeople(list => list.map(item => (item.person.id === entry.person.id ? { ...item, status: next } : item)));
    await InviteUseCases.setStatus(kind, itemId, entry.person.id, next).catch(() => void load());
  };

  const sendLabel = people.length === 1 ? t('share.sendTo', { name: people[0].person.displayName }) : t('share.send');

  return (
    <GlowCard tone="neutral">
      <View style={{ gap: Spacing.sm }}>
        <TouchableOpacity
          onPress={send}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel={sendLabel}
          accessibilityHint={t('share.hint')}
          testID="share-send"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            minHeight: 48,
            paddingHorizontal: Spacing.md,
            borderRadius: Radius.md,
            backgroundColor: palette.primary.default + '1F',
            opacity: sending ? 0.6 : 1,
          }}
        >
          <Ionicons name="paper-plane-outline" size={18} color={palette.primary.default} />
          <Text style={{ ...Typography.labelLarge, color: palette.primary.default, flex: 1 }}>{sendLabel}</Text>
          <Ionicons name="share-social-outline" size={18} color={palette.primary.default} />
        </TouchableOpacity>
        <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('share.hint')}</Text>

        {people.map(entry => {
          const label = entry.status === 'joined' ? t('share.joined') : entry.status === 'invited' ? t('share.invited') : t('share.notSent');
          const color =
            entry.status === 'joined' ? palette.success.default : entry.status === 'invited' ? palette.primary.default : palette.onSurface.variant;
          return (
            <View key={entry.person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 }}>
              <PersonAvatar name={entry.person.displayName} size={32} />
              <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary, flex: 1 }} numberOfLines={1}>
                {entry.person.displayName}
              </Text>
              <TouchableOpacity
                onPress={() => void touchStatus(entry)}
                disabled={entry.status === null}
                accessibilityRole="button"
                accessibilityLabel={t('share.statusA11y', { name: entry.person.displayName, status: label })}
                accessibilityState={{ disabled: entry.status === null }}
                testID={`share-status-${entry.person.id}`}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm }}
              >
                <Text style={{ ...Typography.labelMedium, color }}>{label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </GlowCard>
  );
}
```

Fichier `src/app/invite.tsx` (nouveau) :

<!-- bloc: invite-screen -->

```tsx
/**
 * A received invitation (study 001, 5-A and 12.5; sheet 025). Opened by a Junix link
 * (junixpulse://invite?…), or from "Invitation reçue" where the person pastes the message.
 * It shows what it is, then adds it only on "Ajouter à mon Junix". The sender is linked when
 * already among the people; otherwise a switch, off at first, offers to add them.
 */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwitchRow } from '@/components/create/form/FormBricks';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { itemFamilyColor } from '@/constants/item-kinds';
import { momentKindLook } from '@/constants/moment-kinds';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { Person } from '@/domain/entities';
import { findInvite, inviteWhen, parseInviteParams, receivedKind, type Invite } from '@/domain/rules/invite-rules';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT, type MessageKey } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { InviteUseCases } from '@/use-cases/invite-use-cases';

const KIND_NAMES: Readonly<Record<Invite['kind'], MessageKey>> = {
  task: 'itemForm.todo.title',
  reminder: 'itemForm.todo.titleAlert',
  event: 'itemForm.moment.title',
};

export default function InviteScreen() {
  const t = useT();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const params = useLocalSearchParams<Record<string, string>>();

  const fromLink = useMemo(() => parseInviteParams(params), [params]);
  const [pasted, setPasted] = useState('');
  const fromPaste = useMemo(() => (pasted ? findInvite(pasted) : null), [pasted]);
  const invite = fromLink ?? fromPaste;

  const [sender, setSender] = useState<Person | null>(null);
  const [addSender, setAddSender] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSender(null);
    if (invite) void InviteUseCases.senderOf(invite).then(setSender).catch(() => {});
  }, [invite]);

  const accept = async () => {
    if (!invite) return;
    setSaving(true);
    try {
      const path = await InviteUseCases.accept(invite, addSender);
      showSnackbar(t('invite.added'));
      router.replace(path as never);
    } catch {
      showSnackbar(t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const kind = invite ? receivedKind(invite, new Date()) : null;
  const color = itemFamilyColor(palette, kind === 'event' ? 'moment' : 'todo');
  const look = invite?.kind === 'event' && invite.momentKind ? momentKindLook(invite.momentKind) : null;
  const when = invite ? inviteWhen(invite, language) : '';

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface.base, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, minHeight: 56 }}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={{ ...Typography.titleLarge, color: palette.onSurface.primary, flex: 1 }} accessibilityRole="header">
          {t('invite.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: insets.bottom + Spacing.xxl }}>
        {!fromLink ? (
          <View style={{ gap: Spacing.xs }}>
            <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{t('invite.pasteHint')}</Text>
            <TextInput
              value={pasted}
              onChangeText={setPasted}
              placeholder={t('invite.pastePlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              multiline
              accessibilityLabel={t('invite.pastePlaceholder')}
              testID="invite-paste"
              style={{
                ...Typography.bodyMedium,
                color: palette.onSurface.primary,
                minHeight: 96,
                padding: Spacing.md,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: palette.outline.variant,
                backgroundColor: palette.surface.container,
                textAlignVertical: 'top',
              }}
            />
            {pasted && !fromPaste ? (
              <Text style={{ ...Typography.bodySmall, color: palette.error.default }}>{t('invite.notFound')}</Text>
            ) : null}
          </View>
        ) : null}

        {invite && kind ? (
          <>
            <GlowCard tone="neutral">
              <View style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons name={look?.icon ?? (kind === 'event' ? 'calendar-outline' : kind === 'reminder' ? 'notifications' : 'checkbox-outline')} size={16} color={color} />
                  <Text style={{ ...Typography.labelMedium, color }}>
                    {look && invite.momentKind !== 'other' ? t(look.labelKey) : t(KIND_NAMES[kind])}
                  </Text>
                </View>
                <Text style={{ ...Typography.titleLarge, color: palette.onSurface.primary }}>{invite.title}</Text>
                {when ? <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary }}>{when}</Text> : null}
                {invite.place ? <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{invite.place}</Text> : null}
                {invite.from ? (
                  <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('invite.fromName', { name: invite.from })}</Text>
                ) : null}
                {kind !== invite.kind ? (
                  <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('invite.pastReminder')}</Text>
                ) : null}
              </View>
            </GlowCard>

            {invite.from && sender ? (
              <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('invite.senderKnown', { name: sender.displayName })}</Text>
            ) : invite.from ? (
              <SwitchRow
                label={t('invite.addSender', { name: invite.from })}
                hint={t('invite.addSenderHint')}
                value={addSender}
                onChange={setAddSender}
                accent={palette.primary.default}
                testID="invite-add-sender"
              />
            ) : null}

            <Button label={t('invite.accept')} onPress={accept} loading={saving} variant="primary" size="lg" testID="invite-accept" />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
```

### Étape 5 — Où on les trouve

Dans `src/app/_layout.tsx` :

<!-- bloc: route-avant -->

```tsx
              <Stack.Screen name="events/edit/[id]" options={{ presentation: "modal" }} />
```

devient :

<!-- bloc: route-apres -->

```tsx
              <Stack.Screen name="events/edit/[id]" options={{ presentation: "modal" }} />
              {/* A received invitation (sheet 025): junixpulse://invite?… or a pasted message */}
              <Stack.Screen name="invite" options={{ presentation: "modal" }} />
```

Dans `src/app/reminders/[id].tsx` :

<!-- bloc: rm-import-avant -->

```tsx
import { KINDS_WITH_SUBTASKS } from '@/constants/item-kinds';
```

devient :

<!-- bloc: rm-import-apres -->

```tsx
import { KINDS_WITH_SUBTASKS } from '@/constants/item-kinds';
import { ShareItemCard } from '@/features/share/ShareItemCard';
```

Dans `src/app/reminders/[id].tsx` :

<!-- bloc: rm-card-avant -->

```tsx
          </GlowCard>
        )}
      </ScrollView>
```

devient :

<!-- bloc: rm-card-apres -->

```tsx
          </GlowCard>
        )}

        {/* Send it to someone, without an account (sheet 025) */}
        <ShareItemCard kind="reminder" itemId={reminder.id} />
      </ScrollView>
```

Dans `src/app/tasks/[id].tsx` :

<!-- bloc: tk-import-avant -->

```tsx
import { makeTaskDetailStyles } from '@/styles/tasks/task-detail-styles';
```

devient :

<!-- bloc: tk-import-apres -->

```tsx
import { makeTaskDetailStyles } from '@/styles/tasks/task-detail-styles';
import { ShareItemCard } from '@/features/share/ShareItemCard';
```

Dans `src/app/tasks/[id].tsx` :

<!-- bloc: tk-card-avant -->

```tsx
          </View>
        </View>
      </ScrollView>
```

devient :

<!-- bloc: tk-card-apres -->

```tsx
          </View>
        </View>

        {/* Send it to someone, without an account (sheet 025) */}
        <ShareItemCard kind="task" itemId={task.id} />
      </ScrollView>
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-import-avant -->

```tsx
import { momentKindColor, momentKindLook } from '@/constants/moment-kinds';
```

devient :

<!-- bloc: ev-import-apres -->

```tsx
import { momentKindColor, momentKindLook } from '@/constants/moment-kinds';
import { ShareItemCard } from '@/features/share/ShareItemCard';
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-card-avant -->

```tsx
          <TagField selectedIds={tagIds} onChange={changeTags} look="bare" />
        </View>
      </ScrollView>
```

devient :

<!-- bloc: ev-card-apres -->

```tsx
          <TagField selectedIds={tagIds} onChange={changeTags} look="bare" />
        </View>

        {/* Send it to someone, without an account (sheet 025); follows the people changed above */}
        <ShareItemCard kind="event" itemId={event.id} refreshKey={associatedPersons.map(person => person.id).join(',')} />
      </ScrollView>
```

Dans `src/components/create/NewItemChooser.tsx` :

<!-- bloc: nc-link-avant -->

```tsx
            );
          })}
        </View>
      </View>
    </Modal>
```

devient :

<!-- bloc: nc-link-apres -->

```tsx
            );
          })}

          {/* A received invitation (sheet 025): the message is pasted there */}
          <TouchableOpacity
            onPress={() => {
              close();
              router.push('/invite');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('create.invite')}
            testID="new-item-invite"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 44 }}
          >
            <Ionicons name="mail-open-outline" size={16} color={palette.onSurface.variant} />
            <Text style={styles.rule}>{t('create.invite')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
```

### Étape 6 — Les mots

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'cardMenu.open':
```

devient :

<!-- bloc: fr-apres -->

```ts
  'share.send': "Envoyer",
  'share.sendTo': "Envoyer à {name}",
  'share.hint': "Un message et un lien Junix, par WhatsApp, SMS, e-mail… Rien ne passe par un serveur, et les notes restent chez toi.",
  'share.notSent': "Pas envoyé",
  'share.invited': "Invitation envoyée",
  'share.joined': "Participe",
  'share.statusA11y': "{name} : {status}. Toucher pour changer",
  'invite.message': "Invitation : {title}",
  'invite.messageFrom': "{name} t'invite : {title}",
  'invite.whenAt': "{day} à {time}",
  'invite.whenDay': "pour {day}",
  'invite.messageLink': "Pour l'ajouter dans Junix Pulse :",
  'invite.title': "Invitation reçue",
  'invite.pasteHint': "Colle ici le message reçu : Junix y retrouve l'invitation.",
  'invite.pastePlaceholder': "Message reçu",
  'invite.notFound': "Pas d'invitation Junix dans ce texte.",
  'invite.fromName': "De la part de {name}",
  'invite.pastReminder': "L'heure de ce rappel est passée : il sera ajouté comme tâche ce jour-là.",
  'invite.senderKnown': "{name} est déjà dans tes proches : la personne sera liée.",
  'invite.addSender': "Ajouter {name} à mes proches",
  'invite.addSenderHint': "Sinon, l'élément est ajouté sans personne liée.",
  'invite.accept': "Ajouter à mon Junix",
  'invite.added': "Ajouté à ton Junix",
  'create.invite': "Invitation reçue ? Colle le message",
  'cardMenu.open':
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'cardMenu.open':
```

devient :

<!-- bloc: en-apres -->

```ts
  'share.send': "Send",
  'share.sendTo': "Send to {name}",
  'share.hint': "A message and a Junix link, by WhatsApp, SMS, e-mail… Nothing goes through a server, and the notes stay with you.",
  'share.notSent': "Not sent",
  'share.invited': "Invitation sent",
  'share.joined': "Takes part",
  'share.statusA11y': "{name}: {status}. Tap to change",
  'invite.message': "Invitation: {title}",
  'invite.messageFrom': "{name} invites you: {title}",
  'invite.whenAt': "{day} at {time}",
  'invite.whenDay': "for {day}",
  'invite.messageLink': "To add it in Junix Pulse:",
  'invite.title': "Received invitation",
  'invite.pasteHint': "Paste the received message here: Junix finds the invitation in it.",
  'invite.pastePlaceholder': "Received message",
  'invite.notFound': "No Junix invitation in this text.",
  'invite.fromName': "From {name}",
  'invite.pastReminder': "This reminder's time has passed: it will be added as a task on that day.",
  'invite.senderKnown': "{name} is already among your loved ones: they will be linked.",
  'invite.addSender': "Add {name} to my loved ones",
  'invite.addSenderHint': "Otherwise, the item is added with no linked person.",
  'invite.accept': "Add to my Junix",
  'invite.added': "Added to your Junix",
  'create.invite': "Received an invitation? Paste the message",
  'cardMenu.open':
```

### Étape 7 — Appliquer d'un coup, puis vérifier

```powershell
node docs/fiches/outils/appliquer-fiche-025.js .
```

La nouvelle route `/invite` doit être connue des routes typées : lancer une fois le serveur web (`npx expo start --web`), qui réécrit `.expo/types/router.d.ts`, puis :

```powershell
npx tsc --noEmit
```

```powershell
npx jest
```

```powershell
npx eslint src
```

## 6. Vérification

| Contrôle | Résultat attendu |
|---|---|
| `npx jest` | tout passe, dont `invite-rules` |
| Page d'un moment → « Envoyer » | le partage du téléphone s'ouvre avec le message ; ses personnes passent à « Invitation envoyée » |
| Toucher « Invitation envoyée » | « Participe », et retour |
| « + » → « Invitation reçue ? » → coller le message | l'élément s'affiche ; « Ajouter à mon Junix » l'ajoute et l'ouvre |
| Sur le téléphone, toucher le lien (si l'appli le rend cliquable) | Junix s'ouvre sur « Invitation reçue » |

## 7. Retour en arrière

`git checkout -- <fichiers modifiés>` et supprimer les fichiers nouveaux. La table `item_invites` reste (SQLite) mais n'est plus lue.

## Compte rendu d'exécution (24 novembre 2026)

- Lu avant d'écrire : l'étude (5, 5-A, 12.5), l'adresse `junixpulse` déjà déclarée dans `app.json`, les bibliothèques déjà présentes (partage, fichiers, liens), les pages d'une tâche, d'un rappel et d'un moment, le choix « + », les sauvegardes.
- Quatre décisions prises avec toi (section 1). Aucune dépendance ajoutée, `app.json` inchangé.
- Appliquée **à partir des blocs de cette fiche** (`appliquer-fiche-025.js`), puis rejouée sur une copie propre du code enregistré : résultat identique fichier par fichier.
- Comme pour la fiche 022, `tsc` ne connaissait pas la nouvelle route `/invite` avant que le serveur web ne réécrive les routes typées (étape 7).
- Tests : `Test Suites: 101 passed`, `Tests: 2070 passed` (dont `invite-rules` : aller-retour du lien avec accents et « & », message collé, refus des invitations incomplètes ou abîmées, longueurs coupées) ; `tsc` et `eslint` sans erreur.
- **Vérifié à l'écran** (web, 360 px) :
  - un lien de moment ouvre « Invitation reçue » : type Fête, titre avec accents et « & », date, lieu, « De la part de Awa Diallo », interrupteur des proches éteint ;
  - « Ajouter à mon Junix » crée le moment et l'ouvre, avec son type et le bloc « Envoyer » (moment d'essai supprimé ensuite) ;
  - un message entier collé, avec un lien de rappel dedans, est reconnu (pas ajouté).
- **Pas vérifié** : le partage du téléphone (« Envoyer ») et le passage à « Invitation envoyée », le lien touché dans WhatsApp ou un SMS (à voir sur le téléphone). Rien n'est encore enregistré dans git.

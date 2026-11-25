# FICHE OPÉRATOIRE N° 020 — Pulse propose « En faire une habitude ? »

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 019](FICHE-019-habitude-qui-sonne.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 15.2

---

## 1. Objectif

C'est le lien qui manquait entre les choses à faire et les habitudes : quand quelque chose **revient souvent**, Pulse le remarque et propose d'en faire une habitude. L'utilisateur **accepte ou refuse** (comme toutes les propositions de Pulse).

| Pulse remarque | Il propose | S'il accepte |
|---|---|---|
| Un **rappel qui se répète** chaque jour ou chaque semaine | « Tu fais souvent « Prendre mes vitamines ». On en fait une habitude ? » | Une **habitude qui sonne à la même heure** est créée (fiche 019), et le rappel répété est **retiré** (il ferait doublon ; il reste dans les données, comme toute suppression) |
| Une **tâche faite 3 fois ou plus en 14 jours** (même titre) | Idem | Une **habitude « X fois par semaine »** est créée (X = fois faites en 14 jours ÷ 2, arrondi au-dessus) |

- **Une seule proposition à la fois**, et jamais pour ce qui est **déjà une habitude** (même titre, sans tenir compte des majuscules ni des accents).
- Refusée, elle ne revient pas le jour même (règle existante des propositions).
- Elle apparaît là où Pulse propose déjà (onglet Pulse, bulles), avec son humeur « contente ».

**Pour que rien ne casse demain** : la règle est un fichier à part (`habit-candidate-rules.ts`), branché dans le moteur existant ; le nouveau type `MAKE_HABIT` est ajouté à chaque table des types (TypeScript signale celles qui manquent).

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 019 est enregistrée | `git log --oneline -1` | `feat(habits): a habit can ring…` |
| Tout passe | `npx jest` | `Tests: 1963 passed` |

## 3. Hypothèses

- Le titre comparé est « normalisé » : minuscules, sans accents, espaces simples.
- Un rappel répété « tous les X jours » (intervalle personnalisé) n'est pas proposé : seulement chaque jour ou chaque semaine.
- Les textes de Pulse existent en tutoiement et vouvoiement (français), et en anglais.

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/domain/enums/index.ts` | le type `MAKE_HABIT` |
| `src/domain/rules/mascot-preferences.ts` | la proposition `P13` |
| `src/domain/rules/mascot-suggestion-rules.ts` | ses tables (proposition, message, humeur, paramètres) |
| `src/domain/rules/mascot-message-catalog.ts` et `-en.ts` | ce que dit Pulse |
| `src/domain/rules/habit-candidate-rules.ts` | **créé** : la règle |
| `src/domain/rules/mascot-candidate-rules.ts` | les faits nouveaux, et la règle branchée |
| `src/use-cases/suggestion-use-cases.ts` | les faits chargés, et « Accepter » crée l'habitude |
| `src/services/backup-service.ts` | le type dans les sauvegardes |
| `src/domain/rules/__tests__/habit-candidate-rules.test.ts` | **créé** : 6 tests |

## 5. Étapes

### Étape 1 — Le nouveau type de proposition

Dans `src/domain/enums/index.ts` :

<!-- bloc: enum-avant -->

```ts
  | 'WELCOME_BACK';          // Retour après quelques jours d'absence
```

<!-- bloc: enum-apres -->

```ts
  | 'WELCOME_BACK'           // Retour après quelques jours d'absence
  | 'MAKE_HABIT';            // Rappel répété ou tâche faite souvent → en faire une habitude (fiche 020)
```

Dans `src/domain/rules/mascot-preferences.ts` :

<!-- bloc: pref-avant -->

```ts
  | 'P7' | 'P8' | 'P9' | 'P10' | 'P11' | 'P12';
```

<!-- bloc: pref-apres -->

```ts
  | 'P7' | 'P8' | 'P9' | 'P10' | 'P11' | 'P12'
  // P13: "make it a habit" (sheet 020)
  | 'P13';
```

Dans `src/domain/rules/mascot-suggestion-rules.ts`, quatre remplacements :

<!-- bloc: sr-1-avant -->

```ts
  LINGERING_TASK: 'P11',
  WELCOME_BACK: 'P12',
};
```

<!-- bloc: sr-1-apres -->

```ts
  LINGERING_TASK: 'P11',
  WELCOME_BACK: 'P12',
  MAKE_HABIT: 'P13',
};
```

<!-- bloc: sr-2-avant -->

```ts
  LINGERING_TASK: 'LINGERING_TASK',
  WELCOME_BACK: 'WELCOME_BACK',
};
```

<!-- bloc: sr-2-apres -->

```ts
  LINGERING_TASK: 'LINGERING_TASK',
  WELCOME_BACK: 'WELCOME_BACK',
  MAKE_HABIT: 'MAKE_HABIT',
};
```

<!-- bloc: sr-3-avant -->

```ts
  LINGERING_TASK: 'calm',
  WELCOME_BACK: 'happy',
};
```

<!-- bloc: sr-3-apres -->

```ts
  LINGERING_TASK: 'calm',
  WELCOME_BACK: 'happy',
  MAKE_HABIT: 'happy',
};
```

<!-- bloc: sr-4-avant -->

```ts
  WELCOME_BACK: { count: 'number' },
};
```

<!-- bloc: sr-4-apres -->

```ts
  WELCOME_BACK: { count: 'number' },
  MAKE_HABIT: { title: 'string' },
};
```

### Étape 2 — Ce que dit Pulse

Dans `src/domain/rules/mascot-message-catalog.ts` (tutoiement chaleureux, tutoiement sobre, vouvoiement chaleureux, vouvoiement sobre) :

<!-- bloc: msg-fr-avant -->

```ts
  WELCOME_BACK: entry(
    ["Contente de te revoir ! {count} {count|rappel t'attend|rappels t'attendent}.", "Contente de te revoir, {name} ! {count} {count|rappel t'attend|rappels t'attendent}."],
```

<!-- bloc: msg-fr-apres -->

```ts
  MAKE_HABIT: entry(
    ["Tu fais souvent « {title} ». On en fait une habitude ?", "{name}, tu fais souvent « {title} ». On en fait une habitude ?"],
    ["« {title} » revient souvent. En faire une habitude ?", "{name}, « {title} » revient souvent. En faire une habitude ?"],
    ["Vous faites souvent « {title} ». On en fait une habitude ?", "{name}, vous faites souvent « {title} ». On en fait une habitude ?"],
    ["« {title} » revient souvent. En faire une habitude ?", "{name}, « {title} » revient souvent. En faire une habitude ?"],
  ),
  WELCOME_BACK: entry(
    ["Contente de te revoir ! {count} {count|rappel t'attend|rappels t'attendent}.", "Contente de te revoir, {name} ! {count} {count|rappel t'attend|rappels t'attendent}."],
```

Dans `src/domain/rules/mascot-message-catalog-en.ts` :

<!-- bloc: msg-en-avant -->

```ts
  WELCOME_BACK: entry(
    ["Good to see you again! {count} {count|reminder is|reminders are} waiting for you.", "Good to see you again, {name}! {count} {count|reminder is|reminders are} waiting for you."],
```

<!-- bloc: msg-en-apres -->

```ts
  MAKE_HABIT: entry(
    ["You often do “{title}”. Shall we make it a habit?", "{name}, you often do “{title}”. Shall we make it a habit?"],
    ["“{title}” comes back often. Make it a habit?", "{name}, “{title}” comes back often. Make it a habit?"],
  ),
  WELCOME_BACK: entry(
    ["Good to see you again! {count} {count|reminder is|reminders are} waiting for you.", "Good to see you again, {name}! {count} {count|reminder is|reminders are} waiting for you."],
```

### Étape 3 — La règle

Créer `src/domain/rules/habit-candidate-rules.ts` :

<!-- bloc: rules -->

```ts
/**
 * "Make it a habit" (study 001, 15.2; sheet 020): what comes back often becomes a habit, if the
 * user wants. A reminder repeated every day or week, or a task done at least 3 times in 14 days,
 * and not a habit already. One proposal at a time. Pure: tested alone.
 */

import type { SuggestionCandidate } from './mascot-candidate-rules';

export const MAKE_HABIT_MIN_TASKS = 3;
export const MAKE_HABIT_WINDOW_DAYS = 14;

export interface RepeatedReminderFact {
  id: string;
  title: string;
  /** "HH:mm" */
  time: string;
  frequency: 'DAILY' | 'WEEKLY';
}

export interface DoneTaskFact {
  id: string;
  title: string;
  completedAt: string;
}

/** A title as compared: lower case, no accents, single spaces. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeHabitCandidates({
  now,
  repeatedReminders = [],
  recentDoneTasks = [],
  habitTitles = [],
}: {
  now: Date;
  repeatedReminders?: readonly RepeatedReminderFact[];
  recentDoneTasks?: readonly DoneTaskFact[];
  habitTitles?: readonly string[];
}): SuggestionCandidate[] {
  const habits = new Set(habitTitles.map(normalizeTitle));

  // A reminder that repeats: the habit rings at the same time, and replaces it
  const reminder = repeatedReminders.find(item => !habits.has(normalizeTitle(item.title)));
  if (reminder) {
    return [
      {
        type: 'MAKE_HABIT',
        targetId: `reminder:${reminder.id}`,
        targetType: 'reminder',
        title: `Faire de "${reminder.title}" une habitude`,
        explanation: 'Ce rappel revient souvent. Pulse peut en faire une habitude qui sonne à la même heure, et retirer le rappel répété.',
        proposedData: JSON.stringify({
          title: reminder.title,
          source: 'reminder',
          reminderId: reminder.id,
          frequency: reminder.frequency,
          targetDaysPerWeek: reminder.frequency === 'WEEKLY' ? 1 : undefined,
          time: reminder.time,
        }),
      },
    ];
  }

  // A task done often: the same title at least 3 times in 14 days
  const since = now.getTime() - MAKE_HABIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const groups = new Map<string, DoneTaskFact[]>();
  for (const task of recentDoneTasks) {
    const doneAt = new Date(task.completedAt).getTime();
    if (Number.isNaN(doneAt) || doneAt < since || doneAt > now.getTime()) continue;
    const key = normalizeTitle(task.title);
    if (!key || habits.has(key)) continue;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  const often = [...groups.values()]
    .filter(group => group.length >= MAKE_HABIT_MIN_TASKS)
    .sort((a, b) => b.length - a.length)[0];
  if (!often) return [];
  const latest = [...often].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  return [
    {
      type: 'MAKE_HABIT',
      targetId: `task:${normalizeTitle(latest.title)}`,
      targetType: 'task',
      title: `Faire de "${latest.title}" une habitude`,
      explanation: `Cette tâche a été faite ${often.length} fois en ${MAKE_HABIT_WINDOW_DAYS} jours. En faire une habitude ?`,
      proposedData: JSON.stringify({
        title: latest.title,
        source: 'task',
        frequency: 'WEEKLY',
        targetDaysPerWeek: Math.min(7, Math.ceil(often.length / 2)),
      }),
    },
  ];
}
```

| Passage | Rôle |
|---|---|
| `normalizeTitle` | « Méditer », « méditer » et « Mediter » sont la même chose |
| `reminder` d'abord | Un rappel répété est le cas le plus clair ; une seule proposition à la fois |
| `groups` | Les tâches faites, groupées par titre, sur les 14 derniers jours |
| `Math.ceil(often.length / 2)` | 4 fois en 14 jours → 2 fois par semaine |

### Étape 4 — Brancher la règle dans le moteur de Pulse

Dans `src/domain/rules/mascot-candidate-rules.ts`, trois remplacements :

<!-- bloc: cand-1-avant -->

```ts
import { formatFrenchTime } from './mascot-suggestion-rules';
```

<!-- bloc: cand-1-apres -->

```ts
import { formatFrenchTime } from './mascot-suggestion-rules';
import { makeHabitCandidates, type DoneTaskFact, type RepeatedReminderFact } from './habit-candidate-rules';
```

<!-- bloc: cand-2-avant -->

```ts
  /** Reminders that are due or missed and still wait for the user. */
  waitingReminderCount: number;
}
```

<!-- bloc: cand-2-apres -->

```ts
  /** Reminders that are due or missed and still wait for the user. */
  waitingReminderCount: number;
  /** Reminders that repeat every day or week, for "make it a habit" (sheet 020). */
  repeatedReminders?: readonly RepeatedReminderFact[];
  /** Tasks done lately, for "make it a habit" (sheet 020). */
  recentDoneTasks?: readonly DoneTaskFact[];
  /** The titles of the habits that exist: nothing already a habit is proposed. */
  habitTitles?: readonly string[];
}
```

<!-- bloc: cand-3-avant -->

```ts
  return candidates;
}
```

<!-- bloc: cand-3-apres -->

```ts
  // P13: what comes back often, made a habit (sheet 020)
  candidates.push(
    ...makeHabitCandidates({
      now: facts.now,
      repeatedReminders: facts.repeatedReminders,
      recentDoneTasks: facts.recentDoneTasks,
      habitTitles: facts.habitTitles,
    })
  );

  return candidates;
}
```

Dans `src/use-cases/suggestion-use-cases.ts`, quatre remplacements :

<!-- bloc: uc-1-avant -->

```ts
import { createReminder, snoozeReminder } from './reminder-use-cases';
```

<!-- bloc: uc-1-apres -->

```ts
import { createReminder, deleteReminder, snoozeReminder } from './reminder-use-cases';
```

<!-- bloc: uc-2-avant -->

```ts
  const facts: CandidateFacts = {
```

<!-- bloc: uc-2-apres -->

```ts
  // "Make it a habit" (sheet 020): the reminders that repeat, and the tasks done
  const repeatedReminders: { id: string; title: string; time: string; frequency: 'DAILY' | 'WEEKLY' }[] = [];
  for (const reminder of activeReminders) {
    const ruleId = reminder.recurrenceRuleId;
    if (!ruleId) continue;
    const rule = await safe(() => ReminderRepository.findRecurrenceRule(ruleId), null);
    if (rule?.type === 'DAILY' || rule?.type === 'WEEKLY') {
      repeatedReminders.push({
        id: reminder.id,
        title: reminder.title,
        time: format(new Date(reminder.scheduledAt), 'HH:mm'),
        frequency: rule.type,
      });
    }
  }
  const allTasks = await safe(() => TaskRepository.findAll(), []);

  const facts: CandidateFacts = {
```

<!-- bloc: uc-3-avant -->

```ts
    waitingReminderCount: waitingReminders.length,
  };
```

<!-- bloc: uc-3-apres -->

```ts
    waitingReminderCount: waitingReminders.length,
    repeatedReminders,
    recentDoneTasks: allTasks
      .filter(task => task.status === 'COMPLETED' && task.completedAt)
      .map(task => ({ id: task.id, title: task.title, completedAt: task.completedAt as string })),
    habitTitles: habits.map(item => item.habit.title),
  };
```

<!-- bloc: uc-4-avant -->

```ts
      } else if (sugg.type === 'BIRTHDAY_REMINDER') {
```

<!-- bloc: uc-4-apres -->

```ts
      } else if (sugg.type === 'MAKE_HABIT') {
        // "Make it a habit" (sheet 020): the habit is created, ringing at the time of the reminder
        const data = readProposedData(sugg);
        if (typeof data.title === 'string') {
          await HabitUseCases.createHabit({
            title: data.title,
            frequency: data.frequency === 'DAILY' ? 'DAILY' : 'WEEKLY',
            targetDaysPerWeek: typeof data.targetDaysPerWeek === 'number' ? data.targetDaysPerWeek : undefined,
            reminderTime: typeof data.time === 'string' ? data.time : undefined,
          });
          // The habit now rings at the same time: the repeated reminder would ring twice
          if (data.source === 'reminder' && typeof data.reminderId === 'string') {
            const reminder = await ReminderRepository.findById(data.reminderId);
            if (reminder) await deleteReminder(reminder);
          }
        }
      } else if (sugg.type === 'BIRTHDAY_REMINDER') {
```

Dans `src/services/backup-service.ts` (le type dans les sauvegardes) :

<!-- bloc: bk-avant -->

```ts
    type: ['RESCHEDULE_REMINDER', 'POSTPONE_TASK', 'FORGOTTEN_CONTACT', 'BIRTHDAY_REMINDER', 'OVERLOADED_DAY', 'HABIT_REMINDER', 'PLANNING_CONFLICT', 'GOAL_APPROACHING', 'LINGERING_TASK', 'WELCOME_BACK'],
```

<!-- bloc: bk-apres -->

```ts
    type: ['RESCHEDULE_REMINDER', 'POSTPONE_TASK', 'FORGOTTEN_CONTACT', 'BIRTHDAY_REMINDER', 'OVERLOADED_DAY', 'HABIT_REMINDER', 'PLANNING_CONFLICT', 'GOAL_APPROACHING', 'LINGERING_TASK', 'WELCOME_BACK', 'MAKE_HABIT'],
```

### Étape 4 bis — Les deux tables signalées par TypeScript, et les textes

Après l'étape 4, `tsc` a signalé deux tables de plus qui listent les types : la **famille** de chaque proposition (P13 suit le réglage « habitudes et objectifs » de la mascotte) et le **titre** de chaque proposition dans la langue affichée.

Dans `src/domain/rules/mascot-preferences.ts` :

<!-- bloc: fam-avant -->

```ts
  P11: 'tasksPlanning',
  P12: 'always',
};
```

<!-- bloc: fam-apres -->

```ts
  P11: 'tasksPlanning',
  P12: 'always',
  // Make it a habit (sheet 020): follows the habits and goals setting
  P13: 'habitsGoals',
};
```

Dans `src/i18n/suggestion-text.ts` :

<!-- bloc: text-avant -->

```ts
    case 'WELCOME_BACK':
      return { title: t('suggestionText.welcomeBack.title'), explanation: t('suggestionText.welcomeBack.text', p) };
```

<!-- bloc: text-apres -->

```ts
    case 'WELCOME_BACK':
      return { title: t('suggestionText.welcomeBack.title'), explanation: t('suggestionText.welcomeBack.text', p) };
    case 'MAKE_HABIT':
      return { title: t('suggestionText.makeHabit.title', p), explanation: t('suggestionText.makeHabit.text') };
```

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'suggestionText.lingering.text': 'Cette tâche attend dans votre Inbox sans date. Voulez-vous la planifier ?',
```

<!-- bloc: fr-apres -->

```ts
  'suggestionText.lingering.text': 'Cette tâche attend dans votre Inbox sans date. Voulez-vous la planifier ?',
  'suggestionText.makeHabit.title': 'Faire de « {title} » une habitude',
  'suggestionText.makeHabit.text': "Ça revient souvent. Une habitude se coche à chaque fois, peut sonner à son heure et fait avancer tes objectifs.",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'suggestionText.lingering.text': 'This task has been waiting in your Inbox without a date. Do you want to schedule it?',
```

<!-- bloc: en-apres -->

```ts
  'suggestionText.lingering.text': 'This task has been waiting in your Inbox without a date. Do you want to schedule it?',
  'suggestionText.makeHabit.title': 'Make “{title}” a habit',
  'suggestionText.makeHabit.text': 'It comes back often. A habit is ticked each time, can ring at its time and moves your goals forward.',
```

Et l'ancien test des familles, qui comptait exactement les douze propositions du cahier des charges, dans `src/domain/rules/__tests__/mascot-preferences.test.ts` :

<!-- bloc: famtest-avant -->

```ts
  it('covers the twelve proposals as in the brief', () => {
    expect(PROPOSAL_FAMILIES).toEqual({
      P1: 'contacts', P4: 'contacts',
      P3: 'habitsGoals', P10: 'habitsGoals',
```

<!-- bloc: famtest-apres -->

```ts
  // The twelve of the brief, and P13 "make it a habit" (sheet 020)
  it('covers the proposals of the brief and the ones added since', () => {
    expect(PROPOSAL_FAMILIES).toEqual({
      P1: 'contacts', P4: 'contacts',
      P3: 'habitsGoals', P10: 'habitsGoals', P13: 'habitsGoals',
```

### Étape 5 — Les tests

Créer `src/domain/rules/__tests__/habit-candidate-rules.test.ts` :

<!-- bloc: test -->

```ts
import { makeHabitCandidates, normalizeTitle } from '../habit-candidate-rules';
import { suggestionToMascotMessage } from '../mascot-suggestion-rules';

/** Monday 23 November 2026. */
const now = new Date(2026, 10, 23, 12, 0);
const doneOn = (day: number, title = 'Ranger le bureau') => ({ id: `t${day}`, title, completedAt: new Date(2026, 10, day, 18, 0).toISOString() });

describe('make it a habit', () => {
  it('proposes a reminder repeated every day, ringing at the same time', () => {
    const [candidate] = makeHabitCandidates({
      now,
      repeatedReminders: [{ id: 'r1', title: 'Prendre mes vitamines', time: '08:00', frequency: 'DAILY' }],
    });
    expect(candidate.type).toBe('MAKE_HABIT');
    expect(JSON.parse(candidate.proposedData)).toMatchObject({ source: 'reminder', reminderId: 'r1', frequency: 'DAILY', time: '08:00' });
  });

  it('proposes a task done 3 times in 14 days, as a weekly habit', () => {
    const [candidate] = makeHabitCandidates({ now, recentDoneTasks: [doneOn(10), doneOn(15), doneOn(20), doneOn(22)] });
    expect(JSON.parse(candidate.proposedData)).toMatchObject({ source: 'task', frequency: 'WEEKLY', targetDaysPerWeek: 2 });
  });

  it('waits for 3 times, inside the 14 days', () => {
    expect(makeHabitCandidates({ now, recentDoneTasks: [doneOn(20), doneOn(22)] })).toEqual([]);
    expect(makeHabitCandidates({ now, recentDoneTasks: [doneOn(1), doneOn(2), doneOn(3)] })).toEqual([]);
  });

  it('never proposes what is a habit already, whatever its capitals or accents', () => {
    expect(normalizeTitle('  Méditer  le Matin ')).toBe('mediter le matin');
    expect(
      makeHabitCandidates({
        now,
        repeatedReminders: [{ id: 'r1', title: 'Méditer', time: '07:00', frequency: 'DAILY' }],
        habitTitles: ['mediter'],
      })
    ).toEqual([]);
  });

  it('makes one proposal at a time', () => {
    const candidates = makeHabitCandidates({
      now,
      repeatedReminders: [
        { id: 'r1', title: 'Vitamines', time: '08:00', frequency: 'DAILY' },
        { id: 'r2', title: 'Sport', time: '18:00', frequency: 'WEEKLY' },
      ],
      recentDoneTasks: [doneOn(20), doneOn(21), doneOn(22)],
    });
    expect(candidates).toHaveLength(1);
  });

  it('gives Pulse its words', () => {
    const message = suggestionToMascotMessage({ type: 'MAKE_HABIT', title: '', proposedData: JSON.stringify({ title: 'Sport' }) });
    expect(message?.id).toBe('MAKE_HABIT');
  });
});
```

## 6. Test final

```bash
npx jest src/domain/rules/__tests__/habit-candidate-rules.test.ts
npx jest
npx tsc --noEmit
npx eslint src/domain/rules/habit-candidate-rules.ts src/domain/rules/mascot-candidate-rules.ts src/domain/rules/mascot-suggestion-rules.ts src/use-cases/suggestion-use-cases.ts src/domain/rules/mascot-message-catalog.ts src/domain/rules/mascot-message-catalog-en.ts
```

Attendu : `Tests: 6 passed` ; toute la suite passe ; `tsc` et `eslint` n'affichent rien.

**Sur le téléphone** : un rappel « tous les jours » ; dans l'onglet Pulse, la proposition « Tu fais souvent … On en fait une habitude ? » ; Accepter : l'habitude apparaît dans Progrès, avec son heure ; le rappel répété a disparu d'À faire.

## 7. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| `Property 'MAKE_HABIT' is missing in type Record<SuggestionType, …>` | Une table des types a été oubliée | L'ajouter (TypeScript donne le fichier et la ligne) |
| La proposition ne vient pas | Refusée aujourd'hui, ou une habitude au même titre existe | Attendre le lendemain ; vérifier les titres dans Progrès |
| `suggestionToMascotMessage` rend `null` | Le paramètre `title` manque | `REQUIRED_PARAMS.MAKE_HABIT` demande `title` (étape 1) |

## Compte rendu d'exécution (23 novembre 2026)

- Lu avant d'écrire : le moteur des propositions de Pulse (les faits du jour, la règle pure des candidats, Accepter / Refuser, le délai avant de reproposer) et toutes les tables qui listent les types.
- Étapes 1 à 5 appliquées **à partir des blocs de cette fiche** (`docs/fiches/outils/appliquer-fiche-020.js`).
- **Écarts corrigés** (étape 4 bis) : TypeScript a signalé deux tables de plus (la famille de P13, le titre traduit de la proposition) ; un ancien test comptait exactement douze propositions, il connaît maintenant P13.
- Tests : `Tests: 6 passed` ; toute la suite `Test Suites: 95 passed`, `Tests: 1981 passed` ; `tsc` et `eslint` sans erreur.
- **Pas vérifié à l'écran** : la proposition dans l'onglet Pulse et « Accepter » (création de l'habitude, retrait du rappel répété). À voir sur le téléphone. Rien n'est encore enregistré dans git.

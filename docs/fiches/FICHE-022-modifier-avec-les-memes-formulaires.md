# FICHE OPÉRATOIRE N° 022 — Modifier avec les mêmes formulaires que pour créer

Projet : **Junix Pulse** · Date : 24 novembre 2026 · Suite de : [FICHE 021](FICHE-021-presentation-et-bulles-de-pulse.md) · Prolonge : [FICHE 012](FICHE-012-formulaires-a-faire-et-moment.md) (« les écrans de modification restent à faire avec les mêmes briques »)

---

## 1. Objectif

Jusqu'ici, seuls les écrans de **création** avaient le nouveau design (fiche 012). Pour **modifier**, on retombait sur trois anciens écrans différents, et pour un **moment** il n'y avait même pas d'écran de modification. Désormais :

| Quoi | Avant | Après |
|---|---|---|
| Un **rappel** | ancien écran « Modifier » (350 lignes à part) | le formulaire **À faire** (cyan), rempli, avec son alerte |
| Une **tâche** | ses champs modifiables mêlés à sa page | sa page montre ce qu'elle dit et ses sous-tâches ; **Modifier** (crayon) ouvre le formulaire **À faire**, rempli, sans section Alerte |
| Un **moment** | seulement ses personnes et étiquettes | **Modifier** (crayon) ouvre le formulaire **Moment** (ambre), rempli |

Dans les trois cas : même ordre des sections, même « Dicter tout », mêmes « Plus d'options ». La barre dit **Enregistrer** au lieu d'Ajouter, l'en-tête garde le nom court (Tâche, Rappel, Moment) avec « Modification » dessous : à 360 px, « Modifier le rappel » était coupé. En revenant, la page relit l'élément et montre ce qui vient d'être enregistré.

**Trois défauts corrigés au passage** :

1. L'interrupteur « à confirmer » d'un rappel **n'était jamais enregistré** à la modification : il l'est.
2. Une tâche ne pouvait pas **perdre son jour** ni son temps estimé (retour à l'Inbox) : elle le peut.
3. La **répétition** d'un rappel ne pouvait pas être changée : elle le peut. Une répétition que le formulaire ne sait pas montrer (tous les 3 jours, plusieurs jours de la semaine) **reste telle quelle** tant qu'on n'en choisit pas une autre.

**Ce qui ne change pas** : un élément garde sa **nature**. Une tâche reste une tâche, un rappel reste un rappel (changer de nature voudrait dire déplacer ses liens : objectifs, sous-tâches ; c'est noté pour plus tard). Les sous-tâches se cochent et s'ajoutent toujours sur la page de la tâche. Rien n'est effacé dans les données : une ancienne règle de répétition reste en base.

**Pour que rien ne casse demain** : un seul formulaire par famille, pour créer et pour modifier. Ajouter un champ = l'ajouter une fois, et il existe dans les deux cas. Les décisions (statut d'une tâche, répétition affichable, heure refusée) sont des **règles pures testées** (`item-edit-rules.ts`).

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 021 est enregistrée | `git log --oneline -2` | `docs(tutoriel): sheets 017 to 021…` puis `feat(onboarding)…` |
| Tout passe | `npx jest` | `Tests: 2009 passed` |

## 3. Hypothèses

- Un rappel **en retard** peut être modifié (titre, notes…) sans changer son heure ; on refuse seulement une heure **passée choisie** à ce moment-là.
- La personne principale d'un rappel reste la première de la liste (déjà le cas : `setPersons`).
- « Dicter tout » remplit aussi un élément qu'on modifie, sans changer sa nature.

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/domain/rules/item-edit-rules.ts` (+ test) | **nouveau** : les règles pures |
| `src/features/create/edit-loaders.ts` | **nouveau** : lit ce qui est enregistré, pour remplir le formulaire |
| `src/features/create/TodoForm.tsx`, `MomentForm.tsx` | remplacés : savent aussi modifier |
| `src/components/create/form/FormBricks.tsx` | `FormShell` : « Enregistrer » quand on modifie |
| `src/use-cases/reminder-use-cases.ts`, `src/repositories/reminder-repository.ts` | « à confirmer » et répétition enregistrés |
| `src/use-cases/task-use-cases.ts` | une tâche peut perdre son jour et son temps |
| `src/app/reminders/edit/[id].tsx` | remplacé : 10 lignes |
| `src/app/tasks/edit/[id].tsx`, `src/app/events/edit/[id].tsx` | **nouveaux** |
| `src/app/_layout.tsx` | les deux nouvelles routes |
| `src/app/tasks/[id].tsx` | remplacé : page de lecture + sous-tâches |
| `src/app/events/[id].tsx`, `src/app/reminders/[id].tsx` | bouton Modifier, relecture au retour |
| `src/i18n/messages-rest-fr.ts`, `-en.ts` | 6 textes |
| `src/styles/reminders/edit-reminder-styles.ts` | **supprimé** (ne servait qu'à l'ancien écran) |

## 5. Pas à pas

### Étape 1 — Les règles pures et leur test

Fichier `src/domain/rules/item-edit-rules.ts` (remplacé en entier) :

<!-- bloc: rules -->

```ts
/**
 * Pure rules for changing an item with the form that created it (sheet 022): what the form shows
 * of what is saved, and what saving changes. Nothing here reads the database or the screen.
 */

import { format } from 'date-fns';

import type { RecurrenceRule, TaskStatus } from '../entities';

/** The repeats the form offers: every day, every week, every month. */
export type SimpleRecurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * A task given a day leaves the Inbox, a task whose day is taken off goes back to it; any other
 * status (in progress, done, postponed) stays what it was.
 */
export function taskStatusAfterEdit(status: TaskStatus, scheduledDate: string | undefined): TaskStatus {
  if (status === 'INBOX' && scheduledDate) return 'SCHEDULED';
  if (status === 'SCHEDULED' && !scheduledDate) return 'INBOX';
  return status;
}

/**
 * The repeat of a saved rule as the form can show it, or null when the form cannot (every 3 days,
 * several days of the week, "the last Friday"...). Such a rule is kept as it is unless the person
 * changes the repeat.
 */
export function simpleRecurrenceOf(
  rule: Pick<RecurrenceRule, 'type' | 'interval' | 'daysOfWeek' | 'weekPosition'> | null | undefined
): SimpleRecurrence | null {
  if (!rule || rule.interval !== 1 || rule.weekPosition) return null;
  if (rule.type === 'WEEKLY' && (rule.daysOfWeek?.length ?? 0) > 1) return null;
  return rule.type === 'DAILY' || rule.type === 'WEEKLY' || rule.type === 'MONTHLY' ? rule.type : null;
}

/**
 * True when a reminder may not be saved at this time: the time is past and the person moved it
 * there. A reminder already late keeps its time when only its title or its notes change.
 */
export function alertTimeRefused(original: Date | null, next: Date, now: Date): boolean {
  if (next.getTime() > now.getTime()) return false;
  return original === null || original.getTime() !== next.getTime();
}

/** The day (YYYY-MM-DD) and the time of a saved alert, as the form keeps them. */
export function splitAlertMoment(at: Date): { day: string; time: { hour: number; minute: number } } {
  return { day: format(at, 'yyyy-MM-dd'), time: { hour: at.getHours(), minute: at.getMinutes() } };
}
```

Fichier `src/domain/rules/__tests__/item-edit-rules.test.ts` (remplacé en entier) :

<!-- bloc: rules-test -->

```ts
import { alertTimeRefused, simpleRecurrenceOf, splitAlertMoment, taskStatusAfterEdit } from '../item-edit-rules';

describe('taskStatusAfterEdit', () => {
  it('takes a task out of the Inbox once it has a day, and back without one', () => {
    expect(taskStatusAfterEdit('INBOX', '2026-11-25')).toBe('SCHEDULED');
    expect(taskStatusAfterEdit('SCHEDULED', undefined)).toBe('INBOX');
  });

  it('keeps every other status', () => {
    expect(taskStatusAfterEdit('SCHEDULED', '2026-11-25')).toBe('SCHEDULED');
    expect(taskStatusAfterEdit('INBOX', undefined)).toBe('INBOX');
    expect(taskStatusAfterEdit('IN_PROGRESS', undefined)).toBe('IN_PROGRESS');
    expect(taskStatusAfterEdit('COMPLETED', '2026-11-25')).toBe('COMPLETED');
    expect(taskStatusAfterEdit('POSTPONED', undefined)).toBe('POSTPONED');
  });
});

describe('simpleRecurrenceOf', () => {
  it('shows every day, every week and every month', () => {
    expect(simpleRecurrenceOf({ type: 'DAILY', interval: 1 })).toBe('DAILY');
    expect(simpleRecurrenceOf({ type: 'WEEKLY', interval: 1, daysOfWeek: [1] })).toBe('WEEKLY');
    expect(simpleRecurrenceOf({ type: 'MONTHLY', interval: 1 })).toBe('MONTHLY');
  });

  it('does not show what the form cannot say, so that it is kept', () => {
    expect(simpleRecurrenceOf(null)).toBeNull();
    expect(simpleRecurrenceOf(undefined)).toBeNull();
    expect(simpleRecurrenceOf({ type: 'DAILY', interval: 3 })).toBeNull();
    expect(simpleRecurrenceOf({ type: 'CUSTOM_INTERVAL', interval: 1 })).toBeNull();
    expect(simpleRecurrenceOf({ type: 'WEEKLY', interval: 1, daysOfWeek: [1, 3] })).toBeNull();
    expect(simpleRecurrenceOf({ type: 'MONTHLY', interval: 1, weekPosition: 'LAST' })).toBeNull();
  });
});

describe('alertTimeRefused', () => {
  const now = new Date('2026-11-24T10:00:00');
  const past = new Date('2026-11-24T09:00:00');
  const future = new Date('2026-11-24T11:00:00');

  it('accepts a time to come', () => {
    expect(alertTimeRefused(null, future, now)).toBe(false);
    expect(alertTimeRefused(past, future, now)).toBe(false);
  });

  it('refuses a past time chosen now', () => {
    expect(alertTimeRefused(null, past, now)).toBe(true);
    expect(alertTimeRefused(future, past, now)).toBe(true);
  });

  it('lets a late reminder keep its time when something else changes', () => {
    expect(alertTimeRefused(past, new Date(past), now)).toBe(false);
  });
});

describe('splitAlertMoment', () => {
  it('gives the day and the time the form shows', () => {
    expect(splitAlertMoment(new Date('2026-11-25T18:30:00'))).toEqual({ day: '2026-11-25', time: { hour: 18, minute: 30 } });
  });
});
```

### Étape 2 — Lire ce qui est enregistré

Fichier `src/features/create/edit-loaders.ts` (remplacé en entier) :

<!-- bloc: loaders -->

```ts
/**
 * What the forms read before changing a saved item (sheet 022): one function per family, which
 * returns the values the form shows, or null when the item no longer exists.
 */

import type { EventType, Reminder, ReminderPriority, TaskStatus } from '@/domain/entities';
import { simpleRecurrenceOf, splitAlertMoment, type SimpleRecurrence } from '@/domain/rules/item-edit-rules';
import { EventRepository } from '@/repositories/event-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TagRepository } from '@/repositories/tag-repository';
import { TaskRepository } from '@/repositories/task-repository';

/** A "To do" opened to be changed: a reminder (it rings) or a task (it does not). */
export interface TodoEditTarget {
  kind: 'reminder' | 'task';
  id: string;
}

export interface TodoEditValues {
  title: string;
  notes: string;
  day: string | undefined;
  time: { hour: number; minute: number };
  priority: ReminderPriority;
  actionType: Reminder['actionType'];
  /** It repeats; `recurrence` is null when the form cannot show how (the rule is kept). */
  repeat: boolean;
  recurrence: SimpleRecurrence | null;
  confirm: boolean;
  dueDate: string | undefined;
  estimatedMinutes: number | undefined;
  personIds: string[];
  tagIds: string[];
  /** The saved alert time of a reminder, to tell whether the person moved it. */
  scheduledAt: Date | null;
  /** The saved status of a task, from which the new one follows. */
  status: TaskStatus | null;
}

export async function loadTodoForEdit(target: TodoEditTarget): Promise<TodoEditValues | null> {
  if (target.kind === 'reminder') {
    const reminder = await ReminderRepository.findById(target.id);
    if (!reminder) return null;
    const scheduledAt = new Date(reminder.scheduledAt);
    const { day, time } = splitAlertMoment(scheduledAt);
    const [personIds, tagIds, rule] = await Promise.all([
      ReminderRepository.findPersonIds(reminder.id),
      TagRepository.findIdsFor('reminder', reminder.id),
      reminder.recurrenceRuleId ? ReminderRepository.findRecurrenceRule(reminder.recurrenceRuleId) : Promise.resolve(null),
    ]);
    return {
      title: reminder.title,
      notes: reminder.notes ?? '',
      day,
      time,
      priority: reminder.priority,
      actionType: reminder.actionType,
      repeat: Boolean(rule),
      recurrence: simpleRecurrenceOf(rule),
      confirm: Boolean(reminder.requiresConfirmation),
      dueDate: undefined,
      estimatedMinutes: undefined,
      personIds,
      tagIds,
      scheduledAt,
      status: null,
    };
  }

  const task = await TaskRepository.findById(target.id);
  if (!task) return null;
  const [personIds, tagIds] = await Promise.all([
    TaskRepository.findPersonIds(task.id),
    TagRepository.findIdsFor('task', task.id),
  ]);
  return {
    title: task.title,
    notes: task.description ?? '',
    day: task.scheduledDate,
    time: { hour: 9, minute: 0 },
    priority: task.priority,
    actionType: 'NONE',
    repeat: false,
    recurrence: null,
    confirm: false,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    personIds,
    tagIds,
    scheduledAt: null,
    status: task.status,
  };
}

export interface MomentEditValues {
  title: string;
  notes: string;
  startAt: Date;
  endAt: Date;
  location: string;
  travelBufferMinutes: number;
  type: EventType;
  personIds: string[];
  tagIds: string[];
}

export async function loadMomentForEdit(id: string): Promise<MomentEditValues | null> {
  const event = await EventRepository.findById(id);
  if (!event) return null;
  const [persons, tagIds] = await Promise.all([EventRepository.findEventPersons(id), TagRepository.findIdsFor('event', id)]);
  return {
    title: event.title,
    notes: event.notes ?? '',
    startAt: new Date(event.startAt),
    endAt: new Date(event.endAt),
    location: event.location ?? '',
    travelBufferMinutes: event.travelBufferMinutes ?? 0,
    type: event.type,
    personIds: persons.map(person => person.id),
    tagIds,
  };
}
```

### Étape 3 — Le cadre du formulaire dit « Enregistrer »

Dans `src/components/create/form/FormBricks.tsx` :

<!-- bloc: shell-1-avant -->

```tsx
  saveLabel,
  saving,
  onSave,
  testID,
  children,
}: {
  family: ItemFamily;
```

devient :

<!-- bloc: shell-1-apres -->

```tsx
  saveLabel,
  editing = false,
  saving,
  onSave,
  testID,
  children,
}: {
  family: ItemFamily;
```

Dans `src/components/create/form/FormBricks.tsx` :

<!-- bloc: shell-2-avant -->

```tsx
  saveLabel: string;
  saving: boolean;
  onSave: () => void;
  testID?: string;
  children: ReactNode;
}) {
```

devient :

<!-- bloc: shell-2-apres -->

```tsx
  saveLabel: string;
  /** Changing a saved item (sheet 022): the bar says "Enregistrer" rather than "Ajouter". */
  editing?: boolean;
  saving: boolean;
  onSave: () => void;
  testID?: string;
  children: ReactNode;
}) {
```

Dans `src/components/create/form/FormBricks.tsx` :

<!-- bloc: shell-3-avant -->

```tsx
            {saving ? t('itemForm.saving') : t('itemForm.save')}
```

devient :

<!-- bloc: shell-3-apres -->

```tsx
            {saving ? t(editing ? 'itemForm.savingEdit' : 'itemForm.saving') : t(editing ? 'itemForm.saveEdit' : 'itemForm.save')}
```

Dans `src/components/create/form/FormBricks.tsx` :

<!-- bloc: shell-4-avant -->

```tsx
            {saving ? t('itemForm.saving') : saveLabel}
```

devient :

<!-- bloc: shell-4-apres -->

```tsx
            {saving ? t(editing ? 'itemForm.savingEdit' : 'itemForm.saving') : saveLabel}
```

### Étape 4 — Enregistrer « à confirmer », la répétition, et une tâche sans jour

Dans `src/use-cases/reminder-use-cases.ts` :

<!-- bloc: uc-1-avant -->

```ts
  tagIds?: string[];
  requiresConfirmation?: boolean;
}

export async function updateReminder(
```

devient :

<!-- bloc: uc-1-apres -->

```ts
  tagIds?: string[];
  requiresConfirmation?: boolean;
  /** A new repeat (a new rule; the old one stays in the data), null to stop it, undefined to keep it. */
  recurrenceRule?: Omit<RecurrenceRule, 'id'> | null;
}

export async function updateReminder(
```

Dans `src/use-cases/reminder-use-cases.ts` :

<!-- bloc: uc-2-avant -->

```ts
  if (input.tagIds !== undefined) await TagRepository.setFor('reminder', input.id, input.tagIds);

  // Mettre à jour en base
  await ReminderRepository.update({
    id: input.id,
    title: input.title,
    notes: input.notes,
    scheduledAt: input.scheduledAt?.toISOString(),
    priority: input.priority,
    actionType: input.actionType,
    personId: input.personId,
    updatedAt: now,
  });
```

devient :

<!-- bloc: uc-2-apres -->

```ts
  if (input.tagIds !== undefined) await TagRepository.setFor('reminder', input.id, input.tagIds);

  let recurrenceRuleId: string | null | undefined;
  if (input.recurrenceRule === null) recurrenceRuleId = null;
  else if (input.recurrenceRule) {
    recurrenceRuleId = randomUUID();
    await ReminderRepository.createRecurrenceRule({ id: recurrenceRuleId, ...input.recurrenceRule });
  }

  // Mettre à jour en base
  await ReminderRepository.update({
    id: input.id,
    title: input.title,
    notes: input.notes,
    scheduledAt: input.scheduledAt?.toISOString(),
    priority: input.priority,
    actionType: input.actionType,
    personId: input.personId,
    requiresConfirmation: input.requiresConfirmation,
    recurrenceRuleId,
    updatedAt: now,
  });
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: repo-1-avant -->

```ts
  requiresConfirmation?: boolean;
  notificationId?: string | null;
```

devient :

<!-- bloc: repo-1-apres -->

```ts
  requiresConfirmation?: boolean;
  /** null: it no longer repeats. */
  recurrenceRuleId?: string | null;
  notificationId?: string | null;
```

Dans `src/repositories/reminder-repository.ts` :

<!-- bloc: repo-2-avant -->

```ts
      values.push(params.requiresConfirmation ? 1 : 0);
    }
    if (params.personId !== undefined) {
```

devient :

<!-- bloc: repo-2-apres -->

```ts
      values.push(params.requiresConfirmation ? 1 : 0);
    }
    if (params.recurrenceRuleId !== undefined) {
      setClauses.push('recurrence_rule_id = ?');
      values.push(params.recurrenceRuleId);
    }
    if (params.personId !== undefined) {
```

Dans `src/use-cases/task-use-cases.ts` :

<!-- bloc: task-avant -->

```ts
  status?: TaskStatus;
  scheduledDate?: string;
  /** null takes the deadline off the task. */
  dueDate?: string | null;
  estimatedMinutes?: number;
```

devient :

<!-- bloc: task-apres -->

```ts
  status?: TaskStatus;
  /** null puts the task back in the Inbox (no day). */
  scheduledDate?: string | null;
  /** null takes the deadline off the task. */
  dueDate?: string | null;
  /** null takes its time off. */
  estimatedMinutes?: number | null;
```

### Étape 5 — Les deux formulaires savent modifier

Le formulaire À faire. Les ajouts : la propriété `editing`, la lecture au départ (`loadTodoForEdit`), l'enregistrement par `updateReminder` ou `updateTask`, la section Alerte cachée pour une tâche, l'interrupteur d'alerte caché pour un rappel, les sous-tâches retirées des « Plus d'options ».

Fichier `src/features/create/TodoForm.tsx` (remplacé en entier) :

<!-- bloc: todo-form -->

```tsx
/**
 * The "To do" form (study 001, 12.2 "2-B"; sheet 012), in cyan: What → When → Alert → With whom
 * → More options, in the order of the registry (constants/item-forms). Saved without an alert it
 * is a task; with one, a reminder: the kinds kept in the data (constants/item-kinds).
 * The same form changes a saved task or reminder (sheet 022, `editing`): it opens filled in, the
 * kind stays what it is (a task has no alert section, a reminder keeps its alert) and the
 * subtasks stay on the page of the task.
 */

import { Ionicons } from '@expo/vector-icons';
import { addDays, addWeeks, format, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  ChoiceChips,
  DictateAll,
  DictatedInput,
  FieldLabel,
  FormSection,
  FormShell,
  MoreOptions,
  SwitchRow,
  type Choice,
  type IconName,
} from '@/components/create/form/FormBricks';
import { LoadingState } from '@/components/feedback/States';
import { PersonField } from '@/components/people/PersonField';
import { TagField } from '@/components/tags/TagField';
import { DeadlineField } from '@/components/tasks/DeadlineField';
import {
  alertMoment,
  dayParam,
  hourParam,
  TODO_DURATION_OPTIONS,
  visibleMoreFields,
  visibleSections,
  type FormSectionId,
  type MoreFieldId,
} from '@/constants/item-forms';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Radius, Spacing } from '@/constants/theme';
import type { Person, Reminder, ReminderPriority, TaskStatus } from '@/domain/entities';
import { todoFromSentence } from '@/domain/rules/form-dictation-rules';
import { alertTimeRefused, taskStatusAfterEdit, type SimpleRecurrence } from '@/domain/rules/item-edit-rules';
import { loadTodoForEdit, type TodoEditTarget } from '@/features/create/edit-loaders';
import { offerExactAlarmsForConfirmation } from '@/features/reminders/offer-exact-alarms';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT, type MessageKey } from '@/i18n';
import { PersonRepository } from '@/repositories/person-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';
import { createReminder, updateReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

type ActionType = Reminder['actionType'];
type Recurrence = SimpleRecurrence;

const PRIORITIES: readonly { value: ReminderPriority; labelKey: MessageKey }[] = [
  { value: 'LOW', labelKey: 'form.priority.low' },
  { value: 'NORMAL', labelKey: 'priority.normal' },
  { value: 'HIGH', labelKey: 'priority.high' },
  { value: 'URGENT', labelKey: 'form.priority.urgentF' },
];

const ACTIONS: readonly { value: ActionType; labelKey: MessageKey; icon: IconName }[] = [
  { value: 'NONE', labelKey: 'form.none', icon: 'remove-outline' },
  { value: 'CALL', labelKey: 'people.call', icon: 'call-outline' },
  { value: 'MESSAGE', labelKey: 'reminders.action.MESSAGE', icon: 'chatbubble-outline' },
  { value: 'EMAIL', labelKey: 'reminders.action.EMAIL', icon: 'mail-outline' },
  { value: 'MEET', labelKey: 'remNew.action.meet', icon: 'people-outline' },
  { value: 'TASK', labelKey: 'reminders.action.TASK', icon: 'checkmark-outline' },
];

const RECURRENCES: readonly { value: Recurrence; labelKey: MessageKey }[] = [
  { value: 'DAILY', labelKey: 'remNew.daily' },
  { value: 'WEEKLY', labelKey: 'remNew.weekly' },
  { value: 'MONTHLY', labelKey: 'remNew.monthly' },
];

const pad = (value: number) => String(value).padStart(2, '0');

export interface TodoFormProps {
  /** Opened as a reminder ("With an alert", a Planning slot): the alert is on. */
  initialAlert?: boolean;
  defaultDate?: string;
  defaultHour?: string;
  /** Opened from the page of a person: it is already about them. */
  personId?: string;
  /** A saved task or reminder to change (sheet 022) instead of a new one. */
  editing?: TodoEditTarget;
}

export function TodoForm({ initialAlert = false, defaultDate, defaultHour, personId, editing }: TodoFormProps) {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const { showSnackbar } = useAppStore();
  const accent = itemFamilyColor(palette, 'todo');

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const nextMonday = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [day, setDay] = useState<string | undefined>(() => dayParam(defaultDate) ?? (initialAlert ? today : undefined));
  // A saved item keeps its kind: a reminder rings, a task does not
  const [alert, setAlert] = useState(editing ? editing.kind === 'reminder' : initialAlert);
  const [alertTime, setAlertTime] = useState(() => ({
    hour: hourParam(defaultHour) ?? (new Date().getHours() + 1) % 24,
    minute: 0,
  }));
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [repeat, setRepeat] = useState(false);
  // null: a saved repeat the form cannot show (every 3 days...), kept unless the person changes it
  const [recurrence, setRecurrence] = useState<Recurrence | null>('DAILY');
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [personIds, setPersonIds] = useState<string[]>(() => (personId ? [personId] : []));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<'day' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);
  // The people, so that "Appeler Paul" in a dictated sentence finds Paul
  const [persons, setPersons] = useState<Person[]>([]);
  // What was saved, read once when changing an item
  const [ready, setReady] = useState(!editing);
  const savedRef = useRef<{ scheduledAt: Date | null; status: TaskStatus | null }>({ scheduledAt: null, status: null });

  useEffect(() => {
    PersonRepository.findAll()
      .then(setPersons)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    loadTodoForEdit(editing)
      .then(values => {
        if (!active) return;
        if (!values) {
          showSnackbar(t(editing.kind === 'reminder' ? 'remDetail.notFound' : 'taskDetail.notFound'));
          router.back();
          return;
        }
        setTitle(values.title);
        setNotes(values.notes);
        setDay(values.day);
        setAlertTime(values.time);
        setPriority(values.priority);
        setActionType(values.actionType);
        setRepeat(values.repeat);
        setRecurrence(values.repeat ? values.recurrence : 'DAILY');
        setConfirm(values.confirm);
        setDueDate(values.dueDate);
        setEstimatedMinutes(values.estimatedMinutes);
        setPersonIds(values.personIds);
        setTagIds(values.tagIds);
        savedRef.current = { scheduledAt: values.scheduledAt, status: values.status };
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        showSnackbar(t('common.loadError'));
        router.back();
      });
    return () => {
      active = false;
    };
    // Read once for the item opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.kind, editing?.id]);

  const changeRepeat = (on: boolean) => {
    setRepeat(on);
    setRecurrenceTouched(true);
    if (on && recurrence === null) setRecurrence('DAILY');
  };
  const changeRecurrence = (value: Recurrence | null) => {
    if (!value) return;
    setRecurrence(value);
    setRecurrenceTouched(true);
  };

  // "Dictate everything" (sheets 013 and 014): the sentence fills and touches every field it
  // speaks of; "Compris" lists them so the person checks before adding
  const [understood, setUnderstood] = useState<string[]>([]);
  const applySentence = (sentence: string) => {
    const fill = todoFromSentence(sentence, persons, new Date(), language);
    setTitle(fill.title);
    if (fill.title) setTitleError('');
    setDay(fill.day);
    // A saved item keeps its kind, whatever the sentence says
    if (!editing) setAlert(fill.alert);
    setAlertTime(fill.time);
    setPriority(fill.priority);
    setActionType(fill.actionType);
    if (Boolean(fill.recurrence) !== repeat || (fill.recurrence && fill.recurrence !== recurrence)) setRecurrenceTouched(true);
    setRepeat(Boolean(fill.recurrence));
    if (fill.recurrence) setRecurrence(fill.recurrence);
    setConfirm(fill.confirm);
    if (fill.dueDate) setDueDate(fill.dueDate);
    if (fill.estimatedMinutes) setEstimatedMinutes(fill.estimatedMinutes);
    if (fill.notes) setNotes(fill.notes);
    const personId = fill.personId;
    if (personId) setPersonIds(ids => (ids.includes(personId) ? ids : [personId, ...ids]));
    const shortDay = (ymd: string) => format(new Date(`${ymd}T12:00:00`), 'EEE d MMM', { locale: dateLocale });
    const priorityKey = PRIORITIES.find(option => option.value === fill.priority)?.labelKey;
    const actionKey = ACTIONS.find(option => option.value === fill.actionType)?.labelKey;
    const recurrenceKey = RECURRENCES.find(option => option.value === fill.recurrence)?.labelKey;
    setUnderstood(
      [
        fill.day ? shortDay(fill.day) : '',
        fill.alert ? `${pad(fill.time.hour)}:${pad(fill.time.minute)}` : '',
        fill.priority !== 'NORMAL' && priorityKey ? t(priorityKey) : '',
        fill.actionType !== 'NONE' && actionKey ? t(actionKey) : '',
        recurrenceKey ? t(recurrenceKey) : '',
        fill.confirm ? t('confirmReminder.label') : '',
        fill.dueDate ? t('itemForm.understoodDeadline', { date: shortDay(fill.dueDate) }) : '',
        fill.estimatedMinutes ? durationLabel(fill.estimatedMinutes) : '',
        persons.find(person => person.id === personId)?.displayName ?? '',
        fill.notes ? t('itemForm.understoodNote') : '',
      ].filter(Boolean)
    );
  };

  const customDay = day && ![today, tomorrow, nextMonday].includes(day) ? day : undefined;
  const dayChoice = day === undefined ? 'none' : customDay ? 'pick' : day;
  const dayOptions: Choice<string>[] = [
    ...(alert ? [] : [{ value: 'none', label: t('itemForm.noDay'), icon: 'file-tray-outline' as const }]),
    { value: today, label: t('common.today'), icon: 'today-outline' },
    { value: tomorrow, label: t('reminders.section.tomorrow'), icon: 'arrow-forward-outline' },
    { value: nextMonday, label: t('taskNew.nextMonday'), icon: 'calendar-outline' },
    {
      value: 'pick',
      label: customDay
        ? format(new Date(`${customDay}T12:00:00`), t('form.dateFormat'), { locale: dateLocale })
        : t('form.pickDate'),
      icon: 'calendar-number-outline',
    },
  ];
  const priorityOptions: Choice<ReminderPriority>[] = PRIORITIES.map(option => ({ value: option.value, label: t(option.labelKey) }));
  const durationLabel = (minutes: number | undefined) => {
    if (minutes === undefined) return t('form.none');
    if (minutes === 60) return t('taskNew.hours1');
    if (minutes === 120) return t('taskNew.hours2');
    return `${minutes} min`;
  };

  const toggleAlert = (on: boolean) => {
    setAlert(on);
    // An alert rings on a day: today when none was chosen
    if (on && !day) setDay(today);
  };

  const addSubtask = () => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    setSubtasks(previous => [...previous, trimmed]);
    setSubtaskInput('');
  };

  /** The repeat to save: undefined leaves the saved one as it is. */
  const recurrenceToSave = (scheduledAt: Date) => {
    if (editing && !recurrenceTouched) return undefined;
    if (!repeat || !recurrence) return editing ? null : undefined;
    return { type: recurrence, interval: 1, dayOfMonth: recurrence === 'MONTHLY' ? scheduledAt.getDate() : undefined };
  };

  async function handleSave() {
    if (!title.trim()) {
      setTitleError(t('taskNew.titleRequired'));
      return;
    }
    const scheduledAt = alertMoment(day, alertTime, new Date());
    if (alert && alertTimeRefused(savedRef.current.scheduledAt, scheduledAt, new Date())) {
      showSnackbar(t('remNew.mustBeFuture'));
      return;
    }
    setSaving(true);
    try {
      if (editing?.kind === 'reminder') {
        await updateReminder({
          id: editing.id,
          title: title.trim(),
          notes: notes.trim(),
          scheduledAt,
          priority,
          actionType,
          personIds,
          tagIds,
          requiresConfirmation: confirm,
          recurrenceRule: recurrenceToSave(scheduledAt),
        });
        showSnackbar(t('remEdit.updated'));
      } else if (editing?.kind === 'task') {
        await TaskUseCases.updateTask({
          id: editing.id,
          title: title.trim(),
          description: notes.trim(),
          priority,
          scheduledDate: day ?? null,
          dueDate: dueDate ?? null,
          estimatedMinutes: estimatedMinutes ?? null,
          personIds,
          tagIds,
          status: savedRef.current.status ? taskStatusAfterEdit(savedRef.current.status, day) : undefined,
        });
        showSnackbar(t('taskDetail.updated'));
      } else if (alert) {
        const settings = await SettingsRepository.get();
        await createReminder({
          title: title.trim(),
          notes: notes.trim() || undefined,
          scheduledAt,
          timezone: settings.timezone,
          priority,
          actionType,
          personIds,
          tagIds,
          requiresConfirmation: confirm,
          recurrenceRule: recurrenceToSave(scheduledAt) ?? undefined,
        });
        showSnackbar(t('remNew.created'));
      } else {
        await TaskUseCases.createTask({
          title: title.trim(),
          description: notes.trim() || undefined,
          priority,
          scheduledDate: day,
          dueDate,
          estimatedMinutes,
          subtasks,
          personIds,
          tagIds,
        });
        showSnackbar(t('taskNew.created'));
      }
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t(editing ? 'taskDetail.saveError' : 'taskNew.createError'));
    } finally {
      setSaving(false);
    }
  }

  const renderMore = (field: MoreFieldId) => {
    switch (field) {
      case 'priority':
        return (
          <View key={field}>
            <FieldLabel label={t('itemForm.priority')} />
            <ChoiceChips options={priorityOptions} value={priority} onChange={setPriority} accent={accent} testIDPrefix="todo-priority" />
          </View>
        );
      case 'deadline':
        return <DeadlineField key={field} value={dueDate} onChange={setDueDate} />;
      case 'duration':
        return (
          <View key={field}>
            <FieldLabel label={t('taskNew.durationHeader')} hint={t('itemForm.durationHint')} />
            <ChoiceChips
              options={TODO_DURATION_OPTIONS.map(minutes => ({ value: minutes, label: durationLabel(minutes) }))}
              value={estimatedMinutes}
              onChange={setEstimatedMinutes}
              accent={accent}
              testIDPrefix="todo-duration"
            />
          </View>
        );
      case 'subtasks':
        return (
          <View key={field} style={{ gap: Spacing.xs }}>
            <FieldLabel label={t('taskNew.subtasksHeader', { count: subtasks.length })} />
            {subtasks.map((subtask, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 }}>
                <Ionicons name="ellipse-outline" size={16} color={accent} />
                <Text style={[formStyles.fieldLabel, { flex: 1 }]}>{subtask}</Text>
                <TouchableOpacity
                  onPress={() => setSubtasks(previous => previous.filter((_, i) => i !== index))}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.removeSubtask', { title: subtask })}
                  style={{ padding: Spacing.sm }}
                >
                  <Ionicons name="close-circle" size={18} color={palette.error.default} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <TextInput
                style={[formStyles.inputBox, { flex: 1 }]}
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                placeholder={t('taskNew.subtaskPlaceholder')}
                placeholderTextColor={palette.onSurface.disabled}
                onSubmitEditing={addSubtask}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addSubtask}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.addSubtask')}
                style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={20} color={palette.mode === 'light' ? '#FFFFFF' : '#141317'} />
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'tags':
        return <TagField key={field} selectedIds={tagIds} onChange={setTagIds} />;
      default:
        return null;
    }
  };

  const renderSection = (section: FormSectionId) => {
    switch (section) {
      case 'what':
        return (
          <FormSection icon="create-outline" title={t('itemForm.what')} accent={accent}>
            <DictatedInput
              value={title}
              onChangeText={text => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
              accent={accent}
              placeholder={t('itemForm.todoPlaceholder')}
              inputStyle={formStyles.titleInput}
              // A new item starts with its title; a saved one opens without the keyboard
              autoFocus={!editing}
              maxLength={120}
              testID="todo-title"
            />
            {titleError ? <Text style={formStyles.errorText}>{titleError}</Text> : null}
            <DictatedInput
              value={notes}
              onChangeText={setNotes}
              accent={accent}
              placeholder={t('itemForm.notesPlaceholder')}
              inputStyle={formStyles.notesInput}
              multiline
              maxLength={500}
              testID="todo-notes"
              small
            />
          </FormSection>
        );
      case 'when':
        return (
          <FormSection icon="calendar-outline" title={t('itemForm.when')} accent={accent}>
            <ChoiceChips
              options={dayOptions}
              value={dayChoice}
              onChange={value => {
                if (value === 'pick') setPicker('day');
                else setDay(value === 'none' ? undefined : value);
              }}
              accent={accent}
              testIDPrefix="todo-day"
            />
          </FormSection>
        );
      case 'alert':
        return (
          <FormSection icon="notifications-outline" title={t('itemForm.alert')} accent={accent}>
            {editing ? null : (
              <SwitchRow
                label={t('itemForm.alertSwitch')}
                hint={t('itemForm.alertHint')}
                value={alert}
                onChange={toggleAlert}
                accent={accent}
                testID="todo-alert"
              />
            )}
            {alert ? (
              <View style={{ gap: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setPicker('time')}
                  accessibilityRole="button"
                  accessibilityLabel={t('itemForm.alertTime', { time: `${pad(alertTime.hour)}:${pad(alertTime.minute)}` })}
                  testID="todo-alert-time"
                  style={[formStyles.selectorRow, { minHeight: 44 }]}
                >
                  <View style={formStyles.selectorLeft}>
                    <Ionicons name="time-outline" size={18} color={accent} />
                    <Text style={formStyles.selectorValue}>
                      {t('itemForm.alertTime', { time: `${pad(alertTime.hour)}:${pad(alertTime.minute)}` })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
                </TouchableOpacity>
                <FieldLabel label={t('itemForm.priority')} hint={t('itemForm.priorityHint')} />
                <ChoiceChips options={priorityOptions} value={priority} onChange={setPriority} accent={accent} testIDPrefix="todo-priority" />
                <FieldLabel label={t('itemForm.action')} />
                <ChoiceChips
                  options={ACTIONS.map(option => ({ value: option.value, label: t(option.labelKey), icon: option.icon }))}
                  value={actionType}
                  onChange={setActionType}
                  accent={accent}
                  testIDPrefix="todo-action"
                />
                <SwitchRow label={t('remNew.repeat')} hint={t('remNew.repeatHelper')} value={repeat} onChange={changeRepeat} accent={accent} />
                {repeat ? (
                  <>
                    <ChoiceChips
                      options={RECURRENCES.map(option => ({ value: option.value as Recurrence | null, label: t(option.labelKey) }))}
                      value={recurrence}
                      onChange={changeRecurrence}
                      accent={accent}
                    />
                    {recurrence === null ? <Text style={formStyles.fieldLabel}>{t('itemForm.customRepeatKept')}</Text> : null}
                  </>
                ) : null}
                <SwitchRow
                  label={t('confirmReminder.label')}
                  hint={t('confirmReminder.helper')}
                  value={confirm}
                  onChange={value => {
                    setConfirm(value);
                    if (value) void offerExactAlarmsForConfirmation();
                  }}
                  accent={accent}
                  testID="reminder-confirmation"
                />
              </View>
            ) : null}
          </FormSection>
        );
      case 'who':
        return <PersonField selectedIds={personIds} onChange={setPersonIds} multiple />;
      case 'more':
        return (
          <MoreOptions accent={accent}>
            {visibleMoreFields('todo', { alert })
              // The subtasks of a saved task are ticked and changed on its page
              .filter(field => !(editing && field === 'subtasks'))
              .map(renderMore)}
          </MoreOptions>
        );
      default:
        return null;
    }
  };

  if (!ready) return <LoadingState />;

  // A saved task has no alert section: it stays a task
  const sections = visibleSections('todo', { alert }).filter(section => !(editing?.kind === 'task' && section === 'alert'));

  return (
    <FormShell
      family="todo"
      // The header says whether it will ring (sheet 014)
      icon={alert ? 'notifications' : undefined}
      // Changing keeps the short name of the kind; the subtitle says it is a change (sheet 022)
      title={t(alert ? 'itemForm.todo.titleAlert' : 'itemForm.todo.title')}
      subtitle={t(editing ? 'itemForm.editSubtitle' : alert ? 'itemForm.todo.subtitleAlert' : 'itemForm.todo.subtitle')}
      saveLabel={t(editing ? 'itemForm.editSubmit' : alert ? 'itemForm.todo.submitAlert' : 'itemForm.todo.submit')}
      editing={Boolean(editing)}
      saving={saving}
      onSave={handleSave}
      testID="todo-form"
    >
      <DictateAll
        accent={accent}
        example={t('itemForm.dictateTodoExample')}
        onSentence={applySentence}
        understood={understood}
      />
      {sections.map(section => (
        <React.Fragment key={section}>{renderSection(section)}</React.Fragment>
      ))}
      <DateTimePickerModal
        isVisible={picker !== null}
        mode={picker === 'time' ? 'time' : 'date'}
        date={picker === 'time' ? alertMoment(day, alertTime, new Date()) : new Date(`${day ?? today}T12:00:00`)}
        onConfirm={picked => {
          if (picker === 'time') setAlertTime({ hour: picked.getHours(), minute: picked.getMinutes() });
          else setDay(format(picked, 'yyyy-MM-dd'));
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
        confirmTextIOS={t('personNew.confirm')}
        cancelTextIOS={t('form.cancel')}
        locale={language === 'fr' ? 'fr_FR' : 'en_US'}
      />
    </FormShell>
  );
}
```

Le formulaire Moment. Les ajouts : `editingId`, la lecture au départ (`loadMomentForEdit`), l'enregistrement par `updateEvent`.

Fichier `src/features/create/MomentForm.tsx` (remplacé en entier) :

<!-- bloc: moment-form -->

```tsx
/**
 * The "Moment" form (study 001, 12.2 "2-B"; sheet 012), in amber: What → Start and end → Where →
 * Leave … min before (only once a place is written) → With whom → More options, in the order of
 * the registry (constants/item-forms).
 * The same form changes a saved moment (sheet 022, `editingId`): it opens filled in.
 */

import { Ionicons } from '@expo/vector-icons';
import { addHours, format } from 'date-fns';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  ChoiceChips,
  DictateAll,
  DictatedInput,
  FieldLabel,
  FormSection,
  FormShell,
  MoreOptions,
  type Choice,
} from '@/components/create/form/FormBricks';
import { LoadingState } from '@/components/feedback/States';
import { PersonField } from '@/components/people/PersonField';
import { TagField } from '@/components/tags/TagField';
import {
  dayParam,
  hourParam,
  LEAVE_OPTIONS,
  visibleMoreFields,
  visibleSections,
  type FormSectionId,
  type MoreFieldId,
} from '@/constants/item-forms';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Spacing } from '@/constants/theme';
import type { EventType, Person } from '@/domain/entities';
import { momentFromSentence } from '@/domain/rules/form-dictation-rules';
import { loadMomentForEdit } from '@/features/create/edit-loaders';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT } from '@/i18n';
import { PersonRepository } from '@/repositories/person-repository';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';
import { EventUseCases } from '@/use-cases/event-use-cases';

export interface MomentFormProps {
  defaultDate?: string;
  defaultHour?: string;
  /** Opened from the page of a person: they already take part. */
  personId?: string;
  /** A saved moment to change (sheet 022) instead of a new one. */
  editingId?: string;
}

/** The first hour of a new moment: the hour asked for, or the next full hour. */
function initialStart(defaultDate?: string, defaultHour?: string): Date {
  const now = new Date();
  const day = dayParam(defaultDate);
  const start = day ? new Date(`${day}T12:00:00`) : new Date(now);
  start.setHours(hourParam(defaultHour) ?? now.getHours() + 1, 0, 0, 0);
  return start;
}

export function MomentForm({ defaultDate, defaultHour, personId, editingId }: MomentFormProps) {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const { showSnackbar, userTimezone } = useAppStore();
  const accent = itemFamilyColor(palette, 'moment');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [startAt, setStartAt] = useState(() => initialStart(defaultDate, defaultHour));
  const [endAt, setEndAt] = useState(() => addHours(initialStart(defaultDate, defaultHour), 1));
  const [location, setLocation] = useState('');
  const [travelBufferMinutes, setTravelBufferMinutes] = useState(0);
  const [eventType, setEventType] = useState<EventType>('BUSY');
  const [personIds, setPersonIds] = useState<string[]>(() => (personId ? [personId] : []));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);
  // The people, so that "avec Paul" in a dictated sentence finds Paul
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    PersonRepository.findAll()
      .then(setPersons)
      .catch(() => {});
  }, []);

  // What was saved, read once when changing a moment
  const [ready, setReady] = useState(!editingId);
  useEffect(() => {
    if (!editingId) return;
    let active = true;
    loadMomentForEdit(editingId)
      .then(values => {
        if (!active) return;
        if (!values) {
          showSnackbar(t('eventDetail.notFound'));
          router.back();
          return;
        }
        setTitle(values.title);
        setNotes(values.notes);
        setStartAt(values.startAt);
        setEndAt(values.endAt);
        setLocation(values.location);
        setTravelBufferMinutes(values.travelBufferMinutes);
        setEventType(values.type);
        setPersonIds(values.personIds);
        setTagIds(values.tagIds);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        showSnackbar(t('common.loadError'));
        router.back();
      });
    return () => {
      active = false;
    };
    // Read once for the moment opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // "Dictate everything" (sheets 013 and 014): title, start, end, place, person and notes from one
  // sentence; "Compris" lists them so the person checks before adding
  const [understood, setUnderstood] = useState<string[]>([]);
  const applySentence = (sentence: string) => {
    const fill = momentFromSentence(sentence, persons, new Date(), language);
    setTitle(fill.title);
    if (fill.title) setTitleError('');
    setStartAt(fill.start);
    setEndAt(fill.end);
    if (fill.place) setLocation(fill.place);
    if (fill.notes) setNotes(fill.notes);
    const personId = fill.personId;
    if (personId) setPersonIds(ids => (ids.includes(personId) ? ids : [personId, ...ids]));
    setUnderstood(
      [
        `${format(fill.start, 'EEE d MMM HH:mm', { locale: dateLocale })} – ${format(fill.end, 'HH:mm')}`,
        fill.place ?? '',
        persons.find(person => person.id === personId)?.displayName ?? '',
        fill.notes ? t('itemForm.understoodNote') : '',
      ].filter(Boolean)
    );
  };

  const place = location.trim();

  async function handleSave() {
    if (!title.trim()) {
      setTitleError(t('eventNew.titleRequired'));
      return;
    }
    if (endAt <= startAt) {
      showSnackbar(t('eventNew.endAfterStart'));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await EventUseCases.updateEvent({
          id: editingId,
          title: title.trim(),
          notes: notes.trim(),
          startAt,
          endAt,
          location: place,
          type: eventType,
          travelBufferMinutes: place ? travelBufferMinutes : 0,
          personIds,
          tagIds,
        });
        showSnackbar(t('itemForm.saved'));
      } else {
        await EventUseCases.createEvent({
          title: title.trim(),
          notes: notes.trim() || undefined,
          startAt,
          endAt,
          timezone: userTimezone,
          location: place || undefined,
          type: eventType,
          // Leaving only means something with a place
          travelBufferMinutes: place ? travelBufferMinutes : 0,
          personIds,
          tagIds,
        });
        showSnackbar(t('eventNew.created'));
      }
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t(editingId ? 'taskDetail.saveError' : 'taskNew.createError'));
    } finally {
      setSaving(false);
    }
  }

  // The hour first, as on the old form, then the day
  const whenLabel = (value: Date) =>
    `${format(value, 'HH:mm')} · ${format(value, t('eventNew.shortDate'), { locale: dateLocale })}`;

  const slotRow = (which: 'start' | 'end', value: Date) => (
    <TouchableOpacity
      onPress={() => setPicker(which)}
      accessibilityRole="button"
      accessibilityLabel={`${t(which === 'start' ? 'eventNew.start' : 'eventNew.end')} ${whenLabel(value)}`}
      testID={`moment-${which}`}
      style={[formStyles.selectorRow, { minHeight: 44 }]}
    >
      <View style={formStyles.selectorLeft}>
        <Ionicons name={which === 'start' ? 'play-outline' : 'stop-outline'} size={16} color={accent} />
        <Text style={formStyles.selectorLabel}>{t(which === 'start' ? 'eventNew.start' : 'eventNew.end')}</Text>
      </View>
      <Text style={formStyles.selectorValue}>{whenLabel(value)}</Text>
    </TouchableOpacity>
  );

  const renderMore = (field: MoreFieldId) => {
    switch (field) {
      case 'availability': {
        const options: Choice<EventType>[] = [
          { value: 'BUSY', label: t('eventNew.busy'), icon: 'lock-closed-outline' },
          { value: 'FREE', label: t('eventNew.free'), icon: 'leaf-outline' },
        ];
        return (
          <View key={field}>
            <FieldLabel label={t('itemForm.availability')} />
            <ChoiceChips options={options} value={eventType} onChange={setEventType} accent={accent} testIDPrefix="moment-availability" />
          </View>
        );
      }
      case 'tags':
        return <TagField key={field} selectedIds={tagIds} onChange={setTagIds} />;
      default:
        return null;
    }
  };

  const renderSection = (section: FormSectionId) => {
    switch (section) {
      case 'what':
        return (
          <FormSection icon="create-outline" title={t('itemForm.what')} accent={accent}>
            <DictatedInput
              value={title}
              onChangeText={text => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
              accent={accent}
              placeholder={t('itemForm.momentPlaceholder')}
              inputStyle={formStyles.titleInput}
              // A new moment starts with its title; a saved one opens without the keyboard
              autoFocus={!editingId}
              maxLength={120}
              testID="moment-title"
            />
            {titleError ? <Text style={formStyles.errorText}>{titleError}</Text> : null}
            <DictatedInput
              value={notes}
              onChangeText={setNotes}
              accent={accent}
              placeholder={t('itemForm.notesPlaceholder')}
              inputStyle={formStyles.notesInput}
              multiline
              maxLength={500}
              testID="moment-notes"
              small
            />
          </FormSection>
        );
      case 'slot':
        return (
          <FormSection icon="time-outline" title={t('itemForm.slot')} accent={accent}>
            {slotRow('start', startAt)}
            {slotRow('end', endAt)}
          </FormSection>
        );
      case 'where':
        return (
          <FormSection icon="location-outline" title={t('itemForm.where')} accent={accent}>
            <TextInput
              style={formStyles.inputBox}
              value={location}
              onChangeText={setLocation}
              placeholder={t('itemForm.wherePlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              testID="moment-place"
            />
          </FormSection>
        );
      case 'leave':
        return (
          <FormSection icon="car-outline" title={t('itemForm.leave')} accent={accent} testID="moment-leave">
            <FieldLabel label={t('itemForm.leaveHint')} />
            <ChoiceChips
              options={LEAVE_OPTIONS.map(minutes => ({ value: minutes, label: minutes === 0 ? t('form.none') : minutes === 60 ? t('taskNew.hours1') : `${minutes} min` }))}
              value={travelBufferMinutes}
              onChange={setTravelBufferMinutes}
              accent={accent}
              testIDPrefix="moment-leave"
            />
          </FormSection>
        );
      case 'who':
        return <PersonField selectedIds={personIds} onChange={setPersonIds} multiple />;
      case 'more':
        return (
          <MoreOptions accent={accent}>
            <View style={{ gap: Spacing.sm }}>{visibleMoreFields('moment').map(renderMore)}</View>
          </MoreOptions>
        );
      default:
        return null;
    }
  };

  if (!ready) return <LoadingState />;

  return (
    <FormShell
      family="moment"
      title={t('itemForm.moment.title')}
      subtitle={t(editingId ? 'itemForm.editSubtitle' : 'itemForm.moment.subtitle')}
      saveLabel={t(editingId ? 'itemForm.editSubmit' : 'itemForm.moment.submit')}
      editing={Boolean(editingId)}
      saving={saving}
      onSave={handleSave}
      testID="moment-form"
    >
      <DictateAll
        accent={accent}
        example={t('itemForm.dictateMomentExample')}
        onSentence={applySentence}
        understood={understood}
      />
      {visibleSections('moment', { place }).map(section => (
        <React.Fragment key={section}>{renderSection(section)}</React.Fragment>
      ))}
      <DateTimePickerModal
        isVisible={picker !== null}
        mode="datetime"
        date={picker === 'end' ? endAt : startAt}
        onConfirm={picked => {
          if (picker === 'start') {
            setStartAt(picked);
            // The end follows a start moved past it, keeping one hour
            if (endAt <= picked) setEndAt(addHours(picked, 1));
          } else {
            setEndAt(picked);
          }
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
        confirmTextIOS={t('personNew.confirm')}
        cancelTextIOS={t('form.cancel')}
        locale={language === 'fr' ? 'fr-FR' : 'en-US'}
      />
    </FormShell>
  );
}
```

### Étape 6 — Les routes

Fichier `src/app/reminders/edit/[id].tsx` (remplacé en entier) :

<!-- bloc: route-reminder -->

```tsx
/** Change a reminder (sheet 022): the "To do" form that created it, filled in. Route /reminders/edit/[id]. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function EditReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TodoForm editing={{ kind: 'reminder', id }} />;
}
```

Fichier `src/app/tasks/edit/[id].tsx` (remplacé en entier) :

<!-- bloc: route-task -->

```tsx
/** Change a task (sheet 022): the "To do" form that created it, filled in. Route /tasks/edit/[id]. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TodoForm editing={{ kind: 'task', id }} />;
}
```

Fichier `src/app/events/edit/[id].tsx` (remplacé en entier) :

<!-- bloc: route-event -->

```tsx
/** Change a moment (sheet 022): the "Moment" form that created it, filled in. Route /events/edit/[id]. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { MomentForm } from '@/features/create/MomentForm';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MomentForm editingId={id} />;
}
```

Dans `src/app/_layout.tsx` :

<!-- bloc: routes-avant -->

```tsx
              <Stack.Screen name="tasks/new" options={{ presentation: "modal" }} />
```

devient :

<!-- bloc: routes-apres -->

```tsx
              <Stack.Screen name="tasks/new" options={{ presentation: "modal" }} />
              <Stack.Screen name="tasks/edit/[id]" options={{ presentation: "modal" }} />
```

Dans `src/app/_layout.tsx` :

<!-- bloc: routes-2-avant -->

```tsx
              <Stack.Screen name="events/new" options={{ presentation: "modal" }} />
```

devient :

<!-- bloc: routes-2-apres -->

```tsx
              <Stack.Screen name="events/new" options={{ presentation: "modal" }} />
              <Stack.Screen name="events/edit/[id]" options={{ presentation: "modal" }} />
```

### Étape 7 — Les pages : Modifier, et relire au retour

La page d'une tâche devient une page de lecture (statut, Focus, ce qu'elle dit, sous-tâches) :

Fichier `src/app/tasks/[id].tsx` (remplacé en entier) :

<!-- bloc: task-page -->

```tsx
/**
 * The page of a task: its status, Focus, what it says and its subtasks, ticked here.
 * Changing the task opens the "To do" form that created it (sheet 022, /tasks/edit/[id]); the
 * page reads the task again when it comes back to the front.
 */

import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { TaskRepository } from '@/repositories/task-repository';
import { TaskUseCases } from '@/use-cases/task-use-cases';
import { Task, Subtask, TaskStatus } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { makeTaskDetailStyles } from '@/styles/tasks/task-detail-styles';
import { useDateLocale, useT, type MessageKey } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';

const PRIORITY_KEYS: Record<Task['priority'], MessageKey> = {
  LOW: 'form.priority.low',
  NORMAL: 'priority.normal',
  HIGH: 'priority.high',
  URGENT: 'form.priority.urgentF',
};

export default function TaskDetailScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeTaskDetailStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [error, setError] = useState('');
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const statusLabels: Record<TaskStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = useMemo(() => ({
    INBOX: { label: t('taskDetail.status.INBOX'), color: theme.onSurface.variant, icon: 'file-tray-outline' },
    SCHEDULED: { label: t('taskDetail.status.SCHEDULED'), color: theme.primary.default, icon: 'calendar-outline' },
    IN_PROGRESS: { label: t('taskDetail.status.IN_PROGRESS'), color: theme.tertiary.default, icon: 'time-outline' },
    COMPLETED: { label: t('taskDetail.status.COMPLETED'), color: theme.success.default, icon: 'checkmark-circle-outline' },
    POSTPONED: { label: t('taskDetail.status.POSTPONED'), color: theme.priority.HIGH, icon: 'arrow-forward-circle-outline' },
  }), [theme, t]);

  const load = useCallback(async () => {
    if (!id) {
      setError(t('taskDetail.missingId'));
      setScreenState('error');
      return;
    }
    try {
      const [loaded, subs] = await Promise.all([TaskRepository.findById(id), TaskRepository.findSubtasks(id)]);
      if (!loaded) {
        setError(t('taskDetail.notFound'));
        setScreenState('error');
        return;
      }
      setTask(loaded);
      setSubtasks(subs);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('taskDetail.loadError'));
      setScreenState('error');
    }
  }, [id, t]);

  // Read again on coming back from the form, so the page shows what was just saved
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // ─── Subtasks ──────────────────────────────────────────────────────────────

  async function handleToggleSubtask(subtaskId: string, currentCompleted: boolean) {
    if (!id) return;
    const nextCompleted = !currentCompleted;
    setSubtasks(prev => prev.map(s => (s.id === subtaskId ? { ...s, isCompleted: nextCompleted } : s)));
    await TaskUseCases.toggleSubtask(subtaskId, nextCompleted);
  }

  async function handleAddSubtask() {
    if (!id || !newSubtaskInput.trim()) return;
    const added = await TaskUseCases.addSubtask(id, newSubtaskInput);
    setSubtasks(prev => [...prev, added]);
    setNewSubtaskInput('');
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const deleted = subtasks.find(s => s.id === subtaskId);
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    await TaskUseCases.deleteSubtask(subtaskId);
    showSnackbar(t('taskDetail.subtaskDeleted'), {
      actionLabel: t('taskDetail.undo'),
      onAction: async () => {
        if (deleted && id) {
          await TaskUseCases.addSubtask(id, deleted.title);
          load();
        }
      },
    });
  }

  // ─── Task ──────────────────────────────────────────────────────────────────

  async function handleToggleStatus() {
    if (!task) return;
    const newStatus = await TaskUseCases.toggleComplete(task.id);
    const isCompleted = newStatus === 'COMPLETED';

    showSnackbar(isCompleted ? t('taskDetail.completed') : t('taskDetail.reopened'), {
      actionLabel: t('taskDetail.undo'),
      onAction: async () => {
        await TaskUseCases.toggleComplete(task.id);
        load();
      },
    });

    router.back();
  }

  async function handleDelete() {
    if (!task) return;
    await TaskUseCases.deleteTask(task.id);
    showSnackbar(t('tasks.deleted'), {
      actionLabel: t('common.undo30'),
      onAction: async () => {
        await TaskUseCases.undoDelete(task.id);
        load();
      },
      durationMs: 30000,
    });
    router.back();
  }

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error' || !task) return <ErrorState message={error} onRetry={load} />;

  const statusConfig = statusLabels[task.status];
  const completedSubtasksCount = subtasks.filter(s => s.isCompleted).length;
  const longDay = (ymd: string) => format(new Date(`${ymd}T12:00:00`), t('form.dateFormat'), { locale: dateLocale });
  // What the task says, one line each: only what was given
  const facts: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: task.scheduledDate ? 'calendar-outline' : 'file-tray-outline', text: task.scheduledDate ? longDay(task.scheduledDate) : t('itemForm.noDay') },
    ...(task.dueDate ? [{ icon: 'flag-outline' as const, text: t('itemForm.understoodDeadline', { date: longDay(task.dueDate) }) }] : []),
    ...(task.estimatedMinutes ? [{ icon: 'timer-outline' as const, text: `${task.estimatedMinutes} min` }] : []),
    ...(task.priority !== 'NORMAL' ? [{ icon: 'alert-circle-outline' as const, text: t(PRIORITY_KEYS[task.priority]) }] : []),
  ];

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={theme.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('taskDetail.title')}</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push({ pathname: '/tasks/edit/[id]', params: { id: task.id } })}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            testID="task-edit"
          >
            <Ionicons name="create-outline" size={20} color={theme.onSurface.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete} accessibilityRole="button" accessibilityLabel={t('taskDetail.deleteA11y')}>
            <Ionicons name="trash-outline" size={20} color={theme.error.default} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlowCard tone="neutral">
          <View style={styles.statusRowInner}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
            <Button
              label={task.status === 'COMPLETED' ? t('taskDetail.reopenButton') : t('taskDetail.completeButton')}
              onPress={handleToggleStatus}
              variant={task.status === 'COMPLETED' ? 'secondary' : 'primary'}
              size="sm"
            />
          </View>
        </GlowCard>

        {task.status !== 'COMPLETED' && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.surface.container,
              padding: Spacing.md,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: theme.outline.variant,
            }}
            onPress={() =>
              router.push({
                pathname: '/focus' as never,
                params: { taskId: task.id, taskTitle: task.title, minutes: String(task.estimatedMinutes ?? '') },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t('taskDetail.focusA11y')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="timer-outline" size={20} color={theme.tertiary.default} />
              <Text style={{ ...Typography.labelLarge, color: theme.onSurface.primary }}>{t('taskDetail.focusLabel')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.onSurface.inactive} />
          </TouchableOpacity>
        )}

        {/* What the task says; "Modifier" changes it */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/tasks/edit/[id]', params: { id: task.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${task.title}. ${t('common.edit')}`}
          style={{
            backgroundColor: theme.surface.container,
            padding: Spacing.lg,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: theme.outline.variant,
            gap: Spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
            <Text style={{ ...Typography.titleLarge, color: theme.onSurface.primary, flex: 1 }}>{task.title}</Text>
            <Ionicons name="create-outline" size={18} color={theme.onSurface.variant} />
          </View>
          {task.description ? <Text style={{ ...Typography.bodyMedium, color: theme.onSurface.variant }}>{task.description}</Text> : null}
          {facts.map(fact => (
            <View key={fact.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name={fact.icon} size={16} color={theme.onSurface.variant} />
              <Text style={{ ...Typography.bodyMedium, color: theme.onSurface.primary }}>{fact.text}</Text>
            </View>
          ))}
        </TouchableOpacity>

        <View style={styles.field}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.label}>{t('taskDetail.subtasks')}</Text>
            {subtasks.length > 0 && (
              <Text style={styles.subtaskCounter}>
                {t('taskDetail.subtasksDone', { done: completedSubtasksCount, total: subtasks.length })}
              </Text>
            )}
          </View>

          {subtasks.map(s => (
            <View key={s.id} style={styles.subtaskWrapper}>
              <GlowCard tone="neutral">
                <View style={styles.subtaskRowInner}>
                  <TouchableOpacity
                    onPress={() => handleToggleSubtask(s.id, s.isCompleted)}
                    style={styles.subtaskCheck}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.isCompleted }}
                    accessibilityLabel={
                      s.isCompleted
                        ? t('taskDetail.markSubtaskUndone', { title: s.title })
                        : t('taskDetail.markSubtaskDone', { title: s.title })
                    }
                  >
                    <Ionicons
                      name={s.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={s.isCompleted ? theme.success.default : theme.onSurface.disabled}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.subtaskTitle, s.isCompleted && styles.subtaskTitleCompleted]}>{s.title}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteSubtask(s.id)}
                    style={styles.subtaskDelete}
                    accessibilityRole="button"
                    accessibilityLabel={t('taskDetail.deleteSubtaskA11y', { title: s.title })}
                  >
                    <Ionicons name="close" size={18} color={theme.onSurface.disabled} />
                  </TouchableOpacity>
                </View>
              </GlowCard>
            </View>
          ))}

          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={styles.subtaskInput}
              value={newSubtaskInput}
              onChangeText={setNewSubtaskInput}
              placeholder={t('taskDetail.addSubtaskPlaceholder')}
              placeholderTextColor={theme.onSurface.disabled}
              onSubmitEditing={handleAddSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.subtaskAddBtn}
              onPress={handleAddSubtask}
              accessibilityRole="button"
              accessibilityLabel={t('taskDetail.addSubtaskA11y')}
            >
              <Ionicons name="add" size={20} color={theme.primary.on} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-1-avant -->

```tsx
import { useEffect, useState, useCallback } from 'react';
```

devient :

<!-- bloc: ev-1-apres -->

```tsx
import { useState, useCallback } from 'react';
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-2-avant -->

```tsx
import { router, useLocalSearchParams } from 'expo-router';
```

devient :

<!-- bloc: ev-2-apres -->

```tsx
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-3-avant -->

```tsx
  // Events have no edit screen: their people change here, saved at once
```

devient :

<!-- bloc: ev-3-apres -->

```tsx
  // Their people and tags also change here, saved at once; the rest in the form (sheet 022)
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-4-avant -->

```tsx
  useEffect(() => {
    load();
  }, [load]);
```

devient :

<!-- bloc: ev-4-apres -->

```tsx
  // Read again on coming back from the form, so the page shows what was just saved
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
```

Dans `src/app/events/[id].tsx` :

<!-- bloc: ev-5-avant -->

```tsx
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={t('eventDetail.deleteA11y')}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error.default} />
        </TouchableOpacity>
      </View>
```

devient :

<!-- bloc: ev-5-apres -->

```tsx
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push({ pathname: '/events/edit/[id]', params: { id: event.id } })}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            testID="event-edit"
          >
            <Ionicons name="create-outline" size={20} color={theme.onSurface.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={t('eventDetail.deleteA11y')}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error.default} />
          </TouchableOpacity>
        </View>
      </View>
```

Dans `src/app/reminders/[id].tsx` :

<!-- bloc: rm-1-avant -->

```tsx
import { useEffect, useState, useCallback } from 'react';
```

devient :

<!-- bloc: rm-1-apres -->

```tsx
import { useState, useCallback } from 'react';
```

Dans `src/app/reminders/[id].tsx` :

<!-- bloc: rm-2-avant -->

```tsx
import { router, useLocalSearchParams } from 'expo-router';
```

devient :

<!-- bloc: rm-2-apres -->

```tsx
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
```

Dans `src/app/reminders/[id].tsx` :

<!-- bloc: rm-3-avant -->

```tsx
  useEffect(() => {
    load();
  }, [load]);
```

devient :

<!-- bloc: rm-3-apres -->

```tsx
  // Read again on coming back from the form, so the page shows what was just saved (sheet 022)
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
```

### Étape 8 — Les textes

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'itemForm.moment.submit': "Ajouter ce moment",
```

devient :

<!-- bloc: fr-apres -->

```ts
  'itemForm.moment.submit': "Ajouter ce moment",
  'itemForm.editSubtitle': "Modification",
  'itemForm.editSubmit': "Enregistrer les changements",
  'itemForm.saveEdit': "Enregistrer",
  'itemForm.savingEdit': "Enregistrement…",
  'itemForm.saved': "Modifications enregistrées",
  'itemForm.customRepeatKept': "Répétition personnalisée : elle reste telle quelle si tu n'en choisis pas une autre.",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'itemForm.moment.submit': "Add this moment",
```

devient :

<!-- bloc: en-apres -->

```ts
  'itemForm.moment.submit': "Add this moment",
  'itemForm.editSubtitle': "Editing",
  'itemForm.editSubmit': "Save the changes",
  'itemForm.saveEdit': "Save",
  'itemForm.savingEdit': "Saving…",
  'itemForm.saved': "Changes saved",
  'itemForm.customRepeatKept': "Custom repeat: it stays as it is unless you choose another one.",
```

### Étape 9 — Supprimer l'ancien style, appliquer, vérifier

L'outil supprime `src/styles/reminders/edit-reminder-styles.ts` (plus personne ne l'utilise).

```powershell
node docs/fiches/outils/appliquer-fiche-022.js .
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
| `npx jest` | tout passe, dont `item-edit-rules` |
| `npx tsc --noEmit` | aucune erreur |
| Un rappel → Modifier | formulaire cyan rempli, en-tête « Rappel · Modification », pas d'interrupteur d'alerte |
| Une tâche → crayon | formulaire cyan rempli, pas de section Alerte, pas de sous-tâches |
| Un moment → crayon | formulaire ambre rempli |
| Enregistrer puis retour | la page montre le changement |

## 7. Retour en arrière

`git checkout -- <fichiers modifiés>`, supprimer les fichiers nouveaux, et `git checkout -- src/styles/reminders/edit-reminder-styles.ts`. Aucune migration : les données ne bougent pas.

## Compte rendu d'exécution (24 novembre 2026)

- Lu avant d'écrire : les deux formulaires de création (fiche 012), l'ancien écran « Modifier » d'un rappel, la page d'une tâche (ses champs modifiables), la page d'un moment (pas d'écran de modification), les actions `updateReminder`, `updateTask`, `updateEvent` et le dépôt des rappels.
- Appliquée **à partir des blocs de cette fiche** (`appliquer-fiche-022.js`), puis rejouée avec la fiche 023 sur une copie propre du code enregistré : résultat identique fichier par fichier.
- **Écart corrigé** : à 360 px, l'en-tête « Modifier le rappel » était coupé (« Modifier le rap… »). L'en-tête garde le nom court (Tâche, Rappel, Moment) avec « Modification » dessous ; trois textes retirés.
- **Problème rencontré** : `tsc` refusait les deux nouvelles routes (`/tasks/edit/[id]`, `/events/edit/[id]`) tant que les routes typées d'expo-router n'étaient pas régénérées. Remède : lancer le serveur web une fois (`npx expo start --web`, ou `expo-web` dans l'app), qui réécrit `.expo/types/router.d.ts`, puis relancer `tsc`.
- Tests : `Test Suites: 97 passed`, `Tests: 2017 passed` ; `tsc` et `eslint` sans erreur.
- **Vérifié à l'écran** (web, 360 px), sur les données d'essai du navigateur :
  - un **rappel en retard** s'ouvre rempli ; une note ajoutée est enregistrée sans toucher à son heure, puis effacée ; la page se relit au retour ;
  - une **tâche d'essai** : pas de section Alerte ; « Demain » la fait passer de l'Inbox à « Planifiée », « Sans date » la renvoie à l'Inbox ; puis supprimée ;
  - un **moment d'essai** s'ouvre rempli ; un lieu ajouté fait apparaître « Partir … min avant », et la page montre le lieu et « Y aller » ; puis supprimé.
- **Pas vérifié** : sur le téléphone ; la répétition d'un rappel changée (vérifiée par les tests et le code seulement). Rien n'est encore enregistré dans git.

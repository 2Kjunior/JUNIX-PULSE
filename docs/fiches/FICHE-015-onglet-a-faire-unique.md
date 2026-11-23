# FICHE OPÉRATOIRE N° 015 — Un seul onglet « À faire », et la barre du bas réordonnée

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 014](FICHE-014-formulaires-ajustes-et-dicter-tout-complet.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 14, et 12.10 (chantier n° 4)

---

## 1. Objectif

Les onglets **Rappels** et **Tâches** menaient au même formulaire : c'est une répétition. Après cette fiche :

- **Barre du bas** : **Accueil · À faire · Planning · Proches** (4 onglets au lieu de 5) : la vue d'ensemble, puis quoi faire, puis quand, puis avec qui.
- **Onglet « À faire »** : en haut, un filtre **Tout · Avec alerte · Sans alerte** (avec le nombre de choses ouvertes) ; sous lui, les étiquettes de couleur ; puis une seule liste **rangée par moment** : **En retard · Aujourd'hui · Demain · Plus tard · Sans date · Fait**.
- **Une seule carte** pour tout : la case à cocher **cyan** de la famille « À faire », le titre, et dessous l'heure avec une **cloche** pour ce qui sonne, ou le jour pour ce qui ne sonne pas ; un point pour la priorité Haute ou Urgente ; les étiquettes.
- **Les gestes** : toucher la case = fait ; glisser vers la droite = fait ; glisser vers la gauche = modifier, supprimer (avec « Annuler » pendant 30 s), et **« Plus tard » (+2 h)** pour ce qui sonne.
- Le bouton **« + »** ouvre le formulaire « À faire » ; avec l'alerte déjà activée si le filtre « Avec alerte » est choisi.
- Les raccourcis de l'Accueil (Rappels, Tâches) ouvrent l'onglet sur le bon filtre.

Le tri par moment est **une règle pure** (`todo-list-rules.ts`) : ajouter une section ou un filtre, c'est ce fichier et son test. Les anciennes listes (`/reminders`) restent joignables pour les liens qui y mènent (notifications, anciennes pages).

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| Les fiches 013 et 014 sont enregistrées | `git log --oneline -3` | `feat(forms): "Dicter tout"…` présent |
| Tout passe | `npx jest` | `Tests: 1941 passed` |

## 3. Matériel

Aucune bibliothèque ajoutée : `PillTopBar`, `TagFilterRow`, `SwipeableItem`, `EmptyState` et le bouton flottant existent déjà.

## 4. Hypothèses

- Une tâche est rangée selon son **jour prévu**, ou à défaut son **échéance** ; sans l'un ni l'autre, dans « Sans date ».
- Un rappel dont l'heure est passée sans être fait est **En retard** (manqué) ; un rappel fait ne se rouvre pas (sa case est grisée).
- « Fait » montre les **15 plus récents**.
- La barre du bas choisissait l'onglet allumé **par sa place** (`state.index === index`) : en retirant un onglet, la lumière serait tombée sur le mauvais. Elle le choisit maintenant **par son nom**.
- La clé de texte `tab.tasks` (« Tâches ») est gardée (un test et d'autres écrans s'en servent) ; l'onglet prend la nouvelle clé `tab.todo` (« À faire »).

## 5. Carte de l'intervention

| Fichier | Action | Rôle |
|---|---|---|
| `src/domain/rules/todo-list-rules.ts` | **créé** | Filtre et tri par moment |
| `src/components/todo/TodoRow.tsx` | **créé** | La carte unique |
| `src/features/todo/TodoTabScreen.tsx` | **créé** | L'écran de l'onglet « À faire » |
| `src/app/(tabs)/tasks.tsx` | remplacé | L'onglet affiche `TodoTabScreen` |
| `src/app/(tabs)/_layout.tsx` | modifié | 4 onglets ; l'onglet allumé choisi par son nom |
| `src/app/(tabs)/index.tsx` | modifié | Les raccourcis de l'Accueil ouvrent le bon filtre |
| `src/domain/rules/mascot-suggestion-rules.ts` | modifié | « Bon retour » ouvre l'onglet À faire |
| `src/i18n/messages-rest-fr.ts` et `-en.ts` | modifiés | 20 textes chacun |
| `src/domain/rules/__tests__/todo-list-rules.test.ts` | **créé** | 6 tests |

## 6. Sauvegarde

Aucune donnée touchée : seulement l'affichage. Pour annuler avant le commit : `git restore` des fichiers modifiés, suppression des fichiers créés (`git show HEAD:"src/app/(tabs)/tasks.tsx"` rend l'ancien écran).

## 7. Étapes

### Étape 1 — Le filtre et le tri par moment

Créer `src/domain/rules/todo-list-rules.ts` :

<!-- bloc: rules -->

```ts
/**
 * The single "To do" tab (study 001, 12.10 n° 4 and section 14; sheet 015): the reminders (with
 * an alert) and the tasks (without) in one list, filtered at the top and sorted by moment.
 * Pure: a section or a filter added tomorrow is a line here and its test.
 */

import type { Reminder, ReminderPriority, Task } from '../entities';

export type TodoFilter = 'all' | 'alert' | 'noAlert';
export const TODO_FILTERS: readonly TodoFilter[] = ['all', 'alert', 'noAlert'];

export type TodoSectionId = 'overdue' | 'today' | 'tomorrow' | 'later' | 'noDate' | 'done';
export const TODO_SECTION_ORDER: readonly TodoSectionId[] = ['overdue', 'today', 'tomorrow', 'later', 'noDate', 'done'];

/** The things done that stay in sight, the most recent first. */
export const MAX_DONE_SHOWN = 15;

const PRIORITY_WEIGHT: Readonly<Record<ReminderPriority, number>> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export interface TodoEntry {
  kind: 'task' | 'reminder';
  id: string;
  title: string;
  /** A reminder: when it rings. A task: its planned day, or else its deadline (at noon). */
  when: Date | null;
  /** A task counts by its day, a reminder by its hour. */
  dayOnly: boolean;
  done: boolean;
  doneAt?: string;
  priority: ReminderPriority;
  tagIds: readonly string[];
}

export interface TodoSection {
  id: TodoSectionId;
  entries: TodoEntry[];
}

/** The filter asked by a link ("?filter=alert"), or everything. */
export function filterFromParam(value?: string | string[]): TodoFilter {
  const text = Array.isArray(value) ? value[0] : value;
  return TODO_FILTERS.includes(text as TodoFilter) ? (text as TodoFilter) : 'all';
}

function noonOf(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0) : null;
}

export function entryFromTask(task: Task, tagIds: readonly string[] = []): TodoEntry {
  const day = task.scheduledDate ?? task.dueDate;
  return {
    kind: 'task',
    id: task.id,
    title: task.title,
    when: day ? noonOf(day) : null,
    dayOnly: true,
    done: task.status === 'COMPLETED',
    doneAt: task.completedAt,
    priority: task.priority,
    tagIds,
  };
}

export function entryFromReminder(reminder: Reminder, tagIds: readonly string[] = []): TodoEntry {
  const when = new Date(reminder.scheduledAt);
  return {
    kind: 'reminder',
    id: reminder.id,
    title: reminder.title,
    when: Number.isNaN(when.getTime()) ? null : when,
    dayOnly: false,
    done: reminder.status === 'COMPLETED',
    doneAt: reminder.completedAt,
    priority: reminder.priority,
    tagIds,
  };
}

function startOfDay(date: Date, plusDays = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + plusDays);
}

function matches(entry: TodoEntry, filter: TodoFilter): boolean {
  return filter === 'all' || (filter === 'alert') === (entry.kind === 'reminder');
}

function sectionOf(entry: TodoEntry, now: Date): TodoSectionId {
  if (entry.done) return 'done';
  if (!entry.when) return 'noDate';
  const late = entry.dayOnly ? entry.when < startOfDay(now) : entry.when < now;
  if (late) return 'overdue';
  if (entry.when < startOfDay(now, 1)) return 'today';
  if (entry.when < startOfDay(now, 2)) return 'tomorrow';
  return 'later';
}

/** The sections to show, in order, without the empty ones. */
export function todoSections(
  entries: readonly TodoEntry[],
  filter: TodoFilter,
  now: Date,
  tagId: string | null = null
): TodoSection[] {
  const groups = new Map<TodoSectionId, TodoEntry[]>(TODO_SECTION_ORDER.map(id => [id, []]));
  for (const entry of entries) {
    if (!matches(entry, filter) || (tagId && !entry.tagIds.includes(tagId))) continue;
    groups.get(sectionOf(entry, now))?.push(entry);
  }
  const byTime = (a: TodoEntry, b: TodoEntry) =>
    (a.when?.getTime() ?? Infinity) - (b.when?.getTime() ?? Infinity) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  return TODO_SECTION_ORDER.map(id => {
    const list = groups.get(id) ?? [];
    const sorted =
      id === 'done'
        ? [...list].sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, MAX_DONE_SHOWN)
        : id === 'noDate'
          ? [...list].sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])
          : [...list].sort(byTime);
    return { id, entries: sorted };
  }).filter(section => section.entries.length > 0);
}

/** How many open things each filter holds, for the counts at the top. */
export function todoCounts(entries: readonly TodoEntry[]): Record<TodoFilter, number> {
  const open = entries.filter(entry => !entry.done);
  return {
    all: open.length,
    alert: open.filter(entry => entry.kind === 'reminder').length,
    noAlert: open.filter(entry => entry.kind === 'task').length,
  };
}
```

| Passage | Ce qu'il fait |
|---|---|
| `TodoEntry` | Une tâche ou un rappel, ramené à ce qu'il faut pour la liste |
| `noonOf` | Une tâche n'a qu'un jour : on la place à midi de ce jour |
| `sectionOf` | En retard, Aujourd'hui, Demain, Plus tard, Sans date ou Fait ; une tâche est en retard dès le lendemain de son jour, un rappel dès son heure passée |
| `byTime` | Le plus tôt d'abord ; à égalité, le plus prioritaire |
| `MAX_DONE_SHOWN` | Les 15 dernières choses faites restent visibles |
| `filterFromParam` | Lit le filtre demandé par un lien (« ?filter=alert ») |

### Étape 2 — La carte unique

Créer `src/components/todo/TodoRow.tsx` :

<!-- bloc: row -->

```tsx
/**
 * One card for everything to do (sheet 015): the cyan box of the family, the title, and below
 * it the hour with a bell for what rings, or the day for what does not; a dot for a high or urgent
 * priority, and the tags.
 */

import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';

import { TagSummary } from '@/components/tags/TagChip';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { Tag } from '@/domain/entities';
import type { TodoEntry } from '@/domain/rules/todo-list-rules';
import { useTheme } from '@/hooks/use-theme';
import { useDateLocale, useT } from '@/i18n';

export function TodoRow({
  entry,
  tags,
  onPress,
  onToggle,
}: {
  entry: TodoEntry;
  tags: readonly Tag[];
  onPress: () => void;
  onToggle: () => void;
}) {
  const t = useT();
  const locale = useDateLocale();
  const { palette } = useTheme();
  const accent = itemFamilyColor(palette, 'todo');
  const rings = entry.kind === 'reminder';
  // A reminder done cannot be reopened from here: its box is greyed
  const canToggle = !(rings && entry.done);

  const when = entry.when;
  const dayLabel = !when
    ? t('todoTab.noDate')
    : isToday(when)
      ? t('common.today')
      : isTomorrow(when)
        ? t('reminders.section.tomorrow')
        : format(when, 'EEE d MMM', { locale });
  const whenLabel = rings && when ? (isToday(when) ? format(when, 'HH:mm') : `${dayLabel} · ${format(when, 'HH:mm')}`) : dayLabel;
  const dot = entry.priority === 'URGENT' ? palette.priority.URGENT : entry.priority === 'HIGH' ? palette.priority.HIGH : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}. ${whenLabel}${rings ? `. ${t('todoTab.ringsA11y')}` : ''}`}
      testID={`todo-row-${entry.id}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: 60,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: palette.outline.variant,
        backgroundColor: palette.surface.container,
        opacity: entry.done ? 0.6 : 1,
      }}
    >
      <TouchableOpacity
        onPress={onToggle}
        disabled={!canToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: entry.done, disabled: !canToggle }}
        accessibilityLabel={t(entry.done ? 'todoTab.reopenA11y' : 'todoTab.doneA11y', { title: entry.title })}
        testID={`todo-toggle-${entry.id}`}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: Radius.sm,
            borderWidth: 2,
            borderColor: canToggle ? accent : palette.onSurface.disabled,
            backgroundColor: entry.done ? accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {entry.done ? <Ionicons name="checkmark" size={16} color={palette.mode === 'light' ? '#FFFFFF' : '#141317'} /> : null}
        </View>
      </TouchableOpacity>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            ...Typography.bodyLarge,
            color: palette.onSurface.primary,
            textDecorationLine: entry.done ? 'line-through' : 'none',
          }}
        >
          {entry.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Ionicons name={rings ? 'notifications' : 'calendar-outline'} size={13} color={rings ? accent : palette.onSurface.variant} />
          <Text style={{ ...Typography.labelMedium, color: palette.onSurface.variant }} numberOfLines={1}>
            {whenLabel}
          </Text>
          {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
          <TagSummary tags={tags} />
        </View>
      </View>
    </Pressable>
  );
}
```

### Étape 3 — L'écran de l'onglet « À faire »

Créer `src/features/todo/TodoTabScreen.tsx` :

<!-- bloc: screen -->

```tsx
/**
 * The "To do" tab (study 001, 12.10 n° 4 and section 14; sheet 015): reminders and tasks
 * together, filtered at the top (All · With an alert · Without an alert), the coloured tags
 * below, and one list sorted by moment. The old Reminders list stays for the links to it.
 */

import { Ionicons } from '@expo/vector-icons';
import { addHours } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { TagFilterRow } from '@/components/tags/TagFilterRow';
import { TodoRow } from '@/components/todo/TodoRow';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { SwipeableItem, makeStandardRightActions, type SwipeAction } from '@/components/ui/SwipeableItem';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Spacing, TAB_BAR_TOTAL_HEIGHT, Typography } from '@/constants/theme';
import type { Reminder, Tag, Task } from '@/domain/entities';
import { tagsOf } from '@/domain/rules/tag-rules';
import {
  entryFromReminder,
  entryFromTask,
  filterFromParam,
  todoCounts,
  todoSections,
  type TodoEntry,
  type TodoFilter,
  type TodoSectionId,
} from '@/domain/rules/todo-list-rules';
import { useTheme } from '@/hooks/use-theme';
import { type MessageKey, useT } from '@/i18n';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TagRepository } from '@/repositories/tag-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { useAppStore } from '@/store/app-store';
import { completeReminder, deleteReminder, snoozeReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

const SECTION_LOOK: Readonly<Record<TodoSectionId, { icon: keyof typeof Ionicons.glyphMap; labelKey: MessageKey }>> = {
  overdue: { icon: 'alert-circle-outline', labelKey: 'todoTab.section.overdue' },
  today: { icon: 'today-outline', labelKey: 'todoTab.section.today' },
  tomorrow: { icon: 'arrow-forward-outline', labelKey: 'todoTab.section.tomorrow' },
  later: { icon: 'calendar-outline', labelKey: 'todoTab.section.later' },
  noDate: { icon: 'file-tray-outline', labelKey: 'todoTab.section.noDate' },
  done: { icon: 'checkmark-done-outline', labelKey: 'todoTab.section.done' },
};

type ScreenState = 'loading' | 'content' | 'error';

export function TodoTabScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const accent = itemFamilyColor(palette, 'todo');
  const params = useLocalSearchParams<{ filter?: string }>();

  const [state, setState] = useState<ScreenState>('loading');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TodoFilter>(() => filterFromParam(params.filter));
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, string[]>>({});
  const [reminderTags, setReminderTags] = useState<Record<string, string[]>>({});

  // A link from the home screen asks for a filter ("Rappels" → With an alert)
  useEffect(() => {
    if (params.filter) setFilter(filterFromParam(params.filter));
  }, [params.filter]);

  const load = useCallback(async () => {
    try {
      const [allTasks, allReminders, allTags, taskLinks, reminderLinks] = await Promise.all([
        TaskRepository.findAll(),
        ReminderRepository.findAll(),
        // The tags never keep the list from showing
        TagRepository.findAll().catch(() => [] as Tag[]),
        TagRepository.findLinks('task').catch(() => ({})),
        TagRepository.findLinks('reminder').catch(() => ({})),
      ]);
      setTasks(allTasks);
      setReminders(allReminders.filter(reminder => reminder.status !== 'DELETED' && !reminder.deletedAt));
      setTags(allTags);
      setTaskTags(taskLinks);
      setReminderTags(reminderLinks);
      // A tag deleted meanwhile no longer filters anything
      setTagFilter(current => (current && allTags.some(tag => tag.id === current) ? current : null));
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      setState('error');
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const entries: TodoEntry[] = [
    ...tasks.map(task => entryFromTask(task, taskTags[task.id] ?? [])),
    ...reminders.map(reminder => entryFromReminder(reminder, reminderTags[reminder.id] ?? [])),
  ];
  const sections = todoSections(entries, filter, new Date(), tagFilter);
  const counts = todoCounts(entries);

  const openEntry = (entry: TodoEntry) => router.push(entry.kind === 'task' ? `/tasks/${entry.id}` : `/reminders/${entry.id}`);

  const toggle = async (entry: TodoEntry) => {
    try {
      if (entry.kind === 'task') {
        const status = await TaskUseCases.toggleComplete(entry.id);
        showSnackbar(t(status === 'COMPLETED' ? 'tasks.completed' : 'tasks.reopened'));
      } else {
        const reminder = reminders.find(item => item.id === entry.id);
        if (!reminder || entry.done) return;
        await completeReminder(reminder);
        showSnackbar(t('reminders.completed'));
      }
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('common.error'));
    }
    void load();
  };

  const remove = async (entry: TodoEntry) => {
    try {
      const result =
        entry.kind === 'task'
          ? await TaskUseCases.deleteTask(entry.id)
          : await deleteReminder(reminders.find(item => item.id === entry.id) as Reminder);
      void load();
      showSnackbar(t(entry.kind === 'task' ? 'tasks.deleted' : 'reminders.deleted'), {
        actionLabel: t('common.undo30'),
        onAction: async () => {
          await result.undo();
          void load();
        },
        durationMs: 30_000,
      });
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const later = async (entry: TodoEntry) => {
    const reminder = reminders.find(item => item.id === entry.id);
    if (!reminder) return;
    await snoozeReminder(reminder, { kind: 'custom', until: addHours(new Date(), 2) });
    showSnackbar(t('reminders.snoozed'));
    void load();
  };

  const rightActionsOf = (entry: TodoEntry): SwipeAction[] => [
    ...(entry.kind === 'reminder' && !entry.done
      ? [{ key: 'later', icon: 'time-outline' as const, label: t('todoTab.later'), color: palette.tertiary.default, onPress: () => void later(entry) }]
      : []),
    ...makeStandardRightActions({
      palette,
      onDelete: () => void remove(entry),
      onEdit: () => openEntry(entry),
      deleteLabel: t('common.delete'),
      editLabel: t('common.edit'),
    }),
  ];

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const addPath = filter === 'alert' ? '/tasks/new?alert=1' : '/tasks/new';

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} testID="todo-tab">
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...Typography.headlineMedium, color: palette.onSurface.primary }} numberOfLines={1}>
            {t('tab.todo')}
          </Text>
          <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }} numberOfLines={1}>
            {t('todoTab.subtitle', { count: counts.all })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/focus' as never)}
          accessibilityRole="button"
          accessibilityLabel={t('todoTab.focusA11y')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="timer-outline" size={22} color={palette.tertiary.default} />
        </TouchableOpacity>
      </View>

      <PillTopBar<TodoFilter>
        tabs={[
          { key: 'all', label: t('todoTab.all'), count: counts.all },
          // No icons here: on a phone, the words need the room (the bell is on the cards)
          { key: 'alert', label: t('todoTab.alert'), count: counts.alert },
          { key: 'noAlert', label: t('todoTab.noAlert'), count: counts.noAlert },
        ]}
        activeTab={filter}
        onTabChange={setFilter}
      />
      <TagFilterRow tags={tags} selectedId={tagFilter} onSelect={setTagFilter} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: TAB_BAR_TOTAL_HEIGHT + insets.bottom + 96, gap: Spacing.sm }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 ? (
          tagFilter ? (
            <EmptyState iconName="pricetag-outline" title={t('tags.filterEmpty')} />
          ) : (
            <EmptyState
              iconName="checkbox-outline"
              title={t(`todoTab.empty.${filter}` as MessageKey)}
              description={t('todoTab.emptyDesc')}
              actionLabel={t('todoTab.add')}
              onAction={() => router.push(addPath as never)}
            />
          )
        ) : (
          sections.map(section => (
            <View key={section.id} style={{ gap: Spacing.sm }} testID={`todo-section-${section.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md }}>
                <Ionicons
                  name={SECTION_LOOK[section.id].icon}
                  size={16}
                  color={section.id === 'overdue' ? palette.error.default : accent}
                />
                <Text style={{ ...Typography.titleMedium, color: palette.onSurface.primary }}>{t(SECTION_LOOK[section.id].labelKey)}</Text>
                <Text style={{ ...Typography.labelMedium, color: palette.onSurface.variant }}>{section.entries.length}</Text>
              </View>
              {section.entries.map(entry => (
                <SwipeableItem
                  key={`${entry.kind}-${entry.id}`}
                  rightActions={rightActionsOf(entry)}
                  leftActions={
                    entry.done
                      ? []
                      : [{ key: 'done', icon: 'checkmark', label: t('todoTab.done'), color: accent, onPress: () => void toggle(entry) }]
                  }
                >
                  <TodoRow
                    entry={entry}
                    tags={tagsOf(entry.tagIds, tags)}
                    onPress={() => openEntry(entry)}
                    onToggle={() => void toggle(entry)}
                  />
                </SwipeableItem>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <GlassFloatingActionButton label={t('todoTab.add')} icon="add" onPress={() => router.push(addPath as never)} />
    </View>
  );
}
```

| Passage | Ce qu'il fait |
|---|---|
| `useLocalSearchParams` + `filterFromParam` | Ouvert par « Rappels » depuis l'Accueil : le filtre « Avec alerte » est déjà choisi |
| `load` | Lit tâches, rappels et étiquettes ensemble ; une étiquette qui échoue n'empêche jamais la liste |
| `entries` / `todoSections` | Les deux sortes ramenées à une seule, puis rangées par moment |
| `toggle` | Une tâche se coche et se décoche ; un rappel se termine (et prévient les notifications, comme avant) |
| `remove` | Supprimer, avec « Annuler » pendant 30 s, comme les anciennes listes |
| `later` | « Plus tard » : un rappel revient dans 2 heures, comme dans l'ancienne liste |
| `addPath` | « + » ouvre « À faire », avec l'alerte activée si le filtre « Avec alerte » est choisi |

### Étape 4 — L'onglet « Tâches » devient « À faire »

Remplacer tout le contenu de `src/app/(tabs)/tasks.tsx` :

<!-- bloc: route -->

```tsx
/**
 * The "To do" tab (sheet 015): reminders and tasks together, see features/todo/TodoTabScreen.
 * The route keeps its name "tasks", so every link to it still works.
 */
import React from 'react';

import { TodoTabScreen } from '@/features/todo/TodoTabScreen';

export default function TasksTabScreen() {
  return <TodoTabScreen />;
}
```

### Étape 5 — La barre du bas

Dans `src/app/(tabs)/_layout.tsx`, deux remplacements.

<!-- bloc: tabs-1-avant -->

```tsx
  {
    name: "reminders",
    titleKey: "tab.reminders",
    icon: "notifications-outline",
    iconFocused: "notifications",
  },
  {
    name: "tasks",
    titleKey: "tab.tasks",
    icon: "checkmark-circle-outline",
    iconFocused: "checkmark-circle",
  },
```

<!-- bloc: tabs-1-apres -->

```tsx
  // One tab for reminders and tasks (sheet 015): the route "reminders" stays, out of the bar
  {
    name: "tasks",
    titleKey: "tab.todo",
    icon: "checkbox-outline",
    iconFocused: "checkbox",
  },
```

<!-- bloc: tabs-2-avant -->

```tsx
                focused={state.index === index}
```

<!-- bloc: tabs-2-apres -->

```tsx
                // By name, not by place: the bar no longer shows every route (sheet 015)
                focused={state.routes[state.index]?.name === tab.name}
```

### Étape 5 bis — Le filtre tient sur un téléphone

Vu à 360 px : la barre de filtre donnait **la même largeur** aux trois boutons, et « Avec alerte » était coupé (« Ave… »). Chaque bouton prend maintenant **sa largeur naturelle** (le reste est partagé), et la barre d'« À faire » n'a pas d'icônes (la cloche est sur les cartes). La barre est commune : celles du Planning et des Proches en profitent aussi.

Dans `src/components/ui/PillTopBar.tsx` :

<!-- bloc: pill-avant -->

```ts
    tabItem: {
      flex: 1,
      flexDirection: 'row',
```

<!-- bloc: pill-apres -->

```ts
    tabItem: {
      // Each pill takes its natural width and shares what is left: a long label gets more room
      // than "Tout", instead of being cut on a phone (sheet 015)
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 'auto',
      flexDirection: 'row',
```

### Étape 6 — Les raccourcis qui mènent à l'onglet

Dans `src/app/(tabs)/index.tsx` :

<!-- bloc: home-1-avant -->

```tsx
            onPress={() => router.push('/(tabs)/reminders' as any)}
```

<!-- bloc: home-1-apres -->

```tsx
            onPress={() => router.push({ pathname: '/(tabs)/tasks', params: { filter: 'alert' } } as any)}
```

<!-- bloc: home-2-avant -->

```tsx
            onPress={() => router.push('/(tabs)/tasks' as any)}
```

<!-- bloc: home-2-apres -->

```tsx
            onPress={() => router.push({ pathname: '/(tabs)/tasks', params: { filter: 'noAlert' } } as any)}
```

Dans `src/domain/rules/mascot-suggestion-rules.ts` :

<!-- bloc: mascot-avant -->

```ts
    case 'WELCOME_BACK':
      return '/(tabs)/reminders';
```

<!-- bloc: mascot-apres -->

```ts
    case 'WELCOME_BACK':
      // The single "To do" tab (sheet 015), on what rings
      return '/(tabs)/tasks?filter=alert';
```

### Étape 7 — Les textes

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'itemForm.understoodNote': "une note",
```

<!-- bloc: fr-apres -->

```ts
  'itemForm.understoodNote': "une note",
  'tab.todo': "À faire",
  'todoTab.subtitle': "{count} en cours",
  'todoTab.all': "Tout",
  'todoTab.alert': "Avec alerte",
  'todoTab.noAlert': "Sans alerte",
  'todoTab.section.overdue': "En retard",
  'todoTab.section.today': "Aujourd'hui",
  'todoTab.section.tomorrow': "Demain",
  'todoTab.section.later': "Plus tard",
  'todoTab.section.noDate': "Sans date",
  'todoTab.section.done': "Fait",
  'todoTab.noDate': "Sans date",
  'todoTab.ringsA11y': "Avec alerte",
  'todoTab.doneA11y': "Marquer « {title} » comme fait",
  'todoTab.reopenA11y': "Remettre « {title} » à faire",
  'todoTab.done': "Fait",
  'todoTab.later': "+2 h",
  'todoTab.add': "Nouvelle chose à faire",
  'todoTab.focusA11y': "Lancer une session Focus",
  'todoTab.empty.all': "Rien à faire pour l'instant",
  'todoTab.empty.alert': "Aucune alerte prévue",
  'todoTab.empty.noAlert': "Aucune chose sans alerte",
  'todoTab.emptyDesc': "Touche + pour ajouter, ou dicte tout en une phrase.",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'itemForm.understoodNote': "a note",
```

<!-- bloc: en-apres -->

```ts
  'itemForm.understoodNote': "a note",
  'tab.todo': "To do",
  'todoTab.subtitle': "{count} open",
  'todoTab.all': "All",
  'todoTab.alert': "With an alert",
  'todoTab.noAlert': "No alert",
  'todoTab.section.overdue': "Overdue",
  'todoTab.section.today': "Today",
  'todoTab.section.tomorrow': "Tomorrow",
  'todoTab.section.later': "Later",
  'todoTab.section.noDate': "No date",
  'todoTab.section.done': "Done",
  'todoTab.noDate': "No date",
  'todoTab.ringsA11y': "With an alert",
  'todoTab.doneA11y': "Mark “{title}” as done",
  'todoTab.reopenA11y': "Put “{title}” back to do",
  'todoTab.done': "Done",
  'todoTab.later': "+2 h",
  'todoTab.add': "New to-do",
  'todoTab.focusA11y': "Start a Focus session",
  'todoTab.empty.all': "Nothing to do for now",
  'todoTab.empty.alert': "No alert planned",
  'todoTab.empty.noAlert': "Nothing without an alert",
  'todoTab.emptyDesc': "Tap + to add one, or dictate it all in one sentence.",
```

### Étape 8 — Les tests

Créer `src/domain/rules/__tests__/todo-list-rules.test.ts` :

<!-- bloc: test -->

```ts
import type { Reminder, Task } from '../../entities';
import {
  entryFromReminder,
  entryFromTask,
  filterFromParam,
  MAX_DONE_SHOWN,
  todoCounts,
  todoSections,
} from '../todo-list-rules';

/** Monday 23 November 2026, 10:00. */
const now = new Date(2026, 10, 23, 10, 0);

const task = (over: Partial<Task>): Task =>
  ({ id: 't', title: 'Tâche', status: 'SCHEDULED', priority: 'NORMAL', createdAt: '', updatedAt: '', ...over }) as Task;
const reminder = (over: Partial<Reminder>): Reminder =>
  ({ id: 'r', title: 'Rappel', status: 'UPCOMING', priority: 'NORMAL', scheduledAt: '', createdAt: '', updatedAt: '', ...over }) as Reminder;
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).toISOString();

const entries = [
  entryFromTask(task({ id: 't-late', scheduledDate: '2026-11-20' })),
  entryFromTask(task({ id: 't-today', scheduledDate: '2026-11-23' })),
  entryFromTask(task({ id: 't-due', dueDate: '2026-11-24' })),
  entryFromTask(task({ id: 't-none' })),
  entryFromTask(task({ id: 't-done', status: 'COMPLETED', completedAt: '2026-11-22T10:00:00Z' })),
  entryFromReminder(reminder({ id: 'r-missed', scheduledAt: at(23, 8) })),
  entryFromReminder(reminder({ id: 'r-today', scheduledAt: at(23, 18) })),
  entryFromReminder(reminder({ id: 'r-later', scheduledAt: at(30, 9) })),
];

const shape = (sections: ReturnType<typeof todoSections>) =>
  sections.map(section => [section.id, section.entries.map(entry => entry.id)]);

describe('the single To do list', () => {
  it('sorts reminders and tasks together by moment', () => {
    expect(shape(todoSections(entries, 'all', now))).toEqual([
      ['overdue', ['t-late', 'r-missed']],
      ['today', ['t-today', 'r-today']],
      ['tomorrow', ['t-due']],
      ['later', ['r-later']],
      ['noDate', ['t-none']],
      ['done', ['t-done']],
    ]);
  });

  it('filters what rings and what does not', () => {
    expect(shape(todoSections(entries, 'alert', now))).toEqual([
      ['overdue', ['r-missed']],
      ['today', ['r-today']],
      ['later', ['r-later']],
    ]);
    expect(todoSections(entries, 'noAlert', now).flatMap(section => section.entries).every(entry => entry.kind === 'task')).toBe(true);
  });

  it('puts the most urgent first at the same time, and filters by tag', () => {
    const same = [
      entryFromTask(task({ id: 'normal', scheduledDate: '2026-11-23' })),
      entryFromTask(task({ id: 'urgent', scheduledDate: '2026-11-23', priority: 'URGENT' }), ['tag-a']),
    ];
    expect(shape(todoSections(same, 'all', now))).toEqual([['today', ['urgent', 'normal']]]);
    expect(shape(todoSections(same, 'all', now, 'tag-a'))).toEqual([['today', ['urgent']]]);
  });

  it('counts the open things of each filter', () => {
    expect(todoCounts(entries)).toEqual({ all: 7, alert: 3, noAlert: 4 });
  });

  it(`keeps the last ${MAX_DONE_SHOWN} things done in sight`, () => {
    const done = Array.from({ length: 20 }, (_, n) =>
      entryFromTask(task({ id: `d${n}`, status: 'COMPLETED', completedAt: `2026-11-${String(n + 1).padStart(2, '0')}T10:00:00Z` }))
    );
    const [section] = todoSections(done, 'all', now);
    expect(section.entries).toHaveLength(MAX_DONE_SHOWN);
    expect(section.entries[0].id).toBe('d19');
  });

  it('reads the filter asked by a link', () => {
    expect(filterFromParam('alert')).toBe('alert');
    expect(filterFromParam(['noAlert'])).toBe('noAlert');
    expect(filterFromParam('reminders')).toBe('all');
    expect(filterFromParam(undefined)).toBe('all');
  });
});
```

## 8. Test final

```bash
npx jest src/domain/rules/__tests__/todo-list-rules.test.ts
npx jest
npx tsc --noEmit
npx eslint src/domain/rules/todo-list-rules.ts src/components/todo src/features/todo "src/app/(tabs)" src/domain/rules/mascot-suggestion-rules.ts
```

Résultat attendu : `Tests: 6 passed` ; toute la suite passe ; `tsc` et `eslint` n'affichent rien.

**Sur le web, à 360 px** : la barre du bas a 4 onglets (Accueil, À faire, Planning, Proches) et l'onglet ouvert est allumé ; « À faire » montre le filtre Tout · Avec alerte · Sans alerte, puis les sections ; les raccourcis Rappels et Tâches de l'Accueil ouvrent le bon filtre.

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Le mauvais onglet est allumé | L'ancienne comparaison par place | Étape 5, deuxième remplacement |
| L'onglet « Rappels » réapparaît | Le bloc `reminders` est encore dans `TABS` | Étape 5, premier remplacement |
| Un ancien test cherche l'onglet « Tâches » | Les textes ont changé | Le texte `tab.tasks` existe toujours ; l'onglet utilise `tab.todo` |

## 10. Lexique

- **Filtre** : un choix en haut de liste qui n'en montre qu'une partie.
- **Section** : un groupe de la liste avec son titre (Aujourd'hui, Demain…).

## 11. Et après

1. Fiche 016 : revue de tous les écrans à la largeur d'un téléphone.
2. Le tutoriel avant l'APK, puis l'APK de test.

## Compte rendu d'exécution (23 novembre 2026)

- Lu avant d'écrire : les deux anciens onglets, la barre du bas, ce qui mène à l'onglet Rappels (Accueil, mascotte). Trouvé : la barre allumait l'onglet **par sa place** ; en retirer un aurait allumé le mauvais (corrigé à l'étape 5).
- Étapes 1 à 8 appliquées **à partir des blocs de cette fiche** (`docs/tutoriel-suite/outils/appliquer-fiche-015.js`). Avant d'appliquer : `Typography.titleSmall` n'existe pas dans le thème, remplacé par `titleMedium` dans la fiche.
- Tests : `Tests: 6 passed` ; toute la suite `Test Suites: 91 passed`, `Tests: 1947 passed` ; `tsc` et `eslint` sans erreur.
- **Vu sur le web à 360 px** : 4 onglets (Accueil, À faire, Planning, Proches), « À faire » allumé ; sections En retard, Sans date, Fait ; cartes cyan avec cloche et heure ; filtre « Avec alerte » : seulement les rappels.
- **Écart corrigé après l'avoir vu** (étape 5 bis) : la barre de filtre donnait la même largeur aux trois boutons, « Avec alerte » était coupé ; chaque bouton prend maintenant sa largeur naturelle, sans icônes dans cette barre. La barre est commune : Planning et Proches en profitent.
- Noté pour la fiche 016 : la barre de filtre ne dit pas aux lecteurs d'écran quel bouton est choisi (`aria-selected` absent), défaut plus ancien que cette fiche.
- **Pas vérifié** : les glissements (gestes) et la case à cocher en vrai (pas touchés pour ne pas modifier tes données du web), les raccourcis de l'Accueil. Rien n'est encore enregistré dans git.

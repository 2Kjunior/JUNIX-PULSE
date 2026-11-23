# FICHE OPÉRATOIRE N° 018 — « Progrès » : habitudes et objectifs trouvables, et un objectif qui avance avec ses habitudes

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 017](FICHE-017-coherence-parametres-et-mots.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 15

---

## 1. Objectif

Les habitudes et les objectifs existaient, mais on ne les trouvait presque pas (un petit lien en bas de l'Accueil, seulement s'il y avait déjà des habitudes ; la page Pulse). Et une habitude n'était liée à rien.

| Après cette fiche | Détail |
|---|---|
| **Carte « Habitudes et objectifs »** sur l'Accueil, **toujours visible** | « 2/3 habitudes aujourd'hui », « 1 objectif en cours · 40 % » ; sans rien encore, une phrase qui explique avec un exemple. Elle ouvre « Progrès » |
| **Page « Progrès »** | Filtre **Habitudes · Objectifs** ; reprend les deux listes existantes (rien n'est recopié) ; bouton Paramètres commun |
| **Objectif ← habitudes** | Sur la page d'un objectif, une section **« Habitudes liées »** : lier, délier, voir « 2/3 cette semaine » |
| **Progression d'un objectif** | **(tâches faites + part de la semaine de chaque habitude) ÷ (nombre de tâches + nombre d'habitudes)**. Exemple : 2 tâches dont 1 faite, et une habitude « 3 fois par semaine » faite 2 fois → (1 + 2/3) ÷ 3 = **56 %** |
| **Achèvement automatique** | Inchangé : un objectif se termine tout seul quand **ses tâches** sont toutes faites. Les habitudes font avancer la barre, mais une bonne semaine ne termine pas un objectif par erreur |

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 017 est enregistrée | `git log --oneline -1` | `feat(ui): one settings button…` |
| La base est en version 34 | `src/database/migrations.ts` | dernière entrée `version: 34` |
| Tout passe | `npx jest` | `Tests: 1950 passed` |

## 3. Hypothèses

- La « part de la semaine » d'une habitude : fois faites **depuis lundi** ÷ objectif de la semaine (7 pour « tous les jours », sinon le nombre choisi), au plus 100 %.
- Une habitude supprimée ou un objectif supprimé : le lien disparaît avec eux (`ON DELETE CASCADE`).
- Les sauvegardes emportent les liens (`goal_habits`) ; une sauvegarde plus ancienne, sans eux, se restaure toujours (`.default([])`).
- Les pages `/habits` et `/goals` restent (liens existants, Pulse) ; elles s'affichent aussi **dans** Progrès, sans leur propre en-tête.

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/database/migrations.ts` | **version 35** : table `goal_habits` |
| `src/services/backup-service.ts` | la table dans les sauvegardes |
| `src/repositories/goal-repository.ts` | lier, délier, lire les habitudes d'un objectif |
| `src/domain/rules/goal-rules.ts` | `weeklyTarget`, `doneThisWeek`, `calculateGoalProgressWithHabits` |
| `src/use-cases/goal-use-cases.ts` | détails avec habitudes ; `taskProgress` pour l'achèvement |
| `src/features/goals/GoalHabitsSection.tsx` | **créé** |
| `src/features/progress/ProgressCard.tsx` | **créé** |
| `src/app/progress.tsx` | **créé** : la page Progrès |
| `src/app/goals/index.tsx`, `src/app/habits/index.tsx` | option `embedded` (sans en-tête) |
| `src/app/goals/[id].tsx` | la section Habitudes liées |
| `src/app/(tabs)/index.tsx` | la carte, et « Tout voir » ouvre Progrès |
| `src/i18n/messages-rest-fr.ts` et `-en.ts` | 18 textes chacun |
| `src/domain/rules/__tests__/goal-habit-rules.test.ts` | **créé** : 5 tests |

## 5. Sauvegarde

La migration 35 **ajoute** une table ; aucune donnée n'est modifiée. Faire une sauvegarde (Réglages › Données) avant d'installer l'APK reste une bonne habitude.

## 6. Étapes

### Étape 1 — Les données : migration, sauvegarde, dépôt

Dans `src/database/migrations.ts`, à la fin de la liste :

<!-- bloc: mig-avant -->

```ts
      ALTER TABLE settings ADD COLUMN quiet_hours_end INTEGER NOT NULL DEFAULT 7;
    `,
  },
];
```

<!-- bloc: mig-apres -->

```ts
      ALTER TABLE settings ADD COLUMN quiet_hours_end INTEGER NOT NULL DEFAULT 7;
    `,
  },
  {
    version: 35,
    name: 'add_goal_habits',
    sql: `
      -- Un objectif avance aussi avec ses habitudes (fiche 018, etude 15.2).
      CREATE TABLE IF NOT EXISTS goal_habits (
        goal_id TEXT NOT NULL,
        habit_id TEXT NOT NULL,
        added_at TEXT NOT NULL,
        PRIMARY KEY (goal_id, habit_id),
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_goal_habits_habit ON goal_habits(habit_id);
    `,
  },
];
```

Dans `src/services/backup-service.ts`, quatre remplacements :

<!-- bloc: bk-1-avant -->

```ts
  'goal_tasks',
  'personal_schedules',
```

<!-- bloc: bk-1-apres -->

```ts
  'goal_tasks',
  'goal_habits',
  'personal_schedules',
```

<!-- bloc: bk-2-avant -->

```ts
  goal_tasks: ['goal_id', 'task_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'valid_until', 'status', 'created_at', 'updated_at'],
```

<!-- bloc: bk-2-apres -->

```ts
  goal_tasks: ['goal_id', 'task_id', 'added_at'],
  goal_habits: ['goal_id', 'habit_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'valid_until', 'status', 'created_at', 'updated_at'],
```

<!-- bloc: bk-3-avant -->

```ts
  goal_tasks: ['goal_id', 'task_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'status', 'created_at', 'updated_at'],
```

<!-- bloc: bk-3-apres -->

```ts
  goal_tasks: ['goal_id', 'task_id', 'added_at'],
  goal_habits: ['goal_id', 'habit_id', 'added_at'],
  personal_schedules: ['id', 'name', 'valid_from', 'status', 'created_at', 'updated_at'],
```

<!-- bloc: bk-4-avant -->

```ts
  goal_tasks: z.array(BackupRowSchema),
```

<!-- bloc: bk-4-apres -->

```ts
  goal_tasks: z.array(BackupRowSchema),
  // Since sheet 018: an older backup has none, and still restores
  goal_habits: z.array(BackupRowSchema).default([]),
```

Dans `src/repositories/goal-repository.ts` :

<!-- bloc: repo-avant -->

```ts
  /** The goals a task belongs to. */
```

<!-- bloc: repo-apres -->

```ts
  // ── Association Habitudes ↔ Objectifs (fiche 018) ───────────────────────────

  async linkHabit(goalId: string, habitId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO goal_habits (goal_id, habit_id, added_at) VALUES (?, ?, ?)`,
      goalId,
      habitId,
      new Date().toISOString()
    );
  },

  async unlinkHabit(goalId: string, habitId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM goal_habits WHERE goal_id = ? AND habit_id = ?', goalId, habitId);
  },

  /** The habits linked to a goal, in the order they were linked. */
  async getAssociatedHabitIds(goalId: string): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ habit_id: string }>(
      'SELECT habit_id FROM goal_habits WHERE goal_id = ? ORDER BY added_at ASC',
      goalId
    );
    return rows.map(row => row.habit_id);
  },

  /** The goals a task belongs to. */
```

### Étape 2 — La règle de progression

Dans `src/domain/rules/goal-rules.ts`, juste avant `isGoalOverdue` :

<!-- bloc: rules-avant -->

```ts
export function isGoalOverdue(goal: Goal, now: Date = new Date()): boolean {
```

<!-- bloc: rules-apres -->

```ts
/** The times a habit asks for in a week: 7 every day, or the number chosen (sheet 018). */
export function weeklyTarget(habit: { frequency: string; targetDaysPerWeek?: number }): number {
  return habit.frequency === 'DAILY' ? 7 : Math.max(1, habit.targetDaysPerWeek ?? 1);
}

/** The times a habit was done this week, Monday included. */
export function doneThisWeek(completions: readonly { completedDate: string }[], now: Date = new Date()): number {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const from = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return new Set(completions.map(c => c.completedDate).filter(day => day >= from && day <= today)).size;
}

/**
 * The progress of a goal with its tasks and its habits (sheet 018): each task done counts 1, each
 * habit counts the share of its week it reached (at most 1). Null when nothing is linked.
 */
export function calculateGoalProgressWithHabits(associatedTasks: readonly Task[], habitShares: readonly number[]): number | null {
  const parts = associatedTasks.length + habitShares.length;
  if (parts === 0) return null;
  const done =
    associatedTasks.filter(task => task.status === 'COMPLETED').length +
    habitShares.reduce((sum, share) => sum + Math.min(1, Math.max(0, share)), 0);
  return Math.round((done / parts) * 100);
}

export function isGoalOverdue(goal: Goal, now: Date = new Date()): boolean {
```

| Fonction | Rôle |
|---|---|
| `weeklyTarget` | 7 pour une habitude de chaque jour, sinon le nombre de fois choisi par semaine |
| `doneThisWeek` | Les jours cochés depuis lundi (un jour compte une fois) |
| `calculateGoalProgressWithHabits` | Chaque tâche faite vaut 1, chaque habitude vaut sa part de la semaine ; l'ancienne `calculateGoalProgress` reste pour l'achèvement |

### Étape 3 — Les détails d'un objectif

Dans `src/use-cases/goal-use-cases.ts`, huit remplacements.

<!-- bloc: uc-1-avant -->

```ts
import { GoalRepository } from '../repositories/goal-repository';
import { Goal, Task, GoalStatus } from '../domain/entities';
import {
  calculateGoalProgress,
```

<!-- bloc: uc-1-apres -->

```ts
import { GoalRepository } from '../repositories/goal-repository';
import { HabitRepository } from '../repositories/habit-repository';
import { Goal, Habit, Task, GoalStatus } from '../domain/entities';
import {
  calculateGoalProgress,
  calculateGoalProgressWithHabits,
  doneThisWeek,
  weeklyTarget,
```

<!-- bloc: uc-2-avant -->

```ts
  goal: Goal;
  associatedTasks: Task[];
  progress: number | null;
```

<!-- bloc: uc-2-apres -->

```ts
  goal: Goal;
  associatedTasks: Task[];
  /** The habits linked to it (sheet 018), with this week's share. */
  associatedHabits: GoalHabitLink[];
  /** Tasks and habits together: what the bar shows. */
  progress: number | null;
  /** The tasks alone: only they complete the goal by themselves. */
  taskProgress: number | null;
```

<!-- bloc: uc-3-avant -->

```ts
export interface GoalDetails {
```

<!-- bloc: uc-3-apres -->

```ts
export interface GoalHabitLink {
  habit: Habit;
  doneThisWeek: number;
  target: number;
  /** From 0 to 1: how much of its week the habit reached. */
  share: number;
}

/** The habits of a goal, with how this week went for each. */
async function habitLinksOf(goalId: string, now: Date = new Date()): Promise<GoalHabitLink[]> {
  const links: GoalHabitLink[] = [];
  for (const habitId of await GoalRepository.getAssociatedHabitIds(goalId)) {
    const habit = await HabitRepository.findById(habitId);
    if (!habit || habit.deletedAt) continue;
    const done = doneThisWeek(await HabitRepository.getCompletions(habit.id), now);
    const target = weeklyTarget(habit);
    links.push({ habit, doneThisWeek: done, target, share: Math.min(1, done / target) });
  }
  return links;
}

export interface GoalDetails {
```

<!-- bloc: uc-4-avant -->

```ts
  async refreshGoalStatus(goalId: string): Promise<void> {
```

<!-- bloc: uc-4-apres -->

```ts
  async linkHabit(goalId: string, habitId: string): Promise<void> {
    await GoalRepository.linkHabit(goalId, habitId);
  },

  async unlinkHabit(goalId: string, habitId: string): Promise<void> {
    await GoalRepository.unlinkHabit(goalId, habitId);
  },

  async refreshGoalStatus(goalId: string): Promise<void> {
```

<!-- bloc: uc-5-avant -->

```ts
      details.progress === 100 &&
```

<!-- bloc: uc-5-apres -->

```ts
      details.taskProgress === 100 &&
```

<!-- bloc: uc-6-avant -->

```ts
    if (details.goal.status === 'COMPLETED' && details.progress !== null && details.progress < 100) {
```

<!-- bloc: uc-6-apres -->

```ts
    if (details.goal.status === 'COMPLETED' && details.taskProgress !== null && details.taskProgress < 100) {
```

<!-- bloc: uc-7-avant -->

```ts
    const associatedTasks = await GoalRepository.getAssociatedTasks(goalId);
    const progress = calculateGoalProgress(associatedTasks);
    const overdue = isGoalOverdue(goal);
    const daysLeft = daysUntilDeadline(goal);

    return {
      goal,
      associatedTasks,
      progress,
      isOverdue: overdue,
      daysLeft,
    };
```

<!-- bloc: uc-7-apres -->

```ts
    const associatedTasks = await GoalRepository.getAssociatedTasks(goalId);
    const associatedHabits = await habitLinksOf(goalId);
    const progress = calculateGoalProgressWithHabits(associatedTasks, associatedHabits.map(link => link.share));
    const overdue = isGoalOverdue(goal);
    const daysLeft = daysUntilDeadline(goal);

    return {
      goal,
      associatedTasks,
      associatedHabits,
      progress,
      taskProgress: calculateGoalProgress(associatedTasks),
      isOverdue: overdue,
      daysLeft,
    };
```

<!-- bloc: uc-8-avant -->

```ts
      const associatedTasks = await GoalRepository.getAssociatedTasks(goal.id);
      const progress = calculateGoalProgress(associatedTasks);
      const overdue = isGoalOverdue(goal);
      const daysLeft = daysUntilDeadline(goal);

      detailsList.push({
        goal,
        associatedTasks,
        progress,
        isOverdue: overdue,
        daysLeft,
      });
```

<!-- bloc: uc-8-apres -->

```ts
      const associatedTasks = await GoalRepository.getAssociatedTasks(goal.id);
      const associatedHabits = await habitLinksOf(goal.id);
      const progress = calculateGoalProgressWithHabits(associatedTasks, associatedHabits.map(link => link.share));
      const overdue = isGoalOverdue(goal);
      const daysLeft = daysUntilDeadline(goal);

      detailsList.push({
        goal,
        associatedTasks,
        associatedHabits,
        progress,
        taskProgress: calculateGoalProgress(associatedTasks),
        isOverdue: overdue,
        daysLeft,
      });
```

Un ancien test (`src/__tests__/stats-follow-up.test.ts`) remplace le dépôt des objectifs par une doublure qui ne connaît pas la nouvelle fonction ; on la lui apprend (aucune habitude liée) :

<!-- bloc: mock-avant -->

```ts
    findGoalIdsForTask: jest.fn(async () => ['g1']),
  },
}));
```

<!-- bloc: mock-apres -->

```ts
    findGoalIdsForTask: jest.fn(async () => ['g1']),
    // Since sheet 018: a goal may have habits; none here
    getAssociatedHabitIds: jest.fn(async () => []),
  },
}));
```

### Étape 4 — La section « Habitudes liées »

Créer `src/features/goals/GoalHabitsSection.tsx` :

<!-- bloc: section -->

```tsx
/**
 * "Linked habits" on the page of a goal (sheet 018): a goal moves forward with its tasks and with
 * its habits. Link a habit, unlink it, and see how its week goes.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import type { Habit } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { HabitRepository } from '@/repositories/habit-repository';
import { GoalUseCases, type GoalHabitLink } from '@/use-cases/goal-use-cases';

export function GoalHabitsSection({
  goalId,
  linked,
  onChange,
}: {
  goalId: string;
  linked: readonly GoalHabitLink[];
  onChange: () => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const [picking, setPicking] = useState(false);
  const [available, setAvailable] = useState<Habit[]>([]);

  const togglePicker = async () => {
    if (picking) {
      setPicking(false);
      return;
    }
    const all = await HabitRepository.findAllActive();
    setAvailable(all.filter(habit => !linked.some(link => link.habit.id === habit.id)));
    setPicking(true);
  };

  const link = async (habit: Habit) => {
    await GoalUseCases.linkHabit(goalId, habit.id);
    setPicking(false);
    onChange();
  };

  const unlink = async (habit: Habit) => {
    await GoalUseCases.unlinkHabit(goalId, habit.id);
    onChange();
  };

  const card = {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: palette.outline.variant,
    backgroundColor: palette.surface.container,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  };

  return (
    <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }} testID="goal-habits">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Ionicons name="repeat-outline" size={18} color={palette.primary.default} />
        <Text style={{ ...Typography.titleMedium, color: palette.onSurface.primary, flex: 1 }}>{t('goalHabits.title')}</Text>
        <TouchableOpacity
          onPress={() => void togglePicker()}
          accessibilityRole="button"
          accessibilityLabel={t('goalHabits.link')}
          testID="goal-habits-link"
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name={picking ? 'close' : 'add'} size={18} color={palette.primary.default} />
          <Text style={{ ...Typography.labelLarge, color: palette.primary.default }}>{t('goalHabits.link')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('goalHabits.hint')}</Text>

      {picking ? (
        available.length === 0 ? (
          <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{t('goalHabits.none')}</Text>
        ) : (
          available.map(habit => (
            <TouchableOpacity
              key={habit.id}
              onPress={() => void link(habit)}
              accessibilityRole="button"
              accessibilityLabel={t('goalHabits.linkA11y', { title: habit.title })}
              style={card}
            >
              <Ionicons name="add-circle-outline" size={20} color={palette.primary.default} />
              <Text style={{ ...Typography.bodyLarge, color: palette.onSurface.primary, flex: 1 }} numberOfLines={1}>
                {habit.title}
              </Text>
            </TouchableOpacity>
          ))
        )
      ) : null}

      {linked.map(link => (
        <View key={link.habit.id} style={card}>
          <Ionicons
            name={link.share >= 1 ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={link.share >= 1 ? palette.success.default : palette.onSurface.variant}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...Typography.bodyLarge, color: palette.onSurface.primary }} numberOfLines={1}>
              {link.habit.title}
            </Text>
            <Text style={{ ...Typography.labelMedium, color: palette.onSurface.variant }}>
              {t('goalHabits.week', { done: link.doneThisWeek, target: link.target })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => void unlink(link.habit)}
            accessibilityRole="button"
            accessibilityLabel={t('goalHabits.unlinkA11y', { title: link.habit.title })}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close-circle" size={20} color={palette.onSurface.variant} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
```

Dans `src/app/goals/[id].tsx`, l'import et la section, après les tâches :

<!-- bloc: detail-1-avant -->

```tsx
import { GoalUseCases, GoalDetails } from '@/use-cases/goal-use-cases';
```

<!-- bloc: detail-1-apres -->

```tsx
import { GoalUseCases, GoalDetails } from '@/use-cases/goal-use-cases';
import { GoalHabitsSection } from '@/features/goals/GoalHabitsSection';
```

<!-- bloc: detail-2-avant -->

```tsx
          )}
        </View>
      </ScrollView>
```

<!-- bloc: detail-2-apres -->

```tsx
          )}
        </View>

        {/* Habitudes liées (fiche 018) : l'objectif avance aussi avec elles */}
        <GoalHabitsSection goalId={id} linked={details.associatedHabits} onChange={loadData} />
      </ScrollView>
```

### Étape 5 — La page « Progrès »

Les deux listes peuvent s'afficher sans leur propre en-tête. Dans `src/app/habits/index.tsx` :

<!-- bloc: habits-1-avant -->

```tsx
export default function HabitsListScreen() {
```

<!-- bloc: habits-1-apres -->

```tsx
export default function HabitsListScreen({ embedded = false }: { embedded?: boolean } = {}) {
```

<!-- bloc: habits-2-avant -->

```tsx
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('habits.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
```

<!-- bloc: habits-2-apres -->

```tsx
      {/* Header: hidden inside the Progrès page, which has its own (sheet 018) */}
      {!embedded && (
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('habits.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}
```

Dans `src/app/goals/index.tsx` :

<!-- bloc: goals-1-avant -->

```tsx
export default function GoalsListScreen() {
```

<!-- bloc: goals-1-apres -->

```tsx
export default function GoalsListScreen({ embedded = false }: { embedded?: boolean } = {}) {
```

<!-- bloc: goals-2-avant -->

```tsx
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('goals.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
```

<!-- bloc: goals-2-apres -->

```tsx
      {/* Header: hidden inside the Progrès page, which has its own (sheet 018) */}
      {!embedded && (
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('goals.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}
```

Créer `src/app/progress.tsx` :

<!-- bloc: page -->

```tsx
/**
 * "Progrès" (study 001, 15.2; sheet 018): the habits of the week and the goals, in one place,
 * reached from the home card. It shows the two existing lists, without copying them.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GoalsListScreen from '@/app/goals/index';
import HabitsListScreen from '@/app/habits/index';
import { SettingsButton } from '@/components/ui/HeaderIconButton';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type ProgressFilter = 'habits' | 'goals';

export default function ProgressScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<ProgressFilter>(params.filter === 'goals' ? 'goals' : 'habits');

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface.base, paddingTop: insets.top }} testID="progress-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...Typography.headlineMedium, color: palette.onSurface.primary }} numberOfLines={1}>
            {t('progress.title')}
          </Text>
          <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }} numberOfLines={2}>
            {t('progress.subtitle')}
          </Text>
        </View>
        <SettingsButton />
      </View>
      <PillTopBar<ProgressFilter>
        tabs={[
          { key: 'habits', label: t('progress.habits') },
          { key: 'goals', label: t('progress.goals') },
        ]}
        activeTab={filter}
        onTabChange={setFilter}
      />
      <View style={{ flex: 1 }}>{filter === 'habits' ? <HabitsListScreen embedded /> : <GoalsListScreen embedded />}</View>
    </View>
  );
}
```

### Étape 6 — La carte de l'Accueil

Créer `src/features/progress/ProgressCard.tsx` :

<!-- bloc: card -->

```tsx
/**
 * The home card "Habits and goals" (study 001, 15.2; sheet 018): where the habits of today and the
 * goals in progress stand, always visible, and explained in one sentence when there is none yet.
 * It opens the Progrès page.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { HabitRepository } from '@/repositories/habit-repository';
import { GoalUseCases } from '@/use-cases/goal-use-cases';

interface Summary {
  habitsDone: number;
  habitsTotal: number;
  goals: number;
  percent: number | null;
}

export function ProgressCard() {
  const t = useT();
  const { palette } = useTheme();
  const [summary, setSummary] = useState<Summary | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const habits = await HabitRepository.findAllActive();
          const today = format(new Date(), 'yyyy-MM-dd');
          let habitsDone = 0;
          for (const habit of habits) if (await HabitRepository.isCompletedOn(habit.id, today)) habitsDone += 1;
          const goals = (await GoalUseCases.getAllGoalsWithDetails()).filter(details => details.goal.status === 'ACTIVE');
          const measured = goals.filter(details => details.progress !== null);
          const percent = measured.length
            ? Math.round(measured.reduce((sum, details) => sum + (details.progress ?? 0), 0) / measured.length)
            : null;
          if (alive) setSummary({ habitsDone, habitsTotal: habits.length, goals: goals.length, percent });
        } catch {
          // The card never keeps the home screen from showing
          if (alive) setSummary({ habitsDone: 0, habitsTotal: 0, goals: 0, percent: null });
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const empty = summary !== null && summary.habitsTotal === 0 && summary.goals === 0;
  const habitsLine =
    summary && summary.habitsTotal > 0
      ? t('progressCard.habits', { done: summary.habitsDone, total: summary.habitsTotal })
      : t('progressCard.noHabits');
  const goalsLine =
    summary && summary.goals > 0
      ? t('progressCard.goals', { count: summary.goals, percent: summary.percent ?? 0 })
      : t('progressCard.noGoals');

  return (
    <Pressable
      onPress={() => router.push('/progress' as never)}
      accessibilityRole="button"
      accessibilityLabel={`${t('progressCard.title')}. ${empty ? t('progressCard.empty') : `${habitsLine}. ${goalsLine}`}`}
      testID="progress-card"
      style={{
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: palette.outline.variant,
        backgroundColor: palette.surface.container,
        padding: Spacing.md,
        gap: Spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Ionicons name="trending-up-outline" size={20} color={palette.primary.default} />
        <Text style={{ ...Typography.titleMedium, color: palette.onSurface.primary, flex: 1 }}>{t('progressCard.title')}</Text>
        <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
      </View>
      {empty ? (
        <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{t('progressCard.empty')}</Text>
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="repeat-outline" size={16} color={palette.onSurface.variant} />
            <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary }}>{habitsLine}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="flag-outline" size={16} color={palette.onSurface.variant} />
            <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary }}>{goalsLine}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
```

Dans `src/app/(tabs)/index.tsx`, la carte juste avant les habitudes du jour, et « Tout voir » ouvre Progrès :

<!-- bloc: home-1-avant -->

```tsx
import { HeaderIconButton, SettingsButton } from '@/components/ui/HeaderIconButton';
```

<!-- bloc: home-1-apres -->

```tsx
import { HeaderIconButton, SettingsButton } from '@/components/ui/HeaderIconButton';
import { ProgressCard } from '@/features/progress/ProgressCard';
```

<!-- bloc: home-2-avant -->

```tsx
        {/* ─── 6. Habitudes du jour (Routines & Streaks) ───────────────────── */}
```

<!-- bloc: home-2-apres -->

```tsx
        {/* Habitudes et objectifs (fiche 018) : toujours visibles, ils ouvrent Progrès */}
        <View style={styles.sectionBlock}>
          <ProgressCard />
        </View>

        {/* ─── 6. Habitudes du jour (Routines & Streaks) ───────────────────── */}
```

<!-- bloc: home-3-avant -->

```tsx
              <TouchableOpacity onPress={() => router.push('/habits')}>
```

<!-- bloc: home-3-apres -->

```tsx
              <TouchableOpacity onPress={() => router.push('/progress' as never)}>
```

### Étape 7 — Les textes

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'tab.todo': "À faire",
```

<!-- bloc: fr-apres -->

```ts
  'tab.todo': "À faire",
  'progress.title': "Progrès",
  'progress.subtitle': "Tes habitudes de la semaine et tes objectifs",
  'progress.habits': "Habitudes",
  'progress.goals': "Objectifs",
  'progressCard.title': "Habitudes et objectifs",
  'progressCard.habits': "{done}/{total} habitudes aujourd'hui",
  'progressCard.noHabits': "Aucune habitude pour l'instant",
  'progressCard.goals': "{count} en cours · {percent} %",
  'progressCard.noGoals': "Aucun objectif en cours",
  'progressCard.empty': "Une habitude (« sport 3 fois par semaine ») ou un objectif (« déménager avant mars ») : commence ici.",
  'goalHabits.title': "Habitudes liées",
  'goalHabits.hint': "Chaque habitude fait avancer l'objectif selon ce que tu fais cette semaine.",
  'goalHabits.link': "Lier",
  'goalHabits.linkA11y': "Lier l'habitude {title}",
  'goalHabits.unlinkA11y': "Délier l'habitude {title}",
  'goalHabits.none': "Aucune habitude à lier : crée-en une dans Progrès.",
  'goalHabits.week': "{done}/{target} cette semaine",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'tab.todo': "To do",
```

<!-- bloc: en-apres -->

```ts
  'tab.todo': "To do",
  'progress.title': "Progress",
  'progress.subtitle': "Your habits this week and your goals",
  'progress.habits': "Habits",
  'progress.goals': "Goals",
  'progressCard.title': "Habits and goals",
  'progressCard.habits': "{done}/{total} habits today",
  'progressCard.noHabits': "No habit yet",
  'progressCard.goals': "{count} in progress · {percent}%",
  'progressCard.noGoals': "No goal in progress",
  'progressCard.empty': "A habit (“sport 3 times a week”) or a goal (“move out before March”): start here.",
  'goalHabits.title': "Linked habits",
  'goalHabits.hint': "Each habit moves the goal forward with what you do this week.",
  'goalHabits.link': "Link",
  'goalHabits.linkA11y': "Link the habit {title}",
  'goalHabits.unlinkA11y': "Unlink the habit {title}",
  'goalHabits.none': "No habit to link: create one in Progress.",
  'goalHabits.week': "{done}/{target} this week",
```

### Étape 8 — Les tests

Créer `src/domain/rules/__tests__/goal-habit-rules.test.ts` :

<!-- bloc: test -->

```ts
import type { Task } from '../../entities';
import { calculateGoalProgress, calculateGoalProgressWithHabits, doneThisWeek, weeklyTarget } from '../goal-rules';

const task = (status: Task['status']) => ({ status }) as Task;
/** Wednesday 25 November 2026. */
const now = new Date(2026, 10, 25, 15, 0);

describe('a goal with its habits', () => {
  it('counts each task done as 1 and each habit as the share of its week', () => {
    // 1 of 2 tasks, and a habit 3 times a week done twice: (1 + 2/3) / 3
    expect(calculateGoalProgressWithHabits([task('COMPLETED'), task('SCHEDULED')], [2 / 3])).toBe(56);
    expect(calculateGoalProgressWithHabits([], [1, 0.5])).toBe(75);
    expect(calculateGoalProgressWithHabits([], [])).toBeNull();
  });

  it('never counts a habit for more than its week', () => {
    expect(calculateGoalProgressWithHabits([], [1.8])).toBe(100);
  });

  it('keeps the tasks alone for the automatic completion', () => {
    expect(calculateGoalProgress([task('COMPLETED')])).toBe(100);
  });

  it('asks 7 times a week for a daily habit, else the number chosen', () => {
    expect(weeklyTarget({ frequency: 'DAILY' })).toBe(7);
    expect(weeklyTarget({ frequency: 'WEEKLY', targetDaysPerWeek: 3 })).toBe(3);
    expect(weeklyTarget({ frequency: 'WEEKLY' })).toBe(1);
  });

  it('counts the days done since Monday, each once', () => {
    const completions = ['2026-11-22', '2026-11-23', '2026-11-25', '2026-11-25'].map(completedDate => ({ completedDate }));
    expect(doneThisWeek(completions, now)).toBe(2);
  });
});
```

## 7. Test final

```bash
npx jest src/domain/rules/__tests__/goal-habit-rules.test.ts
npx jest
npx tsc --noEmit
npx eslint src/domain/rules/goal-rules.ts src/use-cases/goal-use-cases.ts src/repositories/goal-repository.ts src/features/goals src/features/progress src/app/progress.tsx src/app/goals src/app/habits "src/app/(tabs)/index.tsx" src/services/backup-service.ts src/database/migrations.ts
```

Attendu : `Tests: 5 passed` ; toute la suite passe ; `tsc` et `eslint` n'affichent rien. Sur le web : la carte « Habitudes et objectifs » sur l'Accueil ; elle ouvre Progrès (Habitudes · Objectifs) ; sur un objectif, « Habitudes liées » et « Lier ».

## 8. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| `Property 'associatedHabits' is missing` | Un test ou un écran fabrique un `GoalDetails` à la main | Ajouter `associatedHabits: []` et `taskProgress` |
| Un test des migrations ou des sauvegardes échoue | Il liste les tables | Ajouter `goal_habits` à sa liste |
| Un objectif se termine trop tôt | `refreshGoalStatus` lit `progress` | Il doit lire `taskProgress` (étape 3) |

## Compte rendu d'exécution (23 novembre 2026)

- Lu avant d'écrire : les listes et la page d'un objectif, le dépôt, les règles d'habitude (la semaine) et d'objectif, la sauvegarde. Trouvé : un objectif **se termine tout seul** à 100 % ; avec les habitudes dans le calcul, une bonne semaine l'aurait terminé par erreur, d'où `taskProgress` pour l'achèvement.
- Étapes 1 à 8 appliquées **à partir des blocs de cette fiche** (`docs/tutoriel-suite/outils/appliquer-fiche-018.js`), du premier coup.
- **Écart corrigé** : un ancien test remplaçait le dépôt des objectifs par une doublure sans la nouvelle fonction ; ajoutée (étape 3 bis de cette fiche, bloc `mock`).
- Tests : `Tests: 5 passed` ; toute la suite `Test Suites: 93 passed`, `Tests: 1956 passed` ; `tsc` et `eslint` sans erreur.
- **Pas vérifié à l'écran** (panneau du navigateur caché) : la carte de l'Accueil, la page Progrès, la section Habitudes liées. À voir avec le prochain APK. Rien n'est encore enregistré dans git.

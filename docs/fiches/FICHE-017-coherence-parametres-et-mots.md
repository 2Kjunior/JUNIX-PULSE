# FICHE OPÉRATOIRE N° 017 — Cohérence : un seul bouton Paramètres, les mots Tâche et Rappel, plus de liste sur un rappel

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 016](FICHE-016-revue-ecrans-largeur-telephone.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 15

---

## 1. Objectif

| Avant | Après |
|---|---|
| Le bouton Paramètres était dessiné différemment sur chaque écran, et **absent** d'« À faire » (oubli de la fiche 015) | **Un seul bouton**, le même partout (engrenage, rond de verre, 44 px, en haut à droite) : Accueil, À faire, Planning, Proches, Pulse. Les autres boutons d'en-tête (Sanctuaire, Recherche, Focus) prennent la même forme |
| Filtre « Tout · Avec alerte · Sans alerte » ; l'Accueil dit « Rappels » et « Tâches » | Filtre **« Tout · Rappels · Tâches »** : les mêmes mots partout (étude 15.1) |
| Formulaire « À faire » / « À faire · alerte » | En-tête **« Tâche »** (case à cocher) ou **« Rappel »** (cloche) ; bouton « Ajouter la tâche » / « Ajouter le rappel » ; l'explication de l'interrupteur dit la différence : *sans heure c'est une tâche, avec une heure c'est un rappel* |
| Un vieux rappel pouvait montrer une liste à cocher (il ressemblait à une tâche) | Les sous-tâches sont **seulement pour les tâches**, déclaré dans le **registre des types** (`KINDS_WITH_SUBTASKS`) ; les listes déjà écrites restent dans les données |
| Bouton de l'Accueil « + Rappel, tâche ou événement » | **« + À faire ou moment »** |

**Pour que rien ne casse demain** : le bouton est une brique (`HeaderIconButton`, `SettingsButton`) ; la règle des sous-tâches est une ligne du registre.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 016 est enregistrée | `git log --oneline -3` | `fix(ui): every main screen…` présent |
| Tout passe | `npx jest` | `Tests: 1947 passed` |

## 3. Hypothèses

- Les écrans gardent leurs anciens styles de bouton (`headerBtn`, `settingsBtn`) inutilisés : on ne les supprime pas dans cette fiche (sans danger).
- La « liste de contrôle » d'un rappel reste lisible dans une sauvegarde et revient si l'on change le registre.

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/components/ui/HeaderIconButton.tsx` | **créé** : `HeaderIconButton`, `SettingsButton` |
| `src/app/(tabs)/index.tsx`, `calendar.tsx`, `people.tsx`, `pulse.tsx` | modifiés : les briques |
| `src/features/todo/TodoTabScreen.tsx` | modifié : Focus et Paramètres |
| `src/features/create/TodoForm.tsx` | modifié : bouton selon l'alerte |
| `src/constants/item-kinds.ts` | modifié : `KINDS_WITH_SUBTASKS` |
| `src/app/reminders/[id].tsx` | modifié : plus de liste sur un rappel |
| `src/i18n/messages.ts`, `messages-rest-fr.ts`, `messages-rest-en.ts` | modifiés : les mots |
| `src/__tests__/coherence-017.test.ts` | **créé** : 3 tests |

## 5. Étapes

### Étape 1 — Les briques du bouton d'en-tête

Créer `src/components/ui/HeaderIconButton.tsx` :

<!-- bloc: button -->

```tsx
/**
 * The buttons at the top of the main screens (sheet 017): one shape everywhere, a round glass
 * button of 44 px. SettingsButton is the same gear, at the same place, on every tab.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export function HeaderIconButton({
  icon,
  label,
  onPress,
  color,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={{
        width: 44,
        height: 44,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.glass.control.backgroundColor,
        borderWidth: 1,
        borderColor: palette.glass.control.borderColor,
      }}
    >
      <Ionicons name={icon} size={20} color={color ?? palette.onSurface.variant} />
    </TouchableOpacity>
  );
}

/** The way to the settings, the same on every tab (study 001, 15.2). */
export function SettingsButton() {
  const t = useT();
  return (
    <HeaderIconButton icon="settings-outline" label={t('common.settings')} onPress={() => router.push('/settings')} testID="settings-button" />
  );
}
```

### Étape 2 — Les écrans prennent les briques

**Accueil** — `src/app/(tabs)/index.tsx` :

<!-- bloc: home-1-avant -->

```tsx
import { Ionicons } from '@expo/vector-icons';
```

<!-- bloc: home-1-apres -->

```tsx
import { Ionicons } from '@expo/vector-icons';
import { HeaderIconButton, SettingsButton } from '@/components/ui/HeaderIconButton';
```

<!-- bloc: home-2-avant -->

```tsx
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/sanctum')}
              accessibilityLabel={t('home.a11y.sanctum')}
            >
              <Ionicons name="lock-closed-outline" size={19} color={palette.onSurface.variant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/search')}
              accessibilityLabel={t('home.a11y.search')}
            >
              <Ionicons name="search-outline" size={20} color={palette.onSurface.variant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/settings')}
              accessibilityLabel={t('home.a11y.settings')}
            >
              <Ionicons name="settings-outline" size={20} color={palette.onSurface.variant} />
            </TouchableOpacity>
```

<!-- bloc: home-2-apres -->

```tsx
            <HeaderIconButton icon="lock-closed-outline" label={t('home.a11y.sanctum')} onPress={() => router.push('/sanctum')} />
            <HeaderIconButton icon="search-outline" label={t('home.a11y.search')} onPress={() => router.push('/search')} />
            <SettingsButton />
```

**Planning** — `src/app/(tabs)/calendar.tsx` :

<!-- bloc: cal-1-avant -->

```tsx
import { Ionicons } from '@expo/vector-icons';
```

<!-- bloc: cal-1-apres -->

```tsx
import { Ionicons } from '@expo/vector-icons';
import { SettingsButton } from '@/components/ui/HeaderIconButton';
```

<!-- bloc: cal-2-avant -->

```tsx
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
          >
            <Ionicons name="settings-outline" size={20} color={theme.onSurface.variant} />
          </TouchableOpacity>
```

<!-- bloc: cal-2-apres -->

```tsx
          <SettingsButton />
```

**Proches** — `src/app/(tabs)/people.tsx` :

<!-- bloc: people-1-avant -->

```tsx
import { Ionicons } from '@expo/vector-icons';
```

<!-- bloc: people-1-apres -->

```tsx
import { Ionicons } from '@expo/vector-icons';
import { SettingsButton } from '@/components/ui/HeaderIconButton';
```

<!-- bloc: people-2-avant -->

```tsx
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel={t('common.settings')}
        >
          <Ionicons name="settings-outline" size={20} color={theme.onSurface.variant} />
        </TouchableOpacity>
```

<!-- bloc: people-2-apres -->

```tsx
        <SettingsButton />
```

**Pulse** — `src/app/(tabs)/pulse.tsx` :

<!-- bloc: pulse-1-avant -->

```tsx
import { Ionicons } from '@expo/vector-icons';
```

<!-- bloc: pulse-1-apres -->

```tsx
import { Ionicons } from '@expo/vector-icons';
import { SettingsButton } from '@/components/ui/HeaderIconButton';
```

<!-- bloc: pulse-2-avant -->

```tsx
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('common.settings')}
        >
          <Ionicons name="settings-outline" size={20} color={theme.onSurface.variant} />
        </TouchableOpacity>
```

<!-- bloc: pulse-2-apres -->

```tsx
        <SettingsButton />
```

**À faire** — `src/features/todo/TodoTabScreen.tsx` (le bouton Paramètres oublié par la fiche 015) :

<!-- bloc: todo-1-avant -->

```tsx
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
```

<!-- bloc: todo-1-apres -->

```tsx
import { RefreshControl, ScrollView, Text, View } from 'react-native';
```

<!-- bloc: todo-2-avant -->

```tsx
import { PillTopBar } from '@/components/ui/PillTopBar';
```

<!-- bloc: todo-2-apres -->

```tsx
import { HeaderIconButton, SettingsButton } from '@/components/ui/HeaderIconButton';
import { PillTopBar } from '@/components/ui/PillTopBar';
```

<!-- bloc: todo-3-avant -->

```tsx
        <TouchableOpacity
          onPress={() => router.push('/focus' as never)}
          accessibilityRole="button"
          accessibilityLabel={t('todoTab.focusA11y')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="timer-outline" size={22} color={palette.tertiary.default} />
        </TouchableOpacity>
```

<!-- bloc: todo-3-apres -->

```tsx
        <HeaderIconButton
          icon="timer-outline"
          label={t('todoTab.focusA11y')}
          onPress={() => router.push('/focus' as never)}
          color={palette.tertiary.default}
        />
        <SettingsButton />
```

### Étape 3 — Le bouton du formulaire suit l'alerte

Dans `src/features/create/TodoForm.tsx` :

<!-- bloc: form-avant -->

```tsx
      saveLabel={t('itemForm.todo.submit')}
```

<!-- bloc: form-apres -->

```tsx
      saveLabel={t(alert ? 'itemForm.todo.submitAlert' : 'itemForm.todo.submit')}
```

### Étape 4 — Les sous-tâches, seulement pour les tâches

Dans `src/constants/item-kinds.ts`, juste avant le registre des types :

<!-- bloc: kinds-avant -->

```ts
export const ITEM_KIND_DEFINITIONS: Readonly<Record<ItemKind, ItemKindDefinition>> = {
```

<!-- bloc: kinds-apres -->

```ts
/**
 * The kinds that hold a list of subtasks (study 001, 15.2): the task only. A reminder differs
 * from a task by its hour alone; the lists written before stay in the data.
 */
export const KINDS_WITH_SUBTASKS: readonly ItemKind[] = ['task'];

export const ITEM_KIND_DEFINITIONS: Readonly<Record<ItemKind, ItemKindDefinition>> = {
```

Dans `src/app/reminders/[id].tsx` :

<!-- bloc: rem-1-avant -->

```tsx
import { Reminder, ReminderChecklistItem, Person, type Tag } from '@/domain/entities';
```

<!-- bloc: rem-1-apres -->

```tsx
import { Reminder, ReminderChecklistItem, Person, type Tag } from '@/domain/entities';
import { KINDS_WITH_SUBTASKS } from '@/constants/item-kinds';
```

<!-- bloc: rem-2-avant -->

```tsx
        {checklist.length > 0 && (
```

<!-- bloc: rem-2-apres -->

```tsx
        {KINDS_WITH_SUBTASKS.includes('reminder') && checklist.length > 0 && (
```

### Étape 5 — Les mots

Dans `src/i18n/messages.ts` (le bouton de l'Accueil) :

<!-- bloc: home-fr-avant -->

```ts
  'home.quickAddA11y': 'Ajouter un rappel, une tâche ou un événement',
  'home.quickAdd': '+ Rappel, tâche ou événement',
```

<!-- bloc: home-fr-apres -->

```ts
  'home.quickAddA11y': 'Ajouter une chose à faire ou un moment',
  'home.quickAdd': '+ À faire ou moment',
```

<!-- bloc: home-en-avant -->

```ts
  'home.quickAddA11y': 'Add a reminder, a task or an event',
  'home.quickAdd': '+ Reminder, task or event',
```

<!-- bloc: home-en-apres -->

```ts
  'home.quickAddA11y': 'Add a to-do or a moment',
  'home.quickAdd': '+ To-do or moment',
```

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-1-avant -->

```ts
  'itemForm.todo.title': "À faire",
  'itemForm.todo.subtitle': "Une chose à cocher",
  'itemForm.todo.titleAlert': "À faire · alerte",
```

<!-- bloc: fr-1-apres -->

```ts
  'itemForm.todo.title': "Tâche",
  'itemForm.todo.subtitle': "Sans heure, à cocher",
  'itemForm.todo.titleAlert': "Rappel",
```

<!-- bloc: fr-2-avant -->

```ts
  'itemForm.todo.submit': "Ajouter à mes choses à faire",
```

<!-- bloc: fr-2-apres -->

```ts
  'itemForm.todo.submit': "Ajouter la tâche",
  'itemForm.todo.submitAlert': "Ajouter le rappel",
```

<!-- bloc: fr-3-avant -->

```ts
  'itemForm.alertHint': "Sans alerte, elle attend dans ta liste. Avec, ton téléphone te prévient.",
```

<!-- bloc: fr-3-apres -->

```ts
  'itemForm.alertHint': "Sans heure, c'est une tâche. Avec une heure, c'est un rappel : ton téléphone sonne.",
```

<!-- bloc: fr-4-avant -->

```ts
  'todoTab.alert': "Avec alerte",
  'todoTab.noAlert': "Sans alerte",
```

<!-- bloc: fr-4-apres -->

```ts
  'todoTab.alert': "Rappels",
  'todoTab.noAlert': "Tâches",
```

<!-- bloc: fr-5-avant -->

```ts
  'todoTab.ringsA11y': "Avec alerte",
```

<!-- bloc: fr-5-apres -->

```ts
  'todoTab.ringsA11y': "Rappel",
```

<!-- bloc: fr-6-avant -->

```ts
  'todoTab.empty.alert': "Aucune alerte prévue",
  'todoTab.empty.noAlert': "Aucune chose sans alerte",
```

<!-- bloc: fr-6-apres -->

```ts
  'todoTab.empty.alert': "Aucun rappel prévu",
  'todoTab.empty.noAlert': "Aucune tâche",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-1-avant -->

```ts
  'itemForm.todo.title': "To do",
  'itemForm.todo.subtitle': "Something to tick off",
  'itemForm.todo.titleAlert': "To do · alert",
```

<!-- bloc: en-1-apres -->

```ts
  'itemForm.todo.title': "Task",
  'itemForm.todo.subtitle': "No set time, to tick off",
  'itemForm.todo.titleAlert': "Reminder",
```

<!-- bloc: en-2-avant -->

```ts
  'itemForm.todo.submit': "Add to my to-dos",
```

<!-- bloc: en-2-apres -->

```ts
  'itemForm.todo.submit': "Add the task",
  'itemForm.todo.submitAlert': "Add the reminder",
```

<!-- bloc: en-3-avant -->

```ts
  'itemForm.alertHint': "Without an alert it waits in your list. With one, your phone tells you.",
```

<!-- bloc: en-3-apres -->

```ts
  'itemForm.alertHint': "Without a time it is a task. With a time it is a reminder: your phone rings.",
```

<!-- bloc: en-4-avant -->

```ts
  'todoTab.alert': "With an alert",
  'todoTab.noAlert': "No alert",
```

<!-- bloc: en-4-apres -->

```ts
  'todoTab.alert': "Reminders",
  'todoTab.noAlert': "Tasks",
```

<!-- bloc: en-5-avant -->

```ts
  'todoTab.ringsA11y': "With an alert",
```

<!-- bloc: en-5-apres -->

```ts
  'todoTab.ringsA11y': "Reminder",
```

<!-- bloc: en-6-avant -->

```ts
  'todoTab.empty.alert': "No alert planned",
  'todoTab.empty.noAlert': "Nothing without an alert",
```

<!-- bloc: en-6-apres -->

```ts
  'todoTab.empty.alert': "No reminder planned",
  'todoTab.empty.noAlert': "No task",
```

### Étape 6 — Les tests

Créer `src/__tests__/coherence-017.test.ts` :

<!-- bloc: test -->

```ts
import { KINDS_WITH_SUBTASKS } from '../constants/item-kinds';
import { translate } from '../i18n/translate';

describe('one vocabulary everywhere (study 001, 15.1)', () => {
  it('names the filter of the To do tab with the words of the home screen', () => {
    expect([translate('fr', 'todoTab.all'), translate('fr', 'todoTab.alert'), translate('fr', 'todoTab.noAlert')]).toEqual([
      'Tout',
      'Rappels',
      'Tâches',
    ]);
    expect(translate('fr', 'home.reminders')).toBe('Rappels');
  });

  it('calls the form a task without a time and a reminder with one', () => {
    expect(translate('fr', 'itemForm.todo.title')).toBe('Tâche');
    expect(translate('fr', 'itemForm.todo.titleAlert')).toBe('Rappel');
    expect(translate('en', 'itemForm.todo.titleAlert')).toBe('Reminder');
  });

  it('keeps the subtasks for the tasks only', () => {
    expect(KINDS_WITH_SUBTASKS).toEqual(['task']);
  });
});
```

## 6. Test final

```bash
npx jest src/__tests__/coherence-017.test.ts
npx jest
npx tsc --noEmit
npx eslint src/components/ui/HeaderIconButton.tsx "src/app/(tabs)" src/features/todo src/features/create/TodoForm.tsx src/constants/item-kinds.ts "src/app/reminders/[id].tsx"
```

Attendu : `Tests: 3 passed` ; toute la suite passe ; `tsc` et `eslint` n'affichent rien. Sur le web : le même engrenage en haut à droite des 4 onglets ; filtre « Tout · Rappels · Tâches » ; formulaire « Tâche » puis « Rappel » avec l'alerte.

## 7. Dépannage

| Symptôme | Remède |
|---|---|
| `home.reminders` n'est pas « Rappels » | Vérifier la clé du titre de la carte Rappels de l'Accueil dans `messages.ts` et l'adapter dans le test |
| Un écran a encore son ancien bouton | Chercher `router.push('/settings')` dans `src/app/(tabs)` et le remplacer par `<SettingsButton />` |

## Compte rendu d'exécution (23 novembre 2026)

- Lu avant d'écrire : les boutons d'en-tête des 5 écrans (formes proches, mais chaque écran dessinait le sien ; Pulse avec d'autres couleurs ; « À faire » sans bouton Paramètres depuis la fiche 015) ; la liste d'un rappel ne s'affichait que pour les rappels qui en avaient déjà une.
- Étapes 1 à 6 appliquées **à partir des blocs de cette fiche** (`docs/tutoriel-suite/outils/appliquer-fiche-017.js`), du premier coup.
- Tests : `Tests: 3 passed` ; toute la suite `Test Suites: 92 passed`, `Tests: 1950 passed` ; `tsc` et `eslint` sans erreur.
- **Pas vérifié à l'écran** (le panneau du navigateur était caché) : à voir avec le prochain APK. Rien n'est encore enregistré dans git.

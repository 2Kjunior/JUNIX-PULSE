# FICHE OPÉRATOIRE N° 021 — La présentation et les bulles de Pulse, à jour

Projet : **Junix Pulse** · Date : 24 novembre 2026 · Suite de : [FICHE 020](FICHE-020-pulse-propose-une-habitude.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 15.1

---

## 1. Objectif

Les premiers écrans (la présentation) et les bulles de Pulse parlaient encore de l'ancienne app : « Trois concepts », « Événements », « Rhythm / IA au repos », « Touche le cercle ». Cette fiche les remet à jour **sans ajouter de page d'explication** (l'app doit se comprendre seule) :

| Où | Avant | Après |
|---|---|---|
| Bienvenue, 3 badges | Serein · Zéro surcharge / Privé · 100 % Hors-ligne / Rhythm · IA au repos | **Simple** · Une phrase suffit / **Privé** · Hors ligne, chiffré / **Pulse** · Propose, sans imposer |
| « Comment ça fonctionne » | 3 cartes (Rappels, Tâches, Événements) + encadré « À retenir » | **5 cartes** : Tâche, Rappel, Moment, Habitude, Objectif (icône, couleur, une phrase, un exemple) + une ligne « Pour ajouter, touchez + » |
| Pulse sur cet écran | montre 3 cartes | montre les **5 cartes**, une par une, dans le même ordre |
| Visite de l'accueil | « rappels, tâches, planning et proches », « un rappel, une tâche ou un événement » | « ce qui reste à faire, ton planning et tes proches », « une tâche, un rappel ou un moment. Une phrase dictée suffit. » |
| Astuce de l'onglet À faire | « Touche le cercle pour en terminer une » (il n'y a plus de cercle) | « Le filtre en haut les sépare ; glisse une carte pour plus d'actions. » |

**Pour que rien ne casse demain** : les cinq choses sont **une liste unique** (`src/constants/pulse-concepts.ts`) et **une carte partagée** (`ConceptCard`). Ajouter une sixième chose = une ligne dans la liste, ses textes FR/EN et une phrase de Pulse ; un test vérifie que les cartes et les phrases de Pulse restent du même nombre. Les couleurs de Tâche, Rappel et Moment viennent du registre des types (cyan, ambre) : les mêmes que partout ailleurs.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 020 est enregistrée | `git log --oneline -1` | `feat(pulse): Pulse suggests making a habit…` |
| Tout passe | `npx jest` | `Tests: 1981 passed` |

## 3. Hypothèses

- Les clés de texte des badges gardent leur nom (`welcome.badge.calm…`) : seul le texte change, aucun autre fichier n'est touché.
- La phrase de Pulse pour le Moment garde l'identifiant `DISCOVER_EVENT` (seul le texte change).
- Les anciennes clés `discover.reminders.*`, `discover.tasks.*`, `discover.events.*`, `discover.remember*` ne servaient qu'à cet écran : elles sont retirées.
- L'astuce de l'ancien onglet Rappels reste (la page existe encore, hors de la barre du bas).
- Sur un petit écran, les 5 cartes ne tiennent pas toutes : la liste défile, et Pulse montre le bas de la zone visible pour une carte cachée (au lieu de pointer hors de l'écran).

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/constants/pulse-concepts.ts` | **nouveau** : la liste des cinq choses |
| `src/features/onboarding/ConceptCard.tsx` | **nouveau** : la carte partagée |
| `src/app/(onboarding)/discover.tsx` | remplacé : 5 cartes + ligne « Pour ajouter » |
| `src/app/(onboarding)/index.tsx` | icône du premier badge (micro) |
| `src/i18n/messages.ts` | badges, sous-titre, ligne d'aide, textes des 5 choses (FR, EN) |
| `src/domain/rules/mascot-guide-rules.ts` | Pulse montre 5 cartes |
| `src/domain/rules/mascot-message-catalog.ts` et `-en.ts` | phrases de Pulse (présentation, visite, astuce À faire) |
| `src/domain/rules/__tests__/mascot-guide-rules.test.ts` | l'ordre des 5 phrases |
| `src/__tests__/coherence-021.test.ts` | **nouveau** : mêmes nombres, textes dans les deux langues |

## 5. Pas à pas

### Étape 1 — La liste des cinq choses

Une seule liste dit leur ordre, leur icône, leur couleur et où sont leurs textes.

Fichier `src/constants/pulse-concepts.ts` (nouveau) :

<!-- bloc: concepts -->

```ts
/**
 * The five things Junix Pulse keeps for you (study 001, 15.1): their order, icon, colour and the
 * keys of their texts. The onboarding shows them as cards (sheet 021); any other screen that
 * explains them reads this list, so a sixth one is added here once (with its texts in both
 * languages and a mascot sentence in DISCOVER_CARD_MESSAGES: a test keeps them in step).
 * Task, reminder and moment take the colour of their family, the same as on every other screen.
 */
import type { Ionicons } from '@expo/vector-icons';

import { itemFamilyColor, type ItemFamily } from '@/constants/item-kinds';
import type { ThemePalette } from '@/constants/palettes';
import type { MessageKey } from '@/i18n';

export const PULSE_CONCEPTS = ['task', 'reminder', 'moment', 'habit', 'goal'] as const;
export type PulseConcept = (typeof PULSE_CONCEPTS)[number];

export interface PulseConceptDefinition {
  icon: keyof typeof Ionicons.glyphMap;
  /** The family whose colour it takes, or the palette role it uses. */
  color: { family: ItemFamily } | { role: 'success' | 'tertiary' };
  titleKey: MessageKey;
  descKey: MessageKey;
  exampleKey: MessageKey;
}

export const PULSE_CONCEPT_DEFINITIONS: Readonly<Record<PulseConcept, PulseConceptDefinition>> = {
  task: {
    icon: 'checkbox-outline',
    color: { family: 'todo' },
    titleKey: 'concept.task.title',
    descKey: 'concept.task.desc',
    exampleKey: 'concept.task.example',
  },
  reminder: {
    icon: 'notifications-outline',
    color: { family: 'todo' },
    titleKey: 'concept.reminder.title',
    descKey: 'concept.reminder.desc',
    exampleKey: 'concept.reminder.example',
  },
  moment: {
    icon: 'calendar-outline',
    color: { family: 'moment' },
    titleKey: 'concept.moment.title',
    descKey: 'concept.moment.desc',
    exampleKey: 'concept.moment.example',
  },
  habit: {
    icon: 'repeat-outline',
    color: { role: 'success' },
    titleKey: 'concept.habit.title',
    descKey: 'concept.habit.desc',
    exampleKey: 'concept.habit.example',
  },
  goal: {
    icon: 'flag-outline',
    color: { role: 'tertiary' },
    titleKey: 'concept.goal.title',
    descKey: 'concept.goal.desc',
    exampleKey: 'concept.goal.example',
  },
};

/** The colour of one of the five things in the current theme. */
export function pulseConceptColor(palette: ThemePalette, concept: PulseConcept): string {
  const color = PULSE_CONCEPT_DEFINITIONS[concept].color;
  return 'family' in color ? itemFamilyColor(palette, color.family) : palette[color.role].default;
}
```

### Étape 2 — La carte partagée

Une carte = icône dans un rond coloré, nom, une phrase, un exemple dans la couleur. Le lecteur d'écran lit la carte d'un seul trait.

Fichier `src/features/onboarding/ConceptCard.tsx` (nouveau) :

<!-- bloc: card -->

```tsx
/**
 * One of the five things of Junix Pulse as a card: icon, name, one sentence and an example
 * (sheet 021). Shared by the onboarding and any screen that explains them; what it says lives
 * in constants/pulse-concepts.ts. Read as one item by a screen reader.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PULSE_CONCEPT_DEFINITIONS, pulseConceptColor, type PulseConcept } from '@/constants/pulse-concepts';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

export function ConceptCard({ concept }: { concept: PulseConcept }) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeConceptCardStyles);
  const definition = PULSE_CONCEPT_DEFINITIONS[concept];
  const color = pulseConceptColor(palette, concept);
  const title = t(definition.titleKey);
  const desc = t(definition.descKey);
  const example = t(definition.exampleKey);

  return (
    <View style={styles.card} accessible accessibilityLabel={`${title}. ${desc} ${example}`}>
      <View style={[styles.icon, { backgroundColor: color + '26' }]}>
        <Ionicons name={definition.icon} size={20} color={color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
        <Text style={[styles.example, { color }]}>{example}</Text>
      </View>
    </View>
  );
}

const makeConceptCardStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    body: {
      flex: 1,
    },
    title: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      marginBottom: 2,
    },
    desc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      lineHeight: 18,
      marginBottom: 2,
    },
    example: {
      ...Typography.labelSmall,
    },
  });
```

### Étape 3 — L'écran « Comment ça fonctionne »

Il affiche la liste avec la carte partagée. Les cartes sont mesurées pour que Pulse les montre ; une carte sous le bas de la zone visible est montrée au bas de cette zone.

Fichier `src/app/(onboarding)/discover.tsx` (remplacé en entier) :

<!-- bloc: discover -->

```tsx
/**
 * Onboarding, step 2: how it works. The five things of Junix Pulse (task, reminder, moment,
 * habit, goal) as shared cards, and one line on how to add (sheet 021). The list and its
 * texts live in constants/pulse-concepts.ts, so this screen never lists them by hand.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/ui/StepIndicator';
import type { ThemePalette } from '@/constants/palettes';
import { PULSE_CONCEPTS } from '@/constants/pulse-concepts';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { setDiscoverCardsY } from '@/features/mascot/onboarding-guide-state';
import { ConceptCard } from '@/features/onboarding/ConceptCard';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

/** How far above the bottom of the list the mascot points for a card that is scrolled out of view. */
const HIDDEN_CARD_MARGIN = 24;

export default function OnboardingDiscover() {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingDiscoverStyles);

  // The mascot guide points at each card: the screen tells it where they are. They are measured
  // once the screen has finished sliding in, otherwise the position would be the moving one.
  // A card below the visible part of the list is pointed at the bottom of that part.
  const listRef = useRef<React.ComponentRef<typeof View>>(null);
  const cardRefs = useRef<(React.ComponentRef<typeof View> | null)[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.measureInWindow((_lx, listY, _lw, listHeight) => {
        const bottom = listY + listHeight - HIDDEN_CARD_MARGIN;
        const centres: number[] = [];
        let measured = 0;
        cardRefs.current.forEach((card, index) => {
          card?.measureInWindow((_x, y, _w, h) => {
            centres[index] = Math.min(y + h / 2, bottom);
            measured += 1;
            if (measured === PULSE_CONCEPTS.length) setDiscoverCardsY(centres);
          });
        });
      });
    }, 600);
    return () => {
      clearTimeout(timer);
      setDiscoverCardsY([]);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <StepIndicator total={5} current={2} />
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/permissions')}
            style={styles.skipBtn}
            accessibilityLabel={t('discover.skipA11y')}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t('discover.title')}</Text>
        <Text style={styles.subtitle}>{t('discover.subtitle')}</Text>
      </View>

      <View ref={listRef} collapsable={false} style={styles.scroll}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {PULSE_CONCEPTS.map((concept, index) => (
            <View
              key={concept}
              ref={node => {
                cardRefs.current[index] = node;
              }}
              collapsable={false}
            >
              <ConceptCard concept={concept} />
            </View>
          ))}

          <View style={styles.hint}>
            <Ionicons name="mic-outline" size={18} color={palette.primary.default} />
            <Text style={styles.hintText}>{t('discover.hint')}</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('common.next')}
          onPress={() => router.push('/(onboarding)/personalize')}
          variant="primary"
          size="lg"
          style={styles.btnPrimary}
          testID="onboarding-discover-next"
        />
        <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" size="md" />
      </View>
    </View>
  );
}

const makeOnboardingDiscoverStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.xxl,
    },
    header: {
      marginBottom: Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    skipBtn: {
      paddingVertical: Spacing.xs,
      paddingLeft: Spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    skipText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.disabled,
    },
    title: {
      fontSize: 26,
      fontFamily: 'Outfit-Bold',
      color: theme.onSurface.primary,
      marginBottom: Spacing.xs,
      lineHeight: 34,
    },
    subtitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.variant,
    },
    scroll: {
      flex: 1,
    },
    list: {
      gap: Spacing.sm,
      paddingBottom: Spacing.lg,
    },
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: theme.surface.high,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginTop: Spacing.xs,
      borderWidth: 1,
      borderColor: theme.primary.default + '26',
    },
    hintText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      flex: 1,
    },
    actions: {
      gap: Spacing.sm,
      alignItems: 'center',
      paddingTop: Spacing.md,
    },
    btnPrimary: {
      width: '100%',
    },
  });
```

### Étape 4 — Les textes (FR et EN)

Dans `src/i18n/messages.ts` :

<!-- bloc: badges-fr-avant -->

```ts
  'welcome.badge.calm.title': 'Serein',
  'welcome.badge.calm.subtitle': 'Zéro surcharge',
  'welcome.badge.private.title': 'Privé',
  'welcome.badge.private.subtitle': '100\u00A0% Hors-ligne',
  'welcome.badge.rhythm.title': 'Rhythm',
  'welcome.badge.rhythm.subtitle': 'IA au repos',
```

devient :

<!-- bloc: badges-fr-apres -->

```ts
  'welcome.badge.calm.title': 'Simple',
  'welcome.badge.calm.subtitle': 'Une phrase suffit',
  'welcome.badge.private.title': 'Privé',
  'welcome.badge.private.subtitle': 'Hors ligne, chiffré',
  'welcome.badge.rhythm.title': 'Pulse',
  'welcome.badge.rhythm.subtitle': 'Propose, sans imposer',
```

Dans `src/i18n/messages.ts` :

<!-- bloc: badges-en-avant -->

```ts
  'welcome.badge.calm.title': 'Calm',
  'welcome.badge.calm.subtitle': 'No overload',
  'welcome.badge.private.title': 'Private',
  'welcome.badge.private.subtitle': '100% offline',
  'welcome.badge.rhythm.title': 'Rhythm',
  'welcome.badge.rhythm.subtitle': 'AI at rest',
```

devient :

<!-- bloc: badges-en-apres -->

```ts
  'welcome.badge.calm.title': 'Simple',
  'welcome.badge.calm.subtitle': 'One sentence is enough',
  'welcome.badge.private.title': 'Private',
  'welcome.badge.private.subtitle': 'Offline, encrypted',
  'welcome.badge.rhythm.title': 'Pulse',
  'welcome.badge.rhythm.subtitle': 'Suggests, never imposes',
```

Dans `src/i18n/messages.ts` :

<!-- bloc: discover-fr-avant -->

```ts
  'discover.subtitle': 'Trois concepts, une cohérence.',
  'discover.reminders.title': 'Rappels',
  'discover.reminders.desc':
    'Une chose à ne pas oublier à un moment précis. Peut être ponctuel ou récurrent, lié à une personne, avec un snooze si besoin.',
  'discover.reminders.example': 'Ex\u00A0: Appeler maman vendredi 18h',
  'discover.tasks.title': 'Tâches',
  'discover.tasks.desc':
    'Une intention d’agir, avec ou sans date. Les tâches sans date vivent dans votre Inbox jusqu’à ce que vous les planifiiez.',
  'discover.tasks.example': 'Ex\u00A0: Préparer la réunion de lundi',
  'discover.events.title': 'Événements',
  'discover.events.desc':
    'Un rendez-vous ou une occupation avec une durée. Peut inclure un lieu, des personnes et un temps de trajet.',
  'discover.events.example': 'Ex\u00A0: Réunion d’équipe 14h–15h30',
  'discover.remember': 'À retenir',
  'discover.rememberReminder': 'Un rappel déclenche une attention.',
  'discover.rememberTask': 'Une tâche attend d’être accomplie.',
  'discover.rememberEvent': 'Un événement occupe une période dans le temps.',
```

devient :

<!-- bloc: discover-fr-apres -->

```ts
  'discover.subtitle': 'Cinq choses, une seule logique.',
  'discover.hint': 'Pour ajouter, touchez +\u00A0: une phrase dictée peut tout remplir.',

  // ─── Les cinq choses de Junix Pulse (étude 001, 15.1), lues par constants/pulse-concepts ───
  'concept.task.title': 'Tâche',
  'concept.task.desc': 'Une chose à faire, sans heure. Elle se coche quand c’est fait.',
  'concept.task.example': 'Ex\u00A0: Préparer la réunion de lundi',
  'concept.reminder.title': 'Rappel',
  'concept.reminder.desc': 'Une chose à faire qui sonne à l’heure choisie, une fois ou souvent.',
  'concept.reminder.example': 'Ex\u00A0: Appeler maman vendredi à 18\u00A0h',
  'concept.moment.title': 'Moment',
  'concept.moment.desc': 'Un temps de votre planning, avec un début, une fin, parfois un lieu.',
  'concept.moment.example': 'Ex\u00A0: Réunion d’équipe de 14\u00A0h à 15\u00A0h\u00A030',
  'concept.habit.title': 'Habitude',
  'concept.habit.desc': 'Ce qui revient. Vous la cochez à chaque fois, elle peut sonner à son heure.',
  'concept.habit.example': 'Ex\u00A0: Boire de l’eau, chaque jour',
  'concept.goal.title': 'Objectif',
  'concept.goal.desc': 'Ce que vous voulez atteindre. Il avance avec ses tâches et ses habitudes.',
  'concept.goal.example': 'Ex\u00A0: Courir 10\u00A0km en mars',
```

Dans `src/i18n/messages.ts` :

<!-- bloc: discover-en-avant -->

```ts
  'discover.subtitle': 'Three ideas, one logic.',
  'discover.reminders.title': 'Reminders',
  'discover.reminders.desc':
    'Something not to forget at a precise moment. One-off or recurring, tied to a person, with a snooze if needed.',
  'discover.reminders.example': 'E.g. Call mom on Friday at 6 PM',
  'discover.tasks.title': 'Tasks',
  'discover.tasks.desc':
    'An intention to act, with or without a date. Tasks without a date stay in your Inbox until you plan them.',
  'discover.tasks.example': 'E.g. Prepare Monday’s meeting',
  'discover.events.title': 'Events',
  'discover.events.desc':
    'An appointment or an activity with a length. It can include a place, people and travel time.',
  'discover.events.example': 'E.g. Team meeting 2–3:30 PM',
  'discover.remember': 'Remember',
  'discover.rememberReminder': 'A reminder calls for your attention.',
  'discover.rememberTask': 'A task waits to be done.',
  'discover.rememberEvent': 'An event takes up a stretch of time.',
```

devient :

<!-- bloc: discover-en-apres -->

```ts
  'discover.subtitle': 'Five things, one logic.',
  'discover.hint': 'To add, tap +: one spoken sentence can fill it all.',

  'concept.task.title': 'Task',
  'concept.task.desc': 'Something to do, with no time. Tick it once it’s done.',
  'concept.task.example': 'E.g. Prepare Monday’s meeting',
  'concept.reminder.title': 'Reminder',
  'concept.reminder.desc': 'Something to do that rings at the chosen time, once or often.',
  'concept.reminder.example': 'E.g. Call mom on Friday at 6 PM',
  'concept.moment.title': 'Moment',
  'concept.moment.desc': 'A time in your schedule, with a start, an end, sometimes a place.',
  'concept.moment.example': 'E.g. Team meeting 2–3:30 PM',
  'concept.habit.title': 'Habit',
  'concept.habit.desc': 'What comes back. Tick it each time; it can ring at its time.',
  'concept.habit.example': 'E.g. Drink water, every day',
  'concept.goal.title': 'Goal',
  'concept.goal.desc': 'What you want to reach. It moves with its tasks and habits.',
  'concept.goal.example': 'E.g. Run 10 km in March',
```

Et l'icône du premier badge :

Dans `src/app/(onboarding)/index.tsx` :

<!-- bloc: icon-avant -->

```tsx
        <ValueBadge
          icon="moon-outline"
```

devient :

<!-- bloc: icon-apres -->

```tsx
        <ValueBadge
          icon="mic-outline"
```

### Étape 5 — Pulse montre les cinq cartes

Dans `src/domain/rules/mascot-guide-rules.ts` :

<!-- bloc: cards-avant -->

```ts
/** What the mascot says as it points at each of the three discovery cards, in order. */
export const DISCOVER_CARD_MESSAGES: readonly GuideMessage[] = [
  { id: 'DISCOVER_REMINDER', mood: 'calm' },
  { id: 'DISCOVER_TASK', mood: 'calm' },
  { id: 'DISCOVER_EVENT', mood: 'calm' },
];
```

devient :

<!-- bloc: cards-apres -->

```ts
/**
 * What the mascot says as it points at each discovery card, in order: the order of
 * PULSE_CONCEPTS (task, reminder, moment, habit, goal; sheet 021). A test keeps both the same length.
 */
export const DISCOVER_CARD_MESSAGES: readonly GuideMessage[] = [
  { id: 'DISCOVER_TASK', mood: 'calm' },
  { id: 'DISCOVER_REMINDER', mood: 'calm' },
  { id: 'DISCOVER_EVENT', mood: 'calm' },
  { id: 'DISCOVER_HABIT', mood: 'calm' },
  { id: 'DISCOVER_GOAL', mood: 'happy' },
];
```

Ses phrases, en français (tutoiement chaleureux, tutoiement sobre, vouvoiement chaleureux, vouvoiement sobre ; chaque fois sans prénom puis avec) :

Dans `src/domain/rules/mascot-message-catalog.ts` :

<!-- bloc: guide-fr-avant -->

```ts
  DISCOVER_INTRO: entry(
    ["Voici les trois choses que je suivrai pour toi.", "{name}, voici les trois choses que je suivrai pour toi."],
    ["Voici les trois éléments que je suivrai pour toi.", "{name}, voici les trois éléments que je suivrai pour toi."],
    ["Voici les trois choses que je suivrai pour vous.", "{name}, voici les trois choses que je suivrai pour vous."],
    ["Voici les trois éléments que je suivrai pour vous.", "{name}, voici les trois éléments que je suivrai pour vous."],
  ),
  DISCOVER_REMINDER: entry(
    ["Un rappel te prévient à l'heure.", "{name}, un rappel te prévient à l'heure."],
    ["Un rappel t'avertit à l'heure prévue.", "{name}, un rappel t'avertit à l'heure prévue."],
    ["Un rappel vous prévient à l'heure.", "{name}, un rappel vous prévient à l'heure."],
    ["Un rappel vous avertit à l'heure prévue.", "{name}, un rappel vous avertit à l'heure prévue."],
  ),
  DISCOVER_TASK: entry(
    ["Une tâche attend d'être faite.", "{name}, une tâche attend d'être faite."],
    ["Une tâche reste à accomplir.", "{name}, une tâche reste à accomplir."],
    ["Une tâche attend d'être faite.", "{name}, une tâche attend d'être faite."],
    ["Une tâche reste à accomplir.", "{name}, une tâche reste à accomplir."],
  ),
  DISCOVER_EVENT: entry(
    ["Un événement occupe un moment.", "{name}, un événement occupe un moment."],
    ["Un événement occupe un créneau.", "{name}, un événement occupe un créneau."],
    ["Un événement occupe un moment.", "{name}, un événement occupe un moment."],
    ["Un événement occupe un créneau.", "{name}, un événement occupe un créneau."],
  ),
```

devient :

<!-- bloc: guide-fr-apres -->

```ts
  DISCOVER_INTRO: entry(
    ["Voici les cinq choses que je garde pour toi.", "{name}, voici les cinq choses que je garde pour toi."],
    ["Voici les cinq éléments que je suis pour toi.", "{name}, voici les cinq éléments que je suis pour toi."],
    ["Voici les cinq choses que je garde pour vous.", "{name}, voici les cinq choses que je garde pour vous."],
    ["Voici les cinq éléments que je suis pour vous.", "{name}, voici les cinq éléments que je suis pour vous."],
  ),
  DISCOVER_TASK: entry(
    ["Une tâche se coche quand c'est fait.", "{name}, une tâche se coche quand c'est fait."],
    ["Une tâche se coche une fois faite.", "{name}, une tâche se coche une fois faite."],
    ["Une tâche se coche quand c'est fait.", "{name}, une tâche se coche quand c'est fait."],
    ["Une tâche se coche une fois faite.", "{name}, une tâche se coche une fois faite."],
  ),
  DISCOVER_REMINDER: entry(
    ["Un rappel sonne à l'heure que tu choisis.", "{name}, un rappel sonne à l'heure que tu choisis."],
    ["Un rappel sonne à l'heure choisie.", "{name}, un rappel sonne à l'heure choisie."],
    ["Un rappel sonne à l'heure que vous choisissez.", "{name}, un rappel sonne à l'heure que vous choisissez."],
    ["Un rappel sonne à l'heure choisie.", "{name}, un rappel sonne à l'heure choisie."],
  ),
  // The id stays DISCOVER_EVENT so nothing that names it breaks; the user now reads "moment"
  DISCOVER_EVENT: entry(
    ["Un moment prend sa place dans ton planning.", "{name}, un moment prend sa place dans ton planning."],
    ["Un moment occupe un créneau du planning.", "{name}, un moment occupe un créneau du planning."],
    ["Un moment prend sa place dans votre planning.", "{name}, un moment prend sa place dans votre planning."],
    ["Un moment occupe un créneau du planning.", "{name}, un moment occupe un créneau du planning."],
  ),
  DISCOVER_HABIT: entry(
    ["Une habitude revient : tu la coches à chaque fois.", "{name}, une habitude revient : tu la coches à chaque fois."],
    ["Une habitude se coche à chaque fois.", "{name}, une habitude se coche à chaque fois."],
    ["Une habitude revient : vous la cochez à chaque fois.", "{name}, une habitude revient : vous la cochez à chaque fois."],
    ["Une habitude se coche à chaque fois.", "{name}, une habitude se coche à chaque fois."],
  ),
  DISCOVER_GOAL: entry(
    ["Un objectif avance avec tes tâches et tes habitudes.", "{name}, un objectif avance avec tes tâches et tes habitudes."],
    ["Un objectif avance avec ses tâches et habitudes.", "{name}, un objectif avance avec ses tâches et habitudes."],
    ["Un objectif avance avec vos tâches et vos habitudes.", "{name}, un objectif avance avec vos tâches et vos habitudes."],
    ["Un objectif avance avec ses tâches et habitudes.", "{name}, un objectif avance avec ses tâches et habitudes."],
  ),
```

Et en anglais :

Dans `src/domain/rules/mascot-message-catalog-en.ts` :

<!-- bloc: guide-en-avant -->

```ts
  DISCOVER_INTRO: entry(
    ["Here are the three things I'll keep track of for you.", "{name}, here are the three things I'll keep track of for you."],
    ["Here are the three items I'll follow for you.", "{name}, here are the three items I'll follow for you."],
  ),
  DISCOVER_REMINDER: entry(
    ["A reminder alerts you on time.", "{name}, a reminder alerts you on time."],
    ["A reminder notifies you at the scheduled time.", "{name}, a reminder notifies you at the scheduled time."],
  ),
  DISCOVER_TASK: entry(
    ["A task is waiting to be done.", "{name}, a task is waiting to be done."],
    ["A task remains to be completed.", "{name}, a task remains to be completed."],
  ),
  DISCOVER_EVENT: entry(
    ["An event takes up a moment.", "{name}, an event takes up a moment."],
    ["An event takes up a time slot.", "{name}, an event takes up a time slot."],
  ),
```

devient :

<!-- bloc: guide-en-apres -->

```ts
  DISCOVER_INTRO: entry(
    ["Here are the five things I keep for you.", "{name}, here are the five things I keep for you."],
    ["Here are the five items I follow for you.", "{name}, here are the five items I follow for you."],
  ),
  DISCOVER_TASK: entry(
    ["A task is ticked once it's done.", "{name}, a task is ticked once it's done."],
    ["A task is ticked when done.", "{name}, a task is ticked when done."],
  ),
  DISCOVER_REMINDER: entry(
    ["A reminder rings at the time you choose.", "{name}, a reminder rings at the time you choose."],
    ["A reminder rings at the chosen time.", "{name}, a reminder rings at the chosen time."],
  ),
  // The id stays DISCOVER_EVENT; the user now reads "moment"
  DISCOVER_EVENT: entry(
    ["A moment takes its place in your schedule.", "{name}, a moment takes its place in your schedule."],
    ["A moment takes a slot in the schedule.", "{name}, a moment takes a slot in the schedule."],
  ),
  DISCOVER_HABIT: entry(
    ["A habit comes back: you tick it each time.", "{name}, a habit comes back: you tick it each time."],
    ["A habit is ticked each time.", "{name}, a habit is ticked each time."],
  ),
  DISCOVER_GOAL: entry(
    ["A goal moves forward with your tasks and habits.", "{name}, a goal moves forward with your tasks and habits."],
    ["A goal moves with its tasks and habits.", "{name}, a goal moves with its tasks and habits."],
  ),
```

### Étape 6 — La visite de l'accueil et l'astuce d'À faire

Dans `src/domain/rules/mascot-message-catalog.ts` :

<!-- bloc: tour-fr-avant -->

```ts
  TOUR_PILLARS: entry(
    ["Voici ton accueil : rappels, tâches, planning et proches d'un coup d'œil.", "{name}, voici ton accueil : rappels, tâches, planning et proches d'un coup d'œil."],
    ["Ton accueil réunit rappels, tâches, planning et proches.", "{name}, ton accueil réunit rappels, tâches, planning et proches."],
    ["Voici votre accueil : rappels, tâches, planning et proches d'un coup d'œil.", "{name}, voici votre accueil : rappels, tâches, planning et proches d'un coup d'œil."],
    ["Votre accueil réunit rappels, tâches, planning et proches.", "{name}, votre accueil réunit rappels, tâches, planning et proches."],
  ),
  TOUR_QUICK_ADD: entry(
    ["Ici, tu ajoutes un rappel, une tâche ou un événement en quelques secondes.", "{name}, ici, tu ajoutes un rappel, une tâche ou un événement en quelques secondes."],
    ["Ajoute ici un rappel, une tâche ou un événement.", "{name}, ajoute ici un rappel, une tâche ou un événement."],
    ["Ici, vous ajoutez un rappel, une tâche ou un événement en quelques secondes.", "{name}, ici, vous ajoutez un rappel, une tâche ou un événement en quelques secondes."],
    ["Ajoutez ici un rappel, une tâche ou un événement.", "{name}, ajoutez ici un rappel, une tâche ou un événement."],
  ),
```

devient :

<!-- bloc: tour-fr-apres -->

```ts
  TOUR_PILLARS: entry(
    ["Voici ton accueil : ce qui reste à faire, ton planning et tes proches d'un coup d'œil.", "{name}, voici ton accueil : ce qui reste à faire, ton planning et tes proches d'un coup d'œil."],
    ["Ton accueil réunit tes tâches, ton planning et tes proches.", "{name}, ton accueil réunit tes tâches, ton planning et tes proches."],
    ["Voici votre accueil : ce qui reste à faire, votre planning et vos proches d'un coup d'œil.", "{name}, voici votre accueil : ce qui reste à faire, votre planning et vos proches d'un coup d'œil."],
    ["Votre accueil réunit vos tâches, votre planning et vos proches.", "{name}, votre accueil réunit vos tâches, votre planning et vos proches."],
  ),
  TOUR_QUICK_ADD: entry(
    ["Ici, tu ajoutes une tâche, un rappel ou un moment. Une phrase dictée suffit.", "{name}, ici, tu ajoutes une tâche, un rappel ou un moment. Une phrase dictée suffit."],
    ["Ajoute ici une tâche, un rappel ou un moment, au clavier ou à la voix.", "{name}, ajoute ici une tâche, un rappel ou un moment, au clavier ou à la voix."],
    ["Ici, vous ajoutez une tâche, un rappel ou un moment. Une phrase dictée suffit.", "{name}, ici, vous ajoutez une tâche, un rappel ou un moment. Une phrase dictée suffit."],
    ["Ajoutez ici une tâche, un rappel ou un moment, au clavier ou à la voix.", "{name}, ajoutez ici une tâche, un rappel ou un moment, au clavier ou à la voix."],
  ),
```

Dans `src/domain/rules/mascot-message-catalog.ts` :

<!-- bloc: tip-fr-avant -->

```ts
  TIP_TASKS: entry(
    ["Ici, tes tâches. Touche le cercle pour en terminer une.", "{name}, ici, tes tâches. Touche le cercle pour en terminer une."],
    ["Touche le cercle d'une tâche pour la terminer.", "{name}, touche le cercle d'une tâche pour la terminer."],
    ["Ici, vos tâches. Touchez le cercle pour en terminer une.", "{name}, ici, vos tâches. Touchez le cercle pour en terminer une."],
    ["Touchez le cercle d'une tâche pour la terminer.", "{name}, touchez le cercle d'une tâche pour la terminer."],
  ),
```

devient :

<!-- bloc: tip-fr-apres -->

```ts
  TIP_TASKS: entry(
    ["Ici, tes tâches et tes rappels. Le filtre en haut les sépare ; glisse une carte pour plus d'actions.", "{name}, ici, tes tâches et tes rappels. Le filtre en haut les sépare ; glisse une carte pour plus d'actions."],
    ["Filtre en haut, et glisse une carte pour plus d'actions.", "{name}, filtre en haut, et glisse une carte pour plus d'actions."],
    ["Ici, vos tâches et vos rappels. Le filtre en haut les sépare ; faites glisser une carte pour plus d'actions.", "{name}, ici, vos tâches et vos rappels. Le filtre en haut les sépare ; faites glisser une carte pour plus d'actions."],
    ["Filtrez en haut, et faites glisser une carte pour plus d'actions.", "{name}, filtrez en haut, et faites glisser une carte pour plus d'actions."],
  ),
```

Dans `src/domain/rules/mascot-message-catalog-en.ts` :

<!-- bloc: tour-en-avant -->

```ts
  TOUR_PILLARS: entry(
    ["This is your home: reminders, tasks, schedule and loved ones at a glance.", "{name}, this is your home: reminders, tasks, schedule and loved ones at a glance."],
    ["Your home brings together reminders, tasks, schedule and loved ones.", "{name}, your home brings together reminders, tasks, schedule and loved ones."],
  ),
  TOUR_QUICK_ADD: entry(
    ["Here you add a reminder, a task or an event in a few seconds.", "{name}, here you add a reminder, a task or an event in a few seconds."],
    ["Add a reminder, a task or an event here.", "{name}, add a reminder, a task or an event here."],
  ),
```

devient :

<!-- bloc: tour-en-apres -->

```ts
  TOUR_PILLARS: entry(
    ["This is your home: what's left to do, your schedule and loved ones at a glance.", "{name}, this is your home: what's left to do, your schedule and loved ones at a glance."],
    ["Your home brings together your tasks, schedule and loved ones.", "{name}, your home brings together your tasks, schedule and loved ones."],
  ),
  TOUR_QUICK_ADD: entry(
    ["Here you add a task, a reminder or a moment. One spoken sentence is enough.", "{name}, here you add a task, a reminder or a moment. One spoken sentence is enough."],
    ["Add a task, a reminder or a moment here, by typing or by voice.", "{name}, add a task, a reminder or a moment here, by typing or by voice."],
  ),
```

Dans `src/domain/rules/mascot-message-catalog-en.ts` :

<!-- bloc: tip-en-avant -->

```ts
  TIP_TASKS: entry(
    ["Here are your tasks. Tap the circle to complete one.", "{name}, here are your tasks. Tap the circle to complete one."],
    ["Tap the circle of a task to complete it.", "{name}, tap the circle of a task to complete it."],
  ),
```

devient :

<!-- bloc: tip-en-apres -->

```ts
  TIP_TASKS: entry(
    ["Here are your tasks and reminders. The filter on top splits them; swipe a card for more actions.", "{name}, here are your tasks and reminders. The filter on top splits them; swipe a card for more actions."],
    ["Filter on top, and swipe a card for more actions.", "{name}, filter on top, and swipe a card for more actions."],
  ),
```

### Étape 7 — Les tests

L'ancien test de l'ordre des phrases :

Dans `src/domain/rules/__tests__/mascot-guide-rules.test.ts` :

<!-- bloc: guidetest-avant -->

```ts
    expect(DISCOVER_CARD_MESSAGES.map(item => item.id)).toEqual(['DISCOVER_REMINDER', 'DISCOVER_TASK', 'DISCOVER_EVENT']);
```

devient :

<!-- bloc: guidetest-apres -->

```ts
    expect(DISCOVER_CARD_MESSAGES.map(item => item.id)).toEqual([
      'DISCOVER_TASK',
      'DISCOVER_REMINDER',
      'DISCOVER_EVENT',
      'DISCOVER_HABIT',
      'DISCOVER_GOAL',
    ]);
```

Et le test du vouvoiement, qui citait l'ancienne phrase du rappel, dans `src/domain/rules/__tests__/mascot-message-rules.test.ts` :

<!-- bloc: msgtest-avant -->

```ts
      "Un rappel vous prévient à l'heure."
```

devient :

<!-- bloc: msgtest-apres -->

```ts
      "Un rappel sonne à l'heure que vous choisissez."
```

Le nouveau test de cohérence :

Fichier `src/__tests__/coherence-021.test.ts` (nouveau) :

<!-- bloc: test -->

```ts
import { PULSE_CONCEPTS, PULSE_CONCEPT_DEFINITIONS } from '../constants/pulse-concepts';
import { DISCOVER_CARD_MESSAGES } from '../domain/rules/mascot-guide-rules';
import { MASCOT_MESSAGES } from '../domain/rules/mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../domain/rules/mascot-message-catalog-en';
import { translate } from '../i18n/translate';

describe('the five things of Junix Pulse (study 001, 15.1; sheet 021)', () => {
  it('lists them in the order the user learns them', () => {
    expect(PULSE_CONCEPTS).toEqual(['task', 'reminder', 'moment', 'habit', 'goal']);
  });

  it('gives the mascot one sentence per card', () => {
    expect(DISCOVER_CARD_MESSAGES).toHaveLength(PULSE_CONCEPTS.length);
    for (const message of DISCOVER_CARD_MESSAGES) {
      expect(MASCOT_MESSAGES[message.id]).toBeDefined();
      expect(MASCOT_MESSAGES_EN[message.id]).toBeDefined();
    }
  });

  it('names them with the words used everywhere else, in both languages', () => {
    const titles = (lang: 'fr' | 'en') => PULSE_CONCEPTS.map(c => translate(lang, PULSE_CONCEPT_DEFINITIONS[c].titleKey));
    expect(titles('fr')).toEqual(['Tâche', 'Rappel', 'Moment', 'Habitude', 'Objectif']);
    expect(titles('en')).toEqual(['Task', 'Reminder', 'Moment', 'Habit', 'Goal']);
    for (const c of PULSE_CONCEPTS) {
      for (const lang of ['fr', 'en'] as const) {
        expect(translate(lang, PULSE_CONCEPT_DEFINITIONS[c].descKey).length).toBeGreaterThan(0);
        expect(translate(lang, PULSE_CONCEPT_DEFINITIONS[c].exampleKey).length).toBeGreaterThan(0);
      }
    }
  });

  it('no longer speaks of the circle of a task, nor of events, in its bubbles', () => {
    const texts = JSON.stringify([MASCOT_MESSAGES.TIP_TASKS, MASCOT_MESSAGES.TOUR_QUICK_ADD, MASCOT_MESSAGES.TOUR_PILLARS]);
    expect(texts).not.toMatch(/cercle|événement/);
  });
});
```

### Étape 8 — Appliquer d'un coup, puis vérifier

```powershell
node docs/fiches/outils/appliquer-fiche-021.js .
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
| `npx jest` | tout passe, dont `coherence-021` |
| `npx tsc --noEmit` | aucune erreur |
| Présentation (web, 360 px) | 5 cartes, la liste défile, Pulse montre chaque carte |
| Accueil, première visite | bulles avec « tâche, rappel ou moment » |

## 7. Retour en arrière

`git checkout -- <fichiers modifiés>` et supprimer les trois nouveaux fichiers. Aucune donnée n'est touchée (aucune migration).

## Compte rendu d'exécution (24 novembre 2026)

- Lu avant d'écrire : les cinq écrans de la présentation, l'endroit où Pulse montre les cartes (`OnboardingGuide`), la visite de l'accueil et les astuces de première visite, et les deux catalogues de phrases (FR à quatre formes, EN à deux).
- Étapes 1 à 7 appliquées **à partir des blocs de cette fiche** (`docs/fiches/outils/appliquer-fiche-021.js`) ; rejouées sur une copie propre du code enregistré : résultat identique fichier par fichier.
- **Écart corrigé** (étape 7) : un ancien test citait mot pour mot la phrase « Un rappel vous prévient à l'heure. » ; il cite maintenant la nouvelle.
- Choix : pas de page « Comprendre » dans les Paramètres (l'app doit se comprendre seule) ; la carte `ConceptCard` est prête si on en veut une plus tard.
- Tests : toute la suite `Test Suites: 96 passed`, `Tests: 2009 passed` ; `tsc` et `eslint` sans erreur.
- **Pas vérifié à l'écran** : le panneau du navigateur était masqué (« Policy check in progress »). À voir : les 5 cartes à 360 px, Pulse qui les montre une à une, les bulles de l'accueil et d'À faire. Rien n'est encore enregistré dans git.

# FICHE OPÉRATOIRE N° 014 — Formulaires ajustés après l'essai sur téléphone, et « Dicter tout » complet

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 013](FICHE-013-dicter-tout-et-y-aller.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 14 (retours après l'APK du 23 novembre)

---

## 1. Objectif

Corriger ce qui a été vu sur le téléphone, et rendre « Dicter tout » vraiment utile :

| Vu sur le téléphone | Après cette fiche |
|---|---|
| Le bouton **« Ajouter »** en haut des formulaires est poussé hors de l'écran par le sous-titre | Dans l'en-tête commun, le milieu ne prend que la place restante, les textes tiennent sur une ligne, les boutons gardent leur taille (pour **tous** les écrans qui utilisent cet en-tête) ; sous-titres raccourcis |
| « À faire » ouvre un petit menu « Sans alerte / Avec une alerte » qui mène au même formulaire | « À faire » ouvre **directement** le formulaire. L'en-tête **change** quand l'alerte est activée : cloche et « À faire · alerte » |
| Le micro des notes est aussi gros que celui du titre | Micro **plus petit** pour les notes (32 px, zone de toucher gardée à 44 px), dans les formulaires et la fiche d'une personne |
| « Dicter tout » remplit peu de choses, et le titre garde toute la phrase | Il comprend et **coche** aussi : la **priorité** (« priorité max », « très très urgent », « important », « pas pressé »…), l'**échéance** (« avant vendredi »), le **temps pour le faire** (« ça prend 45 min »), le **rappel à confirmer** (« insiste »), les **notes** (« note : … ») ; il **retire du titre** ce qu'il a compris ; une ligne **« Compris : … »** montre ce qui a été rempli. La personne vérifie, complète, puis touche Ajouter |
| Pas de voix dans l'ajout d'une **personne** | Micro sur le **nom** et sur les **notes** (pas de « Dicter tout » : un nom ou un numéro dicté se trompe trop souvent) |

Exemple : « Aller à la maison à 18h le lundi 30 novembre, priorité max » → titre **« Aller à la maison »**, jour lundi 30 novembre, **alerte à 18:00**, priorité **Urgente** ; « Compris : lun. 30 nov. · 18:00 · Urgente ».

**Toujours en vigueur** : la règle de la saisie rapide (`capture-rules.ts`) ne change pas ; tout ce qui est ajouté est une règle pure et testée ; les registres et briques restent la seule façon d'ajouter un champ.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 013 est appliquée | `src/domain/rules/form-dictation-rules.ts` existe | oui |
| Tout passe | `npx jest` | `Tests: 1936 passed` |

## 3. Matériel

Aucune bibliothèque ajoutée.

## 4. Hypothèses

- **Le titre nettoyé** retire seulement ce qui a été reconnu avec sûreté (heures, jours nommés, mois, « demain », priorité, durée, échéance, répétition, et pour un moment le lieu et la fin). Un nombre seul (« acheter 3 baguettes ») n'est jamais retiré. Si tout le titre disparaît, on garde la phrase entière.
- **L'échéance** n'est retenue que si les mots après « avant », « au plus tard », « à rendre », « deadline », « échéance », « due », « before », « by » forment une vraie date (« avant de partir » n'en est pas une).
- **« important »** devient la priorité **Haute** (« très urgent », « priorité max », « critique » : **Urgente** ; « pas urgent », « pas pressé », « priorité basse » : **Basse**).
- **Le temps pour le faire** dit (« ça prend 40 min ») prend le choix le plus proche (15, 30, 45 min, 1 h, 2 h).
- **Les notes** commencent après « note : », « remarque : », « précision : » ou « note que ».
- Une personne n'est reconnue que si son nom dit est celui de sa fiche ; sinon on l'ajoute à la main.

## 5. Carte de l'intervention

| Fichier | Action | Rôle |
|---|---|---|
| `src/styles/common/form-styles.ts` | modifié | En-tête : les boutons ne sont plus poussés |
| `src/components/create/form/FormBricks.tsx` | modifié | Titre et sous-titre sur une ligne, icône d'en-tête au choix, micro petit, ligne « Compris » |
| `src/components/create/NewItemChooser.tsx` | modifié | « À faire » ouvre directement le formulaire |
| `src/domain/rules/form-dictation-rules.ts` | remplacé | « Dicter tout » complet |
| `src/features/create/TodoForm.tsx` | modifié | En-tête selon l'alerte, micro des notes, tout ce que la phrase remplit |
| `src/features/create/MomentForm.tsx` | modifié | Micro des notes, tout ce que la phrase remplit |
| `src/app/people/new.tsx` | modifié | Micros du nom et des notes |
| `src/i18n/messages-rest-fr.ts` et `-en.ts` | modifiés | Sous-titres raccourcis, 5 textes nouveaux |
| `src/domain/rules/__tests__/form-dictation-rules.test.ts` | remplacé | 15 tests |
| `src/__tests__/new-item-chooser.test.tsx` | modifié | « À faire » ouvre le formulaire |

## 6. Sauvegarde

Aucune donnée touchée. Pour annuler avant le commit : `git restore` des fichiers modifiés.

## 7. Étapes

### Étape 1 — L'en-tête ne pousse plus les boutons

Dans `src/styles/common/form-styles.ts` :

<!-- bloc: styles-avant -->

```ts
    toolbarBtn: {
      minWidth: 70,
    },
    toolbarCenter: {
      alignItems: 'center',
    },
```

<!-- bloc: styles-apres -->

```ts
    toolbarBtn: {
      minWidth: 70,
      // The buttons keep their size: a long title never pushes them off a narrow screen
      flexShrink: 0,
    },
    toolbarCenter: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      paddingHorizontal: Spacing.xs,
    },
```

| Ligne | Effet |
|---|---|
| `flexShrink: 0` | « Annuler » et « Ajouter » ne rétrécissent jamais |
| `flex: 1, minWidth: 0` | Le milieu prend seulement la place qui reste, et peut couper son texte |

### Étape 2 — Les briques : en-tête, petit micro, « Compris »

Dans `src/components/create/form/FormBricks.tsx`, sept remplacements.

**2a.** Une icône d'en-tête au choix (la cloche quand une chose « À faire » a une alerte) :

<!-- bloc: shell-1-avant -->

```tsx
  family,
  title,
  subtitle,
  saveLabel,
```

<!-- bloc: shell-1-apres -->

```tsx
  family,
  icon,
  title,
  subtitle,
  saveLabel,
```

<!-- bloc: shell-2-avant -->

```tsx
  family: ItemFamily;
  title: string;
```

<!-- bloc: shell-2-apres -->

```tsx
  family: ItemFamily;
  /** Another icon than the family's, for instance a bell for a todo with an alert. */
  icon?: IconName;
  title: string;
```

**2b.** Titre et sous-titre sur une seule ligne :

<!-- bloc: shell-3-avant -->

```tsx
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={ITEM_FAMILY_DEFINITIONS[family].icon} size={18} color={accent} />
            <Text style={[formStyles.toolbarTitle, { color: accent }]}>{title}</Text>
          </View>
          <Text style={formStyles.toolbarSubtitle}>{subtitle}</Text>
```

<!-- bloc: shell-3-apres -->

```tsx
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <Ionicons name={icon ?? ITEM_FAMILY_DEFINITIONS[family].icon} size={18} color={accent} />
            <Text style={[formStyles.toolbarTitle, { color: accent, flexShrink: 1 }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Text style={formStyles.toolbarSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
```

**2c.** Un micro plus petit pour les notes :

<!-- bloc: mic-1-avant -->

```tsx
  inputStyle,
  testID,
  ...input
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  accent: string;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
```

<!-- bloc: mic-1-apres -->

```tsx
  inputStyle,
  testID,
  small = false,
  ...input
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  accent: string;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
  /** A smaller microphone, for a secondary field such as the notes. */
  small?: boolean;
}) {
```

<!-- bloc: mic-2-avant -->

```tsx
  const toggle = () => {
    if (!dictation.listening) {
      baseRef.current = value.trim();
```

<!-- bloc: mic-2-apres -->

```tsx
  // A smaller microphone for the notes than for the title; the touch area stays 44 px
  const micSize = small ? 32 : 44;

  const toggle = () => {
    if (!dictation.listening) {
      baseRef.current = value.trim();
```

<!-- bloc: mic-3-avant -->

```tsx
          testID={testID ? `${testID}-mic` : undefined}
          style={{
            width: 44,
            height: 44,
            borderRadius: Radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
```

<!-- bloc: mic-3-apres -->

```tsx
          testID={testID ? `${testID}-mic` : undefined}
          hitSlop={small ? 6 : 0}
          style={{
            width: micSize,
            height: micSize,
            borderRadius: Radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
```

<!-- bloc: mic-4-avant -->

```tsx
            name={dictation.listening ? 'stop' : 'mic-outline'}
            size={18}
```

<!-- bloc: mic-4-apres -->

```tsx
            name={dictation.listening ? 'stop' : 'mic-outline'}
            size={small ? 15 : 18}
```

**2d.** La ligne « Compris : … » sous « Dicter tout » :

<!-- bloc: all-1-avant -->

```tsx
  example,
  onSentence,
}: {
  accent: string;
  example: string;
  onSentence: (sentence: string) => void;
}) {
```

<!-- bloc: all-1-apres -->

```tsx
  example,
  onSentence,
  understood = [],
}: {
  accent: string;
  example: string;
  onSentence: (sentence: string) => void;
  /** What the sentence filled in, shown so the person checks it before adding (sheet 014). */
  understood?: readonly string[];
}) {
```

<!-- bloc: all-2-avant -->

```tsx
          <Text style={formStyles.fieldSub}>{heard ? t('itemForm.dictateHeard', { sentence: heard }) : example}</Text>
```

<!-- bloc: all-2-apres -->

```tsx
          <Text style={formStyles.fieldSub}>{heard ? t('itemForm.dictateHeard', { sentence: heard }) : example}</Text>
          {understood.length > 0 ? (
            <Text style={[formStyles.fieldSub, { color: accent, fontWeight: '600' }]} testID="form-understood">
              {t('itemForm.understood', { items: understood.join(' · ') })}
            </Text>
          ) : null}
```

### Étape 3 — « À faire » ouvre directement le formulaire

Dans `src/components/create/NewItemChooser.tsx`, six remplacements (dont trois suppressions).

<!-- bloc: ch-1-avant -->

```tsx
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
```

<!-- bloc: ch-1-apres -->

```tsx
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
```

<!-- bloc: ch-2-avant -->

```tsx
const TODO_WAYS: readonly { kind: 'task' | 'reminder'; icon: keyof typeof Ionicons.glyphMap; title: MessageKey; desc: MessageKey }[] = [
  { kind: 'task', icon: 'checkbox-outline', title: 'create.todo.noAlert', desc: 'create.todo.noAlertDesc' },
  { kind: 'reminder', icon: 'notifications-outline', title: 'create.todo.withAlert', desc: 'create.todo.withAlertDesc' },
];
```

<!-- bloc: ch-2-apres -->

```tsx
// One form per family (sheet 014): a todo chooses its alert in its form, no more in this sheet
```

<!-- bloc: ch-3-avant -->

```tsx
  // "Something to do" opened on its two ways
  const [todoOpen, setTodoOpen] = useState(false);

  const close = () => {
    setTodoOpen(false);
    onClose();
  };
```

<!-- bloc: ch-3-apres -->

```tsx
  const close = () => {
    onClose();
  };
```

<!-- bloc: ch-4-avant -->

```tsx
  const todoColor = itemFamilyColor(palette, 'todo');

```

<!-- bloc: ch-4-apres -->

```tsx

```

<!-- bloc: ch-5-avant -->

```tsx
                  style={[styles.choice, isTodo && todoOpen && styles.choiceOpen]}
                  onPress={() => (isTodo ? setTodoOpen(current => !current) : open('event'))}
                  accessibilityRole="button"
                  accessibilityState={isTodo ? { expanded: todoOpen } : undefined}
```

<!-- bloc: ch-5-apres -->

```tsx
                  style={styles.choice}
                  onPress={() => open(isTodo ? 'task' : 'event')}
                  accessibilityRole="button"
```

<!-- bloc: ch-6-avant -->

```tsx
                  {isTodo && (
                    <Ionicons name={todoOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.onSurface.variant} />
                  )}
                </TouchableOpacity>

                {/* Something to do: without or with an alert, each opening its form */}
                {isTodo && todoOpen && (
                  <View style={styles.ways}>
                    {TODO_WAYS.map(way => (
                      <TouchableOpacity
                        key={way.kind}
                        style={styles.way}
                        onPress={() => open(way.kind)}
                        accessibilityRole="button"
                        accessibilityLabel={`${t(way.title)}. ${t(way.desc)}`}
                        testID={`new-item-${way.kind}`}
                      >
                        <Ionicons name={way.icon} size={18} color={todoColor} />
                        <View style={styles.choiceText}>
                          <Text style={styles.wayTitle}>{t(way.title)}</Text>
                          <Text style={styles.rule}>{t(way.desc)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={palette.onSurface.variant} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
```

<!-- bloc: ch-6-apres -->

```tsx
                  <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
                </TouchableOpacity>
```

Et son test, dans `src/__tests__/new-item-chooser.test.tsx` :

<!-- bloc: cht-avant -->

```tsx
  it('opens something to do on its two ways, each opening its form', () => {
    const renderer = render({});
    press(renderer, 'new-item-todo');
    expect(texts(renderer)).toEqual(expect.arrayContaining(['Sans alerte', 'Avec une alerte à une heure']));
    press(renderer, 'new-item-reminder');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/reminders/new', params: {} });
  });
```

<!-- bloc: cht-apres -->

```tsx
  it('opens the To do form directly: its alert is chosen in the form (sheet 014)', () => {
    const renderer = render({});
    press(renderer, 'new-item-todo');
    expect(texts(renderer)).not.toContain('Sans alerte');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/tasks/new', params: {} });
  });
```

### Étape 4 — « Dicter tout » complet

Remplacer tout le contenu de `src/domain/rules/form-dictation-rules.ts` :

<!-- bloc: rules -->

```ts
/**
 * "Dictate everything" in the create forms (sheets 013 and 014): one spoken sentence fills and
 * touches every field it speaks of, and the title keeps only what was not understood.
 * It reuses the analysis of the quick capture (capture-rules, unchanged) for the day, the hour,
 * the person, the action and the repetition, and adds: the priority, the deadline, the time to
 * do it, "to confirm", the notes, and for a moment its place and its end. Pure: tested alone.
 */

import { format } from 'date-fns';

import type { ActionType, Person, ReminderPriority } from '../entities';
import { parseQuickCapture, type CaptureLanguage } from './capture-rules';

/** A moment without a said end lasts one hour. */
export const DEFAULT_MOMENT_MINUTES = 60;
/** The choices of "Time to do it" in the form; a said time takes the nearest one. */
export const TASK_LENGTH_CHOICES: readonly number[] = [15, 30, 45, 60, 120];

export type FormRecurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface TodoFill {
  title: string;
  /** 'YYYY-MM-DD', or undefined when no day is said and nothing rings. */
  day?: string;
  alert: boolean;
  time: { hour: number; minute: number };
  priority: ReminderPriority;
  actionType: ActionType;
  personId?: string;
  recurrence?: FormRecurrence;
  confirm: boolean;
  dueDate?: string;
  estimatedMinutes?: number;
  notes?: string;
}

export interface MomentFill {
  title: string;
  start: Date;
  end: Date;
  place?: string;
  personId?: string;
  notes?: string;
}

interface Found<T> {
  value: T;
  /** The words of the sentence it came from, taken out of the title. */
  raw: string;
}

/** The start and the end of a word, accented letters included (\b does not know them). */
const LEAD = String.raw`(?:^|[\s,;])`;
const SEP = String.raw`(?=$|[\s,.;!?])`;

/** An hour of the day is said: "18h", "8:30", "7pm", "ce soir", "dans 2 heures"… */
const CLOCK_TIME =
  /\b\d{1,2}\s*(?:h|:)\s*\d{0,2}(?!\d)|\b\d{1,2}\s*(?:am|pm)\b|(?:^|\s)(?:ce soir|ce matin|cet après-midi|à midi|a midi|tonight|this morning|this evening|at noon)(?=$|[\s,.;!?])|\b(?:dans|in)\s+\d+\s*(?:minutes?|mins?|heures?|h|hours?)\b/i;

/** Today is said, so "Today" is chosen even without an alert. */
const TODAY_WORDS = /(?:^|\s)(?:aujourd'hui|aujourd’hui|ce soir|ce matin|cet après-midi|today|tonight)(?=$|[\s,.;!?])/i;

/** Words that may belong to a date; a run of them is a date only with an anchor below. */
const DATE_WORD =
  /^(?:le|la|du|de|des|ce|cette|on|the|of|prochain|prochaine|matin|soir|après-midi|morning|evening|afternoon|demain|après-demain|apres-demain|aujourd'hui|aujourd’hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|semaine|mois|fin|\d{1,2}(?:er)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}|next|tomorrow|today|week|month|end|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}(?:st|nd|rd|th))$/i;
const DATE_ANCHOR =
  /^(?:demain|après-demain|apres-demain|aujourd'hui|aujourd’hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|semaine|mois|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow|today|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december)$/i;

/** Where a place stops: a day, an hour, a length, or a punctuation mark. */
const PLACE_END = String.raw`(?=\s+(?:demain|après-demain|apres-demain|aujourd|ce\s+(?:soir|matin|midi|week)|cet\s|cette\s|le\s+\d|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|à\s+\d|a\s+\d|vers\s+\d|de\s+\d|pendant|durant|jusqu|dans\s+\d|tous|toutes|tomorrow|today|tonight|this\s|on\s|at\s+\d|from\s+\d|for\s+\d|until|next|every|in\s+\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\s*[,.;!?]|\s*$)`;

const PLACE_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`\b(chez\s+[^,.;!?]+?)` + PLACE_END, 'i'),
  new RegExp(String.raw`(?:^|\s)(?:à|a)\s+((?:la\s+|l['’])[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
  new RegExp(String.raw`(?:^|\s)((?:au|aux)\s+[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
  new RegExp(String.raw`\bat\s+(?!noon\b|midnight\b|night\b)((?:the\s+)?[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
];

/** Checked in this order: "pas urgent" is low before "urgent" is urgent, "assez urgent" is high. */
const PRIORITY_PATTERNS: readonly [ReminderPriority, RegExp][] = [
  ['LOW', new RegExp(LEAD + String.raw`(pas\s+(?:très\s+|trop\s+|si\s+)?(?:urgente?|pressée?|importante?)|priorité\s+(?:basse|faible)|(?:basse|faible)\s+priorité|quand\s+j['’]ai\s+le\s+temps|not\s+urgent|low\s+priority|no\s+rush)` + SEP, 'i')],
  ['HIGH', new RegExp(LEAD + String.raw`(assez\s+urgente?|priorité\s+(?:haute|élevée)|haute\s+priorité|high\s+priority)` + SEP, 'i')],
  ['URGENT', new RegExp(LEAD + String.raw`((?:(?:situation|c['’]est)\s+)?(?:(?:très|tres)\s+)*urgente?|urgentissime|critique|priorité\s+(?:max(?:imale|imum)?|absolue)|(?:top|max(?:imum)?)\s+priority|very\s+urgent|asap)` + SEP, 'i')],
  ['HIGH', new RegExp(LEAD + String.raw`(importante?)` + SEP, 'i')],
];

const NOTES = new RegExp(LEAD + String.raw`(?:note|notes|remarque|précision|precision)(?:\s*:\s*|\s+que\s+)(.+)$`, 'i');
const DEADLINE_KEY = new RegExp(LEAD + String.raw`(?:au\s+plus\s+tard|avant|deadline|échéance|echeance|due|before|by)\s+`, 'gi');
const TASK_LENGTH = new RegExp(
  LEAD +
    String.raw`(?:(?:ça|ca|cela)\s+)?(?:me\s+)?(?:prend(?:ra)?|durée(?:\s+de)?|duree(?:\s+de)?|it\s+takes|takes)\s+(?:environ\s+|about\s+|around\s+)?(\d+)\s*(h|heures?|hours?|min|mins|minutes?)\s*(\d{2})?` +
    SEP,
  'i'
);
const CONFIRM = new RegExp(
  LEAD + String.raw`(à\s+confirmer|a\s+confirmer|insiste|insister|relance(?:-moi)?|jusqu['’]à\s+ce\s+que\s+je\s+confirme|keep\s+reminding(?:\s+me)?|until\s+i\s+confirm|insist)` + SEP,
  'i'
);
const RECURRENCE_WORDS = new RegExp(LEAD + String.raw`(?:tous\s+les|toutes\s+les|chaque|every)\s+\S+(?:\s+(?:matins?|soirs?|jours?|semaines?|mois))?` + SEP, 'gi');
const LENGTH_WORDS = /\b(?:pendant|durant|for)\s+\d+\s*(?:h|heures?|hours?|hrs?|min|mins|minutes?)\s*\d{0,2}/gi;
const UNTIL_WORDS = /\b(?:jusqu['’]?\s*(?:à|a)|until)\s+\d{1,2}(?:\s*(?:h|:)\s*\d{0,2}|\s*(?:am|pm))?/gi;
const TIME_WORDS: readonly RegExp[] = [
  /(?:^|\s)(?:(?:à|a|vers|at|around)\s+)?\d{1,2}\s*(?:h|:)\s*\d{0,2}(?!\d)/gi,
  /(?:^|\s)(?:at\s+)?\d{1,2}\s*(?:am|pm)\b/gi,
  /(?:^|\s)(?:ce\s+soir|ce\s+matin|cet\s+après-midi|à\s+midi|a\s+midi|tonight|this\s+morning|this\s+evening|at\s+noon)(?=$|[\s,.;!?])/gi,
  /(?:^|\s)(?:dans|in)\s+\d+\s*(?:minutes?|mins?|heures?|h|hours?|jours?|days?|semaines?|weeks?)(?=$|[\s,.;!?])/gi,
];
const TRAILING_LINKS = /[\s,;:–-]+(?:le|la|les|à|a|au|aux|et|de|du|pour|on|at|the|and|in|of|avec)?[\s,;:.!?–-]*$/i;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function findPlace(sentence: string): Found<string> | undefined {
  for (const pattern of PLACE_PATTERNS) {
    const match = pattern.exec(sentence);
    const place = match?.[1]?.trim();
    if (match && place) return { value: capitalize(place), raw: match[0] };
  }
  return undefined;
}

/** The place said in a sentence, with a capital letter, or undefined. */
export function placeOf(sentence: string): string | undefined {
  return findPlace(sentence)?.value;
}

/** The priority said, or undefined: the form then keeps Normal. */
export function priorityOf(sentence: string): Found<ReminderPriority> | undefined {
  for (const [value, pattern] of PRIORITY_PATTERNS) {
    const match = pattern.exec(sentence);
    if (match) return { value, raw: match[0] };
  }
  return undefined;
}

function notesOf(sentence: string): Found<string> | undefined {
  const match = NOTES.exec(sentence);
  const notes = match?.[1]?.trim();
  return match && notes ? { value: capitalize(notes), raw: match[0] } : undefined;
}

function taskLengthOf(sentence: string): Found<number> | undefined {
  const match = TASK_LENGTH.exec(sentence);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const minutes = match[2].toLowerCase().startsWith('h') ? amount * 60 + Number(match[3] ?? 0) : amount;
  if (minutes <= 0) return undefined;
  const nearest = TASK_LENGTH_CHOICES.reduce((best, choice) => (Math.abs(choice - minutes) < Math.abs(best - minutes) ? choice : best));
  return { value: nearest, raw: match[0] };
}

function confirmOf(sentence: string): Found<boolean> | undefined {
  const match = CONFIRM.exec(sentence);
  return match ? { value: true, raw: match[0] } : undefined;
}

/** "avant vendredi", "au plus tard le 12 décembre", "due tomorrow": a deadline, when what follows is a date. */
function deadlineOf(sentence: string, now: Date, language: CaptureLanguage): Found<string> | undefined {
  for (const match of sentence.matchAll(DEADLINE_KEY)) {
    const rest = sentence.slice((match.index ?? 0) + match[0].length).split(/\s+/);
    const taken: string[] = [];
    for (const word of rest) {
      const bare = word.replace(/[,.;!?]+$/, '');
      if (!DATE_WORD.test(bare)) break;
      taken.push(word);
      if (bare !== word) break;
    }
    if (!taken.some(word => DATE_ANCHOR.test(word.replace(/[,.;!?]+$/, '')))) continue;
    const phrase = taken.join(' ').replace(/[,.;!?]+$/, '');
    const due = format(parseQuickCapture(phrase, [], now, language).targetDate, 'yyyy-MM-dd');
    if (due !== format(now, 'yyyy-MM-dd') || TODAY_WORDS.test(phrase)) {
      return { value: due, raw: match[0] + taken.join(' ') };
    }
  }
  return undefined;
}

/** The end of a moment: a length or an end hour said, else one hour after the start. */
export function endOf(sentence: string, start: Date): Date {
  const lower = sentence.toLowerCase();
  const length = /\b(?:pendant|durant|for)\s+(\d+)\s*(h|heures?|hours?|hrs?|min|mins|minutes?)\s*(\d{1,2})?\b/.exec(lower);
  if (length) {
    const amount = Number(length[1]);
    const minutes = length[2].startsWith('h') ? amount * 60 + Number(length[3] ?? 0) : amount;
    if (minutes > 0) return new Date(start.getTime() + minutes * 60000);
  }
  const untilFr = /\bjusqu['’]?\s*(?:à|a)\s+(\d{1,2})\s*(?:h|:)\s*(\d{2})?/.exec(lower);
  const untilEn = /\buntil\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/.exec(lower);
  const until = untilFr ?? untilEn;
  if (until) {
    let hour = Number(until[1]);
    if (untilEn && until === untilEn && until[3] === 'pm' && hour < 12) hour += 12;
    const end = new Date(start);
    end.setHours(hour, Number(until[2] ?? 0), 0, 0);
    if (end > start) return end;
  }
  return new Date(start.getTime() + DEFAULT_MOMENT_MINUTES * 60000);
}

/** Takes out the runs of date words that hold a real date ("le lundi 30 novembre", "demain"). */
function withoutDates(text: string): string {
  const kept: string[] = [];
  let run: string[] = [];
  let anchored = false;
  const flush = () => {
    if (!anchored) kept.push(...run);
    run = [];
    anchored = false;
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const bare = word.replace(/[,.;!?]+$/, '');
    if (DATE_WORD.test(bare)) {
      run.push(word);
      if (DATE_ANCHOR.test(bare)) anchored = true;
      if (bare !== word) flush();
    } else {
      flush();
      kept.push(word);
    }
  }
  flush();
  return kept.join(' ');
}

/**
 * A day is really said: a day or month name, "demain", "le 12", "dans 3 jours", today. The quick capture
 * proposes tomorrow on its own once 9:00 has passed: that is not a day said.
 */
function saysADay(text: string): boolean {
  if (TODAY_WORDS.test(text) || /(?:^|\s)(?:le|on|the)\s+\d{1,2}(?:er|st|nd|rd|th)?(?=$|[\s,.;!?])/i.test(text)) return true;
  if (/(?:^|\s)(?:dans|in)\s+\d+\s*(?:jours?|days?|semaines?|weeks?|mois|months?)(?=$|[\s,.;!?])/i.test(text)) return true;
  return text.split(/\s+/).some(word => DATE_ANCHOR.test(word.replace(/[,.;!?]+$/, '')));
}

/** The title: the sentence without what was understood; the whole sentence if nothing is left. */
export function titleWithout(sentence: string, understood: readonly string[], extra: readonly RegExp[] = []): string {
  let text = ` ${sentence} `;
  for (const raw of understood) if (raw) text = text.replace(raw, ' ');
  for (const pattern of [RECURRENCE_WORDS, ...extra, ...TIME_WORDS]) text = text.replace(pattern, ' ');
  text = withoutDates(text.replace(/\s+/g, ' '));
  let previous = '';
  while (previous !== text) {
    previous = text;
    text = text.replace(TRAILING_LINKS, '').replace(/^[\s,;:.!?–-]+/, '');
  }
  return text ? capitalize(text) : sentence.trim();
}

function formRecurrence(type?: string): FormRecurrence | undefined {
  return type === 'DAILY' || type === 'WEEKLY' || type === 'MONTHLY' ? type : undefined;
}

function clockOf(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

function without(sentence: string, parts: readonly (Found<unknown> | undefined)[]): string {
  return parts.reduce((text, part) => (part ? text.replace(part.raw, ' ') : text), sentence);
}

export function todoFromSentence(
  sentence: string,
  persons: readonly Person[],
  now: Date,
  language: CaptureLanguage = 'fr'
): TodoFill {
  const notes = notesOf(sentence);
  const deadline = deadlineOf(without(sentence, [notes]), now, language);
  const length = taskLengthOf(sentence);
  // The day, the hour and the repetition are read without the deadline, the length and the notes
  const rest = without(sentence, [notes, deadline, length]);
  const parsed = parseQuickCapture(rest, [...persons], now, language);
  const recurrence = formRecurrence(parsed.recurrence?.type);
  const alert = CLOCK_TIME.test(rest) || Boolean(recurrence);
  const day = format(parsed.targetDate, 'yyyy-MM-dd');
  const daySaid = saysADay(rest);
  const priority = priorityOf(rest);
  const confirm = confirmOf(rest);
  return {
    title: titleWithout(sentence, [notes, deadline, length, priority, confirm].map(part => part?.raw ?? '')),
    day: alert || daySaid ? day : undefined,
    alert,
    time: clockOf(parsed.targetTime),
    priority: priority?.value ?? 'NORMAL',
    actionType: parsed.actionType,
    personId: parsed.targetPerson?.id,
    recurrence,
    confirm: Boolean(confirm),
    dueDate: deadline?.value,
    estimatedMinutes: length?.value,
    notes: notes?.value,
  };
}

export function momentFromSentence(
  sentence: string,
  persons: readonly Person[],
  now: Date,
  language: CaptureLanguage = 'fr'
): MomentFill {
  const notes = notesOf(sentence);
  const place = findPlace(without(sentence, [notes]));
  // The start is read without the length ("pendant 2h" is not 02:00) and without the notes
  const rest = without(sentence, [notes]).replace(LENGTH_WORDS, ' ').replace(UNTIL_WORDS, ' ');
  const parsed = parseQuickCapture(rest, [...persons], now, language);
  const { hour, minute } = clockOf(parsed.targetTime);
  const start = new Date(parsed.targetDate);
  start.setHours(hour, minute, 0, 0);
  return {
    title: titleWithout(sentence, [notes?.raw ?? '', place?.raw ?? '', priorityOf(sentence)?.raw ?? ''], [LENGTH_WORDS, UNTIL_WORDS]),
    start,
    end: endOf(without(sentence, [notes]), start),
    place: place?.value,
    personId: parsed.targetPerson?.id,
    notes: notes?.value,
  };
}
```

| Passage | Ce qu'il fait |
|---|---|
| `LEAD`, `SEP` | Le début et la fin d'un mot **avec les accents** (« pressé », « élevée ») : le `\b` des motifs ne connaît pas les lettres accentuées |
| `DATE_WORD`, `DATE_ANCHOR` | Une suite de mots de date n'est une date que si elle contient un « ancrage » (un jour, un mois, « demain »…) : « le dossier » reste, « le lundi 30 novembre » part ; un nombre seul n'est jamais retiré |
| `PRIORITY_PATTERNS` | L'ordre compte : « pas urgent » (Basse) avant « urgent » (Urgente), « assez urgent » (Haute) avant « urgent » |
| `deadlineOf` | « avant » suivi d'une vraie date seulement ; la date est lue par la règle de la saisie rapide |
| `taskLengthOf` | « ça prend 40 min » → 45 min (le choix le plus proche du formulaire) |
| `titleWithout` | Retire du titre ce qui a été compris, les heures, les répétitions et les dates, puis les petits mots qui restent au bout (« le », « à », « et »…) |
| `rest` | Le jour et l'heure sont lus **sans** l'échéance, la durée et les notes (« ça prend 2h » n'est pas 2 heures du matin) |

### Étape 5 — Les formulaires remplissent tout, et le montrent

Dans `src/features/create/TodoForm.tsx`, quatre remplacements.

<!-- bloc: todo-1-avant -->

```tsx
  // "Dictate everything" (sheet 013): the sentence fills the fields it speaks of
  const applySentence = (sentence: string) => {
    const fill = todoFromSentence(sentence, persons, new Date(), language);
    setTitle(fill.title);
    if (fill.title) setTitleError('');
    setDay(fill.day);
    setAlert(fill.alert);
    setAlertTime(fill.time);
    setPriority(fill.priority);
    setActionType(fill.actionType);
    setRepeat(Boolean(fill.recurrence));
    if (fill.recurrence) setRecurrence(fill.recurrence);
    const personId = fill.personId;
    if (personId) setPersonIds(ids => (ids.includes(personId) ? ids : [personId, ...ids]));
  };
```

<!-- bloc: todo-1-apres -->

```tsx
  // "Dictate everything" (sheets 013 and 014): the sentence fills and touches every field it
  // speaks of; "Compris" lists them so the person checks before adding
  const [understood, setUnderstood] = useState<string[]>([]);
  const applySentence = (sentence: string) => {
    const fill = todoFromSentence(sentence, persons, new Date(), language);
    setTitle(fill.title);
    if (fill.title) setTitleError('');
    setDay(fill.day);
    setAlert(fill.alert);
    setAlertTime(fill.time);
    setPriority(fill.priority);
    setActionType(fill.actionType);
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
```

<!-- bloc: todo-2-avant -->

```tsx
      <DictateAll accent={accent} example={t('itemForm.dictateTodoExample')} onSentence={applySentence} />
```

<!-- bloc: todo-2-apres -->

```tsx
      <DictateAll
        accent={accent}
        example={t('itemForm.dictateTodoExample')}
        onSentence={applySentence}
        understood={understood}
      />
```

<!-- bloc: todo-3-avant -->

```tsx
      title={t('itemForm.todo.title')}
      subtitle={t('itemForm.todo.subtitle')}
```

<!-- bloc: todo-3-apres -->

```tsx
      // The header says whether it will ring (sheet 014)
      icon={alert ? 'notifications' : undefined}
      title={t(alert ? 'itemForm.todo.titleAlert' : 'itemForm.todo.title')}
      subtitle={t(alert ? 'itemForm.todo.subtitleAlert' : 'itemForm.todo.subtitle')}
```

<!-- bloc: todo-4-avant -->

```tsx
              testID="todo-notes"
```

<!-- bloc: todo-4-apres -->

```tsx
              testID="todo-notes"
              small
```

> `durationLabel` et `pad` existent déjà plus haut dans le fichier ; `applySentence` est placée après eux. Vérifier que `durationLabel` est bien déclarée **avant** `applySentence` (sinon la déplacer au-dessus).

Dans `src/features/create/MomentForm.tsx`, trois remplacements.

<!-- bloc: moment-1-avant -->

```tsx
  // "Dictate everything" (sheet 013): title, start, end, place and person from one sentence
  const applySentence = (sentence: string) => {
    const fill = momentFromSentence(sentence, persons, new Date(), language);
    setTitle(fill.title);
    if (fill.title) setTitleError('');
    setStartAt(fill.start);
    setEndAt(fill.end);
    if (fill.place) setLocation(fill.place);
    const personId = fill.personId;
    if (personId) setPersonIds(ids => (ids.includes(personId) ? ids : [personId, ...ids]));
  };
```

<!-- bloc: moment-1-apres -->

```tsx
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
```

<!-- bloc: moment-2-avant -->

```tsx
      <DictateAll accent={accent} example={t('itemForm.dictateMomentExample')} onSentence={applySentence} />
```

<!-- bloc: moment-2-apres -->

```tsx
      <DictateAll
        accent={accent}
        example={t('itemForm.dictateMomentExample')}
        onSentence={applySentence}
        understood={understood}
      />
```

<!-- bloc: moment-3-avant -->

```tsx
              testID="moment-notes"
```

<!-- bloc: moment-3-apres -->

```tsx
              testID="moment-notes"
              small
```

### Étape 6 — La voix dans l'ajout d'une personne

Dans `src/app/people/new.tsx`, trois remplacements.

<!-- bloc: person-1-avant -->

```tsx
import { Button } from '@/components/ui/Button';
```

<!-- bloc: person-1-apres -->

```tsx
import { Button } from '@/components/ui/Button';
import { DictatedInput } from '@/components/create/form/FormBricks';
```

<!-- bloc: person-2-avant -->

```tsx
          <TextInput
            style={[styles.input, !!nameError && styles.inputError]}
            value={displayName}
            onChangeText={t => {
              setDisplayName(t);
              if (nameError) setNameError('');
            }}
            placeholder={t('personNew.namePlaceholder')}
            placeholderTextColor={palette.onSurface.disabled}
            autoFocus
          />
```

<!-- bloc: person-2-apres -->

```tsx
          <DictatedInput
            inputStyle={[styles.input, !!nameError && styles.inputError]}
            value={displayName}
            onChangeText={text => {
              setDisplayName(text);
              if (nameError) setNameError('');
            }}
            accent={palette.primary.default}
            placeholder={t('personNew.namePlaceholder')}
            autoFocus
            testID="person-name"
          />
```

<!-- bloc: person-3-avant -->

```tsx
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('personNew.notesPlaceholder')}
            placeholderTextColor={palette.onSurface.disabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
```

<!-- bloc: person-3-apres -->

```tsx
          <DictatedInput
            inputStyle={[styles.input, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            accent={palette.primary.default}
            placeholder={t('personNew.notesPlaceholder')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            small
            testID="person-notes"
          />
```

### Étape 7 — Les textes

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-1-avant -->

```ts
  'itemForm.todo.subtitle': "Une chose à cocher, avec ou sans alerte",
```

<!-- bloc: fr-1-apres -->

```ts
  'itemForm.todo.subtitle': "Une chose à cocher",
  'itemForm.todo.titleAlert': "À faire · alerte",
  'itemForm.todo.subtitleAlert': "Ton téléphone te préviendra",
```

<!-- bloc: fr-2-avant -->

```ts
  'itemForm.moment.subtitle': "Un rendez-vous ou un événement, avec un début et une fin",
```

<!-- bloc: fr-2-apres -->

```ts
  'itemForm.moment.subtitle': "Avec un début et une fin",
```

<!-- bloc: fr-3-avant -->

```ts
  'itemForm.dictateHeard': "« {sentence} »",
```

<!-- bloc: fr-3-apres -->

```ts
  'itemForm.dictateHeard': "« {sentence} »",
  'itemForm.understood': "Compris : {items}",
  'itemForm.understoodDeadline': "à rendre {date}",
  'itemForm.understoodNote': "une note",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-1-avant -->

```ts
  'itemForm.todo.subtitle': "Something to tick off, with or without an alert",
```

<!-- bloc: en-1-apres -->

```ts
  'itemForm.todo.subtitle': "Something to tick off",
  'itemForm.todo.titleAlert': "To do · alert",
  'itemForm.todo.subtitleAlert': "Your phone will remind you",
```

<!-- bloc: en-2-avant -->

```ts
  'itemForm.moment.subtitle': "An appointment or event, with a start and an end",
```

<!-- bloc: en-2-apres -->

```ts
  'itemForm.moment.subtitle': "With a start and an end",
```

<!-- bloc: en-3-avant -->

```ts
  'itemForm.dictateHeard': "“{sentence}”",
```

<!-- bloc: en-3-apres -->

```ts
  'itemForm.dictateHeard': "“{sentence}”",
  'itemForm.understood': "Understood: {items}",
  'itemForm.understoodDeadline': "due {date}",
  'itemForm.understoodNote': "a note",
```

### Étape 8 — Les tests

Remplacer tout le contenu de `src/domain/rules/__tests__/form-dictation-rules.test.ts` :

<!-- bloc: test -->

```ts
import type { Person } from '../../entities';
import { endOf, momentFromSentence, placeOf, priorityOf, todoFromSentence } from '../form-dictation-rules';
import { mapsDirectionsUrl, mapsSearchUrl } from '../maps-links';

/** Monday 23 November 2026, 10:00. */
const now = new Date(2026, 10, 23, 10, 0);
const paul = { id: 'p1', displayName: 'Paul' } as Person;
const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe('dictating a todo', () => {
  it('fills "Appeler Paul demain à 18h" and keeps "Appeler Paul" as the title', () => {
    const fill = todoFromSentence('Appeler Paul demain à 18h', [paul], now);
    expect(fill).toMatchObject({
      title: 'Appeler Paul',
      day: '2026-11-24',
      alert: true,
      time: { hour: 18, minute: 0 },
      actionType: 'CALL',
      personId: 'p1',
    });
  });

  it('fills the example of the study: a day, an hour and the highest priority', () => {
    const fill = todoFromSentence('Aller à la maison à 18h le lundi 30 novembre, priorité max', [], now);
    expect(fill).toMatchObject({ title: 'Aller à la maison', day: '2026-11-30', alert: true, priority: 'URGENT' });
    expect(fill.time).toEqual({ hour: 18, minute: 0 });
  });

  it('leaves a thing without a day nor an hour as it is', () => {
    expect(todoFromSentence('Acheter du pain', [], now)).toMatchObject({
      title: 'Acheter du pain',
      day: undefined,
      alert: false,
      priority: 'NORMAL',
    });
  });

  it('keeps a day said without an hour, without an alert', () => {
    expect(todoFromSentence('Réviser le dossier vendredi', [], now)).toMatchObject({
      title: 'Réviser le dossier',
      day: '2026-11-27',
      alert: false,
    });
  });

  it('repeats, rings and hears "urgent" in "tous les jours à 8h, urgent"', () => {
    expect(todoFromSentence('Prendre mes médicaments tous les jours à 8h, urgent', [], now)).toMatchObject({
      title: 'Prendre mes médicaments',
      alert: true,
      recurrence: 'DAILY',
      priority: 'URGENT',
    });
  });

  it('reads a deadline, a length, a low priority and a note in one sentence', () => {
    const fill = todoFromSentence(
      'Rapport à rendre avant vendredi, ça prend 40 min, pas urgent, note : demander les chiffres à Marc',
      [],
      now
    );
    expect(fill).toMatchObject({
      title: 'Rapport à rendre',
      dueDate: '2026-11-27',
      estimatedMinutes: 45,
      priority: 'LOW',
      notes: 'Demander les chiffres à Marc',
      alert: false,
      day: undefined,
    });
  });

  it('rings until confirmed for "insiste", and does not take "ça prend 2h" for an hour', () => {
    expect(todoFromSentence('Payer le loyer ce soir, insiste', [], now)).toMatchObject({
      title: 'Payer le loyer',
      alert: true,
      confirm: true,
    });
    expect(todoFromSentence('Ranger le garage, ça prend 2h', [], now)).toMatchObject({ alert: false, estimatedMinutes: 120 });
  });

  it('keeps a number that is not a date, and ignores "avant de partir"', () => {
    expect(todoFromSentence('Acheter 3 baguettes avant de partir', [], now)).toMatchObject({
      title: 'Acheter 3 baguettes avant de partir',
      dueDate: undefined,
    });
  });
});

describe('the priority said', () => {
  it('knows the words for each level, in the right order', () => {
    expect(priorityOf('situation très très urgente')?.value).toBe('URGENT');
    expect(priorityOf('priorité maximale')?.value).toBe('URGENT');
    expect(priorityOf('assez urgent')?.value).toBe('HIGH');
    expect(priorityOf('c’est important')?.value).toBe('HIGH');
    expect(priorityOf('pas pressé')?.value).toBe('LOW');
    expect(priorityOf('not urgent')?.value).toBe('LOW');
    expect(priorityOf('Acheter du pain')).toBeUndefined();
  });
});

describe('dictating a moment', () => {
  it('finds the title, place, start and end of "Dîner chez Léa samedi à 19h pendant 2h"', () => {
    const fill = momentFromSentence('Dîner chez Léa samedi à 19h pendant 2h', [], now);
    expect(fill.title).toBe('Dîner');
    expect(fill.place).toBe('Chez Léa');
    expect([...ymd(fill.start), fill.start.getHours()]).toEqual([2026, 11, 28, 19]);
    expect([fill.end.getHours(), fill.end.getMinutes()]).toEqual([21, 0]);
  });

  it('reads "à la mairie", "jusqu’à 11h30" and a note', () => {
    const fill = momentFromSentence('Réunion à la mairie demain à 10h jusqu’à 11h30, note : apporter le dossier', [], now);
    expect(fill).toMatchObject({ title: 'Réunion', place: 'La mairie', notes: 'Apporter le dossier' });
    expect([fill.start.getHours(), fill.end.getHours(), fill.end.getMinutes()]).toEqual([10, 11, 30]);
  });

  it('lasts one hour without a said end, and keeps the person in the title', () => {
    const fill = momentFromSentence('Anniversaire de Marc le 12 décembre à 20h', [], now);
    expect(fill.title).toBe('Anniversaire de Marc');
    expect(fill.place).toBeUndefined();
    expect(fill.end.getTime() - fill.start.getTime()).toBe(60 * 60000);
  });

  it('understands English places and lengths', () => {
    expect(placeOf('Meeting at the office tomorrow at 9am')).toBe('The office');
    expect(placeOf('Lunch at noon')).toBeUndefined();
    expect(endOf('Meeting for 30 minutes', new Date(2026, 10, 24, 9, 0)).getMinutes()).toBe(30);
    expect(endOf('Party until 11 pm', new Date(2026, 10, 24, 20, 0)).getHours()).toBe(23);
  });

  it('ignores an end before the start, and reads 1h30', () => {
    const start = new Date(2026, 10, 24, 10, 0);
    expect(endOf('Cours jusqu’à 8h', start).getHours()).toBe(11);
    const long = endOf('Cours pendant 1h30', start);
    expect([long.getHours(), long.getMinutes()]).toEqual([11, 30]);
  });
});

describe('Google Maps links', () => {
  it('opens a place, or the route to it', () => {
    expect(mapsSearchUrl(' 12 rue des Lilas ')).toBe('https://www.google.com/maps/search/?api=1&query=12%20rue%20des%20Lilas');
    expect(mapsDirectionsUrl('Chez Léa')).toBe('https://www.google.com/maps/dir/?api=1&destination=Chez%20L%C3%A9a');
  });
});
```

## 8. Test final

```bash
npx jest src/domain/rules/__tests__/form-dictation-rules.test.ts src/__tests__/new-item-chooser.test.tsx
npx jest
npx tsc --noEmit
npx eslint src/styles/common/form-styles.ts src/components/create src/domain/rules/form-dictation-rules.ts src/features/create src/app/people/new.tsx
```

Résultat attendu : `Tests: 15 passed` pour les règles ; toute la suite passe ; `tsc` et `eslint` n'affichent rien.

**Sur le web, à 360 px de large** : « Ajouter » visible en haut des deux formulaires ; « + » › « À faire » ouvre directement le formulaire ; activer l'Alerte change l'en-tête (cloche, « À faire · alerte »).

**Sur le téléphone** : « Dicter tout » avec les phrases des tests ; la ligne « Compris : … » ; le petit micro des notes ; les micros de la fiche d'une personne.

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Un mot utile disparaît du titre | Il ressemble à une date ou à une heure | Ajouter la phrase aux tests ; retirer le mot de `DATE_WORD` s'il n'est pas une date |
| Une priorité n'est pas comprise | Le mot n'est pas dans `PRIORITY_PATTERNS` | L'ajouter au bon niveau, avec un test |
| `'durationLabel' is used before being defined` | `applySentence` est au-dessus de `durationLabel` | Déplacer `applySentence` sous `durationLabel` |

## 10. Lexique

- **Ancrage** : le mot qui fait d'une suite de mots une vraie date (un jour, un mois, « demain »).
- **Nettoyer le titre** : retirer de la phrase dite ce qui a déjà rempli un autre champ.

## 11. Et après

1. Fiche 015 : un seul onglet « À faire », et la barre du bas Accueil · À faire · Planning · Proches.
2. Fiche 016 : revue de tous les écrans à la largeur d'un téléphone.

## Compte rendu d'exécution (23 novembre 2026)

- Problèmes d'abord **reproduits** sur le web à 360 px de large : le sous-titre long poussait « Ajouter » hors de l'écran (le milieu de l'en-tête n'avait aucune limite de largeur).
- Étapes 1 à 8 appliquées **à partir des blocs de cette fiche** (`docs/tutoriel-suite/outils/appliquer-fiche-014.js`) : toutes les modifications trouvées une seule fois.
- **Écart corrigé** (la fiche décrit maintenant la version corrigée) : pour « Rapport à rendre… » (aucun jour dit), la règle de la saisie rapide propose **demain** toute seule quand 9 h est passé ; « un jour est dit » se décide maintenant sur les mots de la phrase (`saysADay` : un jour, un mois, « demain », « le 12 », « dans 3 jours », aujourd'hui).
- Tests : `Tests: 21 passed` (15 de la dictée, 6 du choix « Nouveau ») ; toute la suite `Test Suites: 90 passed`, `Tests: 1941 passed` ; `tsc` et `eslint` sans erreur.
- **Vu sur le web à 360 px** : « Ajouter » visible dans les deux formulaires ; l'alerte activée change l'en-tête (cloche, « À faire · alerte », « Ton téléphone te préviendra ») ; sous-titres courts.
- **Pas vérifié** : « Dicter tout », la ligne « Compris » et les micros (Android seulement) ; le formulaire d'une personne à l'écran. À voir sur le téléphone. Rien n'est encore enregistré dans git.

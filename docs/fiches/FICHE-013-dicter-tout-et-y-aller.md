# FICHE OPÉRATOIRE N° 013 — « Dicter tout » dans les formulaires, et « Y aller » vers le lieu d'un moment

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 012](FICHE-012-formulaires-a-faire-et-moment.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 12.2 (précisions du 23 novembre) et section 13 (idées 2.0)

---

## 1. Objectif

1. En haut des deux formulaires de création, un bouton **« Dicter tout »** : on dit **une phrase**, elle remplit les champs.
   - **À faire** : « Appeler Paul demain à 18 h » → titre, demain, **alerte à 18 h**, action « Appeler », Paul. « Acheter du pain » → titre seul, sans date ni alerte. « Médicaments tous les jours à 8 h » → alerte répétée chaque jour. « urgent » → priorité Urgente.
   - **Moment** : « Dîner chez Léa samedi à 19 h pendant 2 h » → titre, samedi 19 h - 21 h, **lieu « Chez Léa »**. Aussi « jusqu'à 23 h », « à la mairie », « au restaurant », et en anglais « at the office », « for 30 minutes », « until 6 pm ».
2. Sur la page d'un moment qui a un lieu, sous « Ouvrir dans Maps » (qui existait déjà), un bouton **« Y aller »** : l'itinéraire dans Google Maps, qui propose transports, marche, voiture et taxis.

La phrase est analysée par **la même règle que la saisie rapide** (`capture-rules.ts`, inchangée) ; une petite règle en plus (`form-dictation-rules.ts`) décide de l'alerte et trouve le lieu et la fin. La voix reste sur le téléphone (dictée sur l'appareil, sans Internet). Le micro de chaque champ reste là pour corriger un champ seul.

**Pas dans cette fiche** : choisir le lieu sur une carte (clé Google payante) et les applis de course (idées 2.0, étude section 13).

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 012 est enregistrée | `git log --oneline -3` | `feat(forms): …` présent |
| Tout passe | `npx jest` | `Tests: 1926 passed` |

## 3. Matériel

Aucune bibliothèque ajoutée.

## 4. Hypothèses

- Comme la saisie rapide, le **titre est la phrase entière** (« Appeler Paul demain à 18 h ») : on peut le raccourcir à la main. Retirer les mots de date de la phrase risquerait de couper un vrai titre.
- **L'alerte** s'active seulement si une **heure** est dite (« 18 h », « 8:30 », « ce soir », « dans 2 heures ») ou une **répétition** (« tous les jours ») ; sans heure, une chose à faire reste sans alerte.
- **Le jour** n'est rempli que s'il est dit (ou s'il y a une alerte) ; « Acheter du pain » reste « Sans date ».
- **Le lieu** est reconnu après « chez », « à la », « à l' », « au », « aux » (et « at » en anglais), jusqu'au premier mot de jour, d'heure ou de durée, ou jusqu'à la ponctuation.
- **La fin** : « pendant 2 h », « pendant 1h30 », « pendant 45 min », « jusqu'à 23 h », « for 30 minutes », « until 6 pm » ; sinon une heure après le début ; une fin avant le début est ignorée.
- Le bouton « Dicter tout » ne s'affiche que là où la dictée existe (Android), comme le micro de la saisie rapide.
- « Y aller » envoie l'adresse du lieu à Google Maps **seulement quand la personne touche le bouton**, comme « Ouvrir dans Maps ».

## 5. Carte de l'intervention

| Fichier | Action | Rôle |
|---|---|---|
| `src/domain/rules/form-dictation-rules.ts` | **créé** | Une phrase → les champs d'un « À faire » ou d'un « Moment » |
| `src/domain/rules/maps-links.ts` | **créé** | Les deux liens Google Maps (ouvrir, itinéraire) |
| `src/components/create/form/FormBricks.tsx` | modifié | La brique `DictateAll` |
| `src/features/create/TodoForm.tsx` | modifié | « Dicter tout » remplit le formulaire À faire |
| `src/features/create/MomentForm.tsx` | modifié | « Dicter tout » remplit le formulaire Moment |
| `src/app/events/[id].tsx` | modifié | Le bouton « Y aller » |
| `src/i18n/messages-rest-fr.ts` et `-en.ts` | modifiés | 8 textes chacun |
| `src/domain/rules/__tests__/form-dictation-rules.test.ts` | **créé** | 10 tests |

## 6. Sauvegarde

Aucune donnée ni base touchée. Pour annuler avant le commit : `git restore` des fichiers modifiés, suppression des fichiers créés.

## 7. Étapes

### Étape 1 — Une phrase → les champs

Créer `src/domain/rules/form-dictation-rules.ts` :

<!-- bloc: dictation-rules -->

```ts
/**
 * "Dictate everything" in the create forms (sheet 013): one spoken sentence fills the fields.
 * It reuses the analysis of the quick capture (capture-rules) and adds what the forms need:
 * whether the todo rings, and for a moment its place ("chez Léa", "à la mairie", "at the office")
 * and its end ("pendant 2 h", "jusqu'à 23 h", "for 30 minutes", "until 6 pm"). Pure: tested alone.
 */

import { format } from 'date-fns';

import type { ActionType, Person, ReminderPriority } from '../entities';
import { parseQuickCapture, type CaptureLanguage } from './capture-rules';

/** A moment without a said end lasts one hour. */
export const DEFAULT_MOMENT_MINUTES = 60;

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
}

export interface MomentFill {
  title: string;
  start: Date;
  end: Date;
  place?: string;
  personId?: string;
}

/** An hour of the day is said: "18h", "8:30", "7pm", "ce soir", "dans 2 heures"… */
const CLOCK_TIME =
  /\b\d{1,2}\s*(?:h|:)\s*\d{0,2}(?!\d)|\b\d{1,2}\s*(?:am|pm)\b|\b(?:ce soir|ce matin|cet après-midi|à midi|a midi|tonight|this morning|this evening|at noon)\b|\b(?:dans|in)\s+\d+\s*(?:minutes?|mins?|heures?|h|hours?)\b/i;

/** Today is said, so "Today" is chosen even without an alert. */
const TODAY_WORDS = /\b(?:aujourd'hui|aujourd’hui|ce soir|ce matin|cet après-midi|today|tonight)\b/i;

/** Where a place stops: a day, an hour, a length, or a punctuation mark. */
const PLACE_END = String.raw`(?=\s+(?:demain|après-demain|apres-demain|aujourd|ce\s+(?:soir|matin|midi|week)|cet\s|cette\s|le\s+\d|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|à\s+\d|a\s+\d|vers\s+\d|de\s+\d|pendant|durant|jusqu|dans\s+\d|tous|toutes|tomorrow|today|tonight|this\s|on\s|at\s+\d|from\s+\d|for\s+\d|until|next|every|in\s+\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\s*[,.;!?]|\s*$)`;

const PLACE_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`\b(chez\s+[^,.;!?]+?)` + PLACE_END, 'i'),
  new RegExp(String.raw`(?:^|\s)(?:à|a)\s+((?:la\s+|l['’])[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
  new RegExp(String.raw`(?:^|\s)((?:au|aux)\s+[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
  new RegExp(String.raw`\bat\s+(?!noon\b|midnight\b|night\b)((?:the\s+)?[^\d,.;!?][^,.;!?]*?)` + PLACE_END, 'i'),
];

/** The place said in a sentence, with a capital letter, or undefined. */
export function placeOf(sentence: string): string | undefined {
  for (const pattern of PLACE_PATTERNS) {
    const match = pattern.exec(sentence);
    const place = match?.[1]?.trim();
    if (place) return place.charAt(0).toUpperCase() + place.slice(1);
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

function formRecurrence(type?: string): FormRecurrence | undefined {
  return type === 'DAILY' || type === 'WEEKLY' || type === 'MONTHLY' ? type : undefined;
}

function clockOf(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

export function todoFromSentence(
  sentence: string,
  persons: readonly Person[],
  now: Date,
  language: CaptureLanguage = 'fr'
): TodoFill {
  const parsed = parseQuickCapture(sentence, [...persons], now, language);
  const recurrence = formRecurrence(parsed.recurrence?.type);
  const alert = CLOCK_TIME.test(sentence) || Boolean(recurrence);
  const day = format(parsed.targetDate, 'yyyy-MM-dd');
  const daySaid = day !== format(now, 'yyyy-MM-dd') || TODAY_WORDS.test(sentence);
  return {
    title: parsed.cleanTitle,
    day: alert || daySaid ? day : undefined,
    alert,
    time: clockOf(parsed.targetTime),
    priority: parsed.priority,
    actionType: parsed.actionType,
    personId: parsed.targetPerson?.id,
    recurrence,
  };
}

export function momentFromSentence(
  sentence: string,
  persons: readonly Person[],
  now: Date,
  language: CaptureLanguage = 'fr'
): MomentFill {
  const parsed = parseQuickCapture(sentence, [...persons], now, language);
  const { hour, minute } = clockOf(parsed.targetTime);
  const start = new Date(parsed.targetDate);
  start.setHours(hour, minute, 0, 0);
  return {
    title: parsed.cleanTitle,
    start,
    end: endOf(sentence, start),
    place: placeOf(sentence),
    personId: parsed.targetPerson?.id,
  };
}
```

| Passage | Ce qu'il fait |
|---|---|
| `parseQuickCapture(…)` | La règle de la saisie rapide, **inchangée** : jour, heure, personne, action, priorité, répétition |
| `CLOCK_TIME` | Une heure est-elle dite ? Sinon pas d'alerte (« Réviser vendredi » reste une tâche du vendredi) |
| `TODAY_WORDS` / `daySaid` | Le jour n'est rempli que s'il est dit ; sinon « Sans date » |
| `PLACE_END` | Où s'arrête un lieu : un mot de jour, d'heure, de durée, ou la ponctuation |
| `PLACE_PATTERNS` | « chez … », « à la … », « à l'… », « au … », « aux … », « at … » (pas « at noon ») |
| `endOf` | « pendant 2 h », « 1h30 », « 45 min », « jusqu'à 23 h », « until 6 pm » ; sinon une heure ; une fin avant le début est ignorée |

### Étape 2 — Les deux liens Google Maps

Créer `src/domain/rules/maps-links.ts` :

<!-- bloc: maps-links -->

```ts
/**
 * The two Google Maps links of a place (sheets 013): open it, or the route to it. They work on
 * the phone (Maps app) and on the web, with no key. The address leaves the phone only when the
 * person taps the button.
 */

const MAPS = 'https://www.google.com/maps';

export function mapsSearchUrl(place: string): string {
  return `${MAPS}/search/?api=1&query=${encodeURIComponent(place.trim())}`;
}

/** The route from where the phone is, Maps offering transit, walking, car and taxis. */
export function mapsDirectionsUrl(place: string): string {
  return `${MAPS}/dir/?api=1&destination=${encodeURIComponent(place.trim())}`;
}
```

### Étape 3 — La brique « Dicter tout »

Dans `src/components/create/form/FormBricks.tsx`, juste avant « More options » :

<!-- bloc: bricks-avant -->

```tsx
/** "More options": folded at first, so the form stays short. */
```

<!-- bloc: bricks-apres -->

```tsx
/**
 * "Dictate everything" (sheet 013): one sentence fills the form. The sentence heard is shown and
 * handed to the form at each new result, as the phone refines it while one speaks. Shown where
 * dictation exists (Android), like the microphone of the quick capture.
 */
export function DictateAll({
  accent,
  example,
  onSentence,
}: {
  accent: string;
  example: string;
  onSentence: (sentence: string) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const { showSnackbar } = useAppStore();
  const mineRef = useRef(false);
  const onSentenceRef = useRef(onSentence);
  const [heard, setHeard] = useState('');

  useEffect(() => {
    onSentenceRef.current = onSentence;
  }, [onSentence]);

  const onText = useCallback((sentence: string) => {
    if (!mineRef.current) return;
    setHeard(sentence);
    onSentenceRef.current(sentence);
  }, []);
  const onProblem = useCallback(
    (problem: DictationProblem) => {
      if (mineRef.current) showSnackbar(t(DICTATION_PROBLEM_KEYS[problem]));
    },
    [showSnackbar, t]
  );
  const dictation = useDictation(language, onText, onProblem);

  useEffect(() => {
    if (!dictation.listening) mineRef.current = false;
  }, [dictation.listening]);

  if (!dictation.available) return null;

  return (
    <View style={[formStyles.cardGroup, { borderWidth: 1, borderColor: `${accent}55` }]}>
      <TouchableOpacity
        onPress={() => {
          if (!dictation.listening) mineRef.current = true;
          void dictation.toggle();
        }}
        accessibilityRole="button"
        accessibilityLabel={t(dictation.listening ? 'capture.dictation.stop' : 'itemForm.dictateAll')}
        testID="form-dictate-all"
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: Radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: dictation.listening ? palette.error.default : `${accent}22`,
          }}
        >
          <Ionicons name={dictation.listening ? 'stop' : 'mic'} size={20} color={dictation.listening ? palette.onSurface.primary : accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[formStyles.fieldLabel, { color: accent }]}>
            {t(dictation.listening ? 'itemForm.dictateListening' : 'itemForm.dictateAll')}
          </Text>
          <Text style={formStyles.fieldSub}>{heard ? t('itemForm.dictateHeard', { sentence: heard }) : example}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

/** "More options": folded at first, so the form stays short. */
```

| Passage | Ce qu'il fait |
|---|---|
| `mineRef` | Comme les micros des champs : seul ce bouton garde ce qu'on dit après l'avoir touché |
| `onSentenceRef` | Garde la dernière fonction du formulaire sans réabonner le micro à chaque affichage |
| `heard` | Montre la phrase entendue, pour que la personne voie ce qui a été compris |
| `if (!dictation.available) return null` | Pas de bouton là où la dictée n'existe pas (web, iPhone) |

### Étape 4 — « Dicter tout » dans le formulaire À faire

Six remplacements dans `src/features/create/TodoForm.tsx`.

<!-- bloc: todo-1-avant -->

```tsx
import React, { useState } from 'react';
```

<!-- bloc: todo-1-apres -->

```tsx
import React, { useEffect, useState } from 'react';
```

<!-- bloc: todo-2-avant -->

```tsx
  ChoiceChips,
  DictatedInput,
  FieldLabel,
```

<!-- bloc: todo-2-apres -->

```tsx
  ChoiceChips,
  DictateAll,
  DictatedInput,
  FieldLabel,
```

<!-- bloc: todo-3-avant -->

```tsx
import type { Reminder, ReminderPriority } from '@/domain/entities';
```

<!-- bloc: todo-3-apres -->

```tsx
import type { Person, Reminder, ReminderPriority } from '@/domain/entities';
import { todoFromSentence } from '@/domain/rules/form-dictation-rules';
```

<!-- bloc: todo-4-avant -->

```tsx
import { SettingsRepository } from '@/repositories/settings-repository';
```

<!-- bloc: todo-4-apres -->

```tsx
import { PersonRepository } from '@/repositories/person-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
```

<!-- bloc: todo-5-avant -->

```tsx
  const [saving, setSaving] = useState(false);

  const customDay
```

<!-- bloc: todo-5-apres -->

```tsx
  const [saving, setSaving] = useState(false);
  // The people, so that "Appeler Paul" in a dictated sentence finds Paul
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    PersonRepository.findAll()
      .then(setPersons)
      .catch(() => {});
  }, []);

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

  const customDay
```

<!-- bloc: todo-6-avant -->

```tsx
      {visibleSections('todo', { alert }).map(section => (
```

<!-- bloc: todo-6-apres -->

```tsx
      <DictateAll accent={accent} example={t('itemForm.dictateTodoExample')} onSentence={applySentence} />
      {visibleSections('todo', { alert }).map(section => (
```

### Étape 5 — « Dicter tout » dans le formulaire Moment

Six remplacements dans `src/features/create/MomentForm.tsx`.

<!-- bloc: moment-1-avant -->

```tsx
import React, { useState } from 'react';
```

<!-- bloc: moment-1-apres -->

```tsx
import React, { useEffect, useState } from 'react';
```

<!-- bloc: moment-2-avant -->

```tsx
  ChoiceChips,
  DictatedInput,
  FieldLabel,
```

<!-- bloc: moment-2-apres -->

```tsx
  ChoiceChips,
  DictateAll,
  DictatedInput,
  FieldLabel,
```

<!-- bloc: moment-3-avant -->

```tsx
import type { EventType } from '@/domain/entities';
```

<!-- bloc: moment-3-apres -->

```tsx
import type { EventType, Person } from '@/domain/entities';
import { momentFromSentence } from '@/domain/rules/form-dictation-rules';
```

<!-- bloc: moment-4-avant -->

```tsx
import { useAppStore } from '@/store/app-store';
```

<!-- bloc: moment-4-apres -->

```tsx
import { PersonRepository } from '@/repositories/person-repository';
import { useAppStore } from '@/store/app-store';
```

<!-- bloc: moment-5-avant -->

```tsx
  const [saving, setSaving] = useState(false);

  const place = location.trim();
```

<!-- bloc: moment-5-apres -->

```tsx
  const [saving, setSaving] = useState(false);
  // The people, so that "avec Paul" in a dictated sentence finds Paul
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    PersonRepository.findAll()
      .then(setPersons)
      .catch(() => {});
  }, []);

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

  const place = location.trim();
```

<!-- bloc: moment-6-avant -->

```tsx
      {visibleSections('moment', { place }).map(section => (
```

<!-- bloc: moment-6-apres -->

```tsx
      <DictateAll accent={accent} example={t('itemForm.dictateMomentExample')} onSentence={applySentence} />
      {visibleSections('moment', { place }).map(section => (
```

### Étape 6 — « Y aller » sur la page d'un moment

Dans `src/app/events/[id].tsx` :

<!-- bloc: event-1-avant -->

```tsx
import { useDateLocale, useT } from '@/i18n';
```

<!-- bloc: event-1-apres -->

```tsx
import { useDateLocale, useT } from '@/i18n';
import { mapsDirectionsUrl } from '@/domain/rules/maps-links';
```

<!-- bloc: event-2-avant -->

```tsx
                <Text style={styles.linkSub}>{t('eventDetail.openMaps')}</Text>
              </View>
            </TouchableOpacity>
          )}
```

<!-- bloc: event-2-apres -->

```tsx
                <Text style={styles.linkSub}>{t('eventDetail.openMaps')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Y aller (fiche 013) : l'itinéraire dans Google Maps, qui propose transports, marche et taxis */}
          {!!event.location && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(mapsDirectionsUrl(event.location!))}
              accessibilityRole="button"
              accessibilityLabel={t('eventDetail.goThereA11y', { place: event.location })}
              testID="event-go-there"
            >
              <Ionicons name="navigate-outline" size={20} color={theme.primary.default} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{t('eventDetail.goThere')}</Text>
                <Text style={styles.linkSub}>{t('eventDetail.goThereSub')}</Text>
              </View>
            </TouchableOpacity>
          )}
```

### Étape 7 — Les textes

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'itemForm.availability': "Pendant ce moment",
```

<!-- bloc: fr-apres -->

```ts
  'itemForm.availability': "Pendant ce moment",
  'itemForm.dictateAll': "Dicter tout",
  'itemForm.dictateListening': "J'écoute… touche pour arrêter",
  'itemForm.dictateHeard': "« {sentence} »",
  'itemForm.dictateTodoExample': "Une phrase remplit tout. Ex. : « Appeler Paul demain à 18 h »",
  'itemForm.dictateMomentExample': "Une phrase remplit tout. Ex. : « Dîner chez Léa samedi à 19 h pendant 2 h »",
  'eventDetail.goThere': "Y aller",
  'eventDetail.goThereSub': "Itinéraire dans Google Maps ↗",
  'eventDetail.goThereA11y': "Itinéraire vers {place} dans Google Maps",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'itemForm.availability': "During this moment",
```

<!-- bloc: en-apres -->

```ts
  'itemForm.availability': "During this moment",
  'itemForm.dictateAll': "Dictate everything",
  'itemForm.dictateListening': "Listening… tap to stop",
  'itemForm.dictateHeard': "“{sentence}”",
  'itemForm.dictateTodoExample': "One sentence fills it all. E.g. “Call Paul tomorrow at 6 pm”",
  'itemForm.dictateMomentExample': "One sentence fills it all. E.g. “Dinner at Lea's on Saturday at 7 pm for 2 hours”",
  'eventDetail.goThere': "Go there",
  'eventDetail.goThereSub': "Route in Google Maps ↗",
  'eventDetail.goThereA11y': "Route to {place} in Google Maps",
```

### Étape 8 — Les tests

Créer `src/domain/rules/__tests__/form-dictation-rules.test.ts` :

<!-- bloc: test -->

```ts
import type { Person } from '../../entities';
import { endOf, momentFromSentence, placeOf, todoFromSentence } from '../form-dictation-rules';
import { mapsDirectionsUrl, mapsSearchUrl } from '../maps-links';

/** Monday 23 November 2026, 10:00. */
const now = new Date(2026, 10, 23, 10, 0);
const paul = { id: 'p1', displayName: 'Paul' } as Person;
const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe('dictating a todo', () => {
  it('fills the day, the alert, the action and the person of "Appeler Paul demain à 18h"', () => {
    const fill = todoFromSentence('Appeler Paul demain à 18h', [paul], now);
    expect(fill).toMatchObject({ day: '2026-11-24', alert: true, time: { hour: 18, minute: 0 }, actionType: 'CALL', personId: 'p1' });
    expect(fill.title).toBe('Appeler Paul demain à 18h');
  });

  it('leaves a thing without a day nor an hour as it is', () => {
    const fill = todoFromSentence('Acheter du pain', [], now);
    expect(fill).toMatchObject({ title: 'Acheter du pain', day: undefined, alert: false });
  });

  it('keeps a day said without an hour, without an alert', () => {
    const fill = todoFromSentence('Réviser le dossier vendredi', [], now);
    expect(fill.alert).toBe(false);
    expect(fill.day).toBe('2026-11-27');
  });

  it('repeats and rings for "tous les jours à 8h", and hears "urgent"', () => {
    const fill = todoFromSentence('Prendre mes médicaments tous les jours à 8h, urgent', [], now);
    expect(fill).toMatchObject({ alert: true, recurrence: 'DAILY', time: { hour: 8, minute: 0 }, priority: 'URGENT' });
  });
});

describe('dictating a moment', () => {
  it('finds the place, the start and the end of "Dîner chez Léa samedi à 19h pendant 2h"', () => {
    const fill = momentFromSentence('Dîner chez Léa samedi à 19h pendant 2h', [], now);
    expect(fill.place).toBe('Chez Léa');
    expect([...ymd(fill.start), fill.start.getHours()]).toEqual([2026, 11, 28, 19]);
    expect([fill.end.getHours(), fill.end.getMinutes()]).toEqual([21, 0]);
  });

  it('reads "à la mairie" and "jusqu\'à 11h30"', () => {
    const fill = momentFromSentence('Réunion à la mairie demain à 10h jusqu’à 11h30', [], now);
    expect(fill.place).toBe('La mairie');
    expect([fill.end.getHours(), fill.end.getMinutes()]).toEqual([11, 30]);
  });

  it('lasts one hour without a said end, and has no place when none is said', () => {
    const fill = momentFromSentence('Anniversaire de Marc le 12 décembre à 20h', [], now);
    expect(fill.place).toBeUndefined();
    expect(fill.end.getTime() - fill.start.getTime()).toBe(60 * 60000);
  });

  it('understands English places and lengths', () => {
    expect(placeOf('Meeting at the office tomorrow at 9am')).toBe('The office');
    expect(placeOf('Lunch at noon')).toBeUndefined();
    const start = new Date(2026, 10, 24, 9, 0);
    expect(endOf('Meeting for 30 minutes', start).getMinutes()).toBe(30);
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
npx jest src/domain/rules/__tests__/form-dictation-rules.test.ts
npx jest
npx tsc --noEmit
npx eslint src/domain/rules/form-dictation-rules.ts src/domain/rules/maps-links.ts src/components/create/form src/features/create "src/app/events/[id].tsx"
```

Résultat attendu : `Tests: 10 passed` pour le nouveau fichier ; toute la suite passe ; `tsc` et `eslint` n'affichent rien.

**Sur le web** : la page d'un moment avec un lieu montre « Ouvrir dans Maps » et **« Y aller »** (qui ouvre l'itinéraire). « Dicter tout » n'apparaît pas sur le web (dictée seulement sur Android).

**Sur le téléphone** : dans « À faire », toucher « Dicter tout », dire « Appeler Paul demain à 18 h » : titre, Demain, Alerte à 18:00, Appeler, Paul. Dans « Moment » : « Dîner chez Léa samedi à 19 h pendant 2 h ».

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| « Dicter tout » absent | Web ou iPhone, ou téléphone sans reconnaissance hors ligne | Sur Android, le bouton est là ; s'il dit « non disponible », télécharger la langue hors ligne (le téléphone le propose) |
| Le lieu prend aussi l'heure (« chez Léa à 19h » donne « Chez Léa à 19h ») | Un mot d'arrêt manque dans `PLACE_END` | Ajouter le mot dans la liste, et un test |
| Une phrase sans heure active l'alerte | `CLOCK_TIME` reconnaît trop | Ajouter la phrase aux tests, resserrer le motif |
| La personne n'est pas reconnue | Le nom dit n'est pas celui de la fiche de la personne | Dire le prénom tel qu'il est écrit dans Proches |

## 10. Lexique

- **Analyse de phrase** : retrouver dans une phrase les morceaux utiles (jour, heure, lieu…) avec des motifs (expressions régulières).
- **Motif** (expression régulière) : une description de forme de texte, comme « deux chiffres suivis de h ».
- **Lien profond / universel** : une adresse web qui ouvre directement une appli (Maps) sur le bon écran.

## 11. Et après

1. Un APK pour tout essayer sur le téléphone (fiches 011, 012, 013).
2. Les écrans de modification avec les mêmes briques.
3. Version 2.0 : les applis de course, choisir un lieu sur une carte (étude, section 13).

## Compte rendu d'exécution (23 novembre 2026)

- Décisions prises avant d'écrire (23 novembre) : « Dicter tout » dans les deux formulaires ; pour le lieu, des boutons Maps gratuits plutôt qu'une carte (clé payante) ; les applis de course notées pour la version 2.0 (étude, section 13).
- Code lu avant d'écrire : l'analyse de phrase de la saisie rapide (`parseQuickCapture` : elle garde la phrase entière comme titre et ne dit pas si une heure a été prononcée, d'où la petite règle en plus) ; la page d'un moment, qui avait **déjà** « Ouvrir dans Maps » : seul « Y aller » manquait.
- Étapes 1 à 8 appliquées **à partir des blocs de cette fiche** (`docs/fiches/outils/appliquer-fiche-013.js`) : toutes les modifications trouvées une seule fois.
- Tests : `Tests: 10 passed` du premier coup ; toute la suite `Test Suites: 90 passed`, `Tests: 1936 passed` ; `tsc` et `eslint` sans erreur.
- **Pas vérifié** : « Dicter tout » (n'existe que sur Android : à essayer sur le téléphone), et « Y aller » à l'écran (pas regardé sur le web, pour économiser ; c'est le même type de lien que « Ouvrir dans Maps », qui marche déjà). Rien n'est encore enregistré dans git.

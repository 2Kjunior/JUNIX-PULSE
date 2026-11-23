# FICHE OPÉRATOIRE N° 012 — Les formulaires « À faire » et « Moment » (création)

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 011](FICHE-011-notifications-trois-types.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 12.2 (avec les précisions du 23 novembre) et 12.10 (chantier n° 3)

---

## 1. Objectif

Aujourd'hui, trois formulaires différents (tâche, rappel, événement), longs, avec des sections dans un ordre qui ne suit pas la pensée (« priorité » avant « quand », « durée estimée » incompréhensible). Après cette fiche, **deux formulaires de création**, construits avec les mêmes briques mais **bien différents à l'œil** :

| | **À faire** (cyan, case à cocher) | **Moment** (ambre, calendrier) |
|---|---|---|
| 1 | **Quoi** : titre et notes, avec **micro** | **Quoi** : titre et notes, avec **micro** |
| 2 | **Quand** : Sans date, Aujourd'hui, Demain, Lundi prochain, une date | **Début et fin** |
| 3 | **Alerte** : un interrupteur ; activé : l'heure, la **priorité** (« Urgente » sonne comme une alarme), l'action (Appeler…), la répétition, le rappel à confirmer | **Où** : le lieu |
| 4 | **Avec qui** | **Partir … min avant** : **seulement si un lieu est saisi** |
| 5 | **Plus d'options** (replié) : priorité (sans alerte), échéance, **Temps pour le faire**, sous-tâches, étiquettes | **Avec qui** |
| 6 | | **Plus d'options** (replié) : occupé ou libre, étiquettes |

- Enregistrée **sans alerte**, une chose « À faire » est une **tâche** ; **avec** une alerte, un **rappel**. Les données ne changent pas (les trois types restent, voir `item-kinds.ts`).
- La **durée** devient **« Temps pour le faire »**, cachée dans Plus d'options, avec une phrase qui dit à quoi elle sert : **lancer Focus depuis la tâche règle le minuteur sur ce temps** (avant : toujours 25 min).
- Les **routes ne changent pas** : `/tasks/new` ouvre « À faire » sans alerte, `/reminders/new` ouvre « À faire » avec l'alerte, `/events/new` ouvre « Moment ». Le choix « Nouveau », le Planning, les fiches des personnes continuent de marcher sans être touchés.

**Pour que rien ne casse demain** : l'ordre des sections et le contenu de « Plus d'options » sont **déclarés dans un registre** (`src/constants/item-forms.ts`). Ajouter ou retirer un champ (par exemple le « type de moment » du chantier n° 5) : une ligne dans le registre, et sa brique.

**Pas dans cette fiche** (décidé le 23 novembre) : les écrans de **modification** (fiche suivante, avec les mêmes briques) ; le type de moment (chantier n° 5).

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 011 est enregistrée | `git log --oneline -3` | `feat(notifications): …` présent |
| Tout passe | `npx jest` | `Tests: 1918 passed` |

## 3. Matériel

Aucune bibliothèque ajoutée. La dictée réutilise `src/features/capture/use-dictation.ts` (celle de la saisie rapide) : reconnaissance **sur le téléphone seulement**, rien ne part sur Internet. Le micro ne s'affiche que sur Android (comme dans la saisie rapide).

## 4. Hypothèses

- Les deux champs dictés d'un même formulaire écoutent le même micro du téléphone : chaque champ ne garde que ce qui a été dicté **après un appui sur son propre micro**.
- Avec l'alerte, les champs propres aux tâches (échéance, temps pour le faire, sous-tâches) sont **cachés** : un rappel ne les a pas. S'ils avaient été remplis avant d'activer l'alerte, ils ne sont pas enregistrés.
- Un moment sans lieu n'a pas de « Partir … min avant » : si le lieu est effacé, le temps de trajet est enregistré à 0.
- Les anciens styles (`src/styles/reminders/new-reminder-styles.ts`) ne servent plus aux écrans de création ; on les garde (l'écran de modification d'un rappel peut s'en servir), sans rien supprimer.

## 5. Carte de l'intervention

| Fichier | Action | Rôle |
|---|---|---|
| `src/constants/item-forms.ts` | **créé** | Le registre des formulaires et ses petites règles |
| `src/components/create/form/FormBricks.tsx` | **créé** | Les briques : cadre, section, champ dicté, choix, interrupteur, Plus d'options |
| `src/features/create/TodoForm.tsx` | **créé** | Le formulaire « À faire » |
| `src/features/create/MomentForm.tsx` | **créé** | Le formulaire « Moment » |
| `src/app/tasks/new.tsx`, `reminders/new.tsx`, `events/new.tsx` | remplacés | Chaque route ouvre le bon formulaire |
| `src/domain/rules/focus-rules.ts` | modifié | `focusMinutesForTask` : le minuteur d'une session lancée depuis une tâche |
| `src/app/focus.tsx` | modifié | Le minuteur prend le temps de la tâche |
| `src/app/tasks/[id].tsx` | modifié | Passe le temps de la tâche à Focus |
| `src/i18n/messages.ts` | modifié | « Durée estimée » devient « Temps pour le faire » |
| `src/i18n/messages-rest-fr.ts` et `-en.ts` | modifiés | 31 textes en français et en anglais |
| `src/__tests__/item-forms.test.ts` | **créé** | 8 tests |

## 6. Sauvegarde

Aucune donnée ni base touchée : seulement des écrans. Pour annuler avant le commit : `git restore` des fichiers modifiés et suppression des fichiers créés.

## 7. Étapes

### Étape 1 — Le registre des formulaires

Créer `src/constants/item-forms.ts` :

<!-- bloc: forms-registry -->

```ts
/**
 * The create forms of the two families (study 001, 12.2 "2-B"; sheet 012): each family declares
 * its sections, in order, and the fields folded under "More options". One set of bricks draws
 * them, so a field added or removed tomorrow is a line here and its brick, not every screen.
 */

import type { ItemFamily } from './item-kinds';

export type FormSectionId = 'what' | 'when' | 'alert' | 'slot' | 'where' | 'leave' | 'who' | 'more';
export type MoreFieldId = 'priority' | 'deadline' | 'duration' | 'subtasks' | 'tags' | 'availability';

export interface ItemFormDefinition {
  sections: readonly FormSectionId[];
  more: readonly MoreFieldId[];
}

export const ITEM_FORMS: Readonly<Record<ItemFamily, ItemFormDefinition>> = {
  todo: {
    sections: ['what', 'when', 'alert', 'who', 'more'],
    more: ['priority', 'deadline', 'duration', 'subtasks', 'tags'],
  },
  moment: {
    sections: ['what', 'slot', 'where', 'leave', 'who', 'more'],
    more: ['availability', 'tags'],
  },
};

/** "Time to do it", in minutes; none at first. */
export const TODO_DURATION_OPTIONS: readonly (number | undefined)[] = [undefined, 15, 30, 45, 60, 120];
/** "Leave … min before", in minutes; 0 is no reminder to leave. */
export const LEAVE_OPTIONS: readonly number[] = [0, 15, 30, 45, 60];

export interface FormState {
  alert?: boolean;
  place?: string;
}

/**
 * With an alert, a todo is saved as a reminder: the priority moves under the alert, and what a
 * reminder does not have (deadline, time to do it, subtasks) is not offered.
 */
const HIDDEN_WITH_ALERT: readonly MoreFieldId[] = ['priority', 'deadline', 'duration', 'subtasks'];

/** The sections to draw, in order: "Leave … min before" only once a place is written. */
export function visibleSections(family: ItemFamily, state: FormState = {}): FormSectionId[] {
  return ITEM_FORMS[family].sections.filter(section => section !== 'leave' || (state.place ?? '').trim() !== '');
}

/** The fields under "More options". */
export function visibleMoreFields(family: ItemFamily, state: FormState = {}): MoreFieldId[] {
  return ITEM_FORMS[family].more.filter(field => !(family === 'todo' && state.alert && HIDDEN_WITH_ALERT.includes(field)));
}

/** The day of a 'YYYY-MM-DD…' route parameter, or undefined. */
export function dayParam(value?: string): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? '');
  return match ? match[1] : undefined;
}

/** The hour of a route parameter (0 to 23), or undefined. */
export function hourParam(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : undefined;
}

/** When the alert of a todo rings: its day (today when none) at the chosen time, on the phone's clock. */
export function alertMoment(day: string | undefined, time: { hour: number; minute: number }, now: Date): Date {
  const parts = dayParam(day)?.split('-').map(Number);
  const [year, month, date] = parts ?? [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  return new Date(year, month - 1, date, time.hour, time.minute, 0, 0);
}
```

| Passage | Ce qu'il fait |
|---|---|
| `ITEM_FORMS` | **L'ordre** des sections de chaque formulaire et le contenu de « Plus d'options ». Les écrans parcourent ces listes |
| `HIDDEN_WITH_ALERT` | Avec l'alerte, on fabrique un rappel : la priorité monte sous l'alerte, l'échéance, le temps et les sous-tâches disparaissent |
| `visibleSections` | « Partir … min avant » n'apparaît qu'avec un lieu |
| `dayParam`, `hourParam` | Lisent proprement le jour et l'heure reçus d'un créneau du Planning ou d'une autre page |
| `alertMoment` | L'heure exacte de l'alerte : le jour choisi (aujourd'hui sinon) à l'heure choisie |

### Étape 2 — Les briques

Créer `src/components/create/form/FormBricks.tsx` :

<!-- bloc: bricks -->

```tsx
/**
 * The bricks of the create forms (sheet 012): the frame, a section, a text field with dictation,
 * a row of choices, a switch and the "More options" fold. Each brick takes the colour of its
 * family, so the two forms look different while built from the same pieces.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ITEM_FAMILY_DEFINITIONS, itemFamilyColor, type ItemFamily } from '@/constants/item-kinds';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useDictation, type DictationProblem } from '@/features/capture/use-dictation';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useLanguage, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';

export type IconName = keyof typeof Ionicons.glyphMap;

const DICTATION_PROBLEM_KEYS = {
  permission: 'capture.dictation.permission',
  language: 'capture.dictation.language',
  failed: 'capture.dictation.failed',
  unsupported: 'capture.dictation.unsupported',
} as const;

/** The frame of a form: its bar (Cancel, the family, Add), a coloured line, the page and the big button. */
export function FormShell({
  family,
  title,
  subtitle,
  saveLabel,
  saving,
  onSave,
  testID,
  children,
}: {
  family: ItemFamily;
  title: string;
  subtitle: string;
  saveLabel: string;
  saving: boolean;
  onSave: () => void;
  testID?: string;
  children: ReactNode;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const accent = itemFamilyColor(palette, family);
  // Dark text on the light cyan and amber of the dark theme, white on the deep ones of the light theme
  const onAccent = palette.mode === 'light' ? '#FFFFFF' : '#141317';

  return (
    <KeyboardAvoidingView
      style={[formStyles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID}
    >
      <View style={formStyles.toolbar}>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('form.cancel')}
        >
          <Text style={formStyles.toolbarCancel}>{t('form.cancel')}</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={ITEM_FAMILY_DEFINITIONS[family].icon} size={18} color={accent} />
            <Text style={[formStyles.toolbarTitle, { color: accent }]}>{title}</Text>
          </View>
          <Text style={formStyles.toolbarSubtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
        >
          <Text style={[formStyles.toolbarSave, { color: accent }, saving && formStyles.toolbarSaveDisabled]}>
            {saving ? t('itemForm.saving') : t('itemForm.save')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 3, backgroundColor: accent, opacity: 0.85 }} />

      <ScrollView
        style={formStyles.scroll}
        contentContainerStyle={[formStyles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
          testID="form-save"
          style={{
            marginTop: Spacing.md,
            minHeight: 52,
            borderRadius: Radius.lg,
            backgroundColor: accent,
            opacity: saving ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.sm,
          }}
        >
          <Ionicons name={ITEM_FAMILY_DEFINITIONS[family].icon} size={20} color={onAccent} />
          <Text style={{ ...Typography.labelLarge, fontWeight: '700', color: onAccent }}>
            {saving ? t('itemForm.saving') : saveLabel}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A section: a small coloured badge, its title, and a card with its fields. */
export function FormSection({
  icon,
  title,
  accent,
  testID,
  children,
}: {
  icon: IconName;
  title: string;
  accent: string;
  testID?: string;
  children: ReactNode;
}) {
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View testID={testID}>
      <View style={formStyles.sectionHeaderRow}>
        <View style={[formStyles.sectionHeaderIconBadge, { backgroundColor: `${accent}22` }]}>
          <Ionicons name={icon} size={14} color={accent} />
        </View>
        <Text style={formStyles.sectionHeaderTitle}>{title}</Text>
      </View>
      <View style={formStyles.cardGroup}>{children}</View>
    </View>
  );
}

/** A label and its explanation, above a row of choices. */
export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View style={{ marginTop: Spacing.xs }}>
      <Text style={formStyles.fieldLabel}>{label}</Text>
      {hint ? <Text style={formStyles.fieldSub}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A text field with a microphone beside it (Android). The words heard are added after what was
 * already written. Both fields of a form hear the same microphone: each keeps only what was
 * said after a tap on its own.
 */
export function DictatedInput({
  value,
  onChangeText,
  accent,
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
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const baseRef = useRef('');
  const mineRef = useRef(false);

  const onText = useCallback(
    (heard: string) => {
      if (!mineRef.current) return;
      onChangeText(baseRef.current ? `${baseRef.current} ${heard}` : heard);
    },
    [onChangeText]
  );
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

  const toggle = () => {
    if (!dictation.listening) {
      baseRef.current = value.trim();
      mineRef.current = true;
    }
    void dictation.toggle();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
      <TextInput
        {...input}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={palette.onSurface.disabled}
        style={[{ flex: 1 }, inputStyle]}
      />
      {dictation.available ? (
        <TouchableOpacity
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={t(dictation.listening ? 'capture.dictation.stop' : 'capture.dictation.start')}
          testID={testID ? `${testID}-mic` : undefined}
          style={{
            width: 44,
            height: 44,
            borderRadius: Radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: dictation.listening ? palette.error.default : accent,
            backgroundColor: dictation.listening ? palette.error.default : `${accent}18`,
          }}
        >
          <Ionicons
            name={dictation.listening ? 'stop' : 'mic-outline'}
            size={18}
            color={dictation.listening ? palette.onSurface.primary : accent}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export interface Choice<T> {
  value: T;
  label: string;
  icon?: IconName;
}

/** A row of choices, one selected, in the colour of the family. */
export function ChoiceChips<T>({
  options,
  value,
  onChange,
  accent,
  testIDPrefix,
}: {
  options: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  accent: string;
  testIDPrefix?: string;
}) {
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View style={formStyles.chipsRow} accessibilityRole="radiogroup">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={index}
            style={[formStyles.chip, { minHeight: 44 }, selected && { backgroundColor: `${accent}22`, borderColor: accent }]}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            testID={testIDPrefix ? `${testIDPrefix}-${String(option.value ?? 'none')}` : undefined}
          >
            {option.icon ? (
              <Ionicons name={option.icon} size={14} color={selected ? accent : palette.onSurface.variant} />
            ) : null}
            <Text style={[formStyles.chipText, selected && { color: accent, fontWeight: '700' }]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** A switch with its label and explanation. */
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  accent,
  testID,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accent: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View style={[formStyles.rowBetween, { minHeight: 44 }]}>
      <View style={{ flex: 1, paddingRight: Spacing.sm }}>
        <Text style={formStyles.fieldLabel}>{label}</Text>
        {hint ? <Text style={formStyles.fieldSub}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: palette.outline.variant, true: accent }}
        thumbColor={value ? '#FFFFFF' : palette.onSurface.disabled}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

/** "More options": folded at first, so the form stays short. */
export function MoreOptions({ accent, children }: { accent: string; children: ReactNode }) {
  const t = useT();
  const formStyles = useThemedStyles(makeFormStyles);
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(value => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID="form-more"
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: 44, marginTop: Spacing.sm }}
      >
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={accent} />
        <Text style={[formStyles.fieldLabel, { color: accent }]}>{t(open ? 'itemForm.less' : 'itemForm.more')}</Text>
      </TouchableOpacity>
      {open ? <View style={[formStyles.cardGroup, { gap: Spacing.sm }]}>{children}</View> : null}
    </View>
  );
}
```

| Brique | Rôle |
|---|---|
| `FormShell` | Le cadre : barre (Annuler, l'icône et le nom de la famille **dans sa couleur**, Ajouter), une fine ligne de couleur, la page, le grand bouton coloré en bas |
| `onAccent` | Le texte du grand bouton : foncé sur le cyan et l'ambre clairs du thème sombre, blanc sur les teintes profondes du thème clair (contraste) |
| `FormSection` | Une section : petit badge coloré, titre, carte |
| `DictatedInput` | Champ de texte + micro. `mineRef` : le champ ne garde que ce qui est dicté après **son** micro ; `baseRef` : les mots s'ajoutent après le texte déjà écrit |
| `ChoiceChips` | Une rangée de choix (44 px de haut, lisible par les lecteurs d'écran : « radio », « sélectionné ») |
| `SwitchRow` | Un interrupteur avec son explication |
| `MoreOptions` | Replié au départ : le formulaire reste court |

### Étape 3 — Le formulaire « À faire »

Créer `src/features/create/TodoForm.tsx` :

<!-- bloc: todo-form -->

```tsx
/**
 * The "To do" form (study 001, 12.2 "2-B"; sheet 012), in cyan: What → When → Alert → With whom
 * → More options, in the order of the registry (constants/item-forms). Saved without an alert it
 * is a task; with one, a reminder: the kinds kept in the data (constants/item-kinds).
 */

import { Ionicons } from '@expo/vector-icons';
import { addDays, addWeeks, format, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  ChoiceChips,
  DictatedInput,
  FieldLabel,
  FormSection,
  FormShell,
  MoreOptions,
  SwitchRow,
  type Choice,
  type IconName,
} from '@/components/create/form/FormBricks';
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
import type { Reminder, ReminderPriority } from '@/domain/entities';
import { offerExactAlarmsForConfirmation } from '@/features/reminders/offer-exact-alarms';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT, type MessageKey } from '@/i18n';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';
import { createReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

type ActionType = Reminder['actionType'];
type Recurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

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
}

export function TodoForm({ initialAlert = false, defaultDate, defaultHour, personId }: TodoFormProps) {
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
  const [alert, setAlert] = useState(initialAlert);
  const [alertTime, setAlertTime] = useState(() => ({
    hour: hourParam(defaultHour) ?? (new Date().getHours() + 1) % 24,
    minute: 0,
  }));
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [repeat, setRepeat] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>('DAILY');
  const [confirm, setConfirm] = useState(false);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [personIds, setPersonIds] = useState<string[]>(() => (personId ? [personId] : []));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<'day' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function handleSave() {
    if (!title.trim()) {
      setTitleError(t('taskNew.titleRequired'));
      return;
    }
    const scheduledAt = alertMoment(day, alertTime, new Date());
    if (alert && scheduledAt <= new Date()) {
      showSnackbar(t('remNew.mustBeFuture'));
      return;
    }
    setSaving(true);
    try {
      if (alert) {
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
          recurrenceRule: repeat
            ? { type: recurrence, interval: 1, dayOfMonth: recurrence === 'MONTHLY' ? scheduledAt.getDate() : undefined }
            : undefined,
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
      showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
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
              autoFocus
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
            <SwitchRow
              label={t('itemForm.alertSwitch')}
              hint={t('itemForm.alertHint')}
              value={alert}
              onChange={toggleAlert}
              accent={accent}
              testID="todo-alert"
            />
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
                <SwitchRow label={t('remNew.repeat')} hint={t('remNew.repeatHelper')} value={repeat} onChange={setRepeat} accent={accent} />
                {repeat ? (
                  <ChoiceChips
                    options={RECURRENCES.map(option => ({ value: option.value, label: t(option.labelKey) }))}
                    value={recurrence}
                    onChange={setRecurrence}
                    accent={accent}
                  />
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
        return <MoreOptions accent={accent}>{visibleMoreFields('todo', { alert }).map(renderMore)}</MoreOptions>;
      default:
        return null;
    }
  };

  return (
    <FormShell
      family="todo"
      title={t('itemForm.todo.title')}
      subtitle={t('itemForm.todo.subtitle')}
      saveLabel={t('itemForm.todo.submit')}
      saving={saving}
      onSave={handleSave}
      testID="todo-form"
    >
      {visibleSections('todo', { alert }).map(section => (
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

| Passage | Ce qu'il fait |
|---|---|
| `visibleSections('todo', { alert })` | L'écran dessine les sections **dans l'ordre du registre** |
| `dayOptions` | « Sans date » disparaît quand l'alerte est activée (une alerte sonne un jour précis) |
| `toggleAlert` | Activer l'alerte sans jour choisi prend aujourd'hui |
| `alertMoment(day, alertTime, …)` | Le jour et l'heure de l'alerte réunis en une date ; refusée si elle est déjà passée |
| `if (alert) createReminder … else createTask` | Avec alerte : un **rappel** (mêmes champs qu'avant : priorité, action, répétition, à confirmer) ; sans : une **tâche** (mêmes champs qu'avant) |
| `renderMore` | Ce qui est sous « Plus d'options », selon le registre |
| `testID="reminder-confirmation"` | Le même nom qu'avant pour l'interrupteur « à confirmer » |

### Étape 4 — Le formulaire « Moment »

Créer `src/features/create/MomentForm.tsx` :

<!-- bloc: moment-form -->

```tsx
/**
 * The "Moment" form (study 001, 12.2 "2-B"; sheet 012), in amber: What → Start and end → Where →
 * Leave … min before (only once a place is written) → With whom → More options, in the order of
 * the registry (constants/item-forms).
 */

import { Ionicons } from '@expo/vector-icons';
import { addHours, format } from 'date-fns';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  ChoiceChips,
  DictatedInput,
  FieldLabel,
  FormSection,
  FormShell,
  MoreOptions,
  type Choice,
} from '@/components/create/form/FormBricks';
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
import type { EventType } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';
import { EventUseCases } from '@/use-cases/event-use-cases';

export interface MomentFormProps {
  defaultDate?: string;
  defaultHour?: string;
  /** Opened from the page of a person: they already take part. */
  personId?: string;
}

/** The first hour of a new moment: the hour asked for, or the next full hour. */
function initialStart(defaultDate?: string, defaultHour?: string): Date {
  const now = new Date();
  const day = dayParam(defaultDate);
  const start = day ? new Date(`${day}T12:00:00`) : new Date(now);
  start.setHours(hourParam(defaultHour) ?? now.getHours() + 1, 0, 0, 0);
  return start;
}

export function MomentForm({ defaultDate, defaultHour, personId }: MomentFormProps) {
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
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
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
              autoFocus
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

  return (
    <FormShell
      family="moment"
      title={t('itemForm.moment.title')}
      subtitle={t('itemForm.moment.subtitle')}
      saveLabel={t('itemForm.moment.submit')}
      saving={saving}
      onSave={handleSave}
      testID="moment-form"
    >
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

| Passage | Ce qu'il fait |
|---|---|
| `initialStart` | La première heure : celle demandée par le Planning, sinon l'heure pleine suivante ; la fin, une heure après |
| `visibleSections('moment', { place })` | « Partir … min avant » n'apparaît qu'une fois un lieu écrit |
| `travelBufferMinutes: place ? … : 0` | Sans lieu, pas de trajet enregistré (les notifications de départ en ont besoin, fiche 011) |
| `if (endAt <= picked) setEndAt(…)` | Déplacer le début après la fin pousse la fin, une heure après |
| « Occupé / Libre » dans Plus d'options | Le réglage existant de disponibilité, rangé à part |

### Étape 5 — Les trois routes ouvrent les nouveaux formulaires

Remplacer tout le contenu de `src/app/tasks/new.tsx` :

<!-- bloc: route-task -->

```tsx
/** New "To do" (sheet 012): the form of the family, without an alert unless asked (?alert=1). */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function NewTaskScreen() {
  const params = useLocalSearchParams<{ defaultDate?: string; personId?: string; alert?: string }>();
  return <TodoForm initialAlert={params.alert === '1'} defaultDate={params.defaultDate} personId={params.personId} />;
}
```

Remplacer tout le contenu de `src/app/reminders/new.tsx` :

<!-- bloc: route-reminder -->

```tsx
/** New reminder (sheet 012): the "To do" form with its alert on. The route stays for every link to it. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function NewReminderScreen() {
  const params = useLocalSearchParams<{ defaultDate?: string; defaultHour?: string; personId?: string }>();
  return (
    <TodoForm initialAlert defaultDate={params.defaultDate} defaultHour={params.defaultHour} personId={params.personId} />
  );
}
```

Remplacer tout le contenu de `src/app/events/new.tsx` :

<!-- bloc: route-event -->

```tsx
/** New moment (sheet 012): the "Moment" form. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { MomentForm } from '@/features/create/MomentForm';

export default function NewEventScreen() {
  const params = useLocalSearchParams<{ defaultDate?: string; defaultHour?: string; personId?: string }>();
  return <MomentForm defaultDate={params.defaultDate} defaultHour={params.defaultHour} personId={params.personId} />;
}
```

### Étape 6 — « Temps pour le faire » règle le minuteur de Focus

Dans `src/domain/rules/focus-rules.ts`, juste avant `createFocusSession` :

<!-- bloc: focus-1-avant -->

```ts
export function createFocusSession(params?: {
```

<!-- bloc: focus-1-apres -->

```ts
/**
 * The timer of a session started from a task (sheet 012): its "time to do it", kept between 1 and
 * 120 minutes, or the default 25 minutes when it has none. A time that is not a preset is custom.
 */
export function focusMinutesForTask(estimatedMinutes?: number | null): {
  durationMinutes: number;
  selectionMode: FocusSelectionMode;
} {
  if (!estimatedMinutes || !Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
    return { durationMinutes: DEFAULT_FOCUS_MINUTES, selectionMode: 'preset' };
  }
  const minutes = Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(estimatedMinutes)));
  return {
    durationMinutes: minutes,
    selectionMode: (FOCUS_PRESETS as readonly number[]).includes(minutes) ? 'preset' : 'custom',
  };
}

export function createFocusSession(params?: {
```

Dans `src/app/focus.tsx`, l'import, le paramètre reçu et le minuteur :

<!-- bloc: focus-2-avant -->

```tsx
  calculateFocusProgress,
} from '@/domain/rules/focus-rules';
```

<!-- bloc: focus-2-apres -->

```tsx
  calculateFocusProgress,
  focusMinutesForTask,
} from '@/domain/rules/focus-rules';
```

<!-- bloc: focus-3-avant -->

```tsx
  const params = useLocalSearchParams<{ taskId?: string; taskTitle?: string }>();

  const [session, setSession] = useState<FocusSession>(() =>
    createFocusSession({
      durationMinutes: 25,
      taskId: params.taskId,
```

<!-- bloc: focus-3-apres -->

```tsx
  const params = useLocalSearchParams<{ taskId?: string; taskTitle?: string; minutes?: string }>();

  const [session, setSession] = useState<FocusSession>(() =>
    createFocusSession({
      // From a task: its "time to do it" (sheet 012), otherwise 25 minutes
      ...focusMinutesForTask(Number(params.minutes)),
      taskId: params.taskId,
```

Dans `src/app/tasks/[id].tsx`, le bouton Focus passe le temps de la tâche :

<!-- bloc: focus-4-avant -->

```tsx
                params: { taskId: task.id, taskTitle: task.title },
```

<!-- bloc: focus-4-apres -->

```tsx
                params: { taskId: task.id, taskTitle: task.title, minutes: String(task.estimatedMinutes ?? '') },
```

Et le nom, partout où il s'affiche (création, modification), dans `src/i18n/messages.ts` :

<!-- bloc: dur-fr-avant -->

```ts
  'taskNew.durationHeader': 'Durée estimée',
```

<!-- bloc: dur-fr-apres -->

```ts
  'taskNew.durationHeader': 'Temps pour le faire',
```

<!-- bloc: dur-en-avant -->

```ts
  'taskNew.durationHeader': 'Estimated time',
```

<!-- bloc: dur-en-apres -->

```ts
  'taskNew.durationHeader': 'Time to do it',
```

| Changement | Effet |
|---|---|
| `focusMinutesForTask` | Une tâche de 45 min ouvre Focus sur 45 min ; sans temps, 25 min comme avant ; 3 h est ramené à 120 min (le maximum de Focus) |
| `selectionMode: 'custom'` | 45 n'est pas un des boutons de Focus (5, 15, 25, 50) : le minuteur est « personnalisé » |
| `minutes: String(…)` | Le bouton Focus de la tâche transmet son temps |
| « Temps pour le faire » | Le même nom à la création, à la modification, et la même étiquette « 30 min » sur les cartes qu'avant |

### Étape 7 — Les textes (français et anglais)

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'settingsScreen.nightSaved': "Horaires de nuit enregistrés",
```

<!-- bloc: fr-apres -->

```ts
  'settingsScreen.nightSaved': "Horaires de nuit enregistrés",
  'itemForm.todo.title': "À faire",
  'itemForm.todo.subtitle': "Une chose à cocher, avec ou sans alerte",
  'itemForm.todo.submit': "Ajouter à mes choses à faire",
  'itemForm.moment.title': "Moment",
  'itemForm.moment.subtitle': "Un rendez-vous ou un événement, avec un début et une fin",
  'itemForm.moment.submit': "Ajouter ce moment",
  'itemForm.save': "Ajouter",
  'itemForm.saving': "Ajout…",
  'itemForm.what': "Quoi",
  'itemForm.todoPlaceholder': "Que faut-il faire ?",
  'itemForm.momentPlaceholder': "Quel moment ?",
  'itemForm.notesPlaceholder': "Notes (facultatif)",
  'itemForm.when': "Quand",
  'itemForm.noDay': "Sans date",
  'itemForm.alert': "Alerte",
  'itemForm.alertSwitch': "M'alerter à une heure",
  'itemForm.alertHint': "Sans alerte, elle attend dans ta liste. Avec, ton téléphone te prévient.",
  'itemForm.alertTime': "À {time}",
  'itemForm.priority': "Priorité",
  'itemForm.priorityHint': "« Urgente » sonne comme une alarme.",
  'itemForm.action': "Ce que tu feras",
  'itemForm.slot': "Début et fin",
  'itemForm.where': "Où",
  'itemForm.wherePlaceholder': "Adresse ou lieu (facultatif)",
  'itemForm.leave': "Partir … min avant",
  'itemForm.leaveHint': "Ton téléphone te dira quand partir.",
  'itemForm.more': "Plus d'options",
  'itemForm.less': "Moins d'options",
  'itemForm.durationHint': "Lancer Focus depuis cette tâche réglera le minuteur sur ce temps.",
  'itemForm.availability': "Pendant ce moment",
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'settingsScreen.nightSaved': "Night hours saved",
```

<!-- bloc: en-apres -->

```ts
  'settingsScreen.nightSaved': "Night hours saved",
  'itemForm.todo.title': "To do",
  'itemForm.todo.subtitle': "Something to tick off, with or without an alert",
  'itemForm.todo.submit': "Add to my to-dos",
  'itemForm.moment.title': "Moment",
  'itemForm.moment.subtitle': "An appointment or event, with a start and an end",
  'itemForm.moment.submit': "Add this moment",
  'itemForm.save': "Add",
  'itemForm.saving': "Adding…",
  'itemForm.what': "What",
  'itemForm.todoPlaceholder': "What needs doing?",
  'itemForm.momentPlaceholder': "What is happening?",
  'itemForm.notesPlaceholder': "Notes (optional)",
  'itemForm.when': "When",
  'itemForm.noDay': "No date",
  'itemForm.alert': "Alert",
  'itemForm.alertSwitch': "Alert me at a time",
  'itemForm.alertHint': "Without an alert it waits in your list. With one, your phone tells you.",
  'itemForm.alertTime': "At {time}",
  'itemForm.priority': "Priority",
  'itemForm.priorityHint': "“Urgent” rings like an alarm.",
  'itemForm.action': "What you will do",
  'itemForm.slot': "Start and end",
  'itemForm.where': "Where",
  'itemForm.wherePlaceholder': "Address or place (optional)",
  'itemForm.leave': "Leave … min before",
  'itemForm.leaveHint': "Your phone will tell you when to leave.",
  'itemForm.more': "More options",
  'itemForm.less': "Fewer options",
  'itemForm.durationHint': "Starting Focus from this task sets the timer to this time.",
  'itemForm.availability': "During this moment",
```

### Étape 8 — Les tests

Créer `src/__tests__/item-forms.test.ts` :

<!-- bloc: test -->

```ts
import {
  alertMoment,
  dayParam,
  hourParam,
  ITEM_FORMS,
  visibleMoreFields,
  visibleSections,
} from '../constants/item-forms';
import { ITEM_FAMILIES } from '../constants/item-kinds';
import { focusMinutesForTask } from '../domain/rules/focus-rules';

describe('the forms registry', () => {
  it('gives each family its own form, in the order of the study', () => {
    expect(Object.keys(ITEM_FORMS).sort()).toEqual([...ITEM_FAMILIES].sort());
    expect(visibleSections('todo')).toEqual(['what', 'when', 'alert', 'who', 'more']);
    expect(ITEM_FORMS.moment.sections).toEqual(['what', 'slot', 'where', 'leave', 'who', 'more']);
  });

  it('offers "Leave … min before" only once a place is written', () => {
    expect(visibleSections('moment', { place: '' })).not.toContain('leave');
    expect(visibleSections('moment', { place: '   ' })).not.toContain('leave');
    expect(visibleSections('moment', { place: 'Chez Léa' })).toContain('leave');
  });

  it('hides what a reminder does not have once the alert is on', () => {
    expect(visibleMoreFields('todo')).toEqual(['priority', 'deadline', 'duration', 'subtasks', 'tags']);
    expect(visibleMoreFields('todo', { alert: true })).toEqual(['tags']);
    expect(visibleMoreFields('moment', { alert: true })).toEqual(['availability', 'tags']);
  });

  it('reads the day and the hour handed by the Planning', () => {
    expect(dayParam('2026-11-24')).toBe('2026-11-24');
    expect(dayParam('2026-11-24T10:00:00.000Z')).toBe('2026-11-24');
    expect(dayParam('demain')).toBeUndefined();
    expect(dayParam(undefined)).toBeUndefined();
    expect(hourParam('14')).toBe(14);
    expect(hourParam('0')).toBe(0);
    expect(hourParam('24')).toBeUndefined();
    expect(hourParam('9.5')).toBeUndefined();
    expect(hourParam('')).toBeUndefined();
  });

  it('puts the alert on its day at its time, today when no day is chosen', () => {
    const now = new Date(2026, 10, 23, 15, 10);
    const onDay = alertMoment('2026-11-25', { hour: 9, minute: 30 }, now);
    expect([onDay.getFullYear(), onDay.getMonth(), onDay.getDate(), onDay.getHours(), onDay.getMinutes()]).toEqual([2026, 10, 25, 9, 30]);
    const today = alertMoment(undefined, { hour: 18, minute: 0 }, now);
    expect([today.getDate(), today.getHours()]).toEqual([23, 18]);
  });
});

describe('the time to do a task, in Focus', () => {
  it('sets the timer to the time of the task', () => {
    expect(focusMinutesForTask(15)).toEqual({ durationMinutes: 15, selectionMode: 'preset' });
    expect(focusMinutesForTask(45)).toEqual({ durationMinutes: 45, selectionMode: 'custom' });
  });

  it('keeps 25 minutes for a task without a time', () => {
    expect(focusMinutesForTask(undefined)).toEqual({ durationMinutes: 25, selectionMode: 'preset' });
    expect(focusMinutesForTask(Number(''))).toEqual({ durationMinutes: 25, selectionMode: 'preset' });
    expect(focusMinutesForTask(Number(undefined))).toEqual({ durationMinutes: 25, selectionMode: 'preset' });
  });

  it('keeps the timer within what Focus allows', () => {
    expect(focusMinutesForTask(180)).toEqual({ durationMinutes: 120, selectionMode: 'custom' });
  });
});
```

| Test | Ce qu'il prouve |
|---|---|
| ordre | Chaque famille a son formulaire, dans l'ordre de l'étude |
| lieu | « Partir … min avant » n'apparaît qu'avec un vrai lieu (des espaces ne comptent pas) |
| alerte | Avec l'alerte, seules les étiquettes restent dans Plus d'options (la priorité est montée sous l'alerte) |
| paramètres | Le jour et l'heure venus du Planning sont lus proprement, les valeurs fausses ignorées |
| heure de l'alerte | Le bon jour à la bonne heure ; aujourd'hui sans jour |
| Focus | 15 min = un bouton de Focus ; 45 = personnalisé ; sans temps = 25 ; 3 h = 120 |

## 8. Test final

```bash
npx jest src/__tests__/item-forms.test.ts
npx jest
npx tsc --noEmit
npx eslint src/constants/item-forms.ts src/components/create/form/FormBricks.tsx src/features/create src/app/tasks src/app/reminders/new.tsx src/app/events/new.tsx src/app/focus.tsx src/domain/rules/focus-rules.ts src/__tests__/item-forms.test.ts
```

Résultat attendu : `Tests: 8 passed` pour le nouveau fichier ; toute la suite passe ; `tsc` et `eslint` n'affichent rien.

**Sur le web** :
1. Accueil › « + » › **À faire** › Sans alerte : formulaire **cyan**, « Quoi », « Quand », « Alerte » (éteinte), « Avec qui », « Plus d'options ». Écrire un titre, Aujourd'hui, Ajouter : la tâche apparaît.
2. Activer **Alerte** : l'heure, la priorité, l'action, la répétition et « à confirmer » apparaissent ; « Sans date » disparaît ; Plus d'options ne garde que les étiquettes. Ajouter : un rappel est créé.
3. « + » › **Moment** : formulaire **ambre** ; « Partir … min avant » apparaît dès qu'un lieu est écrit.
4. Une tâche avec « Temps pour le faire » 45 min › sa fiche › Focus : le minuteur affiche 45:00.
5. Thème clair : les deux formulaires restent lisibles (cyan et ambre foncés, bouton à texte blanc).

**Sur le téléphone** : le micro à côté du titre et des notes ; parler remplit le champ.

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| `Property 'fieldSub' does not exist` | Le style porte un autre nom dans `form-styles.ts` | Chercher le nom du petit texte d'aide dans `src/styles/common/form-styles.ts` et le mettre dans `FieldLabel` et `SwitchRow` |
| Le micro n'apparaît pas | Normal sur le web et sur iPhone : la dictée est seulement sur Android | Tester sur le téléphone |
| La dictée remplit les deux champs | `mineRef` absent ou mal recopié | Recopier le bloc de l'étape 2 |
| « Il faut une heure à venir » en activant l'alerte le soir | L'heure proposée est l'heure suivante du jour choisi ; après 23 h, elle revient à minuit | Choisir Demain, ou une autre heure |
| Un ancien test cherche un texte de l'ancien formulaire | Les écrans ont changé | Mettre à jour le test avec le nouveau texte, ou chercher par `testID` |

## 10. Lexique

- **Registre** : une liste unique qui décrit quelque chose (ici, les sections de chaque formulaire) ; les écrans la lisent au lieu de tout écrire en dur.
- **Brique** : un petit composant réutilisable (une section, un champ, une rangée de choix).
- **Route** : l'adresse d'un écran dans l'appli (`/tasks/new`). On garde les routes pour que tous les liens existants continuent de marcher.
- **Dictée sur l'appareil** : la voix est reconnue par le téléphone lui-même, sans Internet.

## 11. Et après

1. Les écrans de **modification** (tâche, rappel, moment) avec les mêmes briques.
2. Le chantier n° 4 (12.10) : l'onglet « À faire » et le bouton « + À faire ou moment ».
3. Au chantier n° 5 : le champ « Type de moment » dans le registre (`ITEM_FORMS.moment`).

## Compte rendu d'exécution (23 novembre 2026)

- Décisions prises avant d'écrire et notées dans l'étude 001, section 12.2 : création d'abord ; priorité sous l'Alerte ; options des rappels sous l'Alerte ; la durée devient « Temps pour le faire », reliée au minuteur de Focus (elle ne servait à rien, d'où l'incompréhension : seulement une étiquette « 30 min » sur les cartes).
- Code lu avant d'écrire : les trois anciens formulaires en entier, la dictée de la saisie rapide (`use-dictation.ts`), les routes du choix « Nouveau », Focus et son lancement depuis une tâche.
- Étapes 1 à 8 appliquées **à partir des blocs de cette fiche** (`docs/tutoriel-suite/outils/appliquer-fiche-012.js`) : toutes les modifications trouvées une seule fois.
- Tests : `Tests: 8 passed` (nouveau fichier) ; toute la suite `Test Suites: 89 passed`, `Tests: 1926 passed` ; `tsc` et `eslint` sans erreur, du premier coup.
- **Vu sur le web** : « À faire » en cyan, sections dans l'ordre de l'étude ; l'Alerte activée fait disparaître « Sans date », choisit Aujourd'hui, montre l'heure, la priorité avec son explication, l'action, la répétition et « à confirmer » ; « Moment » en ambre ; « Partir … min avant » n'apparaît qu'après avoir écrit un lieu.
- **Deux écarts corrigés après les avoir vus à l'écran** (la fiche décrit maintenant la version corrigée) :
  1. le titre de l'action reprenait un vieux texte jargonneux (« Sphère d'Intention & Action ») : nouveau texte `itemForm.action` « Ce que tu feras » / « What you will do » ;
  2. « Début » et « Fin » n'affichaient que la date : ils affichent l'heure puis la date (« 14:00 · 23 nov. 2026 »), comme l'ancien formulaire.
- Les 8 fichiers créés ou remplacés ont été comparés à leurs blocs : identiques.
- **Pas vérifié** : le thème clair des deux formulaires, le minuteur de Focus réglé par une vraie tâche (couvert par le test de `focusMinutesForTask`), l'enregistrement réel d'une tâche, d'un rappel et d'un moment (mêmes fonctions qu'avant : `createTask`, `createReminder`, `createEvent`), et la dictée (Android seulement). À voir sur le téléphone avec un nouvel APK. Rien n'est encore enregistré dans git.

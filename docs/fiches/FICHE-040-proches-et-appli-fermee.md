# FICHE OPÉRATOIRE N° 040 — Les Proches : ajouter depuis un formulaire, modifier ; et l'appli fermée

Projet : **Junix Pulse** · Date : 27 novembre 2026 · Suite de : [FICHE 039](FICHE-039-musiques-et-terminer.md)

---

## 1. Objectif

Tes demandes sur les **Proches**, et une sur les **notifications appli fermée** :

| Ta demande | Ce que fait cette fiche |
|---|---|
| depuis un formulaire (moment, tâche, rappel), pouvoir aller créer une personne | « **+ Nouvelle personne** » toujours en tête de la liste « Avec qui ? » ; la personne créée revient **cochée** dans le formulaire |
| pouvoir modifier la carte d'une personne (« Ami » au lieu de « Famille ») | un **crayon** sur la page de la personne : le même formulaire, déjà rempli |
| que les rappels sonnent même appli fermée | c'est déjà le principe (Android les garde) ; pour les téléphones qui arrêtent les applis fermées : une ligne « **Fonctionner appli fermée** » |
| (vu en passant) | la liste « Avec qui ? » écrivait « Friend » : elle écrit la relation dans la langue de l'appli |

![« Nouvelle personne » en tête de la liste](images/fiche-040-avec-qui.jpg)

*Figure 40-1 — Capture réelle (web) : « Avec qui ? » d'un nouveau moment.*

![La personne modifiée](images/fiche-040-modifier.jpg)

*Figure 40-2 — Capture réelle : la page de la personne après « Modifier » (relation Famille), le crayon à côté de la corbeille.*

**Le partage** (ton autre question) n'est pas dans cette fiche : le lien que tu décris (télécharger l'appli, puis la carte ajoutée) demande un vrai lien web et un petit site, donc un hébergement : il rejoint le chantier n° 10.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 039 est enregistrée | `git log --oneline -1` | `feat(sounds): a phone music for each priority, and Terminer on the alarm` |
| Tout passe | `npx jest` | `Tests: 2160 passed` |

## 3. Matériel

Rien de nouveau.

## 4. Hypothèses

- La personne créée depuis « Avec qui ? » est cochée dans le formulaire d'où tu viens, une seule fois.
- La page « Fonctionner appli fermée » d'Android dépend de la marque du téléphone ; si la liste des optimisations ne s'ouvre pas, c'est la page de l'appli qui s'ouvre (Batterie → Sans restriction).

## 5. Carte de l'intervention

| Fichier | Action |
|---|---|
| `features/people/picked-person.ts` (+ test) | **nouveau** : le relais de la personne créée |
| `components/people/PersonPicker.tsx`, `PersonField.tsx` | « Nouvelle personne », cochée au retour ; la relation traduite |
| `app/people/new.tsx`, `app/people/[id].tsx`, `features/people/relation-label.ts`, `use-cases/person-use-cases.ts` | modifier une personne |
| `…/junixalarm/JunixAlarmModule.kt`, `modules/junix-alarm/index.ts`, `services/alarm-bridge.ts`, `app/settings/index.tsx`, i18n | « Fonctionner appli fermée » |

## 6. Sauvegarde

`git status` propre (hors `docs/motion/`). Aucune migration.

## 7. Pas à pas

Le plus simple : `node docs/fiches/outils/appliquer-fiche-040.js .` fait toutes les étapes ci-dessous ; puis l'APK (fiche 003).

### Étape 1 — « + Nouvelle personne » depuis « Avec qui ? », et elle revient cochée

**Pourquoi** : La liste « Avec qui ? » ne proposait de créer une personne que si tu n'en avais aucune. Maintenant, sa première ligne est toujours « Nouvelle personne ». Le formulaire de la personne (avec « Importer depuis les contacts ») s'ouvre ; à l'enregistrement, il laisse l'identifiant de la personne dans un petit relais en mémoire (`picked-person`), et le formulaire d'où tu venais la coche en revenant à l'écran. La liste montre aussi la relation dans la langue de l'appli (« Ami·e », plus « Friend »), comme la page de la personne.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-040.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/features/people/picked-person.ts`

Fichier nouveau, en entier :

<!-- bloc: new-picked-person -->

```ts
/**
 * A person created from "Avec qui ?" of a form (sheet 040): the person form leaves her id here, and
 * the form she was created for takes it when it comes back into view, already ticked. Kept in memory
 * only: one person at a time, taken once.
 */
let lastCreated: string | null = null;

export function leavePickedPerson(id: string): void {
  lastCreated = id;
}

/** The person just created for a form, once; null when there is none. */
export function takePickedPerson(): string | null {
  const id = lastCreated;
  lastCreated = null;
  return id;
}
```

#### `src/features/people/__tests__/picked-person.test.ts`

Fichier nouveau, en entier :

<!-- bloc: new-picked-person-test -->

```ts
import { leavePickedPerson, takePickedPerson } from '../picked-person';

describe('picked-person, a person created from "Avec qui ?" (sheet 040)', () => {
  it('gives the person created once, to the form she was made for', () => {
    expect(takePickedPerson()).toBeNull();
    leavePickedPerson('p1');
    expect(takePickedPerson()).toBe('p1');
    // Taken: a second form does not tick her again
    expect(takePickedPerson()).toBeNull();
  });
});
```

#### `src/components/people/PersonPicker.tsx`


Changement 1 sur 5. Chercher :

<!-- bloc: personpicker-1-avant -->

```tsx
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

import { PersonAvatar } from './PersonAvatar';

```

Remplacer par :

<!-- bloc: personpicker-1-apres -->

```tsx
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { relationLabel } from '@/features/people/relation-label';

import { PersonAvatar } from './PersonAvatar';

```

Changement 2 sur 5. Chercher :

<!-- bloc: personpicker-2-avant -->

```tsx
                size="md"
                onPress={() => {
                  close();
                  router.push('/people/new');
                }}
              />
            </View>
```

Remplacer par :

<!-- bloc: personpicker-2-apres -->

```tsx
                size="md"
                onPress={() => {
                  close();
                  router.push({ pathname: '/people/new', params: { pick: '1' } });
                }}
              />
            </View>
```

Changement 3 sur 5. Chercher :

<!-- bloc: personpicker-3-avant -->

```tsx
              </View>

              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {shown.length === 0 && <Text style={styles.noMatch}>{t('personPicker.noMatch')}</Text>}
                {shown.map(person => {
                  const selected = selectedIds.includes(person.id);
```

Remplacer par :

<!-- bloc: personpicker-3-apres -->

```tsx
              </View>

              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {/* Always the first row (sheet 040): a new person, who comes back ticked in the form */}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    close();
                    router.push({ pathname: '/people/new', params: { pick: '1' } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('personPicker.newPerson')}
                  testID="person-picker-new"
                >
                  <View style={styles.newIcon}>
                    <Ionicons name="person-add-outline" size={18} color={palette.primary.default} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.name, { color: palette.primary.default }]} numberOfLines={1}>
                      {t('personPicker.newPerson')}
                    </Text>
                  </View>
                  <Ionicons name="add" size={22} color={palette.primary.default} />
                </TouchableOpacity>
                {shown.length === 0 && <Text style={styles.noMatch}>{t('personPicker.noMatch')}</Text>}
                {shown.map(person => {
                  const selected = selectedIds.includes(person.id);
```

Changement 4 sur 5. Chercher :

<!-- bloc: personpicker-4-avant -->

```tsx
                        </Text>
                        {!!person.relationship && (
                          <Text style={styles.relation} numberOfLines={1}>
                            {person.relationship}
                          </Text>
                        )}
                      </View>
```

Remplacer par :

<!-- bloc: personpicker-4-apres -->

```tsx
                        </Text>
                        {!!person.relationship && (
                          <Text style={styles.relation} numberOfLines={1}>
                            {/* In today's language, as on the page of the person (sheets 028 and 040) */}
                            {relationLabel(person.relationship, t)}
                          </Text>
                        )}
                      </View>
```

Changement 5 sur 5. Chercher :

<!-- bloc: personpicker-5-avant -->

```tsx
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
    },
    rowSelected: {
      backgroundColor: theme.glass.controlActive,
    },
```

Remplacer par :

<!-- bloc: personpicker-5-apres -->

```tsx
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
    },
    newIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.primary.default,
    },
    rowSelected: {
      backgroundColor: theme.glass.controlActive,
    },
```

#### `src/components/people/PersonField.tsx`


Changement 1 sur 2. Chercher :

<!-- bloc: personfield-1-avant -->

```tsx
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { Person } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
```

Remplacer par :

<!-- bloc: personfield-1-apres -->

```tsx
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { takePickedPerson } from '@/features/people/picked-person';

import type { Person } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
```

Changement 2 sur 2. Chercher :

<!-- bloc: personfield-2-avant -->

```tsx
  const [persons, setPersons] = useState<Person[]>([]);
  const [picking, setPicking] = useState(false);

  // Read again when the form comes back into view: a person may just have been created
  useFocusEffect(
    useCallback(() => {
      let active = true;
      PersonRepository.findAll()
        .then(list => {
          if (active) setPersons(list);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [])
  );

```

Remplacer par :

<!-- bloc: personfield-2-apres -->

```tsx
  const [persons, setPersons] = useState<Person[]>([]);
  const [picking, setPicking] = useState(false);

  // Read again when the form comes back into view: a person may just have been created, from
  // "+ Nouvelle personne" (sheet 040): she comes back ticked
  useFocusEffect(
    useCallback(() => {
      let active = true;
      PersonRepository.findAll()
        .then(list => {
          if (!active) return;
          setPersons(list);
          const created = takePickedPerson();
          if (created && list.some(person => person.id === created) && !selectedIds.includes(created)) {
            onChange(multiple ? [...selectedIds, created] : [created]);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- read on focus; the ticked ones are read at that moment
    }, [])
  );

```


### Étape 2 — Modifier une personne

**Pourquoi** : Un crayon, à côté de la corbeille, sur la page de la personne. Il ouvre le **même formulaire**, déjà rempli (pas un second formulaire à entretenir). La relation est cochée de nouveau ; une relation écrite avec tes mots (« Maman ») est gardée telle quelle, sauf si tu en coches une autre. Un champ vidé (un numéro effacé) est vraiment effacé : la mise à jour accepte maintenant « vide = enlever ».

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-040.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/app/people/new.tsx`


Changement 1 sur 8. Chercher :

<!-- bloc: new-1-avant -->

```tsx
 * Thématisé dynamiquement : mode sombre Midnight Glow et mode clair crème chaleureuse.
 */

import { useState } from 'react';
import {
  View,
  Text,
```

Remplacer par :

<!-- bloc: new-1-apres -->

```tsx
 * Thématisé dynamiquement : mode sombre Midnight Glow et mode clair crème chaleureuse.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
```

Changement 2 sur 8. Chercher :

<!-- bloc: new-2-avant -->

```tsx
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
```

Remplacer par :

<!-- bloc: new-2-apres -->

```tsx
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
```

Changement 3 sur 8. Chercher :

<!-- bloc: new-3-avant -->

```tsx
import { Contact, requestPermissionsAsync } from 'expo-contacts';

import { PersonUseCases } from '@/use-cases/person-use-cases';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
```

Remplacer par :

<!-- bloc: new-3-apres -->

```tsx
import { Contact, requestPermissionsAsync } from 'expo-contacts';

import { PersonUseCases } from '@/use-cases/person-use-cases';
import { PersonRepository } from '@/repositories/person-repository';
import { relationKeyOf } from '@/features/people/relation-label';
import { leavePickedPerson } from '@/features/people/picked-person';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
```

Changement 4 sur 8. Chercher :

<!-- bloc: new-4-avant -->

```tsx
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNewPersonStyles);

  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState<MessageKey>('rel.friend');
  const [phone, setPhone] = useState('');
```

Remplacer par :

<!-- bloc: new-4-apres -->

```tsx
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNewPersonStyles);

  // With an id, the same form edits a person (sheet 040); with pick, it was opened from "Avec qui ?"
  const params = useLocalSearchParams<{ id?: string; pick?: string }>();
  const editingId = typeof params.id === 'string' && params.id ? params.id : null;
  // A relation written in one's own words (« Maman ») is kept as it is, unless another one is ticked
  const [ownRelation, setOwnRelation] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState<MessageKey>('rel.friend');
  const [phone, setPhone] = useState('');
```

Changement 5 sur 8. Chercher :

<!-- bloc: new-5-avant -->

```tsx
  const [importedFromContacts, setImportedFromContacts] = useState(false);
  const [nameError, setNameError] = useState('');

  async function handleImportFromContacts() {
    setImporting(true);
    try {
```

Remplacer par :

<!-- bloc: new-5-apres -->

```tsx
  const [importedFromContacts, setImportedFromContacts] = useState(false);
  const [nameError, setNameError] = useState('');

  // Editing: the form starts with what the person has
  useEffect(() => {
    if (!editingId) return;
    let alive = true;
    PersonRepository.findById(editingId)
      .then(person => {
        if (!alive || !person) return;
        setDisplayName(person.displayName);
        const known = relationKeyOf(person.relationship);
        setRelationship(known ?? 'rel.other');
        setOwnRelation(!known && person.relationship ? person.relationship : null);
        setPhone(person.phone ?? '');
        setEmail(person.email ?? '');
        setBirthDate(person.birthDate);
        setNotes(person.notes ?? '');
        setForgottenThresholdDays(person.forgottenThresholdDays ?? 30);
        setTimeInfo({ timezone: person.timezone, availability: person.availability });
        setImportedFromContacts(Boolean(person.importedFromContacts));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [editingId]);

  async function handleImportFromContacts() {
    setImporting(true);
    try {
```

Changement 6 sur 8. Chercher :

<!-- bloc: new-6-avant -->

```tsx
    setSaving(true);

    try {
      await PersonUseCases.createPerson({
        displayName: displayName.trim(),
        relationship: t(relationship),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthDate,
```

Remplacer par :

<!-- bloc: new-6-apres -->

```tsx
    setSaving(true);

    try {
      // A relation in one's own words stays, unless another relation was ticked
      const relationText = ownRelation && relationship === 'rel.other' ? ownRelation : t(relationship);
      if (editingId) {
        await PersonUseCases.updatePerson({
          id: editingId,
          displayName: displayName.trim(),
          relationship: relationText,
          phone: phone.trim() || null,
          email: email.trim() || null,
          birthDate: birthDate ?? null,
          notes: notes.trim() || null,
          forgottenThresholdDays,
          timezone: timeInfo.timezone,
          availability: timeInfo.availability,
        });
        showSnackbar(t('personEdit.saved'));
        router.back();
        return;
      }
      const createdId = await PersonUseCases.createPerson({
        displayName: displayName.trim(),
        relationship: relationText,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthDate,
```

Changement 7 sur 8. Chercher :

<!-- bloc: new-7-avant -->

```tsx
        timezone: timeInfo.timezone,
        availability: timeInfo.availability,
      });

      showSnackbar(t('personNew.created'));
      router.back();
```

Remplacer par :

<!-- bloc: new-7-apres -->

```tsx
        timezone: timeInfo.timezone,
        availability: timeInfo.availability,
      });
      // Created from "Avec qui ?" of a form: it comes back ticked there (sheet 040)
      if (params.pick) leavePickedPerson(createdId);

      showSnackbar(t('personNew.created'));
      router.back();
```

Changement 8 sur 8. Chercher :

<!-- bloc: new-8-avant -->

```tsx
        >
          <Ionicons name="close" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('personNew.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
```

Remplacer par :

<!-- bloc: new-8-apres -->

```tsx
        >
          <Ionicons name="close" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(editingId ? 'personEdit.title' : 'personNew.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
```

#### `src/app/people/[id].tsx`


Changement 1 sur 1. Chercher :

<!-- bloc: -id--1-avant -->

```tsx
        <Text style={styles.headerTitle} numberOfLines={1}>
          {person.displayName}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDeletePerson}
```

Remplacer par :

<!-- bloc: -id--1-apres -->

```tsx
        <Text style={styles.headerTitle} numberOfLines={1}>
          {person.displayName}
        </Text>
        {/* Modifier (sheet 040): the same form as for a new person, already filled */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push({ pathname: '/people/new', params: { id: person.id } })}
          accessibilityRole="button"
          accessibilityLabel={t('personEdit.a11y')}
          testID="person-edit"
        >
          <Ionicons name="create-outline" size={22} color={theme.primary.default} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDeletePerson}
```

#### `src/features/people/relation-label.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: relation-label-1-avant -->

```ts
  RELATION_KEYS.map(key => [key, Object.values(MESSAGES).map(catalog => catalog[key])])
) as Record<(typeof RELATION_KEYS)[number], string[]>;

export function relationLabel(stored: string, t: TFunction): string {
  const key = knownRelationKey(stored, RELATION_LABELS);
  return key ? t(key) : stored;
```

Remplacer par :

<!-- bloc: relation-label-1-apres -->

```ts
  RELATION_KEYS.map(key => [key, Object.values(MESSAGES).map(catalog => catalog[key])])
) as Record<(typeof RELATION_KEYS)[number], string[]>;

/** The known relation of a stored text, to tick it again when the person is edited (sheet 040). */
export function relationKeyOf(stored: string | null | undefined): (typeof RELATION_KEYS)[number] | null {
  return knownRelationKey(stored, RELATION_LABELS);
}

export function relationLabel(stored: string, t: TFunction): string {
  const key = knownRelationKey(stored, RELATION_LABELS);
  return key ? t(key) : stored;
```

#### `src/use-cases/person-use-cases.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: person-use-cases-1-avant -->

```ts
  id: string;
  displayName?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  forgottenThresholdDays?: number;
  /** Null clears it. */
  timezone?: string | null;
```

Remplacer par :

<!-- bloc: person-use-cases-1-apres -->

```ts
  id: string;
  displayName?: string;
  relationship?: string;
  /** Null clears it (the person was edited and the field emptied, sheet 040). */
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  forgottenThresholdDays?: number;
  /** Null clears it. */
  timezone?: string | null;
```

Changement 2 sur 2. Chercher :

<!-- bloc: person-use-cases-2-avant -->

```ts
      availability: timeInfo.availability,
      displayName: input.displayName?.trim(),
      relationship: input.relationship?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
      notes: input.notes?.trim(),
      updatedAt: now,
    });
  },
```

Remplacer par :

<!-- bloc: person-use-cases-2-apres -->

```ts
      availability: timeInfo.availability,
      displayName: input.displayName?.trim(),
      relationship: input.relationship?.trim(),
      // Null clears the field; a text is kept trimmed (sheet 040)
      phone: input.phone === null ? null : input.phone?.trim(),
      email: input.email === null ? null : input.email?.trim(),
      notes: input.notes === null ? null : input.notes?.trim(),
      updatedAt: now,
    });
  },
```


### Étape 3 — « Fonctionner appli fermée »

**Pourquoi** : Les rappels et les alarmes sont confiés à Android à l'avance : ils sonnent appli fermée. Mais certains téléphones économisent fort la batterie et arrêtent les applis fermées, avec leurs rappels. Le module dit si Junix est hors de l'économiseur de batterie (`isIgnoringBatteryOptimizations`, sans permission spéciale) et ouvre la page d'Android pour l'en sortir. Une ligne de Notifications et vibrations dit « Autorisé » ou « À autoriser », et se met à jour au retour dans Junix.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-040.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/JunixAlarmModule.kt`


Changement 1 sur 1. Chercher :

<!-- bloc: mod-junixalarmmodule-1-avant -->

```kotlin
      }
    }

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
```

Remplacer par :

<!-- bloc: mod-junixalarmmodule-1-apres -->

```kotlin
      }
    }

    /**
     * Whether Android leaves Junix out of its battery saver (sheet 040): on phones that save the
     * battery hard, an app left in it may lose its reminders once closed.
     */
    Function("isIgnoringBatteryOptimizations") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@Function true
      val power = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
      power.isIgnoringBatteryOptimizations(context.packageName)
    }

    /**
     * Opens the page of Android to take Junix out of the battery saver: the list of the battery
     * optimizations (no special permission needed), or else the page of the app.
     */
    Function("openBatterySettings") {
      val list = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      val app = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(list)
        true
      } catch (error: Exception) {
        try {
          context.startActivity(app)
          true
        } catch (other: Exception) {
          false
        }
      }
    }

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
```

#### `modules/junix-alarm/index.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: mod-index-1-avant -->

```ts
  openFullScreenSettings(): boolean;
  pickMusic(): Promise<PickedSound | null>;
  syncPhoneChannels(channels: PhoneChannel[]): void;
  previewUri(uri: string, durationMs: number): boolean;
  stopPreview(): void;
}
```

Remplacer par :

<!-- bloc: mod-index-1-apres -->

```ts
  openFullScreenSettings(): boolean;
  pickMusic(): Promise<PickedSound | null>;
  syncPhoneChannels(channels: PhoneChannel[]): void;
  isIgnoringBatteryOptimizations(): boolean;
  openBatterySettings(): boolean;
  previewUri(uri: string, durationMs: number): boolean;
  stopPreview(): void;
}
```

Changement 2 sur 2. Chercher :

<!-- bloc: mod-index-2-avant -->

```ts
    native?.stopPreview();
  },

  /** Opens the page of Android to allow it; false when it could not be opened. */
  openFullScreenSettings(): boolean {
    return native ? native.openFullScreenSettings() : false;
```

Remplacer par :

<!-- bloc: mod-index-2-apres -->

```ts
    native?.stopPreview();
  },

  /** Whether Android leaves Junix out of its battery saver; null without the module (sheet 040). */
  isIgnoringBatteryOptimizations(): boolean | null {
    return native ? native.isIgnoringBatteryOptimizations() : null;
  },

  /** Opens the page of Android to take Junix out of the battery saver. */
  openBatterySettings(): boolean {
    return native ? native.openBatterySettings() : false;
  },

  /** Opens the page of Android to allow it; false when it could not be opened. */
  openFullScreenSettings(): boolean {
    return native ? native.openFullScreenSettings() : false;
```

#### `src/services/alarm-bridge.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: alarm-bridge-1-avant -->

```ts
  }
}

/** Opens the page of Android where the person allows it. */
export function openFullScreenAlarmSettings(): boolean {
  return nativeAlarmsOn() ? JunixAlarm.openFullScreenSettings() : false;
```

Remplacer par :

<!-- bloc: alarm-bridge-1-apres -->

```ts
  }
}

/**
 * Whether Junix works with the app closed on this phone (sheet 040): out of the battery saver of
 * Android. null where the alarm of Junix does not exist (web).
 */
export function closedAppAllowed(): boolean | null {
  if (!nativeAlarmsOn()) return null;
  try {
    return JunixAlarm.isIgnoringBatteryOptimizations();
  } catch {
    return null;
  }
}

/** Opens the page of Android to take Junix out of the battery saver. */
export function openClosedAppSettings(): boolean {
  return nativeAlarmsOn() ? JunixAlarm.openBatterySettings() : false;
}

/** Opens the page of Android where the person allows it. */
export function openFullScreenAlarmSettings(): boolean {
  return nativeAlarmsOn() ? JunixAlarm.openFullScreenSettings() : false;
```

#### `src/app/settings/index.tsx`


Changement 1 sur 5. Chercher :

<!-- bloc: index-1-avant -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AlertDefaultsSetting } from '@/components/settings/AlertDefaultsSetting';
import { SoundSetting } from '@/components/settings/SoundSetting';
import { fullScreenAlarmsAllowed, openFullScreenAlarmSettings, pickPhoneSound, previewPhoneSound } from '@/services/alarm-bridge';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { DEFAULT_SOUND_PREFS, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { NotificationSoundService } from '@/services/sound/NotificationSoundService';
```

Remplacer par :

<!-- bloc: index-1-apres -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AlertDefaultsSetting } from '@/components/settings/AlertDefaultsSetting';
import { SoundSetting } from '@/components/settings/SoundSetting';
import {
  closedAppAllowed,
  fullScreenAlarmsAllowed,
  openClosedAppSettings,
  openFullScreenAlarmSettings,
  pickPhoneSound,
  previewPhoneSound,
} from '@/services/alarm-bridge';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { DEFAULT_SOUND_PREFS, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { NotificationSoundService } from '@/services/sound/NotificationSoundService';
```

Changement 2 sur 5. Chercher :

<!-- bloc: index-2-avant -->

```tsx
  const [canEnableExactAlarms, setCanEnableExactAlarms] = useState(false);
  // Whether the page of the alarm may light the locked screen (sheet 035); null: no alarm of Junix here
  const [fullScreenAlarms, setFullScreenAlarms] = useState<boolean | null>(null);

  const loadSettings = useCallback(async () => {
    setAutoBackup(await getAutoBackupConfig());
```

Remplacer par :

<!-- bloc: index-2-apres -->

```tsx
  const [canEnableExactAlarms, setCanEnableExactAlarms] = useState(false);
  // Whether the page of the alarm may light the locked screen (sheet 035); null: no alarm of Junix here
  const [fullScreenAlarms, setFullScreenAlarms] = useState<boolean | null>(null);
  // Whether Junix rings with the app closed: out of the battery saver (sheet 040); null on the web
  const [closedApp, setClosedApp] = useState<boolean | null>(null);

  const loadSettings = useCallback(async () => {
    setAutoBackup(await getAutoBackupConfig());
```

Changement 3 sur 5. Chercher :

<!-- bloc: index-3-avant -->

```tsx
    const exactAlarms = await NotificationService.getExactAlarmStatus();
    setCanEnableExactAlarms(!exactAlarms.granted && exactAlarms.canAsk);
    setFullScreenAlarms(fullScreenAlarmsAllowed());
    try {
      const pinConfigured = await SanctumAuthService.isPinConfigured();
      setIsSanctumPinConfigured(pinConfigured);
```

Remplacer par :

<!-- bloc: index-3-apres -->

```tsx
    const exactAlarms = await NotificationService.getExactAlarmStatus();
    setCanEnableExactAlarms(!exactAlarms.granted && exactAlarms.canAsk);
    setFullScreenAlarms(fullScreenAlarmsAllowed());
    setClosedApp(closedAppAllowed());
    try {
      const pinConfigured = await SanctumAuthService.isPinConfigured();
      setIsSanctumPinConfigured(pinConfigured);
```

Changement 4 sur 5. Chercher :

<!-- bloc: index-4-avant -->

```tsx
  // Back from the settings of Android: the row says at once whether it is allowed now (sheet 035)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setFullScreenAlarms(fullScreenAlarmsAllowed());
    });
    return () => subscription.remove();
  }, []);
```

Remplacer par :

<!-- bloc: index-4-apres -->

```tsx
  // Back from the settings of Android: the row says at once whether it is allowed now (sheet 035)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setFullScreenAlarms(fullScreenAlarmsAllowed());
        setClosedApp(closedAppAllowed());
      }
    });
    return () => subscription.remove();
  }, []);
```

Changement 5 sur 5. Chercher :

<!-- bloc: index-5-avant -->

```tsx
        </TouchableOpacity>
      )}

      {settings.notificationsEnabled && (
        <View style={styles.row}>
          <View style={styles.rowTextFill}>
```

Remplacer par :

<!-- bloc: index-5-apres -->

```tsx
        </TouchableOpacity>
      )}

      {/* With the app closed (sheet 040): phones that save the battery hard may stop its reminders */}
      {settings.notificationsEnabled && closedApp !== null && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            if (!openClosedAppSettings()) GlassAlert.alert(t('closedApp.label'), t('closedApp.hint'));
          }}
          accessibilityRole="button"
          accessibilityLabel={`${t('closedApp.label')}, ${t(closedApp ? 'alarm.fullScreenOn' : 'alarm.fullScreenOff')}`}
          testID="settings-closed-app"
        >
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('closedApp.label')}</Text>
            <Text style={styles.rowSub}>{t('closedApp.hint')}</Text>
          </View>
          <Text style={[styles.rowSub, { color: closedApp ? palette.success.default : palette.primary.default }]}>
            {t(closedApp ? 'alarm.fullScreenOn' : 'alarm.fullScreenOff')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
        </TouchableOpacity>
      )}

      {settings.notificationsEnabled && (
        <View style={styles.row}>
          <View style={styles.rowTextFill}>
```

#### `src/i18n/messages-rest-fr.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-fr-1-avant -->

```ts
  'alarm.fullScreenHint': "Pour qu’une alarme allume l’écran, même verrouillé. Sinon, elle sonne en notification.",
  'alarm.fullScreenOn': "Autorisé",
  'alarm.fullScreenOff': "À autoriser",
  'alarm.done': "Terminer",
  'alarmDone.done': "C’est fait",
  'alarmDone.already': "C’était déjà fait",
```

Remplacer par :

<!-- bloc: messages-rest-fr-1-apres -->

```ts
  'alarm.fullScreenHint': "Pour qu’une alarme allume l’écran, même verrouillé. Sinon, elle sonne en notification.",
  'alarm.fullScreenOn': "Autorisé",
  'alarm.fullScreenOff': "À autoriser",
  'personEdit.title': "Modifier la personne",
  'personEdit.saved': "Personne modifiée",
  'personEdit.a11y': "Modifier la personne",
  'personPicker.newPerson': "Nouvelle personne",
  'closedApp.label': "Fonctionner appli fermée",
  'closedApp.hint': "Pour que rappels et alarmes sonnent même appli fermée, sur les téléphones qui économisent fort la batterie.",
  'alarm.done': "Terminer",
  'alarmDone.done': "C’est fait",
  'alarmDone.already': "C’était déjà fait",
```

#### `src/i18n/messages-rest-en.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-en-1-avant -->

```ts
  'alarm.fullScreenHint': "So that an alarm lights the screen, even locked. Otherwise, it rings as a notification.",
  'alarm.fullScreenOn': "Allowed",
  'alarm.fullScreenOff': "To allow",
  'alarm.done': "Done",
  'alarmDone.done': "Done",
  'alarmDone.already': "It was already done",
```

Remplacer par :

<!-- bloc: messages-rest-en-1-apres -->

```ts
  'alarm.fullScreenHint': "So that an alarm lights the screen, even locked. Otherwise, it rings as a notification.",
  'alarm.fullScreenOn': "Allowed",
  'alarm.fullScreenOff': "To allow",
  'personEdit.title': "Edit person",
  'personEdit.saved': "Person updated",
  'personEdit.a11y': "Edit the person",
  'personPicker.newPerson': "New person",
  'closedApp.label': "Work with the app closed",
  'closedApp.hint': "So that reminders and alarms ring even with the app closed, on phones that save the battery hard.",
  'alarm.done': "Done",
  'alarmDone.done': "Done",
  'alarmDone.already': "It was already done",
```


## 8. Test final

| Contrôle | Résultat attendu |
|---|---|
| `npx jest` | tout passe, dont « picked-person » |
| Nouveau moment → Avec qui ? | « Nouvelle personne » en tête ; les relations en français (« Ami·e ») |
| Nouvelle personne → un nom → Enregistrer | retour au moment, la personne cochée |
| Proches → une personne → crayon | « Modifier la personne », les champs remplis |
| Cocher Famille → Enregistrer | « Personne modifiée », le badge dit Famille |
| **Téléphone** : Notifications et vibrations → Fonctionner appli fermée | « À autoriser » ; la toucher ouvre la page d'Android ; autoriser, revenir : « Autorisé » |
| Un rappel dans 2 min, appli fermée et retirée des applis récentes | il sonne |

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Appli fermée, un rappel ne sonne pas | le téléphone arrête les applis fermées | « Fonctionner appli fermée » ; sur certains téléphones, aussi « Démarrage automatique » dans les réglages de la marque |
| La personne créée n'est pas cochée | le formulaire a été quitté entre-temps | la cocher dans la liste |

## 10. Retour en arrière

`git checkout -- <fichiers de la section 5>`, supprimer `picked-person.ts` et son test.

## 11. Lexique

| Mot | En une phrase |
|---|---|
| Économiseur de batterie | ce qu'Android fait pour durer plus longtemps ; il peut arrêter les applis fermées |
| Relais | une petite boîte en mémoire où un écran laisse une information qu'un autre prend |

## 12. Et après

1. Commit, APK, essai sur le téléphone.
2. Chantier n° 10 : un compte facultatif, la synchronisation, et le **vrai partage par lien** (étude et maquette d'abord).
3. Ensuite, le **tutoriel de A à Z** (tes demandes sont notées).

## Compte rendu d'exécution (27 novembre 2026)

- Lu avant d'écrire : la liste « Avec qui ? » (elle n'offrait de créer qu'à vide), le formulaire d'une personne (création seulement), la page d'une personne (pas de modification), la mise à jour d'une personne (elle ne savait pas effacer un champ).
- Appliquée à partir des blocs de cette fiche (`appliquer-fiche-040.js`), puis rejouée sur une copie propre : identique.
- Écarts corrigés : « effacer un champ » ajouté à la mise à jour d'une personne ; la relation traduite dans la liste (« Friend »).
- Tests : `Test Suites: 108 passed`, `Tests: 2161 passed` ; `tsc` et `eslint` sans erreur. Module compilé.
- **Vérifié sur le web** : « Nouvelle personne » en tête ; une personne créée revient cochée dans le moment ; le crayon ouvre « Modifier la personne » rempli ; Famille enregistrée ; « Ami·e » dans la liste ; la personne d'essai supprimée ensuite ; console vide.
- **Pas vérifié** : « Fonctionner appli fermée » (Android seulement), un rappel appli fermée et retirée des récentes, sur le téléphone. Rien n'est encore enregistré dans git.

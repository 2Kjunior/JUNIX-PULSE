# FICHE OPÉRATOIRE N° 046 — Les secrets de Pulse (« Tu savais ? »)

Projet : **Junix Pulse** · Date : 27 novembre 2026 · Suite de : [FICHE 045](FICHE-045-visite-des-onglets.md)

---

## 1. Objectif

Troisième et dernière fiche du chantier n° 12 (étude 001, 16.13) :

| Ta demande | Ce que fait cette fiche |
|---|---|
| ne pas tout montrer au début, garder des secrets à découvrir | **6 secrets** que l'onboarding ne montre pas |
| les découvrir au fil de l'usage | après **3 jours**, Pulse en dit **un** de temps en temps sur l'Accueil : au plus un tous les 3 jours, jamais le même jour qu'une autre astuce, chacun une seule fois |

Les 6 secrets, dans l'ordre : dicter toute une phrase dans un formulaire ; Focus (glisser une tâche vers la gauche) ; les thèmes de couleurs ; la couleur d'une carte ; le Sanctuaire (le cadenas) ; le widget.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 045 est appliquée | `git status` | ses fichiers |
| Tout passe | `npx jest` | `Tests: 2321 passed` |

## 3. Matériel

Rien de nouveau.

## 4. Hypothèses

- « Le début de l'usage » est la date de création des réglages (la première ouverture de l'appli).
- Un secret est gardé comme une astuce (`tip:secret:…`) : « Oublier les astuces vues » les rend aussi.
- Pas de secret avant que la visite de l'Accueil ait été vue, ni pendant une visite, ni quand Pulse est coupé.

## 5. Carte de l'intervention

| Fichier | Action |
|---|---|
| `domain/rules/secret-tips-rules.ts` (**nouveau**) | les 6 secrets et la règle `secretDue` |
| `domain/rules/mascot-message-catalog*.ts` | les phrases (tu, vous ; chaleureux, sobre ; anglais) |
| `services/mascot/mascot-tips-service.ts` | le jour du dernier secret |
| `features/mascot/SecretTip.tsx` (**nouveau**), `MascotTabsLayer.tsx` | la bulle sur l'Accueil |
| `__tests__/secret-tips.test.ts` (**nouveau**) | le test |

## 6. Sauvegarde

`git status` (fiche 045 appliquée, hors `docs/motion/`). Aucune migration.

## 7. Pas à pas

Le plus simple : `node docs/fiches/outils/appliquer-fiche-046.js .` (après la fiche 045) fait toutes les étapes ci-dessous ; puis l'APK (fiche 003).

### Étape 1 — Les secrets et la règle qui décide

**Pourquoi** : `secret-tips-rules.ts` liste les 6 secrets dans l'ordre (le plus utile d'abord) et `secretDue` décide, sans lire ni base ni écran : rien pendant les 3 premiers jours, rien le jour d'une autre astuce, au plus un tous les 3 jours, le premier pas encore dit. Les phrases de Pulse commencent par « Tu savais ? » (ou « Astuce : » en ton sobre), en tu et vous, et en anglais ; deux phrases au plus.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-046.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/domain/rules/secret-tips-rules.ts`

Fichier nouveau, en entier :

<!-- bloc: new-secret-tips-rules -->

```ts
/**
 * The secrets of Pulse (study 001, 16.13; sheet 046): what the onboarding does not show, found
 * while using the app. After a few days, Pulse tells one of them now and then on the home screen,
 * in this order, each once: « Tu savais ? … ».
 *
 * Pure: what was seen, the days of the last tip and of the last secret are read by the caller.
 */

import { tipDay } from './gesture-tip-rules';
import type { MascotMessageId } from './mascot-message-catalog';

export interface SecretTip {
  /** Remembered as a tip: "Oublier les astuces vues" gives the secrets back too. */
  id: string;
  message: MascotMessageId;
}

/** In the order they are told: the most useful first. */
export const SECRET_TIPS: readonly SecretTip[] = [
  { id: 'secret:dictateAll', message: 'SECRET_DICTATE_ALL' },
  { id: 'secret:focus', message: 'SECRET_FOCUS' },
  { id: 'secret:themes', message: 'SECRET_THEMES' },
  { id: 'secret:cardColor', message: 'SECRET_CARD_COLOR' },
  { id: 'secret:sanctum', message: 'SECRET_SANCTUM' },
  { id: 'secret:widget', message: 'SECRET_WIDGET' },
];

/** The first secret waits this many days of use. */
export const SECRET_FIRST_AFTER_DAYS = 3;
/** Then one every this many days at most. */
export const SECRET_EVERY_DAYS = 3;
/** Where the day of the last secret is kept. */
export const LAST_SECRET_DAY_ID = 'secret:lastDay';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from one YYYY-MM-DD to another (negative if before). */
function daysBetween(from: string, to: string): number {
  const at = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((at(to) - at(from)) / DAY_MS);
}

/**
 * The secret to tell now, or null: not in the first days, never on a day another tip was given,
 * at most one every few days, and the first one not told yet.
 */
export function secretDue({
  seen,
  startedAt,
  lastTipDay,
  lastSecretDay,
  now,
}: {
  seen: ReadonlySet<string>;
  /** When the app was first opened (the settings' creation). */
  startedAt: Date;
  lastTipDay: string | null;
  lastSecretDay: string | null;
  now: Date;
}): SecretTip | null {
  const today = tipDay(now);
  if (daysBetween(tipDay(startedAt), today) < SECRET_FIRST_AFTER_DAYS) return null;
  if (lastTipDay === today) return null;
  if (lastSecretDay && daysBetween(lastSecretDay, today) < SECRET_EVERY_DAYS) return null;
  return SECRET_TIPS.find(secret => !seen.has(secret.id)) ?? null;
}
```

#### `src/domain/rules/mascot-message-catalog.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: mascot-message-catalog-1-avant -->

```ts
    ["Compris. Vos rappels resteront visibles dans l'app.", "Compris {name}. Vos rappels resteront visibles dans l'app."],
  ),

  // ─── Tours of the other tabs (sheet 045) ─────────────────────────────────
  TOUR_TODO_FILTER: entry(
    ["En haut, choisis : tout, ce qui sonne, ou ce qui ne sonne pas.", "{name}, en haut, choisis : tout, ce qui sonne, ou ce qui ne sonne pas."],
```

Remplacer par :

<!-- bloc: mascot-message-catalog-1-apres -->

```ts
    ["Compris. Vos rappels resteront visibles dans l'app.", "Compris {name}. Vos rappels resteront visibles dans l'app."],
  ),

  // ─── Secrets, told now and then after a few days (sheet 046) ──────────────
  SECRET_DICTATE_ALL: entry(
    ["Tu savais ? Dans un formulaire, dicte toute ta phrase : je remplis les champs pour toi.", "{name}, tu savais ? Dans un formulaire, dicte toute ta phrase : je remplis les champs pour toi."],
    ["Astuce : dans un formulaire, une phrase dictée remplit tous les champs.", "{name}, astuce : dans un formulaire, une phrase dictée remplit tous les champs."],
    ["Vous saviez ? Dans un formulaire, dictez toute votre phrase : je remplis les champs pour vous.", "{name}, vous saviez ? Dans un formulaire, dictez toute votre phrase : je remplis les champs pour vous."],
    ["Astuce : dans un formulaire, une phrase dictée remplit tous les champs.", "{name}, astuce : dans un formulaire, une phrase dictée remplit tous les champs."],
  ),
  SECRET_FOCUS: entry(
    ["Tu savais ? Glisse une tâche vers la gauche, puis Focus : je chronomètre et je te dis quand faire une pause.", "{name}, tu savais ? Glisse une tâche vers la gauche, puis Focus : je chronomètre et je te dis quand faire une pause."],
    ["Astuce : Focus, dans le glissement d'une tâche, chronomètre et propose des pauses.", "{name}, astuce : Focus, dans le glissement d'une tâche, chronomètre et propose des pauses."],
    ["Vous saviez ? Glissez une tâche vers la gauche, puis Focus : je chronomètre et je vous dis quand faire une pause.", "{name}, vous saviez ? Glissez une tâche vers la gauche, puis Focus : je chronomètre et je vous dis quand faire une pause."],
    ["Astuce : Focus, dans le glissement d'une tâche, chronomètre et propose des pauses.", "{name}, astuce : Focus, dans le glissement d'une tâche, chronomètre et propose des pauses."],
  ),
  SECRET_THEMES: entry(
    ["Tu savais ? Dans Paramètres, Thème, je change de couleurs : essaie Forêt ou Océan.", "{name}, tu savais ? Dans Paramètres, Thème, je change de couleurs : essaie Forêt ou Océan."],
    ["Astuce : Paramètres, Thème, pour changer les couleurs de l'appli.", "{name}, astuce : Paramètres, Thème, pour changer les couleurs de l'appli."],
    ["Vous saviez ? Dans Paramètres, Thème, je change de couleurs : essayez Forêt ou Océan.", "{name}, vous saviez ? Dans Paramètres, Thème, je change de couleurs : essayez Forêt ou Océan."],
    ["Astuce : Paramètres, Thème, pour changer les couleurs de l'appli.", "{name}, astuce : Paramètres, Thème, pour changer les couleurs de l'appli."],
  ),
  SECRET_CARD_COLOR: entry(
    ["Tu savais ? Une carte peut avoir sa propre couleur : Plus d'options, Couleur de la carte.", "{name}, tu savais ? Une carte peut avoir sa propre couleur : Plus d'options, Couleur de la carte."],
    ["Astuce : Plus d'options, Couleur de la carte, pour colorer un élément.", "{name}, astuce : Plus d'options, Couleur de la carte, pour colorer un élément."],
    ["Vous saviez ? Une carte peut avoir sa propre couleur : Plus d'options, Couleur de la carte.", "{name}, vous saviez ? Une carte peut avoir sa propre couleur : Plus d'options, Couleur de la carte."],
    ["Astuce : Plus d'options, Couleur de la carte, pour colorer un élément.", "{name}, astuce : Plus d'options, Couleur de la carte, pour colorer un élément."],
  ),
  SECRET_SANCTUM: entry(
    ["Tu savais ? Le cadenas en haut ouvre le Sanctuaire : des notes gardées sous ton empreinte.", "{name}, tu savais ? Le cadenas en haut ouvre le Sanctuaire : des notes gardées sous ton empreinte."],
    ["Astuce : le cadenas ouvre le Sanctuaire, des notes protégées par l'empreinte.", "{name}, astuce : le cadenas ouvre le Sanctuaire, des notes protégées par l'empreinte."],
    ["Vous saviez ? Le cadenas en haut ouvre le Sanctuaire : des notes gardées sous votre empreinte.", "{name}, vous saviez ? Le cadenas en haut ouvre le Sanctuaire : des notes gardées sous votre empreinte."],
    ["Astuce : le cadenas ouvre le Sanctuaire, des notes protégées par l'empreinte.", "{name}, astuce : le cadenas ouvre le Sanctuaire, des notes protégées par l'empreinte."],
  ),
  SECRET_WIDGET: entry(
    ["Tu savais ? Pose mon widget sur l'écran d'accueil du téléphone : ta journée d'un coup d'œil.", "{name}, tu savais ? Pose mon widget sur l'écran d'accueil du téléphone : ta journée d'un coup d'œil."],
    ["Astuce : le widget Junix Pulse montre la journée sur l'écran d'accueil du téléphone.", "{name}, astuce : le widget Junix Pulse montre la journée sur l'écran d'accueil du téléphone."],
    ["Vous saviez ? Posez mon widget sur l'écran d'accueil du téléphone : votre journée d'un coup d'œil.", "{name}, vous saviez ? Posez mon widget sur l'écran d'accueil du téléphone : votre journée d'un coup d'œil."],
    ["Astuce : le widget Junix Pulse montre la journée sur l'écran d'accueil du téléphone.", "{name}, astuce : le widget Junix Pulse montre la journée sur l'écran d'accueil du téléphone."],
  ),
  // ─── Tours of the other tabs (sheet 045) ─────────────────────────────────
  TOUR_TODO_FILTER: entry(
    ["En haut, choisis : tout, ce qui sonne, ou ce qui ne sonne pas.", "{name}, en haut, choisis : tout, ce qui sonne, ou ce qui ne sonne pas."],
```

#### `src/domain/rules/mascot-message-catalog-en.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: mascot-message-catalog-en-1-avant -->

```ts
  ),

  // ─── Home tour (four stops) and first visit tips ───────────────────────────
  // ─── Tours of the other tabs (sheet 045) ─────────────────────────────────
  TOUR_TODO_FILTER: entry(
    ["At the top, pick: everything, what rings, or what doesn't.", "{name}, at the top, pick: everything, what rings, or what doesn't."],
```

Remplacer par :

<!-- bloc: mascot-message-catalog-en-1-apres -->

```ts
  ),

  // ─── Home tour (four stops) and first visit tips ───────────────────────────
  // ─── Secrets, told now and then after a few days (sheet 046) ──────────────
  SECRET_DICTATE_ALL: entry(
    ["Did you know? In a form, dictate your whole sentence: I fill in the fields for you.", "{name}, did you know? In a form, dictate your whole sentence: I fill in the fields for you."],
    ["Tip: in a form, one dictated sentence fills every field.", "{name}, tip: in a form, one dictated sentence fills every field."],
  ),
  SECRET_FOCUS: entry(
    ["Did you know? Swipe a task left, then Focus: I time it and tell you when to take a break.", "{name}, did you know? Swipe a task left, then Focus: I time it and tell you when to take a break."],
    ["Tip: Focus, in a task's swipe, times it and suggests breaks.", "{name}, tip: Focus, in a task's swipe, times it and suggests breaks."],
  ),
  SECRET_THEMES: entry(
    ["Did you know? In Settings, Theme, I change colours: try Forest or Ocean.", "{name}, did you know? In Settings, Theme, I change colours: try Forest or Ocean."],
    ["Tip: Settings, Theme, to change the app's colours.", "{name}, tip: Settings, Theme, to change the app's colours."],
  ),
  SECRET_CARD_COLOR: entry(
    ["Did you know? A card can have its own colour: More options, Card colour.", "{name}, did you know? A card can have its own colour: More options, Card colour."],
    ["Tip: More options, Card colour, to colour an item.", "{name}, tip: More options, Card colour, to colour an item."],
  ),
  SECRET_SANCTUM: entry(
    ["Did you know? The padlock at the top opens the Sanctuary: notes kept under your fingerprint.", "{name}, did you know? The padlock at the top opens the Sanctuary: notes kept under your fingerprint."],
    ["Tip: the padlock opens the Sanctuary, notes protected by fingerprint.", "{name}, tip: the padlock opens the Sanctuary, notes protected by fingerprint."],
  ),
  SECRET_WIDGET: entry(
    ["Did you know? Put my widget on your phone's home screen: your day at a glance.", "{name}, did you know? Put my widget on your phone's home screen: your day at a glance."],
    ["Tip: the Junix Pulse widget shows the day on the phone's home screen.", "{name}, tip: the Junix Pulse widget shows the day on the phone's home screen."],
  ),
  // ─── Tours of the other tabs (sheet 045) ─────────────────────────────────
  TOUR_TODO_FILTER: entry(
    ["At the top, pick: everything, what rings, or what doesn't.", "{name}, at the top, pick: everything, what rings, or what doesn't."],
```


### Étape 2 — La bulle sur l'Accueil

**Pourquoi** : `SecretTip` attend 4 secondes sur l'Accueil, vérifie que la visite de l'Accueil a été vue et qu'aucune visite ne tourne, lit ce qui a été dit, demande à `secretDue`, puis montre la bulle des astuces (`TipBubbleLayer`). Le secret est gardé dès qu'il s'affiche (`markSecretTold`, qui note aussi le jour du dernier secret). `MascotTabsLayer` le monte seulement sur l'Accueil.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-046.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/features/mascot/SecretTip.tsx`

Fichier nouveau, en entier :

<!-- bloc: new-secrettip -->

```tsx
/**
 * SecretTip: now and then, on the home screen, Pulse tells one of its secrets (study 001, 16.13;
 * sheet 046). « Tu savais ? … » in the same bubble as the other tips.
 *
 * Only after the home tour was seen, never while a tour is on, never when Pulse is off, and as
 * secretDue decides: after a few days of use, at most one every few days, never on the day of
 * another tip. Told once: it is remembered the moment it shows.
 */

import React, { useEffect, useState } from 'react';

import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { SCREEN_TOURS } from '@/domain/rules/mascot-tour-rules';
import { SECRET_TIPS, secretDue } from '@/domain/rules/secret-tips-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, lastSecretDay, lastTipDay, markSecretTold } from '@/services/mascot/mascot-tips-service';

import { isHomeTourRunning } from './HomeTour';
import { TipBubbleLayer } from './TipBubbleLayer';
import { useMascotPreferences } from './use-mascot-preferences';

/** After the home screen has settled, and after a tour would have started. */
const SHOW_DELAY_MS = 4000;
const READING_MS = 12000;

export function SecretTip() {
  const { preferences, settings } = useMascotPreferences();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    if (settings.presence === 'off') return;
    let active = true;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showTimer = setTimeout(async () => {
      if (!active || isHomeTourRunning() || !(await hasSeenTip(SCREEN_TOURS.home.tipId))) return;
      const saved = await SettingsRepository.get().catch(() => null);
      if (!active || !saved) return;
      const seen = new Set<string>();
      for (const secret of SECRET_TIPS) if (await hasSeenTip(secret.id)) seen.add(secret.id);
      const secret = secretDue({
        seen,
        startedAt: new Date(saved.createdAt),
        lastTipDay: await lastTipDay(),
        lastSecretDay: await lastSecretDay(),
        now: new Date(),
      });
      if (!active || !secret) return;
      const spoken = resolveMascotMessage(secret.message, {}, preferences, saved.displayName ?? null);
      if (!spoken) return;

      setText(spoken);
      void markSecretTold(secret.id); // Told from the moment it shows: it never comes twice
      hideTimer = setTimeout(() => active && setText(null), READING_MS);
    }, SHOW_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
    // Decided when the home screen shows, not each time a preference object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.presence]);

  if (!text) return null;
  return <TipBubbleLayer text={text} onClose={() => setText(null)} />;
}
```

#### `src/services/mascot/mascot-tips-service.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: mascot-tips-service-1-avant -->

```ts
 */

import { LAST_TIP_DAY_ID, tipDay } from '../../domain/rules/gesture-tip-rules';
import { HOME_TOUR_TIP_ID, SCREEN_TOURS, tipKey } from '../../domain/rules/mascot-tour-rules';
import { MascotStateRepository } from '../../repositories/mascot-state-repository';

```

Remplacer par :

<!-- bloc: mascot-tips-service-1-apres -->

```ts
 */

import { LAST_TIP_DAY_ID, tipDay } from '../../domain/rules/gesture-tip-rules';
import { LAST_SECRET_DAY_ID } from '../../domain/rules/secret-tips-rules';
import { HOME_TOUR_TIP_ID, SCREEN_TOURS, tipKey } from '../../domain/rules/mascot-tour-rules';
import { MascotStateRepository } from '../../repositories/mascot-state-repository';

```

Changement 2 sur 2. Chercher :

<!-- bloc: mascot-tips-service-2-avant -->

```ts
  await MascotStateRepository.delete(tipKey(HOME_TOUR_TIP_ID));
}

/** "Revoir la présentation" gives back the tours of the other tabs too (sheet 045). */
export async function replayAllTours(): Promise<void> {
  await Promise.all(Object.values(SCREEN_TOURS).map(tour => MascotStateRepository.delete(tipKey(tour.tipId))));
```

Remplacer par :

<!-- bloc: mascot-tips-service-2-apres -->

```ts
  await MascotStateRepository.delete(tipKey(HOME_TOUR_TIP_ID));
}

/** The day (YYYY-MM-DD) the last secret was told, or null (sheet 046). A failed read counts as today. */
export async function lastSecretDay(): Promise<string | null> {
  try {
    return await MascotStateRepository.get(tipKey(LAST_SECRET_DAY_ID));
  } catch {
    return tipDay(new Date());
  }
}

/** A secret told (sheet 046): seen as a tip (the day of the last tip with it), and the day of the last secret. */
export async function markSecretTold(id: string): Promise<void> {
  await markTipSeen(id);
  try {
    await MascotStateRepository.set(tipKey(LAST_SECRET_DAY_ID), tipDay(new Date()));
  } catch {
    // A secret may come a little sooner: harmless
  }
}

/** "Revoir la présentation" gives back the tours of the other tabs too (sheet 045). */
export async function replayAllTours(): Promise<void> {
  await Promise.all(Object.values(SCREEN_TOURS).map(tour => MascotStateRepository.delete(tipKey(tour.tipId))));
```

#### `src/features/mascot/MascotTabsLayer.tsx`


Changement 1 sur 2. Chercher :

<!-- bloc: mascottabslayer-1-avant -->

```tsx

import { FirstVisitTip } from './FirstVisitTip';
import { HomeTour } from './HomeTour';

export function MascotTabsLayer() {
  const segments = useSegments();
```

Remplacer par :

<!-- bloc: mascottabslayer-1-apres -->

```tsx

import { FirstVisitTip } from './FirstVisitTip';
import { HomeTour } from './HomeTour';
import { SecretTip } from './SecretTip';

export function MascotTabsLayer() {
  const segments = useSegments();
```

Changement 2 sur 2. Chercher :

<!-- bloc: mascottabslayer-2-avant -->

```tsx
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {tour ? <HomeTour key={tour} tour={tour} /> : null}
      {tipScreen ? <FirstVisitTip key={tipScreen} screen={tipScreen} /> : null}
    </View>
  );
```

Remplacer par :

<!-- bloc: mascottabslayer-2-apres -->

```tsx
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {tour ? <HomeTour key={tour} tour={tour} /> : null}
      {/* Now and then, a secret of Pulse on the home screen (sheet 046) */}
      {tour === 'home' ? <SecretTip /> : null}
      {tipScreen ? <FirstVisitTip key={tipScreen} screen={tipScreen} /> : null}
    </View>
  );
```


### Étape 3 — Le test

**Pourquoi** : `secret-tips.test.ts` : silence les premiers jours, jamais le jour d'une autre astuce, un tous les 3 jours, dans l'ordre et une seule fois, chaque secret en français et en anglais.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-046.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/__tests__/secret-tips.test.ts`

Fichier nouveau, en entier :

<!-- bloc: new-secret-tips-test -->

```ts
import { MASCOT_MESSAGES } from '../domain/rules/mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../domain/rules/mascot-message-catalog-en';
import { SECRET_TIPS, secretDue } from '../domain/rules/secret-tips-rules';

describe('the secrets of Pulse (sheet 046)', () => {
  const startedAt = new Date(2026, 10, 20, 9, 0);
  const at = (day: number) => new Date(2026, 10, day, 18, 0);
  const due = (over: Partial<Parameters<typeof secretDue>[0]> = {}) =>
    secretDue({ seen: new Set(), startedAt, lastTipDay: null, lastSecretDay: null, now: at(24), ...over });

  it('keeps quiet in the first days of use', () => {
    expect(due({ now: at(20) })).toBeNull();
    expect(due({ now: at(22) })).toBeNull();
    expect(due({ now: at(23) })?.id).toBe(SECRET_TIPS[0].id);
  });

  it('never comes on the day of another tip', () => {
    expect(due({ lastTipDay: '2026-11-24' })).toBeNull();
    expect(due({ lastTipDay: '2026-11-23' })).not.toBeNull();
  });

  it('tells one at most every three days', () => {
    expect(due({ lastSecretDay: '2026-11-22' })).toBeNull();
    expect(due({ lastSecretDay: '2026-11-21' })).not.toBeNull();
  });

  it('tells them in order, each once, then nothing more', () => {
    expect(due({ seen: new Set([SECRET_TIPS[0].id]) })?.id).toBe(SECRET_TIPS[1].id);
    expect(due({ seen: new Set(SECRET_TIPS.map(secret => secret.id)) })).toBeNull();
  });

  it('has each secret in French and in English, kept as a tip', () => {
    for (const secret of SECRET_TIPS) {
      expect(secret.id.startsWith('secret:')).toBe(true);
      expect(MASCOT_MESSAGES[secret.message]).toBeDefined();
      expect(MASCOT_MESSAGES_EN[secret.message]).toBeDefined();
    }
  });
});
```


## 8. Test final

| Contrôle | Résultat attendu |
|---|---|
| `npx jest` | tout passe, dont « the secrets of Pulse » |
| Les 3 premiers jours | aucun secret |
| Le 4ᵉ jour, sur l'Accueil, sans autre astuce ce jour-là | « Tu savais ? Dans un formulaire, dicte toute ta phrase… » |
| Le lendemain | rien ; le secret suivant 3 jours plus tard |
| Pulse → Oublier les astuces vues | les secrets reviennent, dans l'ordre |

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Aucun secret | trop tôt ; une autre astuce ce jour-là ; la visite de l'Accueil pas encore vue ; Pulse coupé | attendre, ou voir la visite |
| « reste en deux phrases » échoue | une phrase de Pulse en a trois | relier deux phrases (deux-points) |

## 10. Retour en arrière

`git checkout -- <fichiers de la section 5>`, supprimer les 3 fichiers nouveaux.

## 11. Lexique

| Mot | En une phrase |
|---|---|
| Secret (easter egg) | une fonction qu'on ne montre pas au début et qu'on découvre en utilisant l'appli |
| Règle pure | une fonction qui décide sans lire la base ni l'écran : facile à tester |

## 12. Et après

1. Le n° 13 : la nouvelle vue Semaine (jours et heures toujours visibles, zoom, « Maintenant », le bandeau « Cette semaine »).
2. Puis commit des fiches 044 à 046 (et la Semaine), APK, essai sur le téléphone.

## Compte rendu d'exécution (27 novembre 2026)

- Lu avant d'écrire : la bulle des astuces (`TipBubbleLayer`), la règle « une astuce par jour » des gestes, la mémoire des astuces.
- Appliquée à partir des blocs de cette fiche (`appliquer-fiche-046.js`), rejouée sur une copie à l'état de la fiche 045 : identique (7 fichiers).
- Tests : `Test Suites: 113 passed`, `Tests: 2398 passed` ; tsc et eslint sans erreur.
- Écart corrigé en route : le secret des thèmes faisait trois phrases (le test du catalogue en veut deux au plus).
- **Pas vérifié à l'écran** : un secret attend au moins 3 jours d'usage et un jour sans autre astuce ; les visites venaient d'en donner aujourd'hui. La règle est vérifiée par 5 tests (premiers jours, jour d'une autre astuce, un tous les 3 jours, ordre, une seule fois). Rien n'est encore enregistré dans git.

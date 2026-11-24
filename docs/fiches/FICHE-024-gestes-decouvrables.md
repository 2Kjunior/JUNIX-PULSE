# FICHE OPÉRATOIRE N° 024 — Les gestes découvrables

Projet : **Junix Pulse** · Date : 24 novembre 2026 · Suite de : [FICHE 023](FICHE-023-types-de-moment-et-niveaux-d-alerte.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), sections 3 et 12.3 · Chantier n° 6 de la feuille de route (12.10)

---

## 1. Objectif

Glisser une carte ouvre ses actions (modifier, supprimer, plus tard…), mais **rien ne le montre** : on le découvre par hasard, et un lecteur d'écran ne glisse pas. L'étude a retenu trois réponses, qui se complètent :

| | Quoi | Où |
|---|---|---|
| **3-A** | La première fois qu'une liste a **au moins deux cartes**, Pulse le dit dans une bulle et **la première carte s'entrouvre seule** une seconde. **Une seule fois**, et **jamais le même jour** qu'une autre astuce. | À faire, Habitudes, Objectifs |
| **3-B** | Un bouton **« ⋯ »** visible sur chaque carte ouvre les **mêmes actions** dans un petit menu. | idem |
| **3-C** | Un **appui long** sur la carte ouvre ce même menu (avec une petite vibration). | toute carte d'une liste qui se glisse |

Au passage, les cartes d'**À faire** donnent enfin leurs actions au **lecteur d'écran** : depuis la fiche 015, elles ne passaient pas par la brique qui le fait.

**Ce qui ne change pas** :

- les actions elles-mêmes : le menu lit celles que la liste donne déjà au glissement, jamais une deuxième liste ;
- « **Oublier les astuces vues** » (Paramètres → Pulse) remet aussi cette astuce et le jour de la dernière astuce ;
- avec la **mascotte éteinte**, la carte s'entrouvre quand même, sans bulle (le geste doit être trouvé) ;
- avec les **animations réduites**, elle ne bouge pas : la bulle et « ⋯ » suffisent.

**Plus tard** (une ligne chacune dans `GESTURE_TIPS`) : l'astuce du Planning (appui long pour déplacer, chantier n° 8) et celle des invitations (chantier n° 7). L'étude réserve l'appui long du Planning au déplacement : ce sont deux écrans différents, donc un seul sens par endroit.

**Pour que rien ne casse demain** :

- une astuce de geste = une ligne dans `GESTURE_TIPS` et une phrase de Pulse (un test vérifie qu'elle existe dans les deux langues) ;
- une liste qui veut l'astuce appelle `useGestureTip` ;
- une carte qui veut « ⋯ » pose `<CardMenuButton />` ; elle ne s'affiche que dans une rangée qui a des actions.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| Les fiches 022 et 023 sont enregistrées | `git log --oneline -1` | `feat(items): change an item…` |
| Tout passe | `npx jest` | `Tests: 2043 passed` |

## 3. Hypothèses

- « Jamais deux astuces le même jour » vaut pour les **astuces de geste** : une astuce de première visite (par exemple celle de l'onglet À faire, le premier jour) repousse l'astuce du glissement au lendemain. Les astuces de première visite, elles, restent comme avant.
- Le menu s'ouvre avec la boîte de dialogue de l'appli (`GlassAlert`) : « Supprimer » en rouge, « Annuler » en bas.

## 4. Carte de l'intervention

| Fichier | Action |
|---|---|
| `src/domain/rules/gesture-tip-rules.ts` (+ test) | **nouveau** : les astuces de geste et leur règle |
| `src/components/ui/CardMenu.tsx` | **nouveau** : le menu, le bouton « ⋯ », l'appui long |
| `src/features/mascot/TipBubbleLayer.tsx` | **nouveau** : la bulle, sortie de `FirstVisitTip` pour être partagée |
| `src/features/mascot/FirstVisitTip.tsx` | remplacé : utilise la bulle partagée (« Compris » enfin traduit) |
| `src/services/mascot/mascot-tips-service.ts` | remplacé : garde aussi le jour de la dernière astuce |
| `src/features/mascot/GestureTip.tsx` | **nouveau** : `useGestureTip` |
| `src/components/ui/SwipeableItem.tsx` | `peek` : la carte s'entrouvre seule |
| `src/components/ui/GlowCard.tsx` | appui long → menu |
| `src/components/todo/TodoRow.tsx` | appui long, « ⋯ », lecteur d'écran |
| `src/app/habits/index.tsx`, `src/app/goals/index.tsx`, `src/features/todo/TodoTabScreen.tsx` | « ⋯ » et l'astuce |
| catalogues de Pulse, `messages-rest-fr/en` | la phrase de Pulse, le nom de « ⋯ » |

## 5. Pas à pas

### Étape 1 — La règle des astuces de geste

Fichier `src/domain/rules/gesture-tip-rules.ts` (remplacé en entier) :

<!-- bloc: rules -->

```ts
/**
 * The gesture tips (study 001, 3-A and 12.3; sheet 024): each one is given once, when it is
 * useful (a list with at least two cards for the swipe), and never on a day another tip was
 * already given. Pure: what was seen and the last day are read by the caller.
 * The tips of the Planning (long press to move) and of the invitations come with their own
 * chantiers (n° 8 and n° 7): a line here and a sentence of Pulse each.
 */

import type { MascotMessageId } from './mascot-message-catalog';

export type GestureTipId = 'swipe';

export interface GestureTip {
  id: GestureTipId;
  message: MascotMessageId;
  /** The tip waits until there are at least this many cards. */
  minCards: number;
}

export const GESTURE_TIPS: Readonly<Record<GestureTipId, GestureTip>> = {
  swipe: { id: 'swipe', message: 'TIP_SWIPE', minCards: 2 },
};

/** Where the day of the last tip is kept, with the tips seen ("Oublier les astuces vues" clears it too). */
export const LAST_TIP_DAY_ID = 'lastDay';

/** The day of the phone's clock, as YYYY-MM-DD. */
export function tipDay(at: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function gestureTipDue({
  tip,
  cardCount,
  seen,
  lastTipDay,
  now,
}: {
  tip: GestureTip;
  cardCount: number;
  seen: boolean;
  lastTipDay: string | null;
  now: Date;
}): boolean {
  return !seen && cardCount >= tip.minCards && lastTipDay !== tipDay(now);
}

/** The card opens a moment after the list shows, stays open long enough to read, then closes. */
export const PEEK_DELAY_MS = 900;
export const PEEK_OPEN_MS = 1400;
```

Fichier `src/domain/rules/__tests__/gesture-tip-rules.test.ts` (remplacé en entier) :

<!-- bloc: rules-test -->

```ts
import { GESTURE_TIPS, gestureTipDue, tipDay } from '../gesture-tip-rules';
import { MASCOT_MESSAGES } from '../mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../mascot-message-catalog-en';

const NOW = new Date('2026-11-24T15:00:00');
const swipe = GESTURE_TIPS.swipe;

describe('the gesture tips (study 001, 12.3; sheet 024)', () => {
  it('waits for a list of at least two cards', () => {
    expect(gestureTipDue({ tip: swipe, cardCount: 1, seen: false, lastTipDay: null, now: NOW })).toBe(false);
    expect(gestureTipDue({ tip: swipe, cardCount: 2, seen: false, lastTipDay: null, now: NOW })).toBe(true);
  });

  it('is given once', () => {
    expect(gestureTipDue({ tip: swipe, cardCount: 5, seen: true, lastTipDay: null, now: NOW })).toBe(false);
  });

  it('never on a day another tip was given', () => {
    expect(gestureTipDue({ tip: swipe, cardCount: 5, seen: false, lastTipDay: '2026-11-24', now: NOW })).toBe(false);
    expect(gestureTipDue({ tip: swipe, cardCount: 5, seen: false, lastTipDay: '2026-11-23', now: NOW })).toBe(true);
  });

  it('reads the day on the phone clock', () => {
    expect(tipDay(new Date('2026-01-05T23:30:00'))).toBe('2026-01-05');
  });

  it('has a sentence of Pulse in both languages for every tip', () => {
    for (const tip of Object.values(GESTURE_TIPS)) {
      expect(MASCOT_MESSAGES[tip.message]).toBeDefined();
      expect(MASCOT_MESSAGES_EN[tip.message]).toBeDefined();
    }
  });
});
```

### Étape 2 — Les briques : le menu, la bulle partagée, le jour de la dernière astuce, l'astuce de geste

Fichier `src/components/ui/CardMenu.tsx` (remplacé en entier) :

<!-- bloc: card-menu -->

```tsx
/**
 * The actions of a card without swiping (study 001, 3-B and 3-C; sheet 024): a visible "⋯"
 * button, and a long press on the card, open the same actions as the swipe, in a small menu.
 * Both read the actions the swipeable row shares (swipe-accessibility), so a card shows them
 * only inside a row that has actions, and a list never declares them twice.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useContext } from 'react';
import { Platform, TouchableOpacity } from 'react-native';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import { SwipeAccessibilityContext } from '@/components/ui/swipe-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { playHaptic } from '@/services/haptic-service';

/** Opens the menu of the row's actions, or undefined when the row has none. */
export function useCardMenu(title: string): (() => void) | undefined {
  const t = useT();
  const actions = useContext(SwipeAccessibilityContext);
  if (actions.length === 0) return undefined;
  return () => {
    playHaptic('light');
    GlassAlert.alert(title, undefined, [
      ...actions.map(action => ({
        text: action.label,
        style: action.key === 'delete' ? ('destructive' as const) : ('default' as const),
        onPress: action.onPress,
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  };
}

/** The "⋯" of a card: 44 dp to touch, named for the screen reader. Nothing outside a row with actions. */
export function CardMenuButton({ title, testID }: { title: string; testID?: string }) {
  const t = useT();
  const { palette } = useTheme();
  const open = useCardMenu(title);
  if (!open) return null;
  return (
    <TouchableOpacity
      onPress={open}
      // On the web a <button> may not sit inside the card, itself a <button>: there "⋯" keeps its
      // name and its place in the keyboard order, without the role. On the phone it is a button.
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={t('cardMenu.open', { title })}
      testID={testID}
      hitSlop={4}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name="ellipsis-horizontal" size={20} color={palette.onSurface.variant} />
    </TouchableOpacity>
  );
}
```

Fichier `src/features/mascot/TipBubbleLayer.tsx` (remplacé en entier) :

<!-- bloc: bubble -->

```tsx
/**
 * The bubble of a tip, under the title row of a screen, with Pulse beside it and "Compris"
 * (sheet 024: shared by the first visit tips and the gesture tips).
 */
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOUR_BUBBLE_MAX_WIDTH } from '@/domain/rules/mascot-tour-rules';
import { useT } from '@/i18n';

import { MascotBubble } from './MascotBubble';
import { PulseMascot } from './PulseMascot';

const SIDE_MARGIN_DP = 16;
const MASCOT_COLUMN_DP = 60;
/** Below the screen title row of the main tabs. */
const TOP_OFFSET_DP = 72;

export function TipBubbleLayer({ text, onClose }: { text: string; onClose: () => void }) {
  const t = useT();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: SIDE_MARGIN_DP,
          right: SIDE_MARGIN_DP,
          top: insets.top + TOP_OFFSET_DP,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        <View pointerEvents="none" style={{ width: MASCOT_COLUMN_DP, alignItems: 'center', paddingTop: 6 }}>
          <PulseMascot mood="happy" size={40} />
        </View>
        <MascotBubble
          text={text}
          maxWidth={Math.min(TOUR_BUBBLE_MAX_WIDTH, width - SIDE_MARGIN_DP * 2 - MASCOT_COLUMN_DP - 4)}
          tailSide="left"
          solid
          actions={[{ label: t('common.gotIt'), onPress: onClose, primary: true }]}
        />
      </View>
    </View>
  );
}
```

Fichier `src/features/mascot/FirstVisitTip.tsx` (remplacé en entier) :

<!-- bloc: first-visit -->

```tsx
/**
 * FirstVisitTip: one bubble the first time a screen is opened, then never again.
 *
 * It says one useful thing about the screen, stays a few seconds or until "Compris", and is
 * remembered as seen the moment it shows. It does not appear while the home tour is on, nor when
 * the mascot is off. The bubble itself is TipBubbleLayer, shared with the gesture tips (sheet 024).
 */

import React, { useEffect, useState } from 'react';

import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { TIP_MESSAGES, TipScreen } from '@/domain/rules/mascot-tour-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, markTipSeen } from '@/services/mascot/mascot-tips-service';

import { isHomeTourRunning } from './HomeTour';
import { TipBubbleLayer } from './TipBubbleLayer';
import { useMascotPreferences } from './use-mascot-preferences';

const SHOW_DELAY_MS = 1000;
const READING_MS = 9000;

export function FirstVisitTip({ screen }: { screen: TipScreen }) {
  const { preferences, settings } = useMascotPreferences();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    if (settings.presence === 'off') return;
    let active = true;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showTimer = setTimeout(async () => {
      if (!active || isHomeTourRunning() || (await hasSeenTip(screen))) return;
      const saved = await SettingsRepository.get().catch(() => null);
      const spoken = resolveMascotMessage(TIP_MESSAGES[screen], {}, preferences, saved?.displayName ?? null);
      if (!active || !spoken) return;

      setText(spoken);
      void markTipSeen(screen); // Seen from the moment it shows: it never comes twice
      hideTimer = setTimeout(() => active && setText(null), READING_MS);
    }, SHOW_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
    // The tip is decided when the screen shows, not each time a preference object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, settings.presence]);

  if (!text) return null;
  return <TipBubbleLayer text={text} onClose={() => setText(null)} />;
}
```

Fichier `src/services/mascot/mascot-tips-service.ts` (remplacé en entier) :

<!-- bloc: tips-service -->

```ts
/**
 * Remembers which tips and tours the mascot has already given, in the small mascot_state table.
 * A tip is given once; "Oublier les astuces vues" and "Revoir la présentation" give it back.
 * The day of the last tip is kept too (sheet 024): a gesture tip never comes on the same day as
 * another one. It is a "tip:" key, so forgetting the tips forgets it as well.
 */

import { LAST_TIP_DAY_ID, tipDay } from '../../domain/rules/gesture-tip-rules';
import { HOME_TOUR_TIP_ID, tipKey } from '../../domain/rules/mascot-tour-rules';
import { MascotStateRepository } from '../../repositories/mascot-state-repository';

/** True when the tip was already given. A failed read counts as seen: better silent than repeated. */
export async function hasSeenTip(id: string): Promise<boolean> {
  try {
    return (await MascotStateRepository.get(tipKey(id))) !== null;
  } catch {
    return true;
  }
}

export async function markTipSeen(id: string): Promise<void> {
  try {
    await MascotStateRepository.set(tipKey(id), '1');
    await MascotStateRepository.set(tipKey(LAST_TIP_DAY_ID), tipDay(new Date()));
  } catch {
    // The tip may come back once more: harmless
  }
}

/** The day (YYYY-MM-DD) a tip was last given, or null. A failed read counts as today: better silent. */
export async function lastTipDay(): Promise<string | null> {
  try {
    return await MascotStateRepository.get(tipKey(LAST_TIP_DAY_ID));
  } catch {
    return tipDay(new Date());
  }
}

/** "Revoir la présentation": the home tour will run again the next time the home screen shows. */
export async function replayHomeTour(): Promise<void> {
  await MascotStateRepository.delete(tipKey(HOME_TOUR_TIP_ID));
}
```

Fichier `src/features/mascot/GestureTip.tsx` (remplacé en entier) :

<!-- bloc: gesture-tip -->

```tsx
/**
 * A gesture tip in a list (study 001, 3-A and 12.3; sheet 024): the first time a list has enough
 * cards, and not on a day another tip was given, Pulse says it in a bubble and the first card
 * opens by itself for a moment to show its buttons. Once only. With the mascot off, the card still
 * opens (the gesture must be found), without the bubble. With reduced motion, it does not move.
 *
 * Usage in a list: const swipeTip = useGestureTip('swipe', cards.length);
 *   <SwipeableItem peek={swipeTip.peeking && index === 0} …> and {swipeTip.element} at the root.
 */
import React, { useEffect, useRef, useState } from 'react';

import { GESTURE_TIPS, gestureTipDue, PEEK_DELAY_MS, PEEK_OPEN_MS, type GestureTipId } from '@/domain/rules/gesture-tip-rules';
import { resolveMascotMessage } from '@/domain/rules/mascot-message-rules';
import { SettingsRepository } from '@/repositories/settings-repository';
import { hasSeenTip, lastTipDay, markTipSeen } from '@/services/mascot/mascot-tips-service';

import { isHomeTourRunning } from './HomeTour';
import { TipBubbleLayer } from './TipBubbleLayer';
import { useMascotPreferences } from './use-mascot-preferences';

const SHOW_DELAY_MS = 1200;
const READING_MS = 9000;

export function useGestureTip(id: GestureTipId, cardCount: number): { peeking: boolean; element: React.ReactElement | null } {
  const { preferences, settings } = useMascotPreferences();
  const [text, setText] = useState<string | null>(null);
  const [peeking, setPeeking] = useState(false);
  // Decided once per visit of the screen
  const decidedRef = useRef(false);
  const tip = GESTURE_TIPS[id];
  const ready = cardCount >= tip.minCards;

  useEffect(() => {
    if (!ready || decidedRef.current) return;
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(async () => {
        if (!active || isHomeTourRunning()) return;
        const [seen, lastDay] = await Promise.all([hasSeenTip(id), lastTipDay()]);
        if (!active || !gestureTipDue({ tip, cardCount, seen, lastTipDay: lastDay, now: new Date() })) return;
        decidedRef.current = true;
        void markTipSeen(id); // Seen from the moment it shows: it never comes twice

        setPeeking(true);
        timers.push(setTimeout(() => active && setPeeking(false), PEEK_DELAY_MS + PEEK_OPEN_MS + 400));

        if (settings.presence === 'off') return;
        const saved = await SettingsRepository.get().catch(() => null);
        const spoken = resolveMascotMessage(tip.message, {}, preferences, saved?.displayName ?? null);
        if (!active || !spoken) return;
        setText(spoken);
        timers.push(setTimeout(() => active && setText(null), READING_MS));
      }, SHOW_DELAY_MS)
    );

    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
    // Decided when the list is first long enough, not each time a preference object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ready]);

  return { peeking, element: text ? <TipBubbleLayer text={text} onClose={() => setText(null)} /> : null };
}
```

### Étape 3 — La rangée s'entrouvre, la carte ouvre son menu à l'appui long

Dans `src/components/ui/SwipeableItem.tsx` :

<!-- bloc: sw-import-avant -->

```tsx
import React, { useRef, useCallback, useMemo } from 'react';
```

devient :

<!-- bloc: sw-import-apres -->

```tsx
import React, { useRef, useCallback, useEffect, useMemo } from 'react';
```

Dans `src/components/ui/SwipeableItem.tsx` :

<!-- bloc: sw-import-2-avant -->

```tsx
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
```

devient :

<!-- bloc: sw-import-2-apres -->

```tsx
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { PEEK_DELAY_MS, PEEK_OPEN_MS } from '@/domain/rules/gesture-tip-rules';
```

Dans `src/components/ui/SwipeableItem.tsx` :

<!-- bloc: sw-prop-avant -->

```tsx
  /** Désactive entièrement le swipe si false */
  enabled?: boolean;
```

devient :

<!-- bloc: sw-prop-apres -->

```tsx
  /** Désactive entièrement le swipe si false */
  enabled?: boolean;
  /**
   * Opens the right actions by itself for a moment, to show that the card can be swiped
   * (sheet 024, the gesture tip). Not with reduced motion.
   */
  peek?: boolean;
```

Dans `src/components/ui/SwipeableItem.tsx` :

<!-- bloc: sw-args-avant -->

```tsx
  enabled = true,
  containerStyle,
}: SwipeableItemProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
```

devient :

<!-- bloc: sw-args-apres -->

```tsx
  enabled = true,
  containerStyle,
  peek = false,
}: SwipeableItemProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const reducedMotion = useReducedMotion();

  // The gesture tip: the card opens a moment after the list shows, then closes
  useEffect(() => {
    if (!peek || reducedMotion || !rightActions?.length) return;
    const open = setTimeout(() => swipeableRef.current?.openRight(), PEEK_DELAY_MS);
    const close = setTimeout(() => swipeableRef.current?.close(), PEEK_DELAY_MS + PEEK_OPEN_MS);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [peek, reducedMotion, rightActions?.length]);
```

Dans `src/components/ui/GlowCard.tsx` :

<!-- bloc: gc-import-avant -->

```tsx
import { useSwipeAccessibilityProps } from '@/components/ui/swipe-accessibility';
```

devient :

<!-- bloc: gc-import-apres -->

```tsx
import { useSwipeAccessibilityProps } from '@/components/ui/swipe-accessibility';
import { useCardMenu } from '@/components/ui/CardMenu';
```

Dans `src/components/ui/GlowCard.tsx` :

<!-- bloc: gc-hook-avant -->

```tsx
  const swipeAccessibility = useSwipeAccessibilityProps();
  const reducedMotion = useReducedMotion();
```

devient :

<!-- bloc: gc-hook-apres -->

```tsx
  const swipeAccessibility = useSwipeAccessibilityProps();
  // In a row with actions, a long press opens them in a menu (sheet 024)
  const openMenu = useCardMenu(accessibilityLabel ?? '');
  const reducedMotion = useReducedMotion();
```

Dans `src/components/ui/GlowCard.tsx` :

<!-- bloc: gc-press-avant -->

```tsx
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (reducedMotion) return;
        pressScale.value = withTiming(0.98, { duration: 100 });
      }}
```

devient :

<!-- bloc: gc-press-apres -->

```tsx
    <Pressable
      onPress={onPress}
      onLongPress={openMenu}
      onPressIn={() => {
        if (reducedMotion) return;
        pressScale.value = withTiming(0.98, { duration: 100 });
      }}
```

### Étape 4 — « ⋯ » sur les cartes, et l'astuce dans les trois listes

Dans `src/components/todo/TodoRow.tsx` :

<!-- bloc: tr-import-avant -->

```tsx
import { TagSummary } from '@/components/tags/TagChip';
```

devient :

<!-- bloc: tr-import-apres -->

```tsx
import { TagSummary } from '@/components/tags/TagChip';
import { CardMenuButton, useCardMenu } from '@/components/ui/CardMenu';
import { useSwipeAccessibilityProps } from '@/components/ui/swipe-accessibility';
```

Dans `src/components/todo/TodoRow.tsx` :

<!-- bloc: tr-hooks-avant -->

```tsx
  const accent = itemFamilyColor(palette, 'todo');
  const rings = entry.kind === 'reminder';
```

devient :

<!-- bloc: tr-hooks-apres -->

```tsx
  const accent = itemFamilyColor(palette, 'todo');
  // The actions of the swipe, also by a long press, "⋯" and the screen reader (sheet 024)
  const openMenu = useCardMenu(entry.title);
  const swipeAccessibility = useSwipeAccessibilityProps();
  const rings = entry.kind === 'reminder';
```

Dans `src/components/todo/TodoRow.tsx` :

<!-- bloc: tr-press-avant -->

```tsx
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
```

devient :

<!-- bloc: tr-press-apres -->

```tsx
    <Pressable
      onPress={onPress}
      onLongPress={openMenu}
      {...swipeAccessibility}
      accessibilityRole="button"
```

Dans `src/components/todo/TodoRow.tsx` :

<!-- bloc: tr-button-avant -->

```tsx
          <TagSummary tags={tags} />
        </View>
      </View>
    </Pressable>
```

devient :

<!-- bloc: tr-button-apres -->

```tsx
          <TagSummary tags={tags} />
        </View>
      </View>
      <CardMenuButton title={entry.title} testID={`todo-menu-${entry.id}`} />
    </Pressable>
```

Dans `src/app/habits/index.tsx` :

<!-- bloc: hb-import-avant -->

```tsx
import { SwipeableItem, makeStandardRightActions } from '@/components/ui/SwipeableItem';
```

devient :

<!-- bloc: hb-import-apres -->

```tsx
import { SwipeableItem, makeStandardRightActions } from '@/components/ui/SwipeableItem';
import { CardMenuButton } from '@/components/ui/CardMenu';
import { useGestureTip } from '@/features/mascot/GestureTip';
```

Dans `src/app/habits/index.tsx` :

<!-- bloc: hb-hook-avant -->

```tsx
  const [statsList, setStatsList] = useState<HabitStats[]>([]);
```

devient :

<!-- bloc: hb-hook-apres -->

```tsx
  const [statsList, setStatsList] = useState<HabitStats[]>([]);
  // The swipe tip, once, when the list has two habits or more (sheet 024)
  const swipeTip = useGestureTip('swipe', statsList.filter(s => s.habit.status === 'ACTIVE').length);
```

Dans `src/app/habits/index.tsx` :

<!-- bloc: hb-map-avant -->

```tsx
          activeHabits.map(item => {
```

devient :

<!-- bloc: hb-map-apres -->

```tsx
          activeHabits.map((item, index) => {
```

Dans `src/app/habits/index.tsx` :

<!-- bloc: hb-peek-avant -->

```tsx
              <SwipeableItem
                key={item.habit.id}
                containerStyle={styles.swipeableContainer}
```

devient :

<!-- bloc: hb-peek-apres -->

```tsx
              <SwipeableItem
                key={item.habit.id}
                peek={swipeTip.peeking && index === 0}
                containerStyle={styles.swipeableContainer}
```

Dans `src/app/habits/index.tsx` :

<!-- bloc: hb-button-avant -->

```tsx
                    <View style={styles.streakBadge}>
                      <Ionicons name="flame" size={18} color="#FF9800" />
                      <Text style={styles.streakText}>{t('habits.streakDays', { days: item.currentStreak })}</Text>
                    </View>
```

devient :

<!-- bloc: hb-button-apres -->

```tsx
                    <View style={styles.streakBadge}>
                      <Ionicons name="flame" size={18} color="#FF9800" />
                      <Text style={styles.streakText}>{t('habits.streakDays', { days: item.currentStreak })}</Text>
                    </View>
                    <CardMenuButton title={item.habit.title} />
```

Dans `src/app/habits/index.tsx` :

<!-- bloc: hb-element-avant -->

```tsx
        onPress={() => router.push('/habits/new')}
      />
    </View>
```

devient :

<!-- bloc: hb-element-apres -->

```tsx
        onPress={() => router.push('/habits/new')}
      />
      {swipeTip.element}
    </View>
```

Dans `src/app/goals/index.tsx` :

<!-- bloc: gl-import-avant -->

```tsx
import { SwipeableItem, makeStandardRightActions } from '@/components/ui/SwipeableItem';
```

devient :

<!-- bloc: gl-import-apres -->

```tsx
import { SwipeableItem, makeStandardRightActions } from '@/components/ui/SwipeableItem';
import { CardMenuButton } from '@/components/ui/CardMenu';
import { useGestureTip } from '@/features/mascot/GestureTip';
```

Dans `src/app/goals/index.tsx` :

<!-- bloc: gl-hook-avant -->

```tsx
  const [goalsList, setGoalsList] = useState<GoalDetails[]>([]);
```

devient :

<!-- bloc: gl-hook-apres -->

```tsx
  const [goalsList, setGoalsList] = useState<GoalDetails[]>([]);
  // The swipe tip, once, when the list has two goals or more (sheet 024)
  const swipeTip = useGestureTip('swipe', goalsList.filter(g => g.goal.status === 'ACTIVE').length);
```

Dans `src/app/goals/index.tsx` :

<!-- bloc: gl-map-avant -->

```tsx
          activeGoals.map(item => (
```

devient :

<!-- bloc: gl-map-apres -->

```tsx
          activeGoals.map((item, index) => (
```

Dans `src/app/goals/index.tsx` :

<!-- bloc: gl-peek-avant -->

```tsx
            <SwipeableItem
              key={item.goal.id}
              containerStyle={styles.swipeableContainer}
```

devient :

<!-- bloc: gl-peek-apres -->

```tsx
            <SwipeableItem
              key={item.goal.id}
              peek={swipeTip.peeking && index === 0}
              containerStyle={styles.swipeableContainer}
```

Dans `src/app/goals/index.tsx` :

<!-- bloc: gl-button-avant -->

```tsx
                    {item.isOverdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueText}>{t('goals.overdueBadge')}</Text>
                      </View>
                    )}
```

devient :

<!-- bloc: gl-button-apres -->

```tsx
                    {item.isOverdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueText}>{t('goals.overdueBadge')}</Text>
                      </View>
                    )}
                    <CardMenuButton title={item.goal.title} />
```

Dans `src/app/goals/index.tsx` :

<!-- bloc: gl-element-avant -->

```tsx
        onPress={() => router.push('/goals/new')}
      />
    </View>
```

devient :

<!-- bloc: gl-element-apres -->

```tsx
        onPress={() => router.push('/goals/new')}
      />
      {swipeTip.element}
    </View>
```

Dans `src/features/todo/TodoTabScreen.tsx` :

<!-- bloc: tt-import-avant -->

```tsx
import { SwipeableItem, makeStandardRightActions, type SwipeAction } from '@/components/ui/SwipeableItem';
```

devient :

<!-- bloc: tt-import-apres -->

```tsx
import { SwipeableItem, makeStandardRightActions, type SwipeAction } from '@/components/ui/SwipeableItem';
import { useGestureTip } from '@/features/mascot/GestureTip';
```

Dans `src/features/todo/TodoTabScreen.tsx` :

<!-- bloc: tt-hook-avant -->

```tsx
  const counts = todoCounts(entries);
```

devient :

<!-- bloc: tt-hook-apres -->

```tsx
  const counts = todoCounts(entries);
  // The swipe tip (sheet 024): once, when two cards or more show; the first one opens by itself
  const shownCount = sections.reduce((sum, section) => sum + section.entries.length, 0);
  const swipeTip = useGestureTip('swipe', shownCount);
  const firstShown = sections[0]?.entries[0];
  const firstKey = firstShown ? `${firstShown.kind}-${firstShown.id}` : null;
```

Dans `src/features/todo/TodoTabScreen.tsx` :

<!-- bloc: tt-peek-avant -->

```tsx
                <SwipeableItem
                  key={`${entry.kind}-${entry.id}`}
                  rightActions={rightActionsOf(entry)}
```

devient :

<!-- bloc: tt-peek-apres -->

```tsx
                <SwipeableItem
                  key={`${entry.kind}-${entry.id}`}
                  peek={swipeTip.peeking && `${entry.kind}-${entry.id}` === firstKey}
                  rightActions={rightActionsOf(entry)}
```

Dans `src/features/todo/TodoTabScreen.tsx` :

<!-- bloc: tt-element-avant -->

```tsx
        onPress={() => router.push(addPath as never)}
      />
    </View>
```

devient :

<!-- bloc: tt-element-apres -->

```tsx
        onPress={() => router.push(addPath as never)}
      />
      {swipeTip.element}
    </View>
```

### Étape 5 — Les mots

Dans `src/domain/rules/mascot-message-catalog.ts` :

<!-- bloc: msg-fr-avant -->

```ts
    ["Les propositions sont ici. Vous décidez toujours de la suite.", "{name}, les propositions sont ici. Vous décidez toujours de la suite."],
  ),
```

devient :

<!-- bloc: msg-fr-apres -->

```ts
    ["Les propositions sont ici. Vous décidez toujours de la suite.", "{name}, les propositions sont ici. Vous décidez toujours de la suite."],
  ),
  // The gesture tip of the lists (sheet 024), once, when a list has two cards or more
  TIP_SWIPE: entry(
    ["Astuce : glisse une carte pour la modifier ou la supprimer. Le bouton ⋯ fait pareil.", "{name}, astuce : glisse une carte pour la modifier ou la supprimer. Le bouton ⋯ fait pareil."],
    ["Glisse une carte, ou touche ⋯, pour la modifier ou la supprimer.", "{name}, glisse une carte, ou touche ⋯, pour la modifier ou la supprimer."],
    ["Astuce : faites glisser une carte pour la modifier ou la supprimer. Le bouton ⋯ fait pareil.", "{name}, astuce : faites glisser une carte pour la modifier ou la supprimer. Le bouton ⋯ fait pareil."],
    ["Faites glisser une carte, ou touchez ⋯, pour la modifier ou la supprimer.", "{name}, faites glisser une carte, ou touchez ⋯, pour la modifier ou la supprimer."],
  ),
```

Dans `src/domain/rules/mascot-message-catalog-en.ts` :

<!-- bloc: msg-en-avant -->

```ts
    ["The suggestions are here. You always decide what happens next.", "{name}, the suggestions are here. You always decide what happens next."],
  ),
```

devient :

<!-- bloc: msg-en-apres -->

```ts
    ["The suggestions are here. You always decide what happens next.", "{name}, the suggestions are here. You always decide what happens next."],
  ),
  TIP_SWIPE: entry(
    ["Tip: swipe a card to edit or delete it. The ⋯ button does the same.", "{name}, tip: swipe a card to edit or delete it. The ⋯ button does the same."],
    ["Swipe a card, or tap ⋯, to edit or delete it.", "{name}, swipe a card, or tap ⋯, to edit or delete it."],
  ),
```

Dans `src/i18n/messages-rest-fr.ts` :

<!-- bloc: fr-avant -->

```ts
  'itemForm.customRepeatKept':
```

devient :

<!-- bloc: fr-apres -->

```ts
  'cardMenu.open': "Actions : {title}",
  'itemForm.customRepeatKept':
```

Dans `src/i18n/messages-rest-en.ts` :

<!-- bloc: en-avant -->

```ts
  'itemForm.customRepeatKept':
```

devient :

<!-- bloc: en-apres -->

```ts
  'cardMenu.open': "Actions: {title}",
  'itemForm.customRepeatKept':
```

### Étape 6 — Appliquer d'un coup, puis vérifier

```powershell
node docs/tutoriel-suite/outils/appliquer-fiche-024.js .
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
| `npx jest` | tout passe, dont `gesture-tip-rules` |
| À faire avec deux cartes ou plus (un autre jour qu'une autre astuce) | bulle de Pulse, la première carte s'entrouvre puis se referme ; plus jamais ensuite |
| « ⋯ » d'une carte | menu : les actions du glissement, Supprimer en rouge, Annuler |
| Appui long sur une carte | le même menu, avec une petite vibration |
| Paramètres → Pulse → Oublier les astuces vues | l'astuce peut revenir (un autre jour que la dernière) |

## 7. Retour en arrière

`git checkout -- <fichiers modifiés>` et supprimer les fichiers nouveaux. Aucune donnée touchée (seulement deux clés « tip: » dans la petite table de Pulse).

## Compte rendu d'exécution (24 novembre 2026)

- Lu avant d'écrire : l'étude (3 et 12.3, décisions déjà prises : 3-A, 3-B et 3-C, une astuce à la fois), `SwipeableItem`, `GlowCard`, `TodoRow`, les trois listes qui se glissent, la bulle de première visite et le service des astuces vues.
- Appliquée **à partir des blocs de cette fiche** (`appliquer-fiche-024.js`), puis rejouée sur une copie propre du code enregistré : résultat identique fichier par fichier.
- **Écart corrigé** : sur le web, « ⋯ » était un bouton dans le bouton de la carte (HTML invalide, avertissement de React). Sur le web, il garde son nom et sa place au clavier sans le rôle « bouton » ; sur le téléphone, rien ne change.
- **Problème rencontré** : le serveur web s'est arrêté au démarrage (code 3221225477, cache de Metro) ; relancé avec `--clear` (déjà dans la boîte à outils).
- Tests : `Test Suites: 100 passed`, `Tests: 2060 passed` ; `tsc` et `eslint` sans erreur.
- **Vérifié à l'écran** (web, 360 px, onglet À faire, 6 cartes) :
  - la bulle « Simon, astuce : glisse une carte pour la modifier ou la supprimer. Le bouton ⋯ fait pareil. » est apparue, puis plus après rechargement (vue une fois) ;
  - « ⋯ » sur chaque carte ouvre le menu « Fait · Modifier · Supprimer (rouge) · Annuler », fermé avec Annuler.
- **Pas vérifié** : la carte qui s'entrouvre (le glissement ne s'observe pas bien sur le web), l'appui long et sa vibration, les listes Habitudes et Objectifs : à voir sur le téléphone. Rien n'est encore enregistré dans git.

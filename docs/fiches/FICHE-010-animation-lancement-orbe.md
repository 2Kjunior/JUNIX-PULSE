# FICHE OPÉRATOIRE N° 010 — L'animation de lancement autour de l'orbe, et le nouveau `PulseLogo`

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 009](FICHE-009-icones-logo-a1.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), sections 4 (« Animation de lancement »), 12.7 et 12.10 (chantier n° 1) · Dessin validé : [logo-A1-final.svg](../etudes/images/logo-A1-final.svg)

---

## 1. Objectif

Ce que l'utilisateur voit **en premier** en ouvrant l'appli devient l'orbe A1, sur fond sombre, sans aucun flash blanc :

| Moment | Ce qu'on voit |
|---|---|
| 0,00 s | Fond sombre `#141317` (la couleur de l'appli et de l'icône), une lueur violette s'allume au centre |
| 0,15 s | **L'anneau se dessine**, dans le sens des aiguilles d'une montre, en partant de la gauche |
| 0,85 s | **Le liquide monte** dans l'orbe en ondulant |
| 1,75 s | **Le battement passe** de gauche à droite, puis l'orbe bat deux fois, et une onde part de l'anneau |
| 2,30 s | **« JUNIX PULSE » apparaît** sous l'orbe, en montant légèrement |
| 3,00 s | Si la mascotte est activée, **l'orbe devient Pulse, qui salue** de la main |
| 3,90 s | Tout s'efface en fondu sur l'appli (fin à 4,4 s) |

- **Mouvement réduit** (réglage d'accessibilité du téléphone) : le logo complet s'affiche fixe 0,8 s, puis un fondu.
- **Un toucher** n'importe où passe l'animation.
- **Mascotte désactivée** (Réglages › Mascotte › Présence : désactivée) : l'animation finit sur l'orbe, sans Pulse.

Le petit logo de l'appli, `PulseLogo` (onboarding, onglet Pulse quand la mascotte est désactivée, Sanctuaire), devient lui aussi l'orbe, en version sombre ou claire selon le thème.

**Pour que rien ne casse demain** : l'orbe est décrit **une seule fois**, en code, dans `src/constants/orb-logo.ts`, puis dessiné par **un seul composant**, `OrbMark`. L'animation de lancement et `PulseLogo` l'utilisent tous les deux. Pour retoucher le logo un jour, on modifie un seul fichier.

### Choix fait dans cette fiche (à revoir si tu préfères autrement)

L'écran de démarrage **du système** (celui qu'Android montre pendant le chargement, avant notre animation) devient **sombre et vide**. Avec l'orbe dessus, on verrait l'orbe s'afficher, disparaître, puis se redessiner : une saccade. L'autre solution serait de garder l'orbe sur l'écran du système et de commencer l'animation avec l'orbe déjà dessiné, mais on perdrait « l'anneau se dessine, le liquide monte ».

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 009 est faite | `git log --oneline -3` | Le commit `feat(logo): the orb A1 as the app icon…` est présent |
| Le projet est propre | `git status --short` | Seulement `?? docs/motion/` (et cette fiche) |
| Aucune compilation Android en cours | La fenêtre où tourne `gradlew` est terminée | Sinon attendre : la compilation embarque le code tel qu'il est au moment où elle l'emballe |

## 3. Matériel

| Outil | Preuve | Sinon |
|---|---|---|
| Node.js | `node --version` | nodejs.org |
| Microsoft Edge (pour refabriquer l'image de démarrage) | voir fiche 009 | idem |

**Aucune bibliothèque ajoutée** : tout est dessiné avec `react-native-svg` et animé avec `react-native-reanimated`, déjà dans le projet. Le son de lancement (`assets/sounds/junix-pulse-launch-sound.wav`) est gardé tel quel.

## 4. Hypothèses

- La mascotte dessinée à la taille 96 a son orbe de rayon 48 (fichier `src/features/mascot/mascot-visuals.ts`, `MASCOT_ORB.radius`). L'animation l'agrandit pour que l'orbe de Pulse ait la taille de l'anneau du logo : si ces nombres changent un jour, le calcul suit tout seul.
- La base de données s'ouvre **pendant** l'animation. On ne sait donc qu'en cours de route si la mascotte est activée : l'animation lit ce réglage **au moment** où Pulse doit apparaître (3,00 s). Si la base n'est pas encore ouverte, l'animation finit sur l'orbe, sans Pulse.

## 5. Carte de l'intervention

| Fichier | Action | Rôle |
|---|---|---|
| `src/constants/orb-logo.ts` | **créé** | Le dessin de l'orbe en nombres (anneau, liquide, battement, couleurs) |
| `src/components/ui/OrbMark.tsx` | **créé** | Dessine l'orbe, fini ou en train de se dessiner |
| `src/components/ui/PulseLogo.tsx` | remplacé | Le logo de l'appli = l'orbe + une lueur qui respire |
| `src/features/launch/splash-constants.ts` | remplacé | Couleurs, tailles et minutage de l'animation |
| `src/features/launch/SplashAnimation.tsx` | remplacé | La nouvelle animation (921 lignes → environ 250) |
| `src/app/_layout.tsx` | modifié (5 endroits) | Lit le réglage de la mascotte au démarrage et le passe à l'animation |
| `assets/logo/orbe-demarrage.svg` | remplacé | Image de l'écran de démarrage du système : vide (transparente) |
| `app.json` | modifié | Écran de démarrage du système : fond `#141317` |
| `src/__tests__/launch-orb.test.tsx` | **créé** | 7 tests : le dessin, le minutage, l'animation |
| `src/__tests__/app-icons.test.ts` | modifié (1 ligne) | Le nom du test dit maintenant « image transparente » |
| `jest.setup.js` | modifié (1 ligne) | Le faux Reanimated des tests apprend `cancelAnimation` |

Non touchés : l'ancienne image `assets/images/junix-pulse-logo-transparent.png` n'est plus utilisée nulle part, mais on la garde (on ne supprime rien sans le décider).

## 6. Sauvegarde

Rien à sauvegarder dans les données : cette fiche ne touche ni la base, ni les réglages enregistrés. Le code est dans git : pour tout annuler avant le commit,

```bash
git restore src/components/ui/PulseLogo.tsx src/features/launch src/app/_layout.tsx app.json assets/logo/orbe-demarrage.svg assets/images/splash-icon.png src/__tests__/app-icons.test.ts
```

puis effacer les trois fichiers créés.

## 7. Étapes

### Étape 1 — Le dessin de l'orbe, en nombres

Créer `src/constants/orb-logo.ts` :

<!-- bloc: orb-logo -->

```ts
/**
 * The orb A1, the Junix Pulse logo, as numbers: the one source of its drawing for the logo in
 * the app (PulseLogo) and the launch animation. The drawings in assets/logo use the same numbers.
 * The orb is drawn around (0, 0), in a square of 180 units.
 */

export const ORB_VIEWBOX = '-90 -90 180 180';
export const ORB_VIEWBOX_SIZE = 180;

/** The ring: its radius and the width of its line. */
export const ORB_RING = { radius: 78, stroke: 10 } as const;

/** Distance around the ring, to draw it little by little. */
export const ORB_RING_LENGTH = 2 * Math.PI * ORB_RING.radius;

/** The liquid stays inside this circle, within the ring. */
export const ORB_LIQUID_RADIUS = 62;

/** The heartbeat line that crosses the orb. */
export const ORB_BEAT_PATH = 'M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58';

/** Length of the beat line: its six segments added up (223.3), rounded up. */
export const ORB_BEAT_LENGTH = 224;
export const ORB_BEAT_STROKE = 8;
export const ORB_BEAT_OUTLINE_STROKE = 15;

/** The liquid's surface: a wave 80 units long and 12 deep, at height 18. */
export const ORB_WAVE = { period: 80, depth: 12, surfaceY: 18 } as const;

/** How far the liquid goes down to be hidden under the ring. */
export const ORB_LIQUID_HIDDEN_DROP = 70;

export const ORB_COLORS = {
  ringFrom: '#8B3DF0',
  ringTo: '#0AE8F0',
  liquidFrom: '#B58BFF',
  liquidTo: '#7FE9F2',
} as const;

/** dark: for a dark background, white beat. light: dark violet beat outlined in white. */
export type OrbVariant = 'dark' | 'light';

export const ORB_VARIANTS: Record<OrbVariant, { beat: string; beatOutline: string | null; liquidOpacity: number }> = {
  dark: { beat: '#FFFFFF', beatOutline: null, liquidOpacity: 0.9 },
  light: { beat: '#3B2A78', beatOutline: '#FFFFFF', liquidOpacity: 1 },
};

/**
 * The liquid's outline. `drop` moves it down (0 = in place, ORB_LIQUID_HIDDEN_DROP = hidden),
 * `slide` moves the wave to the right (one period, 80, gives the same shape again).
 * At (0, 0) it is the drawing of the logo. Also runs on the animation thread ('worklet').
 */
export function orbWavePath(drop = 0, slide = 0): string {
  'worklet';
  const half = ORB_WAVE.period / 2;
  // The logo's wave starts at -70: one period further left, it still covers the orb once slid by 80
  const x0 = slide - 70 - ORB_WAVE.period;
  const y = ORB_WAVE.surfaceY + drop;
  let d = `M${x0} ${y} Q${x0 + half / 2} ${y - ORB_WAVE.depth} ${x0 + half} ${y}`;
  for (let step = 2; step <= 8; step += 1) d += ` T${x0 + half * step} ${y}`;
  return `${d} V${80 + drop} H${x0} Z`;
}
```

| Ligne | Ce qu'elle fait |
|---|---|
| `ORB_VIEWBOX = '-90 -90 180 180'` | Le cadre du dessin : un carré de 180 unités, le centre de l'orbe en (0, 0) |
| `ORB_RING_LENGTH = 2 * Math.PI * …` | Le tour de l'anneau (environ 490). Pour « dessiner » un trait, on cache sa longueur puis on la révèle |
| `ORB_BEAT_LENGTH = 224` | La longueur du battement ; le test de l'étape 7 vérifie ce nombre en refaisant le calcul |
| `ORB_VARIANTS` | Les deux versions du logo validé : sombre (battement blanc) et claire (battement violet foncé détouré de blanc) |
| `'worklet'` | Dit à Reanimated que cette fonction peut aussi tourner sur le fil des animations, pour que le liquide bouge sans saccade |
| `const x0 = slide - 70 - ORB_WAVE.period` | Le début de la vague : la vague du logo commence à −70 ; on part une vague plus à gauche (−150), pour couvrir l'orbe même une fois la vague glissée de 80, avec les bosses et les creux aux mêmes endroits que sur le dessin validé |
| `Q… T…` | Une vague en SVG : `Q` dessine une première bosse, chaque `T` répète la bosse en l'inversant (creux, bosse, creux…) |
| `V${80 + drop} H${x0} Z` | Ferme la forme par le bas, pour que le liquide soit rempli |

### Étape 2 — Le composant qui dessine l'orbe

Créer `src/components/ui/OrbMark.tsx` :

<!-- bloc: orb-mark -->

```tsx
/**
 * OrbMark: the orb A1 drawn in the app, from the shared drawing in constants/orb-logo.
 * Without `progress` it is the finished logo. With `progress`, three values from 0 to 1 draw it:
 * the ring, then the liquid, then the beat. Used by PulseLogo and by the launch animation.
 */

import React, { useId } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import {
  ORB_BEAT_LENGTH,
  ORB_BEAT_OUTLINE_STROKE,
  ORB_BEAT_PATH,
  ORB_BEAT_STROKE,
  ORB_COLORS,
  ORB_LIQUID_HIDDEN_DROP,
  ORB_LIQUID_RADIUS,
  ORB_RING,
  ORB_RING_LENGTH,
  ORB_VARIANTS,
  ORB_VIEWBOX,
  ORB_WAVE,
  orbWavePath,
  type OrbVariant,
} from '@/constants/orb-logo';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface OrbMarkProgress {
  /** 0 to 1: the ring draws itself, clockwise from the left. */
  ring: SharedValue<number>;
  /** 0 to 1: the liquid rises while its wave sways. */
  liquid: SharedValue<number>;
  /** 0 to 1: the beat crosses the orb from left to right. */
  beat: SharedValue<number>;
}

export interface OrbMarkProps {
  size: number;
  variant?: OrbVariant;
  progress?: OrbMarkProgress;
  /** What a screen reader says; given to the drawing itself. */
  label?: string;
}

export function OrbMark({ size, variant = 'dark', progress, label }: OrbMarkProps) {
  const id = `orb${useId().replace(/[^A-Za-z0-9]/g, '')}`;
  const look = ORB_VARIANTS[variant];
  const beatDash = `${ORB_BEAT_LENGTH} ${ORB_BEAT_LENGTH}`;

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: ORB_RING_LENGTH * (1 - (progress ? progress.ring.value : 1)),
  }));
  const liquidProps = useAnimatedProps(() => {
    const done = progress ? progress.liquid.value : 1;
    return { d: orbWavePath(ORB_LIQUID_HIDDEN_DROP * (1 - done), ORB_WAVE.period * done) };
  });
  const beatProps = useAnimatedProps(() => {
    const done = progress ? progress.beat.value : 1;
    return { strokeDashoffset: ORB_BEAT_LENGTH * (1 - done), opacity: done > 0 ? 1 : 0 };
  });
  const beatOutlineProps = useAnimatedProps(() => {
    const done = progress ? progress.beat.value : 1;
    return { strokeDashoffset: ORB_BEAT_LENGTH * (1 - done), opacity: done > 0 ? 1 : 0 };
  });

  return (
    <Svg width={size} height={size} viewBox={ORB_VIEWBOX} accessibilityLabel={label}>
      <Defs>
        {/* The ring is turned half a circle so it starts on the left: the gradient is turned back to match */}
        <LinearGradient id={`${id}ring`} x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ORB_COLORS.ringFrom} />
          <Stop offset="1" stopColor={ORB_COLORS.ringTo} />
        </LinearGradient>
        <LinearGradient id={`${id}liquid`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={ORB_COLORS.liquidFrom} />
          <Stop offset="1" stopColor={ORB_COLORS.liquidTo} />
        </LinearGradient>
        <ClipPath id={`${id}clip`}>
          <Circle r={ORB_LIQUID_RADIUS} />
        </ClipPath>
      </Defs>

      <AnimatedCircle
        r={ORB_RING.radius}
        fill="none"
        stroke={`url(#${id}ring)`}
        strokeWidth={ORB_RING.stroke}
        strokeDasharray={`${ORB_RING_LENGTH} ${ORB_RING_LENGTH}`}
        transform="rotate(180)"
        animatedProps={ringProps}
      />

      <G clipPath={`url(#${id}clip)`}>
        <AnimatedPath
          d={orbWavePath()}
          fill={`url(#${id}liquid)`}
          opacity={look.liquidOpacity}
          animatedProps={liquidProps}
        />
      </G>

      {look.beatOutline ? (
        <AnimatedPath
          d={ORB_BEAT_PATH}
          fill="none"
          stroke={look.beatOutline}
          strokeWidth={ORB_BEAT_OUTLINE_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={beatDash}
          animatedProps={beatOutlineProps}
        />
      ) : null}
      <AnimatedPath
        d={ORB_BEAT_PATH}
        fill="none"
        stroke={look.beat}
        strokeWidth={ORB_BEAT_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={beatDash}
        animatedProps={beatProps}
      />
    </Svg>
  );
}
```

| Ligne | Ce qu'elle fait |
|---|---|
| `useId().replace(…)` | Un nom unique pour les dégradés de **cet** orbe : deux orbes à l'écran ne se mélangent pas leurs couleurs. On garde seulement lettres et chiffres, comme pour la mascotte |
| `progress ? progress.ring.value : 1` | Sans `progress`, tout vaut 1 : l'orbe est fini |
| `strokeDashoffset: LENGTH * (1 - …)` | Le trait est caché sur toute sa longueur au départ (0), puis révélé petit à petit jusqu'à 1 |
| `orbWavePath(70 * (1 - done), 80 * done)` | Le liquide part de 70 unités plus bas (caché) et remonte, en glissant d'une vague entière |
| `opacity: done > 0 ? 1 : 0` | Le bout arrondi du battement ferait un point visible avant le départ : on le cache tant que rien n'est tracé |
| `transform="rotate(180)"` | Un cercle SVG commence à droite ; tourné d'un demi-tour, il commence à gauche |
| `x1="1" y1="0" x2="0" y2="1"` | Le dégradé tourne avec le cercle : on l'inverse pour garder le violet en bas à gauche et le cyan en haut à droite, comme sur l'icône |
| `ClipPath` + `G clipPath` | Le liquide ne déborde jamais de l'intérieur de l'orbe |

### Étape 3 — Le nouveau `PulseLogo`

Remplacer tout le contenu de `src/components/ui/PulseLogo.tsx` :

<!-- bloc: pulse-logo -->

```tsx
/**
 * PulseLogo: the Junix Pulse logo in the app, the orb A1 (see OrbMark) with a glow that breathes.
 *
 * Modes:
 *  - 'draw'  : the orb draws itself (ring, liquid, beat, 1.2 s), then rests as in 'idle'
 *  - 'idle'  : a double heartbeat every 2.4 s and a breathing glow
 *  - 'static': the finished logo, still; also when the phone asks for reduced motion
 *
 * Rule A.3: ambient animation only where the logo is shown large.
 * Rule A.1: no emoji, this drawing is the visual identity.
 */

import React, { useEffect, useId, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { OrbMark } from '@/components/ui/OrbMark';
import { ORB_RING, ORB_VIEWBOX } from '@/constants/orb-logo';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DRAW = { ringMs: 600, liquidDelayMs: 300, liquidMs: 700, beatDelayMs: 750, beatMs: 450 } as const;
const IDLE_INTERVAL = 2400;
const GLOW_MAX_OPACITY = 0.22;
const GLOW_REST_OPACITY = GLOW_MAX_OPACITY * 0.5;

interface PulseLogoProps {
  size?: number;
  mode?: 'draw' | 'idle' | 'static';
  onDrawComplete?: () => void;
}

export function PulseLogo({ size = 80, mode = 'static', onDrawComplete }: PulseLogoProps) {
  const { isDark } = useTheme();
  const reduceMotion = useSafeReducedMotion();
  const glowId = `glow${useId().replace(/[^A-Za-z0-9]/g, '')}`;
  const onDrawCompleteRef = useRef(onDrawComplete);

  const ring = useSharedValue(mode === 'draw' ? 0 : 1);
  const liquid = useSharedValue(mode === 'draw' ? 0 : 1);
  const beat = useSharedValue(mode === 'draw' ? 0 : 1);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(GLOW_REST_OPACITY);
  const glowScale = useSharedValue(1);
  const progress = useMemo(() => ({ ring, liquid, beat }), [ring, liquid, beat]);

  useEffect(() => {
    onDrawCompleteRef.current = onDrawComplete;
  }, [onDrawComplete]);

  useEffect(() => {
    // Double heartbeat (1 → 1.035 → 1 → 1.02 → 1) every 2.4 s, and a glow breathing in 4.5 s
    function rest() {
      scale.value = withRepeat(
        withSequence(
          withDelay(IDLE_INTERVAL * 0.1, withTiming(1.035, { duration: 150, easing: Easing.out(Easing.ease) })),
          withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) }),
          withDelay(80, withTiming(1.02, { duration: 120, easing: Easing.out(Easing.ease) })),
          withTiming(1, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withDelay(IDLE_INTERVAL * 0.6, withTiming(1, { duration: 10 }))
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(GLOW_MAX_OPACITY, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
          withTiming(GLOW_MAX_OPACITY * 0.35, { duration: 2250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 2250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }

    function drawFinished() {
      onDrawCompleteRef.current?.();
      rest();
    }

    if (reduceMotion || mode === 'static') {
      ring.value = 1;
      liquid.value = 1;
      beat.value = 1;
      scale.value = 1;
      glowOpacity.value = GLOW_REST_OPACITY;
      glowScale.value = 1;
      if (mode === 'draw') onDrawCompleteRef.current?.();
    } else if (mode === 'draw') {
      ring.value = 0;
      liquid.value = 0;
      beat.value = 0;
      ring.value = withTiming(1, { duration: DRAW.ringMs, easing: Easing.bezier(0.65, 0, 0.25, 1) });
      liquid.value = withDelay(
        DRAW.liquidDelayMs,
        withTiming(1, { duration: DRAW.liquidMs, easing: Easing.bezier(0.2, 0.9, 0.25, 1) })
      );
      beat.value = withDelay(
        DRAW.beatDelayMs,
        withTiming(1, { duration: DRAW.beatMs, easing: Easing.inOut(Easing.ease) }, (finished) => {
          if (finished) runOnJS(drawFinished)();
        })
      );
    } else {
      rest();
    }

    return () => {
      for (const value of [ring, liquid, beat, scale, glowOpacity, glowScale]) cancelAnimation(value);
    };
  }, [mode, reduceMotion, ring, liquid, beat, scale, glowOpacity, glowScale]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowProps = useAnimatedProps(() => ({
    opacity: glowOpacity.value / GLOW_MAX_OPACITY,
    r: ORB_RING.radius * glowScale.value,
  }));
  const glowColor = isDark ? '#A078FF' : '#6B46C1';

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, logoStyle]}>
      <Svg width={size} height={size} viewBox={ORB_VIEWBOX} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glowColor} stopOpacity={GLOW_MAX_OPACITY} />
            <Stop offset="1" stopColor={glowColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedCircle fill={`url(#${glowId})`} animatedProps={glowProps} />
      </Svg>
      <OrbMark
        size={size}
        variant={isDark ? 'dark' : 'light'}
        progress={progress}
        label="Junix Pulse logo"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

| Ligne | Ce qu'elle fait |
|---|---|
| `useSafeReducedMotion()` | Le même réglage « mouvement réduit » que la mascotte, et il suit le téléphone en direct |
| `useSharedValue(mode === 'draw' ? 0 : 1)` | En mode « draw » l'orbe part vide, sinon il est déjà fini : pas de flash au premier affichage |
| `useMemo(() => ({ ring, liquid, beat }))` | Les trois avancées regroupées pour `OrbMark`, sans recréer l'objet à chaque affichage |
| `onDrawCompleteRef` | Garde la dernière fonction à appeler à la fin du tracé, sans relancer l'animation quand elle change |
| `function rest()` | Le repos : double battement toutes les 2,4 s, comme l'ancien logo, et la lueur qui respire |
| `cancelAnimation(value)` | Arrête les boucles quand le logo disparaît de l'écran ou change de mode |
| `RadialGradient` + `AnimatedCircle` | La lueur, derrière l'orbe : violet au centre, transparent au bord |
| `label="Junix Pulse logo"` | Le même nom qu'avant pour les lecteurs d'écran. `OrbMark` le donne au dessin (`Svg`) sous le nom `accessibilityLabel` ; la propriété s'appelle `label` pour que le test existant trouve **un seul** élément portant ce nom, le dessin, avec sa largeur et sa hauteur |

### Étape 4 — Les nombres de l'animation de lancement

Remplacer tout le contenu de `src/features/launch/splash-constants.ts` :

<!-- bloc: splash-constants -->

```ts
/**
 * The launch animation, in numbers: colours, sizes, the timeline and its curves.
 * The orb itself is drawn from constants/orb-logo.
 */

import { Easing } from 'react-native-reanimated';

export const SPLASH_COLORS = {
  /** The dark surface of the app: the same as the system launch screen and the icon. */
  background: '#141317',
  glow: '#8B3DF0',
  ripple: '#0AE8F0',
  name: '#FFFFFF',
  tagline: '#7FE9F2',
} as const;

export const SPLASH_LAYOUT = {
  /** The orb's width on screen: 180 px for its 180 units. */
  orbSize: 180,
  /** The glow behind the orb. */
  glowSize: 300,
  /** The ripple leaves the ring and widens by this much. */
  rippleSpread: 56,
  nameGap: 28,
  nameRise: 16,
} as const;

/** The double heartbeat: the orb's size at the end of each step, and how long the step lasts. */
export const SPLASH_HEARTBEAT = [
  { scale: 1.06, ms: 140 },
  { scale: 1, ms: 140 },
  { scale: 1.035, ms: 120 },
  { scale: 1, ms: 220 },
] as const;

export const SPLASH_TIMINGS = {
  totalDurationMs: 4400,
  // Safety net: the app opens even if an animation never reports its end
  safetyTimeoutMs: 4800,
  reducedMotionHoldMs: 800,
  reducedMotionExitMs: 400,

  glowDurationMs: 600,
  ringDelayMs: 150,
  ringDurationMs: 1000,
  liquidDelayMs: 850,
  liquidDurationMs: 1000,
  beatDelayMs: 1750,
  beatDurationMs: 550,
  heartbeatDelayMs: 2300,
  rippleDelayMs: 2300,
  rippleDurationMs: 900,
  nameDelayMs: 2300,
  nameDurationMs: 700,
  greetDelayMs: 3000,
  greetDurationMs: 350,
  exitDelayMs: 3900,
  exitDurationMs: 500,
} as const;

export const SPLASH_EASINGS = {
  // Slow start and end: the ring draws itself
  ringDraw: Easing.bezier(0.65, 0, 0.25, 1),
  // Quick rise that settles gently: the liquid
  liquid: Easing.bezier(0.2, 0.9, 0.25, 1),
  // The name rising
  enterAndRise: Easing.bezier(0.2, 0.8, 0.2, 1),
  easeInOut: Easing.inOut(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeIn: Easing.in(Easing.ease),
};
```

| Ligne | Ce qu'elle fait |
|---|---|
| `background: '#141317'` | Le même sombre que l'appli (`Surface.base`) et que le fond de l'icône |
| `orbSize: 180` | 180 pixels pour 180 unités : une unité du dessin = un pixel |
| `SPLASH_HEARTBEAT` | Le double battement, étape par étape ; changer un nombre ici suffit |
| `…DelayMs` / `…DurationMs` | Quand chaque étape commence et combien de temps elle dure (en millisecondes) ; le test de l'étape 7 vérifie qu'elles s'enchaînent dans le bon ordre |
| `safetyTimeoutMs: 4800` | Le filet de sécurité : quoi qu'il arrive, l'appli s'ouvre au bout de 4,8 s |
| `Easing.bezier(…)` | La « courbe » du mouvement : lente au début, rapide au milieu, douce à la fin… |

### Étape 5 — La nouvelle animation de lancement

Remplacer tout le contenu de `src/features/launch/SplashAnimation.tsx` :

<!-- bloc: splash-animation -->

```tsx
/**
 * The launch animation of Junix Pulse, around the orb A1 (study 001, sections 4, 12.7 and 12.10).
 *
 * Timeline (4.4 s, see SPLASH_TIMINGS):
 *  - 0.00 s: dark background, a violet glow lights up behind the orb
 *  - 0.15 s: the ring draws itself, clockwise from the left
 *  - 0.85 s: the liquid rises and sways
 *  - 1.75 s: the beat crosses the orb, then a double heartbeat and a ripple
 *  - 2.30 s: "JUNIX PULSE" rises under the orb
 *  - 3.00 s: if the mascot is on, the orb becomes Pulse, who waves
 *  - 3.90 s: everything fades out onto the app
 * Reduced motion: the finished logo for 0.8 s, then a fade. A tap anywhere skips it.
 */

import { createAudioPlayer } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { OrbMark } from '@/components/ui/OrbMark';
import { ORB_RING, ORB_VIEWBOX_SIZE } from '@/constants/orb-logo';
import { PulseMascot } from '@/features/mascot/PulseMascot';
import { MASCOT_BASE_SIZE, MASCOT_ORB, MASCOT_VIEWBOX } from '@/features/mascot/mascot-visuals';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';

import { SPLASH_COLORS, SPLASH_EASINGS, SPLASH_HEARTBEAT, SPLASH_LAYOUT, SPLASH_TIMINGS } from './splash-constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ORB_PX = SPLASH_LAYOUT.orbSize;
const GLOW_PX = SPLASH_LAYOUT.glowSize;
/** The outer edge of the ring, in pixels on screen. */
const RING_EDGE_PX = (ORB_RING.radius + ORB_RING.stroke / 2) * (ORB_PX / ORB_VIEWBOX_SIZE);
/** Pulse is drawn at its base size, where one unit is one pixel, then enlarged so its orb fills the ring. */
const MASCOT_SCALE = RING_EDGE_PX / MASCOT_ORB.radius;
/** How far Pulse's orb sits from the centre of its box, to put it exactly on the logo's orb. */
const MASCOT_SHIFT = {
  x: (MASCOT_VIEWBOX.width / 2 - (MASCOT_ORB.cx - MASCOT_VIEWBOX.minX)) * MASCOT_SCALE,
  y: (MASCOT_VIEWBOX.height / 2 - (MASCOT_ORB.cy - MASCOT_VIEWBOX.minY)) * MASCOT_SCALE,
};

interface SplashAnimationProps {
  onFinish: () => void;
  /** True when the mascot is on: the orb then becomes Pulse, who waves. Read when that moment comes. */
  greet?: boolean;
}

export function SplashAnimation({ onFinish, greet = false }: SplashAnimationProps) {
  const reduceMotion = useSafeReducedMotion();
  const onFinishRef = useRef(onFinish);
  const greetRef = useRef(greet);
  const finishedRef = useRef(false);

  const glow = useSharedValue(0);
  const ring = useSharedValue(0);
  const liquid = useSharedValue(0);
  const beat = useSharedValue(0);
  const heartbeat = useSharedValue(1);
  const ripple = useSharedValue(0);
  const name = useSharedValue(0);
  const greeting = useSharedValue(0);
  const exit = useSharedValue(0);
  const progress = useMemo(() => ({ ring, liquid, beat }), [ring, liquid, beat]);

  useEffect(() => {
    onFinishRef.current = onFinish;
    greetRef.current = greet;
  }, [onFinish, greet]);

  // Called once only, whether by the end of the animation, a tap or the safety net
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  }, []);

  // The Android back button does nothing during the animation
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  // The launch sound, at 60 %; a sound that cannot play never blocks the launch
  useEffect(() => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      player = createAudioPlayer(require('../../../assets/sounds/junix-pulse-launch-sound.wav'));
      player.volume = 0.6;
      player.play();
    } catch {
      // Silent
    }
    return () => {
      try {
        player?.pause();
        player?.remove();
      } catch {
        // Silent
      }
    };
  }, []);

  // The timeline
  useEffect(() => {
    const T = SPLASH_TIMINGS;
    const E = SPLASH_EASINGS;
    const timers: ReturnType<typeof setTimeout>[] = [setTimeout(finish, T.safetyTimeoutMs)];
    const fadeOut = (delay: number, duration: number) => {
      exit.value = withDelay(
        delay,
        withTiming(1, { duration, easing: E.easeIn }, (done) => {
          if (done) runOnJS(finish)();
        })
      );
    };

    if (reduceMotion) {
      glow.value = 1;
      ring.value = 1;
      liquid.value = 1;
      beat.value = 1;
      name.value = 1;
      fadeOut(T.reducedMotionHoldMs, T.reducedMotionExitMs);
    } else {
      glow.value = withTiming(1, { duration: T.glowDurationMs, easing: E.easeOut });
      ring.value = withDelay(T.ringDelayMs, withTiming(1, { duration: T.ringDurationMs, easing: E.ringDraw }));
      liquid.value = withDelay(T.liquidDelayMs, withTiming(1, { duration: T.liquidDurationMs, easing: E.liquid }));
      beat.value = withDelay(T.beatDelayMs, withTiming(1, { duration: T.beatDurationMs, easing: E.easeInOut }));
      const [first, ...others] = SPLASH_HEARTBEAT.map((step) =>
        withTiming(step.scale, { duration: step.ms, easing: E.easeInOut })
      );
      heartbeat.value = withDelay(T.heartbeatDelayMs, withSequence(first, ...others));
      ripple.value = withDelay(T.rippleDelayMs, withTiming(1, { duration: T.rippleDurationMs, easing: E.easeOut }));
      name.value = withDelay(T.nameDelayMs, withTiming(1, { duration: T.nameDurationMs, easing: E.enterAndRise }));
      // The mascot setting is read now: the database may only have opened during the animation
      timers.push(
        setTimeout(() => {
          if (greetRef.current) {
            greeting.value = withTiming(1, { duration: T.greetDurationMs, easing: E.easeInOut });
          }
        }, T.greetDelayMs)
      );
      fadeOut(T.exitDelayMs, T.exitDurationMs);
    }

    return () => {
      for (const timer of timers) clearTimeout(timer);
      for (const value of [glow, ring, liquid, beat, heartbeat, ripple, name, greeting, exit]) cancelAnimation(value);
    };
  }, [reduceMotion, finish, glow, ring, liquid, beat, heartbeat, ripple, name, greeting, exit]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const sceneStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.04 * exit.value }] }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: 1 - greeting.value,
    transform: [{ scale: heartbeat.value * (1 - 0.08 * greeting.value) }],
  }));
  const mascotStyle = useAnimatedStyle(() => ({
    opacity: greeting.value,
    transform: [
      { translateX: MASCOT_SHIFT.x },
      { translateY: MASCOT_SHIFT.y },
      { scale: MASCOT_SCALE * (0.92 + 0.08 * greeting.value) },
    ],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: name.value,
    transform: [{ translateY: SPLASH_LAYOUT.nameRise * (1 - name.value) }],
  }));
  const glowProps = useAnimatedProps(() => ({ opacity: glow.value * (1 - greeting.value * 0.4) }));
  const rippleProps = useAnimatedProps(() => ({
    r: RING_EDGE_PX + SPLASH_LAYOUT.rippleSpread * ripple.value,
    opacity: ripple.value > 0 ? 0.6 * (1 - ripple.value) : 0,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} testID="launch-animation">
      <StatusBar style="light" />
      <Pressable style={styles.pressable} onPress={finish} accessibilityRole="button" accessibilityLabel="Junix Pulse">
        <Animated.View style={[styles.scene, sceneStyle]}>
          <View style={styles.orbBox}>
            <Svg
              width={GLOW_PX}
              height={GLOW_PX}
              viewBox={`${-GLOW_PX / 2} ${-GLOW_PX / 2} ${GLOW_PX} ${GLOW_PX}`}
              style={styles.glow}
              pointerEvents="none"
            >
              <Defs>
                <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={SPLASH_COLORS.glow} stopOpacity={0.45} />
                  <Stop offset="1" stopColor={SPLASH_COLORS.glow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <AnimatedCircle r={GLOW_PX / 2} fill="url(#launchGlow)" animatedProps={glowProps} />
              <AnimatedCircle fill="none" stroke={SPLASH_COLORS.ripple} strokeWidth={3} animatedProps={rippleProps} />
            </Svg>
            <Animated.View style={orbStyle}>
              <OrbMark size={ORB_PX} variant="dark" progress={progress} />
            </Animated.View>
            {greet ? (
              <Animated.View pointerEvents="none" style={[styles.mascot, mascotStyle]}>
                <PulseMascot mood="happy" pose="greet" size={MASCOT_BASE_SIZE} />
              </Animated.View>
            ) : null}
          </View>
          <Animated.View style={[styles.name, nameStyle]}>
            <Text style={styles.junix} allowFontScaling={false}>
              JUNIX
            </Text>
            <Text style={styles.pulse} allowFontScaling={false}>
              PULSE
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_COLORS.background,
    zIndex: 99999,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    alignItems: 'center',
  },
  orbBox: {
    width: ORB_PX,
    height: ORB_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    left: (ORB_PX - GLOW_PX) / 2,
    top: (ORB_PX - GLOW_PX) / 2,
  },
  mascot: {
    position: 'absolute',
    left: (ORB_PX - MASCOT_VIEWBOX.width) / 2,
    top: (ORB_PX - MASCOT_VIEWBOX.height) / 2,
    width: MASCOT_VIEWBOX.width,
    height: MASCOT_VIEWBOX.height,
  },
  name: {
    marginTop: SPLASH_LAYOUT.nameGap,
    alignItems: 'center',
  },
  // The letter spacing also adds space after the last letter: the same on the left keeps the word centred
  junix: {
    fontFamily: 'Outfit-Bold',
    fontSize: 34,
    letterSpacing: 8,
    paddingLeft: 8,
    color: SPLASH_COLORS.name,
  },
  pulse: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 9,
    paddingLeft: 9,
    marginTop: 4,
    color: SPLASH_COLORS.tagline,
  },
});
```

| Passage | Ce qu'il fait |
|---|---|
| `RING_EDGE_PX`, `MASCOT_SCALE` | Le bord extérieur de l'anneau mesure 83 px ; l'orbe de Pulse en mesure 48 à sa taille de base : on agrandit Pulse de 83 / 48 ≈ 1,73 fois |
| `MASCOT_SHIFT` | L'orbe de Pulse est 3 unités au-dessus du centre de sa boîte (il a des bras et une ombre) : on le redescend d'autant, agrandi, pour qu'il tombe pile sur le logo |
| `onFinishRef`, `greetRef` | Gardent les dernières valeurs reçues, sans relancer l'animation. `greetRef` permet de lire le réglage de la mascotte **au moment** du salut |
| `finish` + `finishedRef` | L'appli ne reçoit qu'une seule fois « animation terminée », que ce soit la fin normale, un toucher ou le filet de sécurité |
| `BackHandler…() => true` | Le bouton retour d'Android est ignoré pendant les 4 secondes (comme avant) |
| `createAudioPlayer(…)` | Le même son qu'avant, à 60 % ; s'il ne peut pas jouer, rien ne bloque |
| `setTimeout(finish, safetyTimeoutMs)` | Le filet de sécurité de 4,8 s |
| `if (reduceMotion)` | Mouvement réduit : tout est mis directement à la fin (valeur 1), puis le fondu après 0,8 s |
| `withDelay(…, withTiming(…))` | « Attends tant de millisecondes, puis va jusqu'à 1 en tant de millisecondes avec telle courbe » |
| `SPLASH_HEARTBEAT.map(…)` + `withSequence` | Enchaîne les quatre étapes du double battement |
| `setTimeout(() => { if (greetRef.current) … })` | À 3,00 s : Pulse n'apparaît que si la mascotte est activée **à ce moment-là** |
| `orbStyle` / `mascotStyle` | Le fondu enchaîné : l'orbe s'efface en rétrécissant un peu, Pulse apparaît en grandissant un peu, au même endroit |
| `rippleProps` | L'onde : un cercle cyan qui part du bord de l'anneau, s'élargit de 56 px et s'efface |
| `<StatusBar style="light" />` | Les icônes de la barre d'état en blanc, lisibles sur le fond sombre, même si l'appli est en thème clair |
| `testID="launch-animation"` | Un nom pour retrouver l'animation dans les tests |
| `paddingLeft: 8` | L'espacement des lettres ajoute aussi un espace après la dernière lettre : on en met autant devant pour que le mot reste centré |

### Étape 6 — Brancher le réglage de la mascotte, et le fond sombre du système

**6a. `src/app/_layout.tsx`**, cinq remplacements. Chercher exactement le texte « avant » et le remplacer par le texte « après ».

Ajouter `useSyncExternalStore` à l'import de React :

<!-- bloc: layout-react-avant -->

```tsx
import { useEffect, useState, useRef } from "react";
```

<!-- bloc: layout-react-apres -->

```tsx
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
```

Ajouter les deux imports de la mascotte :

<!-- bloc: layout-imports-avant -->

```tsx
import { announceReminderArrived } from "@/services/mascot/mascot-announcers";
```

<!-- bloc: layout-imports-apres -->

```tsx
import { announceReminderArrived } from "@/services/mascot/mascot-announcers";
import { getMascotPresence, setMascotSettings, subscribeMascotSettings } from "@/services/mascot/mascot-runtime";
import { mascotSettingsFrom } from "@/services/mascot/mascot-settings-service";
```

Suivre le réglage de présence de la mascotte :

<!-- bloc: layout-hook-avant -->

```tsx
  const segments = useSegments();
```

<!-- bloc: layout-hook-apres -->

```tsx
  const segments = useSegments();
  // Followed live: the launch animation reads it when Pulse is about to wave
  const mascotPresence = useSyncExternalStore(subscribeMascotSettings, getMascotPresence, getMascotPresence);
```

Appliquer le réglage dès que la base est lue au démarrage :

<!-- bloc: layout-settings-avant -->

```tsx
        const settings = await SettingsRepository.get();
        setOnboardingComplete(settings.onboardingCompleted);
```

<!-- bloc: layout-settings-apres -->

```tsx
        const settings = await SettingsRepository.get();
        setOnboardingComplete(settings.onboardingCompleted);
        // The mascot settings, applied now: the launch animation ends with Pulse waving only if the mascot is on
        setMascotSettings(mascotSettingsFrom(settings));
```

Passer le réglage à l'animation :

<!-- bloc: layout-splash-avant -->

```tsx
      <SplashAnimation key={splashRun} onFinish={() => setSplashFinished(true)} />
```

<!-- bloc: layout-splash-apres -->

```tsx
      <SplashAnimation
        key={splashRun}
        greet={dbReady && mascotPresence !== "off"}
        onFinish={() => setSplashFinished(true)}
      />
```

| Ajout | Ce qu'il fait |
|---|---|
| `useSyncExternalStore(subscribeMascotSettings, getMascotPresence, …)` | Lit le réglage « présence de la mascotte » et se met à jour dès qu'il change (c'est ainsi que la mascotte elle-même le lit) |
| `setMascotSettings(mascotSettingsFrom(settings))` | Les réglages de la mascotte sont dans la même ligne de la base que les autres réglages : on les applique tout de suite, sans seconde lecture |
| `greet={dbReady && mascotPresence !== "off"}` | Pulse salue seulement si la base est ouverte (le réglage est donc le vrai) **et** si la mascotte n'est pas désactivée |

**6b. L'écran de démarrage du système, sombre et vide.** Remplacer tout le contenu de `assets/logo/orbe-demarrage.svg` :

<!-- bloc: orbe-demarrage -->

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 1024">
  <!-- Écran de démarrage du système : volontairement vide (transparent), posé sur le fond sombre #141317.
       L'animation de lancement dessine ensuite l'orbe. Avec l'orbe ici, on le verrait apparaître,
       disparaître, puis se redessiner. Voir FICHE-010. -->
</svg>
```

Dans `app.json`, le fond de l'écran de démarrage passe au sombre (thème clair et sombre) :

<!-- bloc: app-splash-avant -->

```json
          "backgroundColor": "#FFFFFF",
          "dark": {
            "image": "./assets/images/splash-icon.png",
            "backgroundColor": "#FFFFFF"
          }
```

<!-- bloc: app-splash-apres -->

```json
          "backgroundColor": "#141317",
          "dark": {
            "image": "./assets/images/splash-icon.png",
            "backgroundColor": "#141317"
          }
```

Puis refabriquer les images (le script de la fiche 009) :

```bash
node scripts/logo/generer-icones.js
```

Résultat attendu : six lignes, dont `assets/images/splash-icon.png (1024 x 1024)`. Seule `splash-icon.png` doit changer : `git status --short assets/images` ne montre qu'elle (si une autre image apparaît, Edge l'a refaite à l'identique au pixel près ou presque ; la regarder avant de la garder).

**6c. Le test des icônes** dit maintenant ce qu'il vérifie vraiment. Dans `src/__tests__/app-icons.test.ts` :

<!-- bloc: icons-test-avant -->

```ts
  it('gives notifications a transparent silhouette, and the launch screen the orb', () => {
```

<!-- bloc: icons-test-apres -->

```ts
  it('gives notifications a transparent silhouette, and the launch screen a transparent image (the animation draws the orb)', () => {
```

### Étape 7 — Les tests de l'orbe et du lancement

**7a.** Les tests n'utilisent pas le vrai Reanimated mais une imitation, écrite dans `jest.setup.js`. Elle ne connaît pas encore `cancelAnimation` (utilisé par `PulseLogo` et l'animation pour tout arrêter proprement). Dans `jest.setup.js` :

<!-- bloc: jest-setup-avant -->

```js
    withDelay: (_delay, anim) => anim,
```

<!-- bloc: jest-setup-apres -->

```js
    withDelay: (_delay, anim) => anim,
    cancelAnimation: () => {},
```

> Dans cette imitation, `withTiming` appelle tout de suite sa fonction de fin : l'animation se « termine » dès son affichage. Les tests vérifient donc surtout qu'elle ne prévient l'appli **qu'une seule fois**, quoi qu'il arrive.

**7b.**

Créer `src/__tests__/launch-orb.test.tsx` :

<!-- bloc: test -->

```tsx
/**
 * The orb A1 in the app and the launch animation: one drawing with the right numbers, a timeline
 * in order, a launch that can be skipped and always ends, and Pulse only when the mascot is on.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { PulseLogo } from '../components/ui/PulseLogo';
import {
  ORB_BEAT_LENGTH,
  ORB_BEAT_PATH,
  ORB_LIQUID_HIDDEN_DROP,
  ORB_LIQUID_RADIUS,
  ORB_VARIANTS,
  ORB_WAVE,
  orbWavePath,
} from '../constants/orb-logo';
import { SplashAnimation } from '../features/launch/SplashAnimation';
import { SPLASH_HEARTBEAT, SPLASH_TIMINGS } from '../features/launch/splash-constants';
import { PulseMascot } from '../features/mascot/PulseMascot';
import { useAppStore } from '../store/app-store';

// The sound module cannot load in tests: a stand-in player, as in notification-sound-service.test.ts
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ volume: 1, play: jest.fn(), pause: jest.fn(), remove: jest.fn() }),
}));

/** Length of a path made of M, H and L commands, by following the pen. */
function lineLength(path: string): number {
  const parts = path.match(/[A-Z]|-?\d+(?:\.\d+)?/g) ?? [];
  let x = 0;
  let y = 0;
  let total = 0;
  let index = 0;
  while (index < parts.length) {
    const command = parts[index++];
    if (command === 'H') {
      const nextX = Number(parts[index++]);
      total += Math.abs(nextX - x);
      x = nextX;
    } else {
      const nextX = Number(parts[index++]);
      const nextY = Number(parts[index++]);
      if (command === 'L') total += Math.hypot(nextX - x, nextY - y);
      x = nextX;
      y = nextY;
    }
  }
  return total;
}

/** The x of the first and last points of a wave outline. */
function waveSpan(path: string): { from: number; to: number } {
  const xs = [...path.matchAll(/[MT](-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  return { from: xs[0], to: xs[xs.length - 1] };
}

describe('the orb drawing', () => {
  it('gives the beat its true length, so it is drawn to the very end', () => {
    const length = lineLength(ORB_BEAT_PATH);
    expect(ORB_BEAT_LENGTH).toBeGreaterThanOrEqual(length);
    expect(ORB_BEAT_LENGTH - length).toBeLessThan(1);
  });

  it('hides the liquid fully at the start, and covers the whole orb wherever the wave slides', () => {
    // The top of the highest crest is still below the inside of the orb
    expect(ORB_WAVE.surfaceY + ORB_LIQUID_HIDDEN_DROP - ORB_WAVE.depth).toBeGreaterThan(ORB_LIQUID_RADIUS);
    for (const slide of [0, ORB_WAVE.period]) {
      const { from, to } = waveSpan(orbWavePath(0, slide));
      expect(from).toBeLessThanOrEqual(-ORB_LIQUID_RADIUS);
      expect(to).toBeGreaterThanOrEqual(ORB_LIQUID_RADIUS);
    }
    expect(orbWavePath(0, 0)).toContain(`M-150 ${ORB_WAVE.surfaceY} `);
  });
});

describe('the launch timeline', () => {
  it('plays its steps in order and ends before the safety net', () => {
    const T = SPLASH_TIMINGS;
    const heartbeatEnd = T.heartbeatDelayMs + SPLASH_HEARTBEAT.reduce((sum, step) => sum + step.ms, 0);
    expect(T.ringDelayMs).toBeLessThan(T.liquidDelayMs);
    expect(T.liquidDelayMs).toBeLessThan(T.beatDelayMs);
    expect(T.beatDelayMs + T.beatDurationMs).toBeLessThanOrEqual(T.heartbeatDelayMs);
    expect(heartbeatEnd).toBeLessThanOrEqual(T.greetDelayMs);
    expect(T.nameDelayMs + T.nameDurationMs).toBeLessThanOrEqual(T.greetDelayMs);
    expect(T.greetDelayMs + T.greetDurationMs).toBeLessThanOrEqual(T.exitDelayMs);
    expect(T.exitDelayMs + T.exitDurationMs).toBe(T.totalDurationMs);
    expect(T.totalDurationMs).toBeLessThan(T.safetyTimeoutMs);
    expect(T.reducedMotionHoldMs + T.reducedMotionExitMs).toBeLessThan(T.safetyTimeoutMs);
  });
});

describe('the launch animation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function renderSplash(greet: boolean, onFinish: () => void) {
    let root!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(<SplashAnimation greet={greet} onFinish={onFinish} />);
    });
    return root;
  }

  it('ends once when tapped, even when tapped twice', () => {
    const onFinish = jest.fn();
    const root = renderSplash(false, onFinish);
    const skip = root.root.findAllByProps({ accessibilityLabel: 'Junix Pulse' })[0];
    act(() => {
      skip.props.onPress();
      skip.props.onPress();
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('always ends, at the latest with the safety net', () => {
    const onFinish = jest.fn();
    const root = renderSplash(false, onFinish);
    act(() => {
      jest.advanceTimersByTime(SPLASH_TIMINGS.safetyTimeoutMs + 100);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('shows Pulse only when the mascot is on', () => {
    const without = renderSplash(false, jest.fn());
    expect(without.root.findAllByType(PulseMascot)).toHaveLength(0);
    act(() => without.unmount());

    const withPulse = renderSplash(true, jest.fn());
    expect(withPulse.root.findAllByType(PulseMascot)).toHaveLength(1);
    act(() => withPulse.unmount());
  });
});

describe('PulseLogo', () => {
  it('outlines the beat in white on the light theme, as on the validated drawing', () => {
    act(() => {
      useAppStore.setState({ themeMode: 'light' });
    });
    let root!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(<PulseLogo size={64} mode="static" />);
    });
    const light = ORB_VARIANTS.light;
    expect(root.root.findAll((node) => node.props.stroke === light.beat).length).toBeGreaterThan(0);
    expect(root.root.findAll((node) => node.props.stroke === light.beatOutline).length).toBeGreaterThan(0);
    act(() => root.unmount());
  });
});
```

| Test | Ce qu'il prouve |
|---|---|
| `jest.mock('expo-audio', …)` | (pas un test) Le module de son ne peut pas se charger dans les tests : on le remplace par un faux lecteur, comme dans `notification-sound-service.test.ts` |
| `gives the beat its true length` | Refait le calcul des six segments du battement : si on retouche son dessin sans changer `ORB_BEAT_LENGTH`, le test échoue (sinon le battement s'arrêterait avant la fin, ou attendrait) |
| `hides the liquid fully…` | Au départ, le liquide est entièrement sous l'orbe (rien ne dépasse) ; la vague couvre toujours tout l'intérieur, même glissée |
| `plays its steps in order…` | Le minutage s'enchaîne dans le bon ordre et finit avant le filet de sécurité |
| `ends once when tapped…` | Un toucher passe l'animation ; deux touchers rapides n'ouvrent pas l'appli deux fois |
| `always ends…` | Même si aucune animation ne se termine, l'appli s'ouvre au bout de 4,8 s |
| `shows Pulse only when the mascot is on` | Mascotte désactivée = pas de Pulse |
| `outlines the beat in white on the light theme` | En thème clair, le battement violet foncé est bien détouré de blanc |

## 8. Test final

```bash
npx jest src/__tests__/launch-orb.test.tsx src/__tests__/splash-and-logo.test.tsx src/__tests__/app-icons.test.ts
npx tsc --noEmit
npx eslint src/constants/orb-logo.ts src/components/ui/OrbMark.tsx src/components/ui/PulseLogo.tsx src/features/launch src/app/_layout.tsx src/__tests__/launch-orb.test.tsx
```

Résultat attendu : `Tests: 13 passed` (7 + 3 + 3) ; `tsc` et `eslint` n'affichent rien.

**Sur le web** (`npx expo start --web`, puis effacer les données du site pour rejouer l'animation) : fond sombre, l'anneau se dessine, le liquide monte, le battement passe, le nom apparaît, Pulse salue.

**Sur le téléphone** (fiche 003 : prebuild, `local.properties`, APK) :
1. Plus aucun écran blanc au lancement : sombre du début à la fin.
2. L'animation se joue au premier lancement, puis après 15 minutes sans utiliser l'appli.
3. Réglages › Mascotte › Présence « désactivée », fermer l'appli, attendre 15 min (ou effacer ses données de cache n'est **pas** nécessaire) : l'animation finit sur l'orbe, sans Pulse.
4. Réglages Android › Accessibilité › **Supprimer les animations** : le logo s'affiche fixe, puis l'appli s'ouvre.
5. L'onboarding, l'onglet Pulse (mascotte désactivée) et le Sanctuaire montrent l'orbe.

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| L'écran du système est encore blanc | Le prebuild n'a pas été refait après le changement de `app.json` | `npx expo prebuild --platform android --clean`, puis recréer `android/local.properties` (fiche 003) |
| Pulse n'apparaît jamais | La mascotte est désactivée, ou la base met plus de 3 s à s'ouvrir | Vérifier Réglages › Mascotte ; c'est voulu : sans le vrai réglage, on ne montre pas Pulse |
| Pulse est décalé par rapport à l'orbe | La mascotte a changé de proportions | Vérifier `MASCOT_ORB` et `MASCOT_VIEWBOX` dans `mascot-visuals.ts` : le calcul de l'étape 5 s'en sert |
| L'anneau commence à droite, ou le dégradé est inversé | `transform="rotate(180)"` ou le dégradé `x1="1" y1="0" x2="0" y2="1"` a été modifié seul | Les deux vont ensemble (étape 2) |
| Le battement s'arrête avant la fin | Le dessin du battement a changé sans `ORB_BEAT_LENGTH` | Le test `gives the beat its true length` donne la bonne longueur |

## 10. Lexique

- **Écran de démarrage du système** (splash natif) : l'écran qu'Android affiche tout seul pendant que l'appli se charge, avant que notre code tourne.
- **Animation de lancement** : notre animation, dessinée par le code de l'appli, juste après.
- **Dash / dashoffset** : une façon de dessiner un trait en pointillés ; avec un seul pointillé aussi long que le trait, qu'on décale, le trait semble se dessiner.
- **Valeur partagée** (shared value) : un nombre que Reanimated fait varier sur le fil des animations, sans ralentir le reste de l'appli.
- **Worklet** : une petite fonction que Reanimated peut exécuter sur ce fil-là.
- **Fondu enchaîné** : une image s'efface pendant que l'autre apparaît, au même endroit.

## 11. Et après

1. Voir le résultat sur le téléphone (nouvel APK, fiche 003).
2. Le chantier n° 2 de l'étude (12.10) : les notifications des trois types, avec leur hiérarchie (Discret, Normal, Alarme).

## Compte rendu d'exécution (23 novembre 2026)

- Étapes 1 à 7 appliquées **à partir des blocs de cette fiche** (outil `docs/fiches/outils/appliquer-fiche-010.js`), après la fin de la compilation de l'APK du 23 novembre (le code n'a pas été touché pendant qu'elle emballait le JavaScript).
- Étape 6b : `node scripts/logo/generer-icones.js` ; seule `assets/images/splash-icon.png` a changé (devenue transparente).
- **Écarts corrigés pendant l'exécution** (la fiche décrit maintenant la version qui marche) :
  1. `expo-audio` ne se charge pas dans les tests (`Cannot read properties of undefined (reading 'prototype')`) : ajout d'un faux lecteur (`jest.mock('expo-audio', …)`) en tête du test, comme dans `notification-sound-service.test.ts` ;
  2. le test existant `splash-and-logo.test.tsx` trouvait d'abord `OrbMark` (qui recevait `accessibilityLabel`) au lieu du dessin, donc sans largeur : la propriété d'`OrbMark` s'appelle maintenant `label` ;
  3. le faux Reanimated des tests (`jest.setup.js`) ne connaissait pas `cancelAnimation` : ajouté (étape 7a).
- Test final : `Tests: 13 passed, 13 total` pour les trois fichiers ; **toute la suite** : `Test Suites: 86 passed`, `Tests: 1904 passed` ; `tsc --noEmit` sans erreur ; `eslint` sans erreur sur les fichiers de la fiche. (`jest.setup.js` a 18 erreurs eslint `'jest' is not defined` qui existaient déjà : le fichier n'est pas déclaré comme fichier de test pour eslint ; aucune ne vient de la ligne ajoutée.)
- **Vu sur le web** (`expo-web`, port 8099) : fond sombre `#141317` ; l'anneau part de la gauche ; dégradé dans le bon sens (violet en bas à gauche, cyan en haut à droite) ; le liquide ; le battement blanc ; l'onde cyan ; « JUNIX » et « PULSE » ; Pulse apparaît pile à la place de l'orbe et salue ; fondu sur l'onboarding puis l'accueil. Aucune erreur dans la console.
- Sur le web seulement, la page reste blanche le temps que le code se charge (avant l'animation) : le web n'a pas d'écran de démarrage du système. Sur Android, cet écran est maintenant sombre (`app.json`).
- **Pas encore vu sur le téléphone** : il faut un prebuild et un nouvel APK (fiche 003). Rien n'est encore enregistré dans git.

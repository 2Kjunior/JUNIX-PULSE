/**
 * Constantes de timing, dimensions, couleurs et courbes pour le Splash Screen Junix Pulse.
 * Calibré à 100% sur le prototype HTML de référence (4 secondes totales).
 */

import { Easing } from "react-native-reanimated";

export const SPLASH_COLORS = {
  background: "#FFFFFF",
  violet: "#8B3DF0",
  cyan: "#0AE8F0",
  text: "#1A1040",
  ringStroke: 64,
  rippleStroke: 6,
} as const;

export const SPLASH_COORDINATES = {
  viewBoxSize: 1024,
  center: { x: 514, y: 447 },
  ringRadius: 225,
  innerRadius: 212,
  innerWipe: {
    x: 270,
    y: 200,
    width: 490,
    height: 500,
  },
  textWipe: {
    x: 170,
    y: 690,
    width: 690,
    height: 140,
  },
} as const;

export const SPLASH_TIMINGS = {
  // Durée totale maximale avant transition
  totalDurationMs: 4000,
  // Timeout strict de sécurité (forcer le remplacement)
  safetyTimeoutMs: 4200,
  // Mode accessibilité (mouvement réduit)
  reducedMotionDurationMs: 800,

  // 1. Logo global enter
  enterDelayMs: 100,
  enterDurationMs: 1300,

  // 2. Ring drawing (strokeDashoffset 1 -> 0)
  ringDelayMs: 150,
  ringDurationMs: 1250,

  // 3. Inner sweep (révélation pulse + P)
  innerSweepDelayMs: 950,
  innerSweepDurationMs: 1050,

  // 4. Heartbeat (battement du symbole)
  beatDelayMs: 2000,
  beatDurationMs: 1000,

  // 5. Ondes / Ripples
  ripple1DelayMs: 2000,
  ripple2DelayMs: 2280,
  rippleDurationMs: 1000,

  // 6. Texte "JUNIX PULSE"
  textDelayMs: 2350,
  textDurationMs: 800,

  // 7. Sortie globale
  exitDelayMs: 3500,
  exitDurationMs: 500,
} as const;

// Courbes d'animation fidèles aux cubic-bezier de l'HTML
export const SPLASH_EASINGS = {
  // cubic-bezier(.2, .8, .2, 1) - Logo enter et Text rise
  enterAndRise: Easing.bezier(0.2, 0.8, 0.2, 1),
  // cubic-bezier(.65, 0, .25, 1) - Ring draw
  ringDraw: Easing.bezier(0.65, 0, 0.25, 1),
  // cubic-bezier(.5, 0, .2, 1) - Wipe sweep
  wipeSweep: Easing.bezier(0.5, 0, 0.2, 1),
  // ease-in-out - Heartbeat
  heartbeat: Easing.inOut(Easing.ease),
  // ease-out - Ripples
  ripple: Easing.out(Easing.ease),
  // ease-in - Exit
  exit: Easing.in(Easing.ease),
};

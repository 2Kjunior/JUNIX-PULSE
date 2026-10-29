/**
 * Constantes de timing, dimensions, coordonnées, couleurs et courbes
 * pour le Splash Screen Junix Pulse (animation 4 secondes).
 * Source de vérité : docs/splash/junix-pulse-splash-reference.html
 */

import { Easing } from "react-native-reanimated";

export const SPLASH_COLORS = {
  background: "#FFFFFF",
  violet: "#8B3DF0",
  cyan: "#0AE8F0",
  text: "#1A1040",
  ringStroke: 64,
  rippleStroke: 6,
  cardBorder: "rgba(255, 255, 255, 0.80)",
  cardFallback: "rgba(255, 255, 255, 0.82)",
} as const;

export const SPLASH_COORDINATES = {
  viewBox: {
    minX: 62,
    minY: -287,
    width: 900,
    height: 1600,
  },
  logoSize: 1024,
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
  textRisePx: 26,
} as const;

export const SPLASH_TIMINGS = {
  // Durée totale d'animation
  totalDurationMs: 4000,
  // Timeout strict de sécurité (garde-fou)
  safetyTimeoutMs: 4200,
  // Mode accessibilité (mouvement réduit)
  reducedMotionDurationMs: 800,

  // 1. Orbes (0s à 0.9s apparition, 0s à 4s dérive)
  orbEntranceDurationMs: 900,
  orb2DelayMs: 100,
  orb3DelayMs: 200,
  orbDriftDurationMs: 4000,

  // 2. Verre liquide / Glassmorphism (0s à 0.95s goutte, 2.0s à 3.0s battement)
  cardLiquidDurationMs: 950,
  cardBeatDelayMs: 2000,
  cardBeatDurationMs: 1000,
  cardSheenDelayMs: 1950,
  cardSheenDurationMs: 900,

  // 3. Logo enter (0.1s à 1.4s)
  enterDelayMs: 100,
  enterDurationMs: 1300,

  // 4. Anneau dégradé (0.15s à 1.4s)
  ringDelayMs: 150,
  ringDurationMs: 1250,

  // 5. Balayage intérieur (0.95s à 2.0s)
  innerSweepDelayMs: 950,
  innerSweepDurationMs: 1050,

  // 6. Double battement symbole (2.0s à 3.0s)
  beatDelayMs: 2000,
  beatDurationMs: 1000,

  // 7. Ondes / Ripples (2.0s et 2.28s)
  ripple1DelayMs: 2000,
  ripple2DelayMs: 2280,
  rippleDurationMs: 1000,

  // 8. Texte "JUNIX PULSE" (2.35s à 3.15s)
  textDelayMs: 2350,
  textDurationMs: 800,

  // 9. Fondu de sortie (3.5s à 4.0s)
  exitDelayMs: 3500,
  exitDurationMs: 500,
} as const;

// Courbes d'animation strictement identiques aux cubic-bezier CSS de la référence
export const SPLASH_EASINGS = {
  // cubic-bezier(.2, .9, .25, 1) - Goutte liquide de verre
  liquid: Easing.bezier(0.2, 0.9, 0.25, 1),
  // cubic-bezier(.2, .8, .2, 1) - Logo enter et Text rise
  enterAndRise: Easing.bezier(0.2, 0.8, 0.2, 1),
  // cubic-bezier(.65, 0, .25, 1) - Tracé de l'anneau
  ringDraw: Easing.bezier(0.65, 0, 0.25, 1),
  // cubic-bezier(.5, 0, .2, 1) - Balayages gauche -> droite
  wipeSweep: Easing.bezier(0.5, 0, 0.2, 1),
  // ease-in-out - Battements symbole et carte, dérive et reflet
  easeInOut: Easing.inOut(Easing.ease),
  // ease-out - Orbes et ondes
  easeOut: Easing.out(Easing.ease),
  // ease-in - Fondu de sortie global
  easeIn: Easing.in(Easing.ease),
};

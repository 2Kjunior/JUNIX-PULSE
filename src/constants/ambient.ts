/**
 * Settings of the animated ambient background.
 * Source of truth: docs/ambient/BRIEF-fond-ambient-junix-pulse.md
 */

import type { AmbientMotion } from '@/domain/rules/ambient-motion';

/** Single switch: `false` leaves the plain theme background, with no halo and no animation. */
export const AMBIENT_ENABLED = true;

export const AMBIENT_THEME_FADE_MS = 600;
export const AMBIENT_REVEAL_FADE_MS = 600;

/** Below this amount of RAM, the device only draws `AMBIENT_LOW_END_HALO_COUNT` halos. */
export const AMBIENT_LOW_END_MAX_MEMORY_BYTES = 3 * 1024 * 1024 * 1024;
export const AMBIENT_LOW_END_HALO_COUNT = 2;

/** Longest step of the animation clock, so that a long frame never makes the halos jump. */
export const AMBIENT_MAX_FRAME_DELTA_MS = 100;

/**
 * Radius of the gradient, in % of the halo size. It reaches the corners of the square, like the
 * CSS `radial-gradient(circle, ...)` of the reference, so the stops below match its rendering.
 */
export const AMBIENT_GRADIENT_RADIUS = 70.71;
export const AMBIENT_GRADIENT_STOPS = [
  { offset: 0, opacity: 1 },
  { offset: 0.38, opacity: 0.45 },
  { offset: 0.68, opacity: 0 },
] as const;

export type AmbientThemeMode = 'light' | 'dark';

export interface AmbientHaloConfig {
  readonly id: string;
  readonly color: Readonly<Record<AmbientThemeMode, string>>;
  readonly opacity: Readonly<Record<AmbientThemeMode, number>>;
  /** Diameter, in % of the screen width. */
  readonly sizePercent: number;
  /** Center, in % of the screen. */
  readonly center: { readonly x: number; readonly y: number };
  readonly motion: AmbientMotion;
}

/** Ordered by priority: low-end devices keep the first ones. */
export const AMBIENT_HALOS: readonly AmbientHaloConfig[] = [
  {
    id: 'violet',
    color: { light: '#A78BFA', dark: '#8B3DF0' },
    opacity: { light: 0.5, dark: 0.62 },
    sizePercent: 78,
    center: { x: 18, y: 20 },
    motion: {
      durationMs: 24000,
      phaseMs: 0,
      keyframes: [
        { at: 0, x: 0, y: 0, scale: 1 },
        { at: 0.33, x: 14, y: 8, scale: 1.12 },
        { at: 0.66, x: -6, y: 14, scale: 0.94 },
        { at: 1, x: 0, y: 0, scale: 1 },
      ],
    },
  },
  {
    id: 'cyan',
    color: { light: '#67E8F9', dark: '#0AE8F0' },
    opacity: { light: 0.45, dark: 0.5 },
    sizePercent: 68,
    center: { x: 86, y: 36 },
    motion: {
      durationMs: 28000,
      phaseMs: 9000,
      keyframes: [
        { at: 0, x: 0, y: 0, scale: 1 },
        { at: 0.33, x: -12, y: 10, scale: 0.92 },
        { at: 0.66, x: 6, y: -12, scale: 1.1 },
        { at: 1, x: 0, y: 0, scale: 1 },
      ],
    },
  },
  {
    id: 'blue',
    color: { light: '#93A8FB', dark: '#5E7BF2' },
    opacity: { light: 0.4, dark: 0.48 },
    sizePercent: 64,
    center: { x: 28, y: 76 },
    motion: {
      durationMs: 32000,
      phaseMs: 17000,
      keyframes: [
        { at: 0, x: 0, y: 0, scale: 1 },
        { at: 0.33, x: 12, y: -10, scale: 1.1 },
        { at: 0.66, x: -8, y: -4, scale: 0.95 },
        { at: 1, x: 0, y: 0, scale: 1 },
      ],
    },
  },
  {
    id: 'soft-violet',
    color: { light: '#C4B5FD', dark: '#6D28D9' },
    opacity: { light: 0.35, dark: 0.45 },
    sizePercent: 50,
    center: { x: 84, y: 90 },
    motion: {
      durationMs: 20000,
      phaseMs: 5000,
      keyframes: [
        { at: 0, x: 0, y: 0, scale: 1 },
        { at: 0.5, x: -14, y: -12, scale: 1.15 },
        { at: 1, x: 0, y: 0, scale: 1 },
      ],
    },
  },
];
